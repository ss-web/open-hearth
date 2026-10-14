<script setup lang="ts">
defineProps<{ status: string }>()
const { t } = useI18n()
</script>

<template>
  <span class="badge" :class="`badge--${status}`">{{ t(`status.${status}`) }}</span>
</template>
