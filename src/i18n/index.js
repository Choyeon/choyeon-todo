import { createI18n } from 'vue-i18n'
import zhCN from '../locales/zh-CN'
import enUS from '../locales/en-US'
import jaJP from '../locales/ja-JP'

const STORAGE_KEY = 'choyeon_locale'

export const SUPPORTED_LOCALES = ['zh-CN', 'en-US', 'ja-JP']

export const LOCALE_LABELS = {
  'zh-CN': '简体中文',
  'en-US': 'English',
  'ja-JP': '日本語'
}

const getDefaultLocale = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && SUPPORTED_LOCALES.includes(saved)) {
      return saved
    }
  } catch (e) {
    // ignore
  }

  if (typeof navigator !== 'undefined' && navigator.language) {
    const lang = navigator.language
    if (lang.startsWith('zh')) return 'zh-CN'
    if (lang.startsWith('ja')) return 'ja-JP'
    if (lang.startsWith('en')) return 'en-US'
  }
  return 'zh-CN'
}

export const i18n = createI18n({
  legacy: false,
  locale: getDefaultLocale(),
  fallbackLocale: 'zh-CN',
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS,
    'ja-JP': jaJP
  }
})

export const setLocale = (locale) => {
  if (!SUPPORTED_LOCALES.includes(locale)) return
  i18n.global.locale.value = locale
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch (e) {
    // ignore
  }
}

export const getLocale = () => {
  return i18n.global.locale.value
}

export const getNextLocale = () => {
  const current = i18n.global.locale.value
  const idx = SUPPORTED_LOCALES.indexOf(current)
  return SUPPORTED_LOCALES[(idx + 1) % SUPPORTED_LOCALES.length]
}

export const cycleLocale = () => {
  const next = getNextLocale()
  setLocale(next)
  return next
}
