import { embeddedLedger } from '../../shared/ledger'
import { buildSnapshot } from '../../shared/snapshot'
import type { Snapshot } from '../../shared/types'
import { loadLedgerFromDatabase } from './load-ledger'

export async function getSnapshot(): Promise<Snapshot> {
  const config = useRuntimeConfig()
  const loaded = await loadLedgerFromDatabase(config.databaseUrl)
  if (loaded) return buildSnapshot(loaded, 'postgres')
  return buildSnapshot(embeddedLedger, 'embedded')
}
