/** Integer money helpers. Every published amount is a whole US dollar. */

export function amountForBirthOrder(order: number): number {
  if (order <= 1) return 5000
  if (order === 2) return 6500
  if (order === 3) return 7000
  return 7500
}

export function sumUsd(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

/** Operating reserve: at least $5,000, otherwise 10% of the balance, never more than the balance. */
export function reserveOf(balanceUsd: number): number {
  if (balanceUsd <= 0) return 0
  const tenPercent = Math.floor(balanceUsd / 10)
  return Math.min(balanceUsd, Math.max(5000, tenPercent))
}

export function distributableOf(balanceUsd: number): number {
  return balanceUsd - reserveOf(balanceUsd)
}

/** Lottery offer is 9/10 of the distributable amount. The rest stays for the next round. */
export function drawPoolOf(distributableUsd: number): number {
  if (distributableUsd <= 0) return 0
  return Math.floor((distributableUsd * 9) / 10)
}

export function priorityBudgetOf(drawPoolUsd: number): number {
  if (drawPoolUsd <= 0) return 0
  return Math.floor(drawPoolUsd / 5)
}

export function nextDay(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + 1))
  return date.toISOString().slice(0, 10)
}

/** Whole calendar months from `fromIso` to `toIso`. */
export function fullMonths(fromIso: string, toIso: string): number {
  const [fromYear, fromMonth, fromDay] = fromIso.slice(0, 10).split('-').map(Number)
  const [toYear, toMonth, toDay] = toIso.slice(0, 10).split('-').map(Number)
  let months = (toYear - fromYear) * 12 + (toMonth - fromMonth)
  if (toDay < fromDay) months -= 1
  return Math.max(0, months)
}

/**
 * Public age check uses the birth month only.
 * A child born in month M is still within the public window through the day
 * before month M of the next year. The certificate day is checked by the pastor.
 */
export function isNewbornAtSubmission(birthMonth: string, submittedAt: string): boolean {
  const [year, month] = birthMonth.split('-').map(Number)
  const limit = new Date(Date.UTC(year + 1, month - 1, 1))
  const submitted = new Date(`${submittedAt.slice(0, 10)}T00:00:00Z`)
  return submitted.getTime() < limit.getTime()
}

export function inRange(date: string, from: string, to: string): boolean {
  return date >= from && date <= to
}
