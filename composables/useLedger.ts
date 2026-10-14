import type { Snapshot } from '~/shared/types'

export function useLedger() {
  return useFetch<Snapshot>('/api/snapshot')
}

export function usePageSeo(titleKey: string, descriptionKey: string) {
  const { t } = useI18n()
  const config = useRuntimeConfig()
  useSeoMeta({
    title: () => t(titleKey),
    description: () => t(descriptionKey),
    ogTitle: () => `${t(titleKey)} · ${t('brand.name')}`,
    ogDescription: () => t(descriptionKey),
    ogType: 'website',
    ogImage: () => `${config.public.siteUrl}/og.svg`,
    twitterCard: 'summary_large_image',
  })
}
