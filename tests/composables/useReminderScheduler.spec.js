import { createPinia, setActivePinia } from 'pinia'
import { describe, beforeEach, afterEach, test, expect, vi } from 'vitest'
import { useTaskStore } from '@/stores/taskStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useReminderScheduler } from '@/composables/useReminderScheduler'

const reminderModalMock = {
  show: vi.fn(),
  hide: vi.fn(),
  handleSnooze: vi.fn(),
  handleView: vi.fn(),
  visible: { value: false },
  currentTaskId: { value: null },
  isOverdue: { value: false }
}

vi.mock('@/composables/useReminderModal', () => ({
  useReminderModal: () => reminderModalMock
}))

describe('useReminderScheduler', () => {
  let taskStore = null
  let settingsStore = null
  let scheduler = null

  beforeEach(() => {
    vi.useFakeTimers()
    setActivePinia(createPinia())
    taskStore = useTaskStore()
    settingsStore = useSettingsStore()
    taskStore.resetAll()
    settingsStore.resetSettings()
    settingsStore.notificationsEnabled = true
    settingsStore.doNotDisturb = false
    reminderModalMock.show.mockClear()
    Object.defineProperty(window, 'electronAPI', {
      value: { sendNotification: vi.fn() },
      configurable: true,
      writable: true
    })
    scheduler = useReminderScheduler()
  })

  afterEach(() => {
    scheduler.stop()
    vi.useRealTimers()
    delete window.electronAPI
  })

  test('逾期任务在后续轮询中不应该重复触发提醒', () => {
    taskStore.addTask({
      title: '已逾期任务',
      category: 'work',
      date: '2000-01-01',
      time: '09:00',
      reminder: true
    })

    scheduler.start()
    expect(reminderModalMock.show).toHaveBeenCalledTimes(1)
    expect(window.electronAPI.sendNotification).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(60000)

    expect(reminderModalMock.show).toHaveBeenCalledTimes(1)
    expect(window.electronAPI.sendNotification).toHaveBeenCalledTimes(1)
  })
})
