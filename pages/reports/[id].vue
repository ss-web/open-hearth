<script setup lang="ts">
const route = useRoute()
const { t, locale } = useI18n()
const localePath = useLocalePath()
const { data } = await useLedger()
usePageSeo('seo.reports.title', 'seo.reports.description')
const report = computed(() => data.value?.reports.find((item) => item.id === String(route.params.id)))
useSeoMeta({ title: () => report.value ? t(`reports.${report.value.id}`) : t('error.title') })
if (!report.value) throw createError({ statusCode: 404, statusMessage: 'Report not found' })
</script>

<template>
  <p class="kicker">{{ t('reports.kicker') }}</p>
  <h1>{{ t(`reports.${report!.id}`) }}</h1>
  <p class="lead">{{ formatDate(report!.from, locale) }} — {{ formatDate(report!.to, locale) }}</p>
  <section class="grid-3">
    <article class="panel"><p class="panel__label">{{ t('home.income') }}</p><p class="panel__balance">{{ formatUsd(report!.incomeUsd, locale) }}</p></article>
    <article class="panel"><p class="panel__label">{{ t('home.expenses') }}</p><p class="panel__balance">{{ formatUsd(report!.expensesUsd, locale) }}</p></article>
    <article class="panel"><p class="panel__label">{{ t('home.paid') }}</p><p class="panel__balance">{{ formatUsd(report!.payoutsUsd, locale) }}</p></article>
  </section>
  <p>{{ t('reports.detail', { donations: report!.donationCount, payouts: report!.payoutCount, net: formatUsd(report!.netUsd, locale) }) }}</p>
  <NuxtLink :to="localePath('/reports')">{{ t('common.back') }}</NuxtLink>
</template>
