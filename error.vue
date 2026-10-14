<script setup lang="ts">
import type { NuxtError } from '#app'

defineProps<{ error: NuxtError }>()
const { t } = useI18n()
const localePath = useLocalePath()
useSeoMeta({ title: () => t('error.title'), robots: 'noindex' })
</script>

<template>
  <main class="error-page">
    <p class="kicker">{{ error.statusCode }}</p>
    <h1>{{ t('error.title') }}</h1>
    <p class="lead">{{ t('error.text') }}</p>
    <NuxtLink class="button" :to="localePath('/')">{{ t('error.home') }}</NuxtLink>
  </main>
</template>
