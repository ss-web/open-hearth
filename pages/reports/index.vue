<script setup lang="ts">
usePageSeo('seo.reports.title', 'seo.reports.description')
const { t, locale } = useI18n()
const localePath = useLocalePath()
const { data } = await useLedger()
if (!data.value) throw createError({ statusCode: 500, statusMessage: 'Ledger unavailable' })
</script>

<template>
  <p class="kicker">{{ t('reports.kicker') }}</p>
  <h1>{{ t('reports.title') }}</h1>
  <p class="lead">{{ t('reports.lead') }}</p>
  <div class="table-wrap">
    <table class="table">
      <thead>
        <tr>
          <th>{{ t('col.period') }}</th>
          <th class="table__num">{{ t('home.income') }}</th>
          <th class="table__num">{{ t('home.expenses') }}</th>
          <th class="table__num">{{ t('home.paid') }}</th>
          <th class="table__num">{{ t('reports.net') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="report in data!.reports" :key="report.id">
          <td :data-label="t('col.period')"><NuxtLink :to="localePath(`/reports/${report.id}`)">{{ t(`reports.${report.id}`) }}</NuxtLink></td>
          <td class="table__num" :data-label="t('home.income')">{{ formatUsd(report.incomeUsd, locale) }}</td>
          <td class="table__num" :data-label="t('home.expenses')">{{ formatUsd(report.expensesUsd, locale) }}</td>
          <td class="table__num" :data-label="t('home.paid')">{{ formatUsd(report.payoutsUsd, locale) }}</td>
          <td class="table__num" :data-label="t('reports.net')">{{ formatUsd(report.netUsd, locale) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
