import { ALGORITHM, POLICY } from './policy'
import type { CountryStat, DrawEntry, Entropy, PickTrace, RoundEntryView, RoundInput, RoundResult, SkipReason } from './types'
import { drawPoolOf, fullMonths, priorityBudgetOf } from './money'

/**
 * hearth-quota-1
 *
 * Weights are integer thousandths so every verifier gets the same number:
 *   base 1000
 *   + 150 per full year of membership after the first, capped at 750
 *   + 250 for the 3rd child, or 500 for the 4th and later
 *   + 350 when hardship is confirmed by a second pastor
 *   + 50 per full month since approval, capped at 300
 *   then, if the regional balance rule applies, round(total * 12 / 10)
 *
 * Order inside a lane is weighted sampling without replacement.
 * Each step draws an integer in [0, total thousandths) from HMAC-SHA256
 * with rejection sampling, so the draw does not depend on Math.random or Math.log.
 */

export type WeightParts = {
  base: number
  membership: number
  family: number
  hardship: number
  waiting: number
  regionApplied: boolean
  thousandths: number
  weight: number
  waitMonths: number
}

export function weightParts(input: {
  membershipYears: number
  birthOrder: number
  hardship: boolean
  approvedAt: string | null
  asOf: string
  regionBoost?: boolean
}): WeightParts {
  const waitMonths = input.approvedAt ? fullMonths(input.approvedAt, input.asOf) : 0
  const membership = Math.min(750, Math.max(0, input.membershipYears - 1) * 150)
  const family = input.birthOrder >= 4 ? 500 : input.birthOrder === 3 ? 250 : 0
  const hardship = input.hardship ? 350 : 0
  const waiting = Math.min(300, waitMonths * 50)
  let thousandths = 1000 + membership + family + hardship + waiting
  const regionApplied = Boolean(input.regionBoost)
  if (regionApplied) thousandths = Math.round((thousandths * 12) / 10)
  return {
    base: 1000,
    membership,
    family,
    hardship,
    waiting,
    regionApplied,
    thousandths,
    weight: thousandths / 1000,
    waitMonths,
  }
}

export function isPriority(entry: { birthOrder: number; hardship: boolean }): boolean {
  return entry.birthOrder >= 4 || entry.hardship
}

type Prepared = DrawEntry & WeightParts

function countryStats(entries: DrawEntry[], priorPayoutCountries: string[]): CountryStat[] {
  const priorTotal = priorPayoutCountries.length
  const counts = new Map<string, number>()
  for (const entry of entries) counts.set(entry.country, (counts.get(entry.country) ?? 0) + 1)
  const priorCounts = new Map<string, number>()
  for (const country of priorPayoutCountries) priorCounts.set(country, (priorCounts.get(country) ?? 0) + 1)
  const countries = [...counts.keys()].sort()
  return countries.map((country) => {
    const queueCount = counts.get(country) ?? 0
    const priorPayouts = priorCounts.get(country) ?? 0
    const queueShare = entries.length === 0 ? 0 : queueCount / entries.length
    const priorShare = priorTotal === 0 ? 0 : priorPayouts / priorTotal
    const gap = POLICY.regionGapNumerator / POLICY.regionGapDenominator
    const boost = queueCount >= POLICY.regionMinEntries
      && priorTotal >= POLICY.regionMinPriorPayouts
      && queueShare >= priorShare + gap - 1e-12
    return {
      country,
      queueCount,
      queueShare: Math.round(queueShare * 10000) / 10000,
      priorPayouts,
      priorShare: Math.round(priorShare * 10000) / 10000,
      boost,
    }
  })
}

function prepare(entries: DrawEntry[], stats: CountryStat[], asOf: string): Prepared[] {
  const boost = new Set(stats.filter((row) => row.boost).map((row) => row.country))
  return entries.map((entry) => ({
    ...entry,
    ...weightParts({
      membershipYears: entry.membershipYears,
      birthOrder: entry.birthOrder,
      hardship: entry.hardship,
      approvedAt: entry.approvedAt,
      asOf,
      regionBoost: boost.has(entry.country),
    }),
  }))
}

