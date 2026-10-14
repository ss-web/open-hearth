<script setup lang="ts">
usePageSeo('seo.queue.title', 'seo.queue.description')
const { t, locale } = useI18n()
const localePath = useLocalePath()
const { data } = await useLedger()
if (!data.value) throw createError({ statusCode: 500, statusMessage: 'Ledger unavailable' })
const ledger = computed(() => data.value!)
const filter = ref('all')
const filters = ['all', 'approved', 'pastor_review', 'public_notice', 'paid', 'rejected']

const rows = computed(() => ledger.value.applications
  .filter((row) => filter.value === 'all' || row.status === filter.value)
  .slice()
  .sort((a, b) => (a.approvedAt ?? a.submittedAt).localeCompare(b.approvedAt ?? b.submittedAt)))

function church(id: string) {
  const row = ledger.value.churches.find((item) => item.id === id)
  return row ? `${pickLocale(row.city, locale.value)}, ${t(`country.${row.country}`)}` : id
}
</script>

<template>
  <p class="kicker">{{ t('queue.kicker') }}</p>
  <h1>{{ t('queue.title') }}</h1>
  <p class="lead">{{ t('queue.lead') }}</p>

  <section class="section grid-2">
    <article v-for="round in ledger.rounds" :key="round.id" class="panel">
      <p class="kicker">{{ round.official ? t('common.official') : t('common.simulation') }}</p>
      <h2>{{ round.id }}</h2>
      <p>{{ t(`mode.${round.mode}`) }} · {{ formatDate(round.drawDate, locale) }}</p>
      <p>{{ t('queue.pool', { amount: formatUsd(round.distributableUsd, locale), spent: formatUsd(round.spentUsd, locale) }) }}</p>
      <NuxtLink class="button" :to="localePath(`/lottery/${round.id}`)">{{ t('queue.openRound') }}</NuxtLink>
    </article>
  </section>

  <div class="filters" role="tablist">
    <button
      v-for="item in filters"
      :key="item"
      class="filters__button"
      :class="{ 'filters__button--active': filter === item }"
      type="button"
      @click="filter = item"
    >{{ t(`filter.${item}`) }}</button>
  </div>

  <div class="table-wrap">
    <table class="table">
      <thead>
        <tr>
          <th scope="col">{{ t('col.id') }}</th>
          <th scope="col">{{ t('col.family') }}</th>
          <th scope="col">{{ t('col.status') }}</th>
          <th scope="col">{{ t('col.church') }}</th>
          <th scope="col" class="table__num">{{ t('col.order') }}</th>
          <th scope="col" class="table__num">{{ t('col.amount') }}</th>
          <th scope="col">{{ t('col.pastor') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.id">
          <td :data-label="t('col.id')">{{ row.id }}</td>
          <td :data-label="t('col.family')">{{ row.familyCode }}</td>
          <td :data-label="t('col.status')"><StatusBadge :status="row.status" /></td>
          <td :data-label="t('col.church')">{{ church(row.churchId) }}</td>
          <td class="table__num" :data-label="t('col.order')">{{ row.birthOrder }}</td>
          <td class="table__num" :data-label="t('col.amount')">{{ formatUsd(row.amountUsd, locale) }}</td>
          <td :data-label="t('col.pastor')">{{ row.pastorName }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
