<script setup lang="ts">
const { t } = useI18n()
const { data } = useLedger()
</script>

<template>
  <p class="banner">
    {{ t('common.demo') }}
    <span v-if="data" class="banner__source">{{ t(`source.${data.source}`) }}</span>
  </p>
</template>
