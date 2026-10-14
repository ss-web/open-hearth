<script setup lang="ts">
usePageSeo('seo.source.title', 'seo.source.description')
const { t } = useI18n()
const config = useRuntimeConfig()
const docs = [
  'docs/01-opisanie-i-pravila.md',
  'docs/02-tehnicheskoe-zadanie.md',
  'docs/03-algoritm-raspredeleniya.md',
  'docs/04-baza-dannyh.md',
  'docs/05-stranicy-i-scenarii.md',
]
</script>

<template>
  <p class="kicker">{{ t('source.kicker') }}</p>
  <h1>{{ t('source.title') }}</h1>
  <p class="lead">{{ t('source.lead') }}</p>
  <p><a class="button" :href="config.public.githubUrl">{{ config.public.githubUrl }}</a></p>
  <section class="section grid-2">
    <article class="card">
      <h2>{{ t('source.stackTitle') }}</h2>
      <p>{{ t('source.stack') }}</p>
    </article>
    <article class="card">
      <h2>{{ t('source.licenseTitle') }}</h2>
      <p>{{ t('source.license') }}</p>
    </article>
  </section>
  <section class="section">
    <h2>{{ t('source.docsTitle') }}</h2>
    <ul>
      <li v-for="doc in docs" :key="doc"><code>{{ doc }}</code></li>
    </ul>
    <p>{{ t('source.docsNote') }}</p>
  </section>
  <section class="section">
    <h2>{{ t('source.publicTitle') }}</h2>
    <p>{{ t('source.publicText') }}</p>
  </section>
</template>
