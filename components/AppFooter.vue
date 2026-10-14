<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const config = useRuntimeConfig()
</script>

<template>
  <footer class="footer">
    <div class="footer__inner">
      <div class="footer__title">{{ t('brand.name') }}</div>
      <p>{{ t('footer.disclaimer') }}</p>
      <div class="footer__links">
        <NuxtLink :to="localePath('/rules')">{{ t('nav.rules') }}</NuxtLink>
        <NuxtLink :to="localePath('/finances')">{{ t('nav.finances') }}</NuxtLink>
        <NuxtLink :to="localePath('/reports')">{{ t('nav.reports') }}</NuxtLink>
        <NuxtLink :to="localePath('/open-source')">{{ t('nav.source') }}</NuxtLink>
        <a :href="config.public.githubUrl">GitHub</a>
        <a href="/ledger.csv">CSV</a>
      </div>
      <p class="meta">{{ t('footer.license') }}</p>
    </div>
  </footer>
</template>
