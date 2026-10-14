export type LocaleCode = 'ru' | 'en' | 'hy'

export type Localized = Record<LocaleCode, string>

export type Tradition = 'evangelical' | 'baptist' | 'apostolic' | 'pentecostal'

export type DonationMethod = 'bank' | 'card' | 'btc' | 'eth' | 'usdt'

export type ExpenseCategory = 'legal' | 'accounting' | 'audit' | 'hosting' | 'payment_fees' | 'salary'

export type HardshipCategory = 'medical' | 'housing' | 'income'

export type RejectionCode =
  | 'duplicate_child'
  | 'membership_short'
  | 'child_too_old'
  | 'marriage_unregistered'
  | 'endorsement_withdrawn'

export type ApplicationLane = 'fifo_paid' | 'historical' | 'live' | 'review' | 'notice' | 'rejected'

export type PublicStatus = 'paid' | 'approved' | 'pastor_review' | 'public_notice' | 'rejected'

export type Church = {
  id: string
  name: Localized
  city: Localized
  country: string
  tradition: Tradition
  registeredYear: number
}

export type Pastor = {
  id: string
  churchId: string
  name: string
  servingSince: number
}

export type Donation = {
  id: string
  date: string
  method: DonationMethod
  amountUsd: number
  donorLabel: string
  externalRef: string
  recurring: boolean
}

export type Expense = {
  id: string
  date: string
  category: ExpenseCategory
  amountUsd: number
  vendor: string
  receiptPreimage: string
}

export type ApplicationInput = {
  id: string
  familyCode: string
  churchId: string
  pastorId: string
  membershipYears: number
  birthOrder: number
  childBirthMonth: string
  hardship: boolean
  hardshipCategory: HardshipCategory | null
  countersignPastorId: string | null
  submittedAt: string
  approvedAt: string | null
  marriageYear: number
  marriageRegistered: boolean
  lane: ApplicationLane
  paidAt: string | null
  rejectionCode: RejectionCode | null
  noticeUntil: string | null
  roundId: string | null
}

export type HistoricalRoundInput = {
  id: string
  drawDate: string
  paidAt: string
  entropy: Entropy
}

export type Entropy = {
  source: string
  value: string
  note: string
}

export type LedgerData = {
  asOf: string
  churches: Church[]
  pastors: Pastor[]
  donations: Donation[]
  expenses: Expense[]
  applications: ApplicationInput[]
  historicalRounds: HistoricalRoundInput[]
  preview: {
    id: string
    drawDate: string
  }
}

export type DrawEntry = {
  id: string
  familyCode: string
  churchId: string
  country: string
  birthOrder: number
  amountUsd: number
  hardship: boolean
  membershipYears: number
  approvedAt: string
}

export type RoundInput = {
  id: string
  drawDate: string
  distributableUsd: number
  entries: DrawEntry[]
  priorPayoutCountries: string[]
  entropy: Entropy | null
}

export type SkipReason = 'budget' | 'church_cap'

export type PickTrace = {
  lane: 'priority' | 'open'
  step: number
  totalThousandths: number
  random: number
  chosenId: string
  decision: 'take' | 'skip'
  skipReason: SkipReason | null
  spentAfter: number
}

export type CountryStat = {
  country: string
  queueCount: number
  queueShare: number
  priorPayouts: number
  priorShare: number
  boost: boolean
}

export type RoundEntryView = DrawEntry & {
  thousandths: number
  weight: number
  regionBoost: boolean
  waitMonths: number
  lane: 'priority' | 'open' | 'fifo' | null
  decision: 'take' | 'skip' | 'pending'
  skipReason: SkipReason | null
  paymentOrder: number | null
}

export type RoundResult = {
  id: string
  status: 'completed' | 'preview' | 'simulation'
  official: boolean
  drawDate: string
  poolAsOf: string
  weightAsOf: string
  algorithm: string
  mode: 'fifo' | 'lottery' | 'awaiting_entropy'
  distributableUsd: number
  drawPoolUsd: number
  priorityBudgetUsd: number
  continuityUsd: number
  unspentUsd: number
  spentUsd: number
  entropy: Entropy | null
  queueHash: string
  seed: string | null
  countryStats: CountryStat[]
  entries: RoundEntryView[]
  selectedIds: string[]
  trace: PickTrace[]
  input: RoundInput
  /** Present on a preview round: the same queue drawn with labeled demo entropy. */
  simulation?: RoundResult
}

export type Payout = {
  id: string
  applicationId: string
  familyCode: string
  churchId: string
  country: string
  amountUsd: number
  paidAt: string
  birthOrder: number
  roundId: string | null
  mode: 'fifo' | 'lottery'
}

export type PublicApplication = {
  id: string
  familyCode: string
  status: PublicStatus
  churchId: string
  country: string
  pastorId: string
  pastorName: string
  countersignPastorId: string | null
  membershipYears: number
  birthOrder: number
  childBirthMonth: string
  amountUsd: number
  hardship: boolean
  hardshipCategory: HardshipCategory | null
  submittedAt: string
  approvedAt: string | null
  paidAt: string | null
  rejectionCode: RejectionCode | null
  noticeUntil: string | null
  roundId: string | null
  deferred: boolean
  marriageYear: number
  marriageRegistered: boolean
}

export type IntegrityCheck = {
  id: string
  ok: boolean
  detail: string
}

export type Report = {
  id: string
  kind: 'quarter' | 'month'
  from: string
  to: string
  incomeUsd: number
  expensesUsd: number
  payoutsUsd: number
  netUsd: number
  donationCount: number
  payoutCount: number
}

export type PastorFlag = {
  pastorId: string
  pastorName: string
  churchId: string
  endorsements: number
  hardshipEndorsements: number
  rate: number
  flagged: boolean
}

export type Snapshot = {
  source: 'embedded' | 'postgres'
  demo: true
  asOf: string
  algorithm: string
  payoutScale: { birthOrderLabel: string; amountUsd: number }[]
  policy: {
    minReserveUsd: number
    reserveRate: string
    continuityRate: string
    priorityRate: string
    maxPerChurch: number
    algorithm: string
  }
  treasury: {
    incomeUsd: number
    expensesUsd: number
    payoutsUsd: number
    balanceUsd: number
    reserveUsd: number
    distributableUsd: number
    drawPoolUsd: number
    continuityUsd: number
  }
  integrity: { ok: boolean; checks: IntegrityCheck[] }
  churches: Church[]
  pastors: Pastor[]
  donations: Donation[]
  expenses: (Expense & { receiptHash: string })[]
  payouts: Payout[]
  applications: PublicApplication[]
  rounds: RoundResult[]
  reports: Report[]
  pastorFlags: PastorFlag[]
  expenseTotals: { category: ExpenseCategory; amountUsd: number }[]
  payoutsByCountry: { country: string; count: number; amountUsd: number }[]
}
