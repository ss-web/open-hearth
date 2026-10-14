export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  modules: ['@nuxtjs/i18n'],
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL || '',
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      githubUrl: process.env.NUXT_PUBLIC_GITHUB_URL || 'https://github.com/open-hearth/open-hearth',
    },
  },
  app: {
    head: {
      meta: [
        { name: 'theme-color', content: '#1c3b30' },
        { name: 'format-detection', content: 'telephone=no' },
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },
  i18n: {
    bundle: {
      optimizeTranslationDirective: false,
    },
    vueI18n: './i18n.config.ts',
    locales: [
      { code: 'ru', language: 'ru-RU', name: 'Русский' },
      { code: 'en', language: 'en-US', name: 'English' },
      { code: 'hy', language: 'hy-AM', name: 'Հայերեն' },
    ],
    defaultLocale: 'ru',
    strategy: 'prefix_except_default',
    baseUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    detectBrowserLanguage: false,
  },
})
