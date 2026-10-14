import postgres from 'postgres'
import { ledgerFromRows } from '../../shared/from-rows'
import type { LedgerData } from '../../shared/types'

const dateType = {
  date: {
    to: 1082,
    from: [1082],
    serialize: (value: string) => value,
    parse: (value: string) => value,
  },
}

let pool: ReturnType<typeof postgres> | null = null
let disabledUntil = 0

export async function loadLedgerFromDatabase(url: string): Promise<LedgerData | null> {
  if (!url || Date.now() < disabledUntil) return null
  try {
    if (!pool) pool = postgres(url, { max: 2, connect_timeout: 3, idle_timeout: 20, types: dateType })
    const [churches, pastors, donations, expenses, rounds, applications, publication] = await Promise.all([
      pool`select * from churches order by id`,
      pool`select * from pastors order by id`,
      pool`select * from donations order by donated_on, id`,
      pool`select * from expenses order by spent_on, id`,
      pool`select * from rounds order by draw_date, id`,
      pool`select * from applications order by id`,
      pool`select * from publication`,
    ])
    return ledgerFromRows({ churches, pastors, donations, expenses, rounds, applications, publication })
  } catch (error) {
    disabledUntil = Date.now() + 15000
    if (pool) {
      const dying = pool
      pool = null
      void dying.end({ timeout: 1 })
    }
    console.error(`PostgreSQL ledger unavailable, using the embedded demo: ${error instanceof Error ? error.message : 'unknown error'}`)
    return null
  }
}
