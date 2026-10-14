import type { Localized } from '~/shared/types'

export function localeTag(locale: string): string {
  if (locale === 'en') return 'en-US'
  if (locale === 'hy') return 'hy-AM'
  return 'ru-RU'
}

export function formatUsd(value: number, locale: string): string {
  return new Intl.NumberFormat(localeTag(locale), {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(localeTag(locale), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`))
}

export function formatMonth(value: string, locale: string): string {
  const iso = value.length === 7 ? `${value}-01` : value.slice(0, 10)
  return new Intl.DateTimeFormat(localeTag(locale), {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T00:00:00Z`))
}

export function formatShare(value: number, locale: string): string {
  return new Intl.NumberFormat(localeTag(locale), {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(value)
}

export function pickLocale(value: Localized, locale: string): string {
  if (locale === 'en' || locale === 'hy') return value[locale]
  return value.ru
}
