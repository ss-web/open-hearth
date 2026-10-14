/** Normative constants for hearth-quota-1. Mirrored in docs/03-algoritm-raspredeleniya.md. */
export const ALGORITHM = 'hearth-quota-1'

export const POLICY = {
  reserveRateNumerator: 1,
  reserveRateDenominator: 10,
  minReserveUsd: 5000,
  /** Draw offers 9/10 of the distributable amount. The remaining 1/10 stays for the next round. */
  drawPoolNumerator: 9,
  drawPoolDenominator: 10,
  /** Priority lane is 1/5 of the draw pool (20%). Unused budget rolls into the open lane. */
  priorityNumerator: 1,
  priorityDenominator: 5,
  maxPerChurch: 2,
  regionMinEntries: 2,
  regionMinPriorPayouts: 3,
  /** Boost when queue share is at least 10 percentage points above historical payout share. */
  regionGapNumerator: 1,
  regionGapDenominator: 10,
} as const

export const AS_OF = '2026-10-11'
export const NEXT_DRAW = '2026-11-05'
export const PREVIEW_ROUND_ID = 'LOT-2026-11'
