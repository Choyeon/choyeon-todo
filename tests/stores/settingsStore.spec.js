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
      expect(store.themeColors.some((c) => c.value === '#4A90D9')).toBe(true)
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
      expect(store.themeMode).toBe('system')
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

  describe('新增布尔设置', () => {
    test('myDaySmartEnabled 默认值 true', () => {
      expect(store.myDaySmartEnabled).toBe(true)
    })

    test('toggleMyDaySmartEnabled 可以切换', () => {
      expect(store.myDaySmartEnabled).toBe(true)
      store.toggleMyDaySmartEnabled()
      expect(store.myDaySmartEnabled).toBe(false)
      store.toggleMyDaySmartEnabled()
      expect(store.myDaySmartEnabled).toBe(true)
    })

    test('myDaySmartCount 默认值 15', () => {
      expect(store.myDaySmartCount).toBe(15)
    })

    test('setMyDaySmartCount 限制范围 [1,100]', () => {
      store.setMyDaySmartCount(5)
      expect(store.myDaySmartCount).toBe(5)
      store.setMyDaySmartCount(0)
      expect(store.myDaySmartCount).toBe(1)
      store.setMyDaySmartCount(500)
      expect(store.myDaySmartCount).toBe(100)
      store.setMyDaySmartCount('abc')
      expect(store.myDaySmartCount).toBe(100) // 未变更
    })

    test('sidebarShowFilters 默认 true', () => {
      expect(store.sidebarShowFilters).toBe(true)
    })

    test('toggleSidebarShowFilters 切换', () => {
      store.toggleSidebarShowFilters()
      expect(store.sidebarShowFilters).toBe(false)
      store.toggleSidebarShowFilters()
      expect(store.sidebarShowFilters).toBe(true)
    })

    test('sidebarShowAreas 默认 true', () => {
      expect(store.sidebarShowAreas).toBe(true)
    })

    test('toggleSidebarShowAreas 切换', () => {
      store.toggleSidebarShowAreas()
      expect(store.sidebarShowAreas).toBe(false)
      store.toggleSidebarShowAreas()
      expect(store.sidebarShowAreas).toBe(true)
    })
  })

  describe('density 密度设置', () => {
    test('density 有效值为 comfortable/standard/compact 之一', () => {
      expect(['comfortable', 'standard', 'compact'].includes(store.density)).toBe(true)
    })

    test('setDensity 设置合法值', () => {
      store.setDensity('compact')
      expect(store.density).toBe('compact')
      store.setDensity('comfortable')
      expect(store.density).toBe('comfortable')
      store.setDensity('standard')
      expect(store.density).toBe('standard')
    })

    test('setDensity 非法值忽略', () => {
      store.setDensity('standard')
      store.setDensity('huge')
      expect(store.density).toBe('standard')
      store.setDensity(null)
      expect(store.density).toBe('standard')
    })

    test('resetSettings density 根据分辨率推断', () => {
      store.setDensity('compact')
      store.resetSettings()
      // jsdom 环境中 window.innerWidth 可能是 0 或 1024，也可能未定义
      // 重点：reset 后 density 必须是合法值
      expect(['comfortable', 'standard', 'compact'].includes(store.density)).toBe(true)
    })

    test('density 自适应：<=1366 → compact', () => {
      // 临时模拟 innerWidth
      const originalInnerWidth = window.innerWidth
      Object.defineProperty(window, 'innerWidth', { value: 1280, writable: true, configurable: true })
      // 调用 resetSettings 重新触发（detectDefaultDensity 函数在 resetSettings 中被调用）
      store.resetSettings()
      expect(store.density).toBe('compact')
      // 恢复
      Object.defineProperty(window, 'innerWidth', {
        value: originalInnerWidth,
        writable: true,
        configurable: true
      })
    })

    test('density 自适应：1366<width<=1600 → standard', () => {
      const originalInnerWidth = window.innerWidth
      Object.defineProperty(window, 'innerWidth', { value: 1440, writable: true, configurable: true })
      store.resetSettings()
      expect(store.density).toBe('standard')
      Object.defineProperty(window, 'innerWidth', {
        value: originalInnerWidth,
        writable: true,
        configurable: true
      })
    })

    test('density 自适应：>1600 → comfortable', () => {
      const originalInnerWidth = window.innerWidth
      Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true, configurable: true })
      store.resetSettings()
      expect(store.density).toBe('comfortable')
      Object.defineProperty(window, 'innerWidth', {
        value: originalInnerWidth,
        writable: true,
        configurable: true
      })
    })
  })
})
