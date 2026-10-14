function csvCell(value: string | number | boolean): string {
  const text = String(value)
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`
  return text
}

export default defineEventHandler(async (event) => {
  const snapshot = await getSnapshot()
  const lines = ['section,id,date,amount_usd,party,method_or_category,reference,recurring_or_round']
  for (const row of snapshot.donations) {
    lines.push(['donation', row.id, row.date, row.amountUsd, row.donorLabel, row.method, row.externalRef, row.recurring].map(csvCell).join(','))
  }
  for (const row of snapshot.expenses) {
    lines.push(['expense', row.id, row.date, row.amountUsd, row.vendor, row.category, row.receiptHash, ''].map(csvCell).join(','))
  }
  for (const row of snapshot.payouts) {
    lines.push(['payout', row.id, row.paidAt, row.amountUsd, row.familyCode, row.mode, row.applicationId, row.roundId ?? ''].map(csvCell).join(','))
  }
  setHeader(event, 'content-type', 'text/csv; charset=utf-8')
  setHeader(event, 'content-disposition', 'attachment; filename="open-hearth-ledger.csv"')
  return `\uFEFF${lines.join('\n')}\n`
})
