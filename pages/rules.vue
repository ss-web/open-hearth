<script setup lang="ts">
usePageSeo('seo.rules.title', 'seo.rules.description')
const { t } = useI18n()
const articles = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
const faqs = ['1', '2', '3', '4', '5', '6', '7', '8']
</script>

<template>
  <p class="kicker">{{ t('rules.kicker') }}</p>
  <h1>{{ t('rules.title') }}</h1>
  <p class="lead">{{ t('rules.lead') }}</p>
  <section class="section">
    <article v-for="id in articles" :key="id" class="card">
      <p class="kicker">{{ t('rules.article', { id }) }}</p>
      <h2>{{ t(`rules.a${id}Title`) }}</h2>
      <p>{{ t(`rules.a${id}Text`) }}</p>
    </article>
  </section>
  <section class="section">
    <h2>{{ t('faq.title') }}</h2>
    <div class="faq">
      <details v-for="id in faqs" :key="id" class="faq__item">
        <summary>{{ t(`faq.q${id}`) }}</summary>
        <p>{{ t(`faq.a${id}`) }}</p>
      </details>
    </div>
  </section>
</template>
