<script setup lang="ts">
import { runRound } from '~/shared/lottery'
import type { RoundResult } from '~/shared/types'

const route = useRoute()
const { t, locale } = useI18n()
const { data } = await useLedger()
const round = computed(() => data.value?.rounds.find((item) => item.id === String(route.params.id)))
useSeoMeta({
  title: () => round.value?.id ?? t('error.title'),
  description: () => t('seo.queue.description'),
  robots: () => round.value?.official === false ? 'noindex' : 'index,follow',
})
if (!round.value) throw createError({ statusCode: 404, statusMessage: 'Round not found' })

const verdict = ref<'match' | 'mismatch' | null>(null)
const checking = ref(false)

async function verify(target: RoundResult) {
  checking.value = true
  verdict.value = null
  const again = await runRound(target.input)
  const same = again.selectedIds.join(',') === target.selectedIds.join(',') && again.queueHash === target.queueHash && again.seed === target.seed
  verdict.value = same ? 'match' : 'mismatch'
  checking.value = false
}

function entryName(id: string, target: RoundResult) {
  return target.entries.find((entry) => entry.id === id)
}
</script>

<template>
  <p class="kicker">{{ round!.official ? t('common.official') : t('common.simulation') }}</p>
  <h1>{{ round!.id }}</h1>
  <p class="lead">{{ t(`mode.${round!.mode}`) }} · {{ t('lottery.algo', { algo: round!.algorithm }) }}</p>
  <section class="grid-3">
    <article class="panel"><p class="panel__label">{{ t('lottery.distributable') }}</p><p class="panel__balance">{{ formatUsd(round!.distributableUsd, locale) }}</p></article>
    <article class="panel"><p class="panel__label">{{ t('lottery.drawPool') }}</p><p class="panel__balance">{{ formatUsd(round!.drawPoolUsd, locale) }}</p></article>
    <article class="panel"><p class="panel__label">{{ t('lottery.spent') }}</p><p class="panel__balance">{{ formatUsd(round!.spentUsd, locale) }}</p></article>
  </section>
  <section class="section">
    <h2>{{ t('lottery.commitTitle') }}</h2>
    <p class="meta">{{ t('lottery.hash') }}</p>
    <p class="formula">{{ round!.queueHash }}</p>
    <p class="meta">{{ t('lottery.seed') }}</p>
    <p class="formula">{{ round!.seed ?? t('lottery.noSeed') }}</p>
    <p v-if="round!.entropy">{{ t('lottery.entropy', { source: round!.entropy.source, value: round!.entropy.value, note: round!.entropy.source === 'demo' ? t('lottery.demoNote') : round!.entropy.note }) }}</p>
    <button class="button" type="button" :disabled="checking || round!.mode === 'awaiting_entropy'" @click="verify(round!)">
      {{ checking ? t('common.loading') : t('common.verify') }}
    </button>
    <p v-if="verdict" class="note" :class="{ 'note--warn': verdict === 'mismatch' }">{{ t(`verify.${verdict}`) }}</p>
  </section>

  <section class="section">
    <h2>{{ t('lottery.countries') }}</h2>
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>{{ t('col.country') }}</th>
            <th class="table__num">{{ t('lottery.queueShare') }}</th>
            <th class="table__num">{{ t('lottery.priorShare') }}</th>
            <th>{{ t('lottery.boost') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in round!.countryStats" :key="row.country">
            <td :data-label="t('col.country')">{{ t(`country.${row.country}`) }}</td>
            <td class="table__num" :data-label="t('lottery.queueShare')">{{ formatShare(row.queueShare, locale) }}</td>
            <td class="table__num" :data-label="t('lottery.priorShare')">{{ formatShare(row.priorShare, locale) }}</td>
            <td :data-label="t('lottery.boost')">{{ row.boost ? t('common.yes') : t('common.no') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <section class="section">
    <h2>{{ t('lottery.entries') }}</h2>
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>{{ t('col.id') }}</th>
            <th class="table__num">{{ t('lottery.weight') }}</th>
            <th>{{ t('lottery.lane') }}</th>
            <th>{{ t('lottery.decision') }}</th>
            <th class="table__num">{{ t('col.amount') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in round!.entries" :key="entry.id">
            <td :data-label="t('col.id')">{{ entry.id }}</td>
            <td class="table__num" :data-label="t('lottery.weight')">{{ entry.weight.toFixed(3) }}</td>
            <td :data-label="t('lottery.lane')">{{ entry.lane ? t(`lane.${entry.lane}`) : '—' }}</td>
            <td :data-label="t('lottery.decision')">{{ t(`decision.${entry.decision}`) }}<template v-if="entry.skipReason"> · {{ t(`skip.${entry.skipReason}`) }}</template></td>
            <td class="table__num" :data-label="t('col.amount')">{{ formatUsd(entry.amountUsd, locale) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <section v-if="round!.trace.length" class="section">
    <h2>{{ t('lottery.trace') }}</h2>
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>{{ t('lottery.lane') }}</th>
            <th>{{ t('col.id') }}</th>
            <th class="table__num">{{ t('lottery.random') }}</th>
            <th class="table__num">{{ t('lottery.total') }}</th>
            <th>{{ t('lottery.decision') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(step, index) in round!.trace" :key="`${step.lane}-${index}`">
            <td :data-label="t('lottery.lane')">{{ t(`lane.${step.lane}`) }}</td>
            <td :data-label="t('col.id')">{{ step.chosenId }}</td>
            <td class="table__num" :data-label="t('lottery.random')">{{ step.random }}</td>
            <td class="table__num" :data-label="t('lottery.total')">{{ step.totalThousandths }}</td>
            <td :data-label="t('lottery.decision')">{{ t(`decision.${step.decision}`) }}<template v-if="step.skipReason"> · {{ t(`skip.${step.skipReason}`) }}</template></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <section v-if="round!.simulation" class="section note">
    <h2>{{ t('lottery.simTitle') }}</h2>
    <p>{{ t('lottery.simLead') }}</p>
    <p>{{ round!.simulation.selectedIds.map((id) => `${id} ${formatUsd(entryName(id, round!.simulation!)?.amountUsd ?? 0, locale)}`).join(' · ') }}</p>
    <button class="button button--ghost" type="button" :disabled="checking" @click="verify(round!.simulation!)">{{ t('lottery.verifySim') }}</button>
  </section>
</template>
