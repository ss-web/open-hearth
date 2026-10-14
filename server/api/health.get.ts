export default defineEventHandler(async () => {
  const snapshot = await getSnapshot()
  return { ok: snapshot.integrity.ok, source: snapshot.source, asOf: snapshot.asOf, balanceUsd: snapshot.treasury.balanceUsd }
})
