import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import postgres from 'postgres'
import { amountForBirthOrder } from '../shared/money'
import { embeddedLedger } from '../shared/ledger'
import { ledgerFromRows } from '../shared/from-rows'
import { buildSnapshot } from '../shared/snapshot'

function loadEnvFile() {
  try {
    const text = readFileSync(new URL('../.env', import.meta.url), 'utf8')
    for (const line of text.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const index = trimmed.indexOf('=')
      if (index === -1) continue
      const key = trimmed.slice(0, index).trim()
      const value = trimmed.slice(index + 1).trim()
      if (!process.env[key]) process.env[key] = value
    }
  } catch {
    // The process environment is enough when the file is absent.
  }
}

function childHash(applicationId: string): string {
  return createHash('sha256').update(`demo-child-record:${applicationId}`).digest('hex')
}

loadEnvFile()

const adminUrl = process.env.DATABASE_ADMIN_URL
const publicUrl = process.env.DATABASE_URL
if (!adminUrl || !publicUrl) {
  console.error('Set DATABASE_ADMIN_URL and DATABASE_URL. See .env.example.')
  process.exit(1)
}

const admin = postgres(adminUrl, { max: 1, onnotice: () => {} })
const schema = readFileSync(new URL('../server/db/schema.sql', import.meta.url), 'utf8')
await admin.unsafe(schema)

const ledger = embeddedLedger
await admin`insert into churches ${admin(ledger.churches.map((church) => ({
  id: church.id,
  name_ru: church.name.ru,
  name_en: church.name.en,
  name_hy: church.name.hy,
  city_ru: church.city.ru,
  city_en: church.city.en,
  city_hy: church.city.hy,
  country: church.country,
  tradition: church.tradition,
  registered_year: church.registeredYear,
})))}`

await admin`insert into pastors ${admin(ledger.pastors.map((pastor) => ({
  id: pastor.id,
  church_id: pastor.churchId,
  name: pastor.name,
  serving_since: pastor.servingSince,
})))}`

await admin`insert into donations ${admin(ledger.donations.map((donation) => ({
  id: donation.id,
  donated_on: donation.date,
  method: donation.method,
  amount_usd: donation.amountUsd,
  donor_label: donation.donorLabel,
  external_ref: donation.externalRef,
  recurring: donation.recurring,
})))}`

await admin`insert into expenses ${admin(ledger.expenses.map((expense) => ({
  id: expense.id,
  spent_on: expense.date,
  category: expense.category,
  amount_usd: expense.amountUsd,
  vendor: expense.vendor,
  receipt_preimage: expense.receiptPreimage,
})))}`

await admin`insert into rounds ${admin(ledger.historicalRounds.map((round) => ({
  id: round.id,
  draw_date: round.drawDate,
  paid_at: round.paidAt,
  entropy_source: round.entropy.source,
  entropy_value: round.entropy.value,
  entropy_note: round.entropy.note,
})))}`

await admin`insert into applications ${admin(ledger.applications.map((application) => ({
  id: application.id,
  family_code: application.familyCode,
  church_id: application.churchId,
  pastor_id: application.pastorId,
  membership_years: application.membershipYears,
  birth_order: application.birthOrder,
  child_birth_month: application.childBirthMonth,
  amount_usd: amountForBirthOrder(application.birthOrder),
  hardship: application.hardship,
  hardship_category: application.hardshipCategory,
  countersign_pastor_id: application.countersignPastorId,
  submitted_at: application.submittedAt,
  approved_at: application.approvedAt,
  marriage_year: application.marriageYear,
  marriage_registered: application.marriageRegistered,
  lane: application.lane,
  paid_at: application.paidAt,
  rejection_code: application.rejectionCode,
  notice_until: application.noticeUntil,
  round_id: application.roundId,
})))}`

const reserved = ledger.applications.filter((application) => ['fifo_paid', 'historical', 'live'].includes(application.lane))
await admin`insert into application_private ${admin(reserved.map((application) => ({
  application_id: application.id,
  child_record_hash: childHash(application.id),
})))}`

await admin`insert into publication (id, as_of, preview_round_id, preview_draw_date) values (${'current'}, ${ledger.asOf}, ${ledger.preview.id}, ${ledger.preview.drawDate})`

const reader = postgres(publicUrl, {
  max: 1,
  types: {
    date: {
      to: 1082,
      from: [1082],
      serialize: (value: string) => value,
      parse: (value: string) => value,
    },
  },
})

let privateReadBlocked = false
try {
  await reader`select child_record_hash from application_private`
} catch {
  privateReadBlocked = true
}
if (!privateReadBlocked) {
  console.error('hearth_public can read application_private. Grants are wrong.')
  process.exit(1)
}

const loaded = ledgerFromRows({
  churches: await reader`select * from churches order by id`,
  pastors: await reader`select * from pastors order by id`,
  donations: await reader`select * from donations order by id`,
  expenses: await reader`select * from expenses order by id`,
  rounds: await reader`select * from rounds order by id`,
  applications: await reader`select * from applications order by id`,
  publication: await reader`select * from publication`,
})

const fromDb = await buildSnapshot(loaded, 'postgres')
const embedded = await buildSnapshot(ledger, 'embedded')
if (fromDb.treasury.balanceUsd !== embedded.treasury.balanceUsd || fromDb.rounds[0]?.selectedIds.join() !== embedded.rounds[0]?.selectedIds.join()) {
  console.error('Database snapshot does not match the embedded ledger.')
  process.exit(1)
}

console.log(`Database ready. Public balance ${fromDb.treasury.balanceUsd}. Private table is hidden from hearth_public.`)
await reader.end()
await admin.end()
