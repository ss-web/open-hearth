import { demoEntropy, runRound } from './lottery'
import { ALGORITHM, POLICY } from './policy'
import {
  amountForBirthOrder,
  distributableOf,
  inRange,
  isNewbornAtSubmission,
  nextDay,
  reserveOf,
  sumUsd,
} from './money'
import type {
  ApplicationInput,
  DrawEntry,
  ExpenseCategory,
  IntegrityCheck,
  LedgerData,
  Payout,
  PublicApplication,
  PublicStatus,
  Report,
  RoundResult,
  Snapshot,
} from './types'

async function sha256Hex(message: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function balanceBefore(data: LedgerData, date: string, payouts: Payout[]) {
  const incomeUsd = sumUsd(data.donations.filter((row) => row.date < date).map((row) => row.amountUsd))
  const expensesUsd = sumUsd(data.expenses.filter((row) => row.date < date).map((row) => row.amountUsd))
  const payoutsUsd = sumUsd(payouts.filter((row) => row.paidAt < date).map((row) => row.amountUsd))
  const balanceUsd = incomeUsd - expensesUsd - payoutsUsd
  const reserveUsd = reserveOf(balanceUsd)
  return {
    incomeUsd,
    expensesUsd,
    payoutsUsd,
    balanceUsd,
    reserveUsd,
    distributableUsd: distributableOf(balanceUsd),
  }
}

function toDrawEntry(data: LedgerData, application: ApplicationInput): DrawEntry {
  const church = data.churches.find((item) => item.id === application.churchId)
  if (!church) throw new Error(`Missing church ${application.churchId}`)
  if (!application.approvedAt) throw new Error(`Missing approval date for ${application.id}`)
  return {
    id: application.id,
    familyCode: application.familyCode,
    churchId: application.churchId,
    country: church.country,
    birthOrder: application.birthOrder,
    amountUsd: amountForBirthOrder(application.birthOrder),
    hardship: application.hardship,
    membershipYears: application.membershipYears,
    approvedAt: application.approvedAt,
  }
}

function payoutFrom(application: ApplicationInput, country: string, paidAt: string, roundId: string | null, mode: 'fifo' | 'lottery'): Payout {
  return {
    id: `PAY-${application.id.slice(4)}`,
    applicationId: application.id,
    familyCode: application.familyCode,
    churchId: application.churchId,
    country,
    amountUsd: amountForBirthOrder(application.birthOrder),
    paidAt,
    birthOrder: application.birthOrder,
    roundId,
    mode,
  }
}

export async function buildSnapshot(data: LedgerData, source: Snapshot['source']): Promise<Snapshot> {
  const churchById = new Map(data.churches.map((church) => [church.id, church]))
  const pastorById = new Map(data.pastors.map((pastor) => [pastor.id, pastor]))

  const fifoPayouts: Payout[] = data.applications
    .filter((application) => application.lane === 'fifo_paid')
    .map((application) => payoutFrom(application, churchById.get(application.churchId)!.country, application.paidAt!, null, 'fifo'))

  const payouts: Payout[] = [...fifoPayouts]
  const rounds: RoundResult[] = []
  const selectedByRound = new Map<string, Set<string>>()

  for (const round of data.historicalRounds) {
    const participants = data.applications.filter((application) => application.roundId === round.id)
    const books = balanceBefore(data, round.drawDate, payouts)
    const result = await runRound({
      id: round.id,
      drawDate: round.drawDate,
      distributableUsd: books.distributableUsd,
      entries: participants.map((application) => toDrawEntry(data, application)),
      priorPayoutCountries: payouts.map((payout) => payout.country),
      entropy: round.entropy,
    })
    rounds.push({
      ...result,
      status: 'completed',
      official: true,
      poolAsOf: round.drawDate,
      weightAsOf: round.drawDate,
    })
    selectedByRound.set(round.id, new Set(result.selectedIds))
    for (const application of participants) {
      if (!result.selectedIds.includes(application.id)) continue
      payouts.push(payoutFrom(application, churchById.get(application.churchId)!.country, round.paidAt, round.id, 'lottery'))
    }
  }

  const today = balanceBefore(data, nextDay(data.asOf), payouts)
  const waiting = data.applications.filter((application) => {
    if (application.lane === 'live') return true
    if (application.lane !== 'historical' || !application.roundId) return false
    return !selectedByRound.get(application.roundId)?.has(application.id)
  })
  const previewInput = {
    id: data.preview.id,
    drawDate: data.preview.drawDate,
    distributableUsd: today.distributableUsd,
    entries: waiting.map((application) => toDrawEntry(data, application)),
    priorPayoutCountries: payouts.map((payout) => payout.country),
    entropy: null,
  }
  const preview = await runRound(previewInput)
  const simulation = await runRound({ ...previewInput, entropy: demoEntropy(data.preview.id) })
  const simulationRound: RoundResult = {
    ...simulation,
    id: `${data.preview.id}-SIM`,
    status: 'simulation',
    official: false,
    poolAsOf: data.asOf,
    weightAsOf: data.preview.drawDate,
  }
  rounds.push({
    ...preview,
    status: 'preview',
    official: true,
    poolAsOf: data.asOf,
    weightAsOf: data.preview.drawDate,
    simulation: simulationRound,
  })

  const applications: PublicApplication[] = data.applications.map((application) => {
    const selected = application.roundId ? selectedByRound.get(application.roundId)?.has(application.id) : false
    let status: PublicStatus = 'approved'
    let paidAt = application.paidAt
    let deferred = false
    if (application.lane === 'fifo_paid' || selected) status = 'paid'
    else if (application.lane === 'review') status = 'pastor_review'
    else if (application.lane === 'notice') status = 'public_notice'
    else if (application.lane === 'rejected') status = 'rejected'
    else status = 'approved'
    if (selected && application.roundId) {
      paidAt = data.historicalRounds.find((round) => round.id === application.roundId)?.paidAt ?? paidAt
    }
    if (application.lane === 'historical' && !selected) deferred = true
    return {
      id: application.id,
      familyCode: application.familyCode,
      status,
      churchId: application.churchId,
      country: churchById.get(application.churchId)?.country ?? '',
      pastorId: application.pastorId,
      pastorName: pastorById.get(application.pastorId)?.name ?? application.pastorId,
      countersignPastorId: application.countersignPastorId,
      membershipYears: application.membershipYears,
      birthOrder: application.birthOrder,
      childBirthMonth: application.childBirthMonth,
      amountUsd: amountForBirthOrder(application.birthOrder),
      hardship: application.hardship,
      hardshipCategory: application.hardshipCategory,
      submittedAt: application.submittedAt,
      approvedAt: application.approvedAt,
      paidAt: status === 'paid' ? paidAt : null,
      rejectionCode: application.rejectionCode,
      noticeUntil: application.noticeUntil,
      roundId: status === 'paid' ? application.roundId : (deferred ? application.roundId : null),
      deferred,
      marriageYear: application.marriageYear,
      marriageRegistered: application.marriageRegistered,
    }
  }).sort((a, b) => a.id.localeCompare(b.id))

  const expenses = await Promise.all(data.expenses.map(async (expense) => ({
    ...expense,
    receiptHash: await sha256Hex(expense.receiptPreimage),
  })))

  const categories: ExpenseCategory[] = ['legal', 'accounting', 'audit', 'hosting', 'payment_fees', 'salary']
  const expenseTotals = categories.map((category) => ({
    category,
    amountUsd: sumUsd(expenses.filter((expense) => expense.category === category).map((expense) => expense.amountUsd)),
  }))

  const countryTotals = new Map<string, { count: number; amountUsd: number }>()
  for (const payout of payouts) {
    const current = countryTotals.get(payout.country) ?? { count: 0, amountUsd: 0 }
    current.count += 1
    current.amountUsd += payout.amountUsd
    countryTotals.set(payout.country, current)
  }

  const reports = buildReports(data, payouts)
  const pastorFlags = data.pastors.map((pastor) => {
    const endorsements = data.applications.filter((application) => application.pastorId === pastor.id)
    const hardshipEndorsements = endorsements.filter((application) => application.hardship).length
    const rate = endorsements.length === 0 ? 0 : hardshipEndorsements / endorsements.length
    return {
      pastorId: pastor.id,
      pastorName: pastor.name,
      churchId: pastor.churchId,
      endorsements: endorsements.length,
      hardshipEndorsements,
      rate: Math.round(rate * 1000) / 1000,
      flagged: endorsements.length >= 4 && rate > 0.5,
    }
  })

  const treasury = {
    incomeUsd: sumUsd(data.donations.map((row) => row.amountUsd)),
    expensesUsd: sumUsd(data.expenses.map((row) => row.amountUsd)),
    payoutsUsd: sumUsd(payouts.map((row) => row.amountUsd)),
    balanceUsd: 0,
    reserveUsd: 0,
    distributableUsd: 0,
    drawPoolUsd: preview.drawPoolUsd,
    continuityUsd: preview.continuityUsd,
  }
  treasury.balanceUsd = treasury.incomeUsd - treasury.expensesUsd - treasury.payoutsUsd
  treasury.reserveUsd = reserveOf(treasury.balanceUsd)
  treasury.distributableUsd = treasury.balanceUsd - treasury.reserveUsd

  const checks = integrityChecks(data, applications, payouts, rounds, treasury, simulationRound)
  const snapshot: Snapshot = {
    source,
    demo: true,
    asOf: data.asOf,
    algorithm: ALGORITHM,
    payoutScale: [
      { birthOrderLabel: '1', amountUsd: 5000 },
      { birthOrderLabel: '2', amountUsd: 6500 },
      { birthOrderLabel: '3', amountUsd: 7000 },
      { birthOrderLabel: '4+', amountUsd: 7500 },
    ],
    policy: {
      minReserveUsd: POLICY.minReserveUsd,
      reserveRate: '10%',
      continuityRate: '10%',
      priorityRate: '20%',
      maxPerChurch: POLICY.maxPerChurch,
      algorithm: ALGORITHM,
    },
    treasury,
    integrity: { ok: checks.every((check) => check.ok), checks },
    churches: data.churches,
    pastors: data.pastors,
    donations: data.donations,
    expenses,
    payouts: payouts.sort((a, b) => b.paidAt.localeCompare(a.paidAt) || a.id.localeCompare(b.id)),
    applications,
    rounds,
    reports,
    pastorFlags,
    expenseTotals,
    payoutsByCountry: [...countryTotals.entries()]
      .map(([country, totals]) => ({ country, ...totals }))
      .sort((a, b) => b.amountUsd - a.amountUsd),
  }
  return snapshot
}

function buildReports(data: LedgerData, payouts: Payout[]): Report[] {
  const periods = [
    { id: '2026-q1', kind: 'quarter' as const, from: '2026-01-01', to: '2026-03-31' },
    { id: '2026-q2', kind: 'quarter' as const, from: '2026-04-01', to: '2026-06-30' },
    { id: '2026-q3', kind: 'quarter' as const, from: '2026-07-01', to: '2026-09-30' },
    { id: '2026-09', kind: 'month' as const, from: '2026-09-01', to: '2026-09-30' },
    { id: '2026-10', kind: 'month' as const, from: '2026-10-01', to: data.asOf },
  ]
  return periods.map((period) => {
    const income = data.donations.filter((row) => inRange(row.date, period.from, period.to))
    const expense = data.expenses.filter((row) => inRange(row.date, period.from, period.to))
    const paid = payouts.filter((row) => inRange(row.paidAt, period.from, period.to))
    const incomeUsd = sumUsd(income.map((row) => row.amountUsd))
    const expensesUsd = sumUsd(expense.map((row) => row.amountUsd))
    const payoutsUsd = sumUsd(paid.map((row) => row.amountUsd))
    return {
      ...period,
      incomeUsd,
      expensesUsd,
      payoutsUsd,
      netUsd: incomeUsd - expensesUsd - payoutsUsd,
      donationCount: income.length,
      payoutCount: paid.length,
    }
  })
}

function integrityChecks(
  data: LedgerData,
  applications: PublicApplication[],
  payouts: Payout[],
  rounds: RoundResult[],
  treasury: Snapshot['treasury'],
  simulation: RoundResult,
): IntegrityCheck[] {
  const checks: IntegrityCheck[] = []
  const add = (id: string, ok: boolean, detail: string) => checks.push({ id, ok, detail })

  const equation = treasury.incomeUsd - treasury.expensesUsd - treasury.payoutsUsd
  add('balance_equation', equation === treasury.balanceUsd, `${treasury.incomeUsd} - ${treasury.expensesUsd} - ${treasury.payoutsUsd} = ${equation}`)
  add('reserve', treasury.reserveUsd === reserveOf(treasury.balanceUsd) && treasury.distributableUsd === treasury.balanceUsd - treasury.reserveUsd, `reserve ${treasury.reserveUsd}; distributable ${treasury.distributableUsd}`)
  add('positive_balance', treasury.balanceUsd > 0 && treasury.distributableUsd > 0, `balance ${treasury.balanceUsd}`)

  const scaleOk = data.applications.every((application) => amountForBirthOrder(application.birthOrder) > 0)
  add('scale', scaleOk, 'birth order maps to the published scale')

  const eligible = applications.filter((application) => application.status === 'paid' || application.status === 'approved')
  add('membership', eligible.every((application) => application.membershipYears >= 1), 'approved and paid families have at least one year of membership')
  add('marriage', eligible.every((application) => application.marriageRegistered), 'approved and paid families have a registered marriage')
  add('newborn', applications.filter((application) => application.status !== 'rejected').every((application) => isNewbornAtSubmission(application.childBirthMonth, application.submittedAt)), 'non-rejected children are inside the public age window')

  const pastorOk = data.applications.every((application) => {
    const pastor = data.pastors.find((item) => item.id === application.pastorId)
    return pastor?.churchId === application.churchId
  })
  add('pastor_church', pastorOk, 'endorsing pastor belongs to the family church')

  const hardshipOk = data.applications.every((application) => {
    if (!application.hardship) return !application.hardshipCategory && !application.countersignPastorId
    const countersign = data.pastors.find((item) => item.id === application.countersignPastorId)
    return Boolean(application.hardshipCategory && countersign && countersign.churchId !== application.churchId)
  })
  add('hardship', hardshipOk, 'hardship has a category and a pastor from another church')

  const ids = data.applications.map((application) => application.id)
  add('unique_ids', new Set(ids).size === ids.length, `${ids.length} applications`)
  const familyOrders = applications.filter((application) => application.status !== 'rejected').map((application) => `${application.familyCode}:${application.birthOrder}`)
  add('unique_child_slot', new Set(familyOrders).size === familyOrders.length, 'one public slot per family and birth order')

  const completed = rounds.filter((round) => round.status === 'completed')
  const spentOk = completed.every((round) => {
    if (round.mode !== 'lottery') return round.spentUsd <= round.distributableUsd
    const prioritySpent = sumUsd(round.trace.filter((step) => step.lane === 'priority' && step.decision === 'take').map((step) => {
      const entry = round.entries.find((item) => item.id === step.chosenId)
      return entry?.amountUsd ?? 0
    }))
    const churchCounts = new Map<string, number>()
    for (const id of round.selectedIds) {
      const entry = round.entries.find((item) => item.id === id)
      if (!entry) return false
      churchCounts.set(entry.churchId, (churchCounts.get(entry.churchId) ?? 0) + 1)
    }
    return prioritySpent <= round.priorityBudgetUsd
      && round.spentUsd <= round.drawPoolUsd
      && [...churchCounts.values()].every((count) => count <= POLICY.maxPerChurch)
  })
  add('round_caps', spentOk, 'lottery spends stay inside the pool, the priority budget, and the church cap')

  const preview = rounds.find((round) => round.status === 'preview')
  add('preview_unresolved', preview?.mode === 'awaiting_entropy' && preview.selectedIds.length === 0, preview?.mode ?? 'missing')
  add('simulation_labeled', simulation.official === false && simulation.spentUsd <= simulation.drawPoolUsd, `${simulation.id} spent ${simulation.spentUsd} of ${simulation.drawPoolUsd}`)
  add('lottery_when_short', completed.every((round) => {
    const claim = sumUsd(round.entries.map((entry) => entry.amountUsd))
    return claim > round.distributableUsd ? round.mode === 'lottery' : round.mode === 'fifo'
  }), 'a round uses the lottery only when the queue exceeds the distributable amount')

  const paidIds = new Set(payouts.map((payout) => payout.applicationId))
  const paidApps = new Set(applications.filter((application) => application.status === 'paid').map((application) => application.id))
  add('payout_identity', paidIds.size === paidApps.size && [...paidIds].every((id) => paidApps.has(id)), `${paidIds.size} payouts`)

  return checks
}
