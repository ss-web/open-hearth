import en from './locales/en.json'
import hy from './locales/hy.json'
import ru from './locales/ru.json'

export default defineI18nConfig(() => ({
  legacy: false,
  locale: 'ru',
  fallbackLocale: 'ru',
  messages: { ru, en, hy },
}))
