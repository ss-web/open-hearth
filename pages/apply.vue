<script setup lang="ts">
import { amountForBirthOrder } from '~/shared/money'
import { weightParts } from '~/shared/lottery'

usePageSeo('seo.apply.title', 'seo.apply.description')
const { t, locale } = useI18n()
const order = ref(1)
const years = ref(3)
const hardship = ref(false)
const steps = ['1', '2', '3', '4', '5', '6']
const parts = computed(() => weightParts({
  membershipYears: years.value,
  birthOrder: order.value,
  hardship: hardship.value,
  approvedAt: null,
  asOf: '2026-11-05',
}))
const amount = computed(() => amountForBirthOrder(order.value))
</script>

<template>
  <p class="kicker">{{ t('apply.kicker') }}</p>
  <h1>{{ t('apply.title') }}</h1>
  <p class="lead">{{ t('apply.lead') }}</p>

  <ol class="steps section">
    <li v-for="step in steps" :key="step" class="step">
      <span class="step__index">0{{ step }}</span>
      <div>
        <h2>{{ t(`apply.s${step}Title`) }}</h2>
        <p>{{ t(`apply.s${step}Text`) }}</p>
      </div>
    </li>
  </ol>

  <section class="section split">
    <form class="form panel" @submit.prevent>
      <h2>{{ t('apply.calcTitle') }}</h2>
      <label>
        {{ t('col.order') }}
        <select v-model.number="order">
          <option v-for="value in 8" :key="value" :value="value">{{ value }}</option>
        </select>
      </label>
      <label>
        {{ t('col.years') }}
        <input v-model.number="years" type="number" min="0" max="40">
      </label>
      <label class="check">
        <input v-model="hardship" type="checkbox">
        {{ t('apply.hardship') }}
      </label>
      <p v-if="years < 1" class="note note--warn">{{ t('apply.notEligible') }}</p>
    </form>
    <article class="panel">
      <p class="panel__label">{{ t('apply.previewTitle') }}</p>
      <p class="panel__balance">{{ formatUsd(amount, locale) }}</p>
      <dl class="stats">
        <div><dt>{{ t('apply.weight') }}</dt><dd>{{ parts.weight.toFixed(3) }}</dd></div>
        <div><dt>{{ t('apply.partMembership') }}</dt><dd>{{ parts.membership }}</dd></div>
        <div><dt>{{ t('apply.partFamily') }}</dt><dd>{{ parts.family }}</dd></div>
        <div><dt>{{ t('apply.partHardship') }}</dt><dd>{{ parts.hardship }}</dd></div>
      </dl>
      <p class="meta">{{ t('apply.weightNote') }}</p>
      <p class="meta">{{ t('apply.publicCard', { order, years, hardship: hardship ? t('common.yes') : t('common.no') }) }}</p>
      <button class="button" type="button" disabled>{{ t('apply.closed') }}</button>
    </article>
  </section>
</template>
