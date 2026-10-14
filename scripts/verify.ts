import { embeddedLedger } from '../shared/ledger'
import { runRound } from '../shared/lottery'
import { buildSnapshot } from '../shared/snapshot'
import type { RoundResult } from '../shared/types'

function sameIds(left: string[], right: string[]): boolean {
  return left.join(',') === right.join(',')
}

async function matches(round: RoundResult): Promise<string | null> {
  if (round.mode === 'awaiting_entropy') {
    const again = await runRound(round.input)
    if (again.queueHash !== round.queueHash) return `${round.id} queue hash drifted`
    if (again.selectedIds.length !== 0) return `${round.id} preview published winners`
    return null
  }
  const again = await runRound(round.input)
  if (!sameIds(again.selectedIds, round.selectedIds)) {
    return `${round.id} selected ${round.selectedIds.join(' ')} but recomputed ${again.selectedIds.join(' ')}`
  }
  if (again.queueHash !== round.queueHash || again.seed !== round.seed) return `${round.id} commitment drifted`
  if (JSON.stringify(again.trace) !== JSON.stringify(round.trace)) return `${round.id} trace drifted`
  return null
}

const snapshot = await buildSnapshot(embeddedLedger, 'embedded')
const failures = snapshot.integrity.checks.filter((check) => !check.ok).map((check) => `${check.id}: ${check.detail}`)

for (const round of snapshot.rounds) {
  const failure = await matches(round)
  if (failure) failures.push(failure)
  if (round.simulation) {
    const simulationFailure = await matches(round.simulation)
    if (simulationFailure) failures.push(simulationFailure)
  }
}

const september = snapshot.rounds.find((round) => round.id === 'LOT-2026-09')
const preview = snapshot.rounds.find((round) => round.id === 'LOT-2026-11')
if (september?.mode !== 'lottery') failures.push(`September mode is ${september?.mode}`)
if (preview?.mode !== 'awaiting_entropy') failures.push(`Preview mode is ${preview?.mode}`)
if (!preview?.simulation || preview.simulation.official) failures.push('Preview simulation is missing or marked official')

console.log(`As of ${snapshot.asOf}`)
console.log(`Income ${snapshot.treasury.incomeUsd}  expenses ${snapshot.treasury.expensesUsd}  payouts ${snapshot.treasury.payoutsUsd}`)
console.log(`Balance ${snapshot.treasury.balanceUsd}  reserve ${snapshot.treasury.reserveUsd}  distributable ${snapshot.treasury.distributableUsd}`)
for (const round of snapshot.rounds) {
  console.log(`${round.id} ${round.status} ${round.mode} pool ${round.distributableUsd} draw ${round.drawPoolUsd} spent ${round.spentUsd} selected ${round.selectedIds.join(', ') || '—'}`)
  if (round.simulation) {
    console.log(`  simulation ${round.simulation.mode} spent ${round.simulation.spentUsd} selected ${round.simulation.selectedIds.join(', ')}`)
  }
}
console.log('Integrity:')
for (const check of snapshot.integrity.checks) console.log(`  ${check.ok ? 'ok' : 'FAIL'} ${check.id} — ${check.detail}`)

if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}
console.log('verify: ok')
