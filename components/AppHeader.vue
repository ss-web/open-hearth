<script setup lang="ts">
const { t, locale } = useI18n()
const localePath = useLocalePath()
const switchLocalePath = useSwitchLocalePath()
const route = useRoute()
const open = ref(false)
const items = [
  { to: '/', key: 'nav.home' },
  { to: '/apply', key: 'nav.apply' },
  { to: '/queue', key: 'nav.queue' },
  { to: '/finances', key: 'nav.finances' },
  { to: '/rules', key: 'nav.rules' },
  { to: '/pastors', key: 'nav.pastors' },
  { to: '/open-source', key: 'nav.source' },
]
const locales = [
  { code: 'ru', label: 'RU' },
  { code: 'en', label: 'EN' },
  { code: 'hy', label: 'HY' },
] as const

function active(path: string) {
  const target = localePath(path)
  if (path === '/') return route.path === target
  return route.path === target || route.path.startsWith(`${target}/`)
}

watch(() => route.path, () => { open.value = false })
</script>

<template>
  <header class="header">
    <div class="header__bar">
      <NuxtLink class="brand" :to="localePath('/')">
        <AppMark />
        <span class="brand__text">
          <span class="brand__name">{{ t('brand.name') }}</span>
          <span class="brand__tag">{{ t('brand.tagline') }}</span>
        </span>
      </NuxtLink>
      <div class="header__tools">
        <nav class="langs" :aria-label="t('nav.languages')">
          <NuxtLink
            v-for="item in locales"
            :key="item.code"
            class="langs__link"
            :class="{ 'langs__link--active': locale === item.code }"
            :to="switchLocalePath(item.code)"
          >{{ item.label }}</NuxtLink>
        </nav>
        <button class="header__toggle" type="button" :aria-expanded="open" @click="open = !open">{{ t('nav.menu') }}</button>
      </div>
    </div>
    <nav class="nav" :class="{ 'nav--open': open }" :aria-label="t('nav.primary')">
      <NuxtLink v-for="item in items" :key="item.to" class="nav__link" :class="{ 'nav__link--active': active(item.to) }" :to="localePath(item.to)">
        {{ t(item.key) }}
      </NuxtLink>
    </nav>
  </header>
</template>
