<script setup lang="ts">
usePageSeo('seo.home.title', 'seo.home.description')
const { t, locale } = useI18n()
const localePath = useLocalePath()
const { data } = await useLedger()
if (!data.value) throw createError({ statusCode: 500, statusMessage: 'Ledger unavailable' })
const ledger = computed(() => data.value!)
const config = useRuntimeConfig()

const steps = ['1', '2', '3', '4']
const promises = ['1', '2', '3', '4']

const latest = computed(() => ledger.value.payouts.slice(0, 5).map((row) => ({
  date: formatDate(row.paidAt, locale.value),
  family: row.familyCode,
  order: String(row.birthOrder),
  amount: formatUsd(row.amountUsd, locale.value),
  mode: t(`mode.${row.mode}`),
})))

useHead({
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'NGO',
      name: 'Open Hearth',
      description: t('seo.home.description'),
      url: config.public.siteUrl,
    }),
  }],
})
</script>

<template>
  <section class="hero">
    <div>
      <p class="kicker">{{ t('home.kicker') }}</p>
      <h1>{{ t('brand.name') }}</h1>
      <p class="lead">{{ t('home.lead') }}</p>
      <div class="links">
        <NuxtLink class="button" :to="localePath('/apply')">{{ t('home.apply') }}</NuxtLink>
        <NuxtLink class="button button--ghost" :to="localePath('/finances')">{{ t('home.books') }}</NuxtLink>
      </div>
    </div>
    <article class="panel panel--ledger">
      <p class="panel__label">{{ t('home.balanceAsOf', { date: formatDate(ledger.asOf, locale) }) }}</p>
      <p class="panel__balance">{{ formatUsd(ledger.treasury.balanceUsd, locale) }}</p>
      <dl class="stats">
        <div><dt>{{ t('home.distributable') }}</dt><dd>{{ formatUsd(ledger.treasury.distributableUsd, locale) }}</dd></div>
        <div><dt>{{ t('home.reserve') }}</dt><dd>{{ formatUsd(ledger.treasury.reserveUsd, locale) }}</dd></div>
        <div><dt>{{ t('home.income') }}</dt><dd>{{ formatUsd(ledger.treasury.incomeUsd, locale) }}</dd></div>
        <div><dt>{{ t('home.paid') }}</dt><dd>{{ formatUsd(ledger.treasury.payoutsUsd, locale) }}</dd></div>
      </dl>
    </article>
  </section>

  <section class="section">
    <h2>{{ t('home.scaleTitle') }}</h2>
    <p>{{ t('home.scaleLead') }}</p>
    <div class="scale">
      <article v-for="row in ledger.payoutScale" :key="row.birthOrderLabel" class="scale__item">
        <p class="scale__order">{{ t('home.child', { order: row.birthOrderLabel }) }}</p>
        <p class="scale__amount">{{ formatUsd(row.amountUsd, locale) }}</p>
      </article>
    </div>
  </section>

  <section class="section">
    <div class="section__head">
      <h2>{{ t('home.latestTitle') }}</h2>
      <NuxtLink :to="localePath('/queue')">{{ t('home.allPayouts') }}</NuxtLink>
    </div>
    <PublicTable
      :columns="[
        { key: 'date', label: t('col.date') },
        { key: 'family', label: t('col.family') },
        { key: 'order', label: t('col.order'), numeric: true },
        { key: 'amount', label: t('col.amount'), numeric: true },
        { key: 'mode', label: t('col.mode') },
      ]"
      :rows="latest"
    />
  </section>

  <section class="section">
    <h2>{{ t('home.stepsTitle') }}</h2>
    <div class="steps">
      <article v-for="step in steps" :key="step" class="step">
        <span class="step__index">0{{ step }}</span>
        <div>
          <h3>{{ t(`home.step${step}Title`) }}</h3>
          <p>{{ t(`home.step${step}Text`) }}</p>
        </div>
      </article>
    </div>
  </section>

  <section class="section">
    <h2>{{ t('home.promiseTitle') }}</h2>
    <div class="grid-2">
      <article v-for="item in promises" :key="item" class="promise">
        <h3>{{ t(`home.promise${item}Title`) }}</h3>
        <p>{{ t(`home.promise${item}Text`) }}</p>
      </article>
    </div>
  </section>
</template>
