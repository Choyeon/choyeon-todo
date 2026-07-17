import { createPinia, setActivePinia } from 'pinia'
import { describe, beforeEach, afterEach, test, expect, vi } from 'vitest'
import { usePomodoroStore } from '@/stores/pomodoroStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useTaskStore } from '@/stores/taskStore'

describe('PomodoroStore', () => {
  let store = null
  let settingsStore = null

  beforeEach(() => {
    setActivePinia(createPinia())
    settingsStore = useSettingsStore()
    const taskStore = useTaskStore()
    taskStore.resetAll()
    store = usePomodoroStore()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('初始化', () => {
    test('应该有默认的番茄钟状态', () => {
      expect(store.currentMode).toBe('work')
      expect(store.isRunning).toBe(false)
      expect(store.hasStarted).toBe(false)
      expect(store.completedPomodoros).toBe(0)
    })

    test('初始时间应该等于专注时长', () => {
      const expectedSeconds = settingsStore.pomodoroWorkMinutes * 60
      expect(store.timeLeft).toBe(expectedSeconds)
      expect(store.totalTime).toBe(expectedSeconds)
    })
  })

  describe('模式管理', () => {
    test('应该有三种模式', () => {
      expect(store.modes.length).toBe(3)
      expect(store.modes.map((m) => m.value)).toContain('work')
      expect(store.modes.map((m) => m.value)).toContain('shortBreak')
      expect(store.modes.map((m) => m.value)).toContain('longBreak')
    })

    test('currentModeLabel 应该返回正确的中文标签', () => {
      expect(store.currentModeLabel).toBe('专注')
    })

    test('currentColor 应该返回正确的颜色', () => {
      expect(store.currentColor).toBe('#EF4444')
    })
  })

  describe('时间格式化', () => {
    test('formattedTime 应该正确格式化秒数', () => {
      expect(store.formattedTime).toMatch(/^\d{2}:\d{2}$/)
    })
  })

  describe('模式切换', () => {
    test('切换到短休息模式', () => {
      store.switchMode('shortBreak')
      expect(store.currentMode).toBe('shortBreak')
      expect(store.currentModeLabel).toBe('短休息')
      expect(store.currentColor).toBe('#22C55E')
      expect(store.timeLeft).toBe(settingsStore.pomodoroBreakMinutes * 60)
    })

    test('切换到长休息模式', () => {
      store.switchMode('longBreak')
      expect(store.currentMode).toBe('longBreak')
      expect(store.currentModeLabel).toBe('长休息')
      expect(store.currentColor).toBe('#06B6D4')
      expect(store.timeLeft).toBe(settingsStore.pomodoroLongBreakMinutes * 60)
    })

    test('切换模式后应该重置计时器', () => {
      store.toggleTimer()
      expect(store.isRunning).toBe(true)
      store.switchMode('shortBreak')
      expect(store.isRunning).toBe(false)
    })
  })

  describe('重置计时器', () => {
    test('resetTimer 应该重置时间和状态', () => {
      store.switchMode('shortBreak')
      store.toggleTimer()
      store.resetTimer()
      expect(store.isRunning).toBe(false)
      expect(store.timeLeft).toBe(settingsStore.pomodoroBreakMinutes * 60)
    })
  })

  describe('完成番茄钟数', () => {
    test('初始完成数为 0', () => {
      expect(store.completedPomodoros).toBe(0)
    })
  })

  describe('自定义时长', () => {
    test('customMinutes 初始值应该等于专注时长', () => {
      expect(store.customMinutes).toBe(settingsStore.pomodoroWorkMinutes)
    })
  })
})
