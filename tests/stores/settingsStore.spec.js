import { createPinia, setActivePinia } from 'pinia'
import { describe, beforeEach, afterEach, test, expect, vi } from 'vitest'
import { useSettingsStore } from '@/stores/settingsStore'

describe('SettingsStore', () => {
  let store = null

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useSettingsStore()
    store.resetSettings()
  })

  afterEach(() => {
    store.resetSettings()
  })

  describe('初始化', () => {
    test('应该有默认设置', () => {
      expect(store.themeMode).toBe('light')
      expect(store.isDark).toBe(false)
      expect(store.primaryColor).toBe('#4A90D9')
      expect(store.language).toBe('zh-CN')
      expect(store.notificationsEnabled).toBe(true)
    })

    test('应该有主题颜色选项', () => {
      expect(store.themeColors.length).toBeGreaterThan(0)
      expect(store.themeColors.some(c => c.value === '#4A90D9')).toBe(true)
    })
  })

  describe('主题管理', () => {
    test('切换主题模式', () => {
      expect(store.themeMode).toBe('light')
      store.setThemeMode('dark')
      expect(store.themeMode).toBe('dark')
      expect(store.isDark).toBe(true)
      store.setThemeMode('light')
      expect(store.themeMode).toBe('light')
      expect(store.isDark).toBe(false)
    })

    test('切换主题', () => {
      expect(store.themeMode).toBe('light')
      store.toggleTheme()
      expect(store.themeMode).toBe('dark')
      store.toggleTheme()
      expect(store.themeMode).toBe('light')
    })

    test('设置主题色', () => {
      const newColor = '#8B5CF6'
      store.setPrimaryColor(newColor)
      expect(store.primaryColor).toBe(newColor)
    })

    test('应用主题', () => {
      vi.spyOn(document.documentElement.style, 'setProperty')
      store.applyTheme()
      expect(document.documentElement.style.setProperty).toHaveBeenCalled()
    })
  })

  describe('通知设置', () => {
    test('启用/禁用通知', () => {
      expect(store.notificationsEnabled).toBe(true)
      store.notificationsEnabled = false
      expect(store.notificationsEnabled).toBe(false)
      store.notificationsEnabled = true
      expect(store.notificationsEnabled).toBe(true)
    })

    test('设置默认提醒时间', () => {
      store.defaultReminderTime = '09:00'
      expect(store.defaultReminderTime).toBe('09:00')
    })

    test('设置请勿打扰模式', () => {
      expect(store.doNotDisturb).toBe(false)
      store.doNotDisturb = true
      expect(store.doNotDisturb).toBe(true)
    })
  })

  describe('应用设置', () => {
    test('设置自动启动', () => {
      expect(store.autoStart).toBe(false)
      store.autoStart = true
      expect(store.autoStart).toBe(true)
    })

    test('设置关闭到退出', () => {
      expect(store.closeToQuit).toBe(true)
      store.closeToQuit = false
      expect(store.closeToQuit).toBe(false)
    })
  })

  describe('语言设置', () => {
    test('设置语言', () => {
      store.language = 'en-US'
      expect(store.language).toBe('en-US')
    })
  })

  describe('重置设置', () => {
    test('重置设置应该恢复默认值', () => {
      store.setThemeMode('dark')
      store.setPrimaryColor('#FF0000')
      store.language = 'en-US'
      store.notificationsEnabled = false
      
      store.resetSettings()
      
      expect(store.themeMode).toBe('light')
      expect(store.primaryColor).toBe('#4A90D9')
      expect(store.language).toBe('zh-CN')
      expect(store.notificationsEnabled).toBe(true)
    })
  })
})
