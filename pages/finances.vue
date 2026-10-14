<script setup lang="ts">
usePageSeo('seo.finances.title', 'seo.finances.description')
const { t, locale } = useI18n()
const localePath = useLocalePath()
const { data } = await useLedger()
if (!data.value) throw createError({ statusCode: 500, statusMessage: 'Ledger unavailable' })
const ledger = computed(() => data.value!)
const maxExpense = computed(() => Math.max(...ledger.value.expenseTotals.map((row) => row.amountUsd), 1))

const donations = computed(() => ledger.value.donations.map((row) => ({
  date: formatDate(row.date, locale.value),
  donor: row.donorLabel,
  method: t(`method.${row.method}`),
  amount: formatUsd(row.amountUsd, locale.value),
  ref: row.externalRef,
})))
const expenses = computed(() => ledger.value.expenses.map((row) => ({
  date: formatDate(row.date, locale.value),
  category: t(`category.${row.category}`),
  vendor: row.vendor,
  amount: formatUsd(row.amountUsd, locale.value),
  hash: row.receiptHash.slice(0, 12),
})))
const payouts = computed(() => ledger.value.payouts.map((row) => ({
  date: formatDate(row.paidAt, locale.value),
  family: row.familyCode,
  country: t(`country.${row.country}`),
  amount: formatUsd(row.amountUsd, locale.value),
  mode: t(`mode.${row.mode}`),
})))
</script>

<template>
  <p class="kicker">{{ t('finances.kicker') }}</p>
  <h1>{{ t('finances.title') }}</h1>
  <p class="lead">{{ t('finances.lead') }}</p>

  <section class="section grid-3">
    <article class="panel">
      <p class="panel__label">{{ t('home.income') }}</p>
      <p class="panel__balance">{{ formatUsd(ledger.treasury.incomeUsd, locale) }}</p>
    </article>
    <article class="panel">
      <p class="panel__label">{{ t('home.expenses') }}</p>
      <p class="panel__balance">{{ formatUsd(ledger.treasury.expensesUsd, locale) }}</p>
    </article>
    <article class="panel">
      <p class="panel__label">{{ t('home.balance') }}</p>
      <p class="panel__balance">{{ formatUsd(ledger.treasury.balanceUsd, locale) }}</p>
    </article>
  </section>

  <p class="formula">{{ t('finances.equation', ledger.treasury) }}</p>

  <section class="section">
    <h2>{{ t('finances.checksTitle') }}</h2>
    <ul class="checks">
      <li v-for="check in ledger.integrity.checks" :key="check.id" class="checks__item" :class="{ 'checks__item--bad': !check.ok }">
        <span>{{ t(`check.${check.id}`) }}</span>
        <code>{{ check.detail }}</code>
      </li>
    </ul>
  </section>

  <section class="section">
    <h2>{{ t('finances.expenseTitle') }}</h2>
    <div class="bars">
      <div v-for="row in ledger.expenseTotals" :key="row.category" class="bars__row">
        <span>{{ t(`category.${row.category}`) }}</span>
        <span class="bars__track"><span class="bars__fill" :style="{ width: `${(row.amountUsd / maxExpense) * 100}%` }" /></span>
        <span class="bars__value">{{ formatUsd(row.amountUsd, locale) }}</span>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="section__head">
      <h2>{{ t('finances.donationsTitle') }}</h2>
      <a href="/ledger.csv">{{ t('finances.csv') }}</a>
    </div>
    <PublicTable :columns="[
      { key: 'date', label: t('col.date') },
      { key: 'donor', label: t('col.donor') },
      { key: 'method', label: t('col.method') },
      { key: 'amount', label: t('col.amount'), numeric: true },
      { key: 'ref', label: t('col.ref') },
    ]" :rows="donations" />
  </section>

  <section class="section">
    <h2>{{ t('finances.expensesTitle') }}</h2>
    <PublicTable :columns="[
      { key: 'date', label: t('col.date') },
      { key: 'category', label: t('col.category') },
      { key: 'vendor', label: t('col.vendor') },
      { key: 'amount', label: t('col.amount'), numeric: true },
      { key: 'hash', label: t('col.hash') },
    ]" :rows="expenses" />
    <p class="meta">{{ t('finances.hashNote') }}</p>
  </section>

  <section class="section">
    <h2>{{ t('finances.payoutsTitle') }}</h2>
    <PublicTable :columns="[
      { key: 'date', label: t('col.date') },
      { key: 'family', label: t('col.family') },
      { key: 'country', label: t('col.country') },
      { key: 'amount', label: t('col.amount'), numeric: true },
      { key: 'mode', label: t('col.mode') },
    ]" :rows="payouts" />
  </section>

  <section class="section note note--warn">
    <h2>{{ t('finances.giveTitle') }}</h2>
    <p>{{ t('finances.giveLead') }}</p>
    <p>{{ t('finances.rails') }}</p>
    <p><code>BTC bc1q-demo-do-not-send</code><br><code>ETH 0xDEMO-do-not-send</code><br><code>USDT TDEMO-do-not-send</code></p>
    <NuxtLink :to="localePath('/reports')">{{ t('finances.reports') }}</NuxtLink>
  </section>
</template>
