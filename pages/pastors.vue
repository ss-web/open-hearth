<script setup lang="ts">
usePageSeo('seo.pastors.title', 'seo.pastors.description')
const { t, locale } = useI18n()
const { data } = await useLedger()
if (!data.value) throw createError({ statusCode: 500, statusMessage: 'Ledger unavailable' })
const ledger = computed(() => data.value!)
const pastorId = ref(ledger.value.pastors[0]?.id ?? '')
const family = ref('FAM-0000')
const order = ref(1)
const years = ref(2)
const hardship = ref(false)
const pastor = computed(() => ledger.value.pastors.find((item) => item.id === pastorId.value))
const church = computed(() => ledger.value.churches.find((item) => item.id === pastor.value?.churchId))
const statement = computed(() => t('pastors.statement', {
  pastor: pastor.value?.name ?? '',
  church: church.value ? pickLocale(church.value.name, locale.value) : '',
  family: family.value,
  order: order.value,
  years: years.value,
  hardship: hardship.value ? t('pastors.hardshipYes') : t('pastors.hardshipNo'),
}))
const duties = ['1', '2', '3', '4', '5', '6']
</script>

<template>
  <p class="kicker">{{ t('pastors.kicker') }}</p>
  <h1>{{ t('pastors.title') }}</h1>
  <p class="lead">{{ t('pastors.lead') }}</p>
  <section class="section steps">
    <article v-for="id in duties" :key="id" class="step">
      <span class="step__index">0{{ id }}</span>
      <div>
        <h2>{{ t(`pastors.d${id}Title`) }}</h2>
        <p>{{ t(`pastors.d${id}Text`) }}</p>
      </div>
    </article>
  </section>

  <section class="section split">
    <form class="form panel" @submit.prevent>
      <h2>{{ t('pastors.formTitle') }}</h2>
      <label>
        {{ t('col.pastor') }}
        <select v-model="pastorId">
          <option v-for="item in ledger.pastors" :key="item.id" :value="item.id">{{ item.name }} · {{ item.id }}</option>
        </select>
      </label>
      <label>{{ t('col.family') }}<input v-model="family" pattern="FAM-[A-Z0-9]{4}" required></label>
      <label>{{ t('col.order') }}<input v-model.number="order" type="number" min="1" max="12"></label>
      <label>{{ t('col.years') }}<input v-model.number="years" type="number" min="1" max="40"></label>
      <label class="check"><input v-model="hardship" type="checkbox">{{ t('pastors.hardshipCheck') }}</label>
    </form>
    <article>
      <h2>{{ t('pastors.preview') }}</h2>
      <pre class="statement">{{ statement }}</pre>
      <p class="meta">{{ t('pastors.formNote') }}</p>
    </article>
  </section>

  <section class="section">
    <h2>{{ t('pastors.flagTitle') }}</h2>
    <p>{{ t('pastors.flagLead') }}</p>
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>{{ t('col.pastor') }}</th>
            <th class="table__num">{{ t('pastors.endorsements') }}</th>
            <th class="table__num">{{ t('pastors.hardshipCount') }}</th>
            <th class="table__num">{{ t('pastors.rate') }}</th>
            <th>{{ t('col.status') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in ledger.pastorFlags" :key="row.pastorId">
            <td :data-label="t('col.pastor')">{{ row.pastorName }}</td>
            <td class="table__num" :data-label="t('pastors.endorsements')">{{ row.endorsements }}</td>
            <td class="table__num" :data-label="t('pastors.hardshipCount')">{{ row.hardshipEndorsements }}</td>
            <td class="table__num" :data-label="t('pastors.rate')">{{ formatShare(row.rate, locale) }}</td>
            <td :data-label="t('col.status')">{{ row.flagged ? t('pastors.flagged') : t('pastors.clear') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
