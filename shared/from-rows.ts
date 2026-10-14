import type {
  ApplicationInput,
  ApplicationLane,
  Donation,
  DonationMethod,
  Expense,
  ExpenseCategory,
  HardshipCategory,
  HistoricalRoundInput,
  LedgerData,
  RejectionCode,
  Tradition,
} from './types'

type Row = Record<string, unknown>

function text(value: unknown): string {
  return String(value ?? '').trim()
}

function day(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return text(value).slice(0, 10)
}

function nullable(value: unknown): string | null {
  if (value == null || value === '') return null
  return value instanceof Date ? day(value) : text(value)
}

export function ledgerFromRows(input: {
  churches: Row[]
  pastors: Row[]
  donations: Row[]
  expenses: Row[]
  rounds: Row[]
  applications: Row[]
  publication: Row[]
}): LedgerData {
  const publication = input.publication[0]
  if (!publication) throw new Error('publication row is missing')

  const historicalRounds: HistoricalRoundInput[] = input.rounds.map((row) => ({
    id: text(row.id),
    drawDate: day(row.draw_date),
    paidAt: day(row.paid_at),
    entropy: {
      source: text(row.entropy_source),
      value: text(row.entropy_value),
      note: text(row.entropy_note),
    },
  }))

  return {
    asOf: day(publication.as_of),
    preview: {
      id: text(publication.preview_round_id),
      drawDate: day(publication.preview_draw_date),
    },
    churches: input.churches.map((row) => ({
      id: text(row.id),
      name: { ru: text(row.name_ru), en: text(row.name_en), hy: text(row.name_hy) },
      city: { ru: text(row.city_ru), en: text(row.city_en), hy: text(row.city_hy) },
      country: text(row.country),
      tradition: text(row.tradition) as Tradition,
      registeredYear: Number(row.registered_year),
    })),
    pastors: input.pastors.map((row) => ({
      id: text(row.id),
      churchId: text(row.church_id),
      name: text(row.name),
      servingSince: Number(row.serving_since),
    })),
    donations: input.donations.map((row) => ({
      id: text(row.id),
      date: day(row.donated_on),
      method: text(row.method) as DonationMethod,
      amountUsd: Number(row.amount_usd),
      donorLabel: text(row.donor_label),
      externalRef: text(row.external_ref),
      recurring: Boolean(row.recurring),
    })) satisfies Donation[],
    expenses: input.expenses.map((row) => ({
      id: text(row.id),
      date: day(row.spent_on),
      category: text(row.category) as ExpenseCategory,
      amountUsd: Number(row.amount_usd),
      vendor: text(row.vendor),
      receiptPreimage: text(row.receipt_preimage),
    })) satisfies Expense[],
    historicalRounds,
    applications: input.applications.map((row) => ({
      id: text(row.id),
      familyCode: text(row.family_code),
      churchId: text(row.church_id),
      pastorId: text(row.pastor_id),
      membershipYears: Number(row.membership_years),
      birthOrder: Number(row.birth_order),
      childBirthMonth: text(row.child_birth_month),
      hardship: Boolean(row.hardship),
      hardshipCategory: nullable(row.hardship_category) as HardshipCategory | null,
      countersignPastorId: nullable(row.countersign_pastor_id),
      submittedAt: day(row.submitted_at),
      approvedAt: nullable(row.approved_at) ? day(row.approved_at) : null,
      marriageYear: Number(row.marriage_year),
      marriageRegistered: Boolean(row.marriage_registered),
      lane: text(row.lane) as ApplicationLane,
      paidAt: nullable(row.paid_at) ? day(row.paid_at) : null,
      rejectionCode: nullable(row.rejection_code) as RejectionCode | null,
      noticeUntil: nullable(row.notice_until) ? day(row.notice_until) : null,
      roundId: nullable(row.round_id),
    })) satisfies ApplicationInput[],
  }
}
