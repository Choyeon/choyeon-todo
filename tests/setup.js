import { createPinia } from 'pinia'
import { setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { config } from '@vue/test-utils'
import zhCN from '@/locales/zh-CN'
import enUS from '@/locales/en-US'
import jaJP from '@/locales/ja-JP'

const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  fallbackLocale: 'zh-CN',
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS,
    'ja-JP': jaJP
  }
})

config.global.plugins.push(i18n)

beforeEach(() => {
  setActivePinia(createPinia())
})