function canonical(entries: Prepared[]): string {
  const rows = entries
    .map((entry) => ({
      amountUsd: entry.amountUsd,
      approvedAt: entry.approvedAt,
      birthOrder: entry.birthOrder,
      churchId: entry.churchId,
      country: entry.country,
      familyCode: entry.familyCode,
      hardship: entry.hardship,
      id: entry.id,
      membershipYears: entry.membershipYears,
      regionBoost: entry.regionApplied,
      thousandths: entry.thousandths,
      waitMonths: entry.waitMonths,
    }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  return JSON.stringify(rows)
}

async function sha256Hex(message: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function hmacSha256(key: string, message: string): Promise<Uint8Array> {
  const encoder = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message))
  return new Uint8Array(signature)
}

/** Uniform integer in [0, limit). Rejection sampling removes modulo bias. */
async function uniformInt(seed: string, label: string, limit: number): Promise<number> {
  if (limit <= 1) return 0
  const range = 2 ** 48
  const maxAcceptable = range - (range % limit)
  let attempt = 0
  while (attempt < 1000) {
    const bytes = await hmacSha256(seed, `${label}:${attempt}`)
    let value = 0
    for (let index = 0; index < 6; index += 1) value = value * 256 + bytes[index]
    if (value < maxAcceptable) return value % limit
    attempt += 1
  }
  throw new Error(`uniformInt failed for ${label}`)
}

async function weightedOrder(entries: Prepared[], seed: string, lane: 'priority' | 'open'): Promise<{ entry: Prepared; random: number; total: number }[]> {
  const pool = entries.map((entry) => ({ entry, weight: entry.thousandths }))
  const order: { entry: Prepared; random: number; total: number }[] = []
  let step = 0
  while (pool.length > 0) {
    const total = pool.reduce((sum, item) => sum + item.weight, 0)
    const random = await uniformInt(seed, `${lane}:pick:${step}`, total)
    let cursor = 0
    let index = 0
    for (let itemIndex = 0; itemIndex < pool.length; itemIndex += 1) {
      cursor += pool[itemIndex].weight
      if (random < cursor) {
        index = itemIndex
        break
      }
    }
    order.push({ entry: pool[index].entry, random, total })
    pool.splice(index, 1)
    step += 1
  }
  return order
}

function viewFrom(entry: Prepared, extras: Partial<RoundEntryView>): RoundEntryView {
  return {
    id: entry.id,
    familyCode: entry.familyCode,
    churchId: entry.churchId,
    country: entry.country,
    birthOrder: entry.birthOrder,
    amountUsd: entry.amountUsd,
    hardship: entry.hardship,
    membershipYears: entry.membershipYears,
    approvedAt: entry.approvedAt,
    thousandths: entry.thousandths,
    weight: entry.weight,
    regionBoost: entry.regionApplied,
    waitMonths: entry.waitMonths,
    lane: null,
    decision: 'pending',
    skipReason: null,
    paymentOrder: null,
    ...extras,
  }
}

export async function runRound(input: RoundInput): Promise<RoundResult> {
  const stats = countryStats(input.entries, input.priorPayoutCountries)
  const prepared = prepare(input.entries, stats, input.drawDate)
  const queueHash = await sha256Hex(canonical(prepared))
  const distributableUsd = input.distributableUsd
  const claimedUsd = prepared.reduce((sum, entry) => sum + entry.amountUsd, 0)
  const fifo = claimedUsd <= distributableUsd

  let seed: string | null = null
  if (input.entropy) {
    seed = await sha256Hex([ALGORITHM, input.id, input.entropy.value, queueHash].join('\n'))
  }

  const views = new Map<string, RoundEntryView>()
  for (const entry of prepared) views.set(entry.id, viewFrom(entry, {}))

  const selectedIds: string[] = []
  const trace: PickTrace[] = []
  let spentUsd = 0
  let drawPoolUsd = 0
  let priorityBudgetUsd = 0
  let continuityUsd = 0
  let mode: RoundResult['mode'] = 'awaiting_entropy'

  if (!fifo) {
    drawPoolUsd = drawPoolOf(distributableUsd)
    continuityUsd = distributableUsd - drawPoolUsd
    priorityBudgetUsd = priorityBudgetOf(drawPoolUsd)
  }

  if (fifo) {
    mode = 'fifo'
    const ordered = [...prepared].sort((a, b) => a.approvedAt.localeCompare(b.approvedAt) || a.id.localeCompare(b.id))
    for (const entry of ordered) {
      spentUsd += entry.amountUsd
      selectedIds.push(entry.id)
      views.set(entry.id, viewFrom(entry, {
        lane: 'fifo',
        decision: 'take',
        paymentOrder: selectedIds.length,
      }))
    }
  } else if (!seed) {
    mode = 'awaiting_entropy'
  } else {
    mode = 'lottery'
    const churchCount = new Map<string, number>()

    const takeOrSkip = (
      lane: 'priority' | 'open',
      entry: Prepared,
      budget: number,
      spent: number,
      random: number,
      total: number,
      step: number,
    ): number => {
      let skipReason: SkipReason | null = null
      if ((churchCount.get(entry.churchId) ?? 0) >= POLICY.maxPerChurch) skipReason = 'church_cap'
      else if (spent + entry.amountUsd > budget) skipReason = 'budget'
      const decision = skipReason ? 'skip' : 'take'
      const nextSpent = decision === 'take' ? spent + entry.amountUsd : spent
      if (decision === 'take') {
        churchCount.set(entry.churchId, (churchCount.get(entry.churchId) ?? 0) + 1)
        selectedIds.push(entry.id)
        views.set(entry.id, viewFrom(entry, {
          lane,
          decision,
          paymentOrder: selectedIds.length,
        }))
      } else {
        const current = views.get(entry.id)
        if (!current || current.decision !== 'take') {
          views.set(entry.id, viewFrom(entry, { lane, decision, skipReason }))
        }
      }
      trace.push({
        lane,
        step,
        totalThousandths: total,
        random,
        chosenId: entry.id,
        decision,
        skipReason,
        spentAfter: nextSpent,
      })
      return nextSpent
    }

    const priorityPool = prepared.filter((entry) => isPriority(entry))
    const priorityOrder = await weightedOrder(priorityPool, seed, 'priority')
    let prioritySpent = 0
    priorityOrder.forEach((pick, index) => {
      prioritySpent = takeOrSkip('priority', pick.entry, priorityBudgetUsd, prioritySpent, pick.random, pick.total, index)
    })

    const openBudget = drawPoolUsd - prioritySpent
    const openPool = prepared.filter((entry) => !selectedIds.includes(entry.id))
    const openOrder = await weightedOrder(openPool, seed, 'open')
    let openSpent = 0
    openOrder.forEach((pick, index) => {
      openSpent = takeOrSkip('open', pick.entry, openBudget, openSpent, pick.random, pick.total, index)
    })
    spentUsd = prioritySpent + openSpent
  }

  const poolCap = mode === 'lottery' ? drawPoolUsd : distributableUsd
  return {
    id: input.id,
    status: 'completed',
    official: true,
    drawDate: input.drawDate,
    poolAsOf: input.drawDate,
    weightAsOf: input.drawDate,
    algorithm: ALGORITHM,
    mode,
    distributableUsd,
    drawPoolUsd,
    priorityBudgetUsd,
    continuityUsd,
    unspentUsd: Math.max(0, poolCap - spentUsd),
    spentUsd,
    entropy: input.entropy,
    queueHash,
    seed,
    countryStats: stats,
    entries: [...views.values()].sort((a, b) => a.id.localeCompare(b.id)),
    selectedIds,
    trace,
    input,
  }
}

export function demoEntropy(roundId: string): Entropy {
  return {
    source: 'demo',
    value: `demo-entropy-open-hearth-${roundId}`,
    note: 'demo',
  }
}
