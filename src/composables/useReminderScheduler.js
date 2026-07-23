import { useTaskStore } from '../stores/taskStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useReminderModal } from './useReminderModal'
import { getTodayStr, addDays, isValidDateStr } from '../utils/date'

let checkInterval = null
const triggeredReminders = new Set()
const snoozedReminders = new Map()
const OVERDUE_SUFFIX = '-overdue'

const getOverdueReminderKey = (taskId) => `${taskId}${OVERDUE_SUFFIX}`

const getReminderTaskId = (key) =>
  typeof key === 'string' && key.endsWith(OVERDUE_SUFFIX)
    ? key.slice(0, -OVERDUE_SUFFIX.length)
    : key

export const useReminderScheduler = () => {
  const start = () => {
    if (checkInterval) return

    checkInterval = setInterval(() => {
      checkReminders()
    }, 60000)

    checkReminders()
  }

  const stop = () => {
    if (checkInterval) {
      clearInterval(checkInterval)
      checkInterval = null
    }
    triggeredReminders.clear()
    snoozedReminders.clear()
  }

  const snoozeTask = (taskId, minutes = 5) => {
    const snoozeUntil = Date.now() + minutes * 60 * 1000
    snoozedReminders.set(taskId, snoozeUntil)
    triggeredReminders.delete(taskId)
    triggeredReminders.delete(getOverdueReminderKey(taskId))
  }

  const checkReminders = () => {
    const taskStore = useTaskStore()
    const settingsStore = useSettingsStore()
    const reminderModal = useReminderModal()

    if (settingsStore.doNotDisturb || !settingsStore.notificationsEnabled) return

    const hasElectronNotify = !!window.electronAPI?.sendNotification
    const hasBrowserNotify =
      typeof Notification !== 'undefined' && Notification.permission === 'granted'

    const sendNotification = (title, body, taskId) => {
      if (hasElectronNotify) {
        window.electronAPI.sendNotification(title, body, taskId)
      } else if (hasBrowserNotify) {
        new Notification(title, { body })
      }
    }

    const now = new Date()
    const today = getTodayStr()
    const reminderLeadMinutes = settingsStore.defaultReminderTime || 0
    const nowMs = Date.now()

    const validTaskIds = new Set()

    for (const task of taskStore.tasks) {
      if (task.completed) continue
      if (!task.reminder) continue
      validTaskIds.add(task.id)

      if (snoozedReminders.has(task.id)) {
        if (nowMs < snoozedReminders.get(task.id)) continue
        snoozedReminders.delete(task.id)
      }

      if (triggeredReminders.has(task.id)) continue

      if (!task.date || !isValidDateStr(task.date)) continue

      if (task.date < today) {
        const triggerKey = getOverdueReminderKey(task.id)
        if (!triggeredReminders.has(triggerKey)) {
          triggeredReminders.add(triggerKey)
          triggeredReminders.add(task.id)
          const title = '任务已逾期'
          const body = `"${task.title}" 已逾期，请尽快处理`
          sendNotification(title, body, task.id)
          reminderModal.show(task.id, {
            overdue: true,
            onView: (id) => {
              if (typeof window !== 'undefined' && window.focusTask) {
                window.focusTask(id)
              }
            },
            onSnooze: (id) => snoozeTask(id, 10)
          })
        }
        continue
      }

      if (task.date !== today && task.date !== addDays(today, 1)) continue
      if (!task.time) continue

      const timeParts = task.time.split(':').map(Number)
      if (timeParts.length !== 2 || timeParts.some(isNaN)) continue

      const [taskHour, taskMin] = timeParts
      const taskMinutes = taskHour * 60 + taskMin
      const nowMinutes = now.getHours() * 60 + now.getMinutes()

      if (task.date !== today) {
        const minutesUntilMidnight = 1440 - nowMinutes
        if (reminderLeadMinutes < minutesUntilMidnight) continue
        const totalMinutesUntilTask = minutesUntilMidnight + taskMinutes
        if (totalMinutesUntilTask > reminderLeadMinutes) continue
      }

      if (nowMinutes >= taskMinutes - reminderLeadMinutes || task.date !== today) {
        triggeredReminders.add(task.id)
        const isDue = task.date === today && nowMinutes >= taskMinutes
        const title = isDue ? '任务到期提醒' : '任务即将到期'
        const minutesLeft =
          task.date === today ? taskMinutes - nowMinutes : 1440 - nowMinutes + taskMinutes
        const body = isDue
          ? `"${task.title}" 已到期`
          : `"${task.title}" 将在 ${minutesLeft} 分钟后到期`

        sendNotification(title, body, task.id)
        reminderModal.show(task.id, {
          overdue: isDue,
          onView: (id) => {
            if (typeof window !== 'undefined' && window.focusTask) {
              window.focusTask(id)
            }
          },
          onSnooze: (id) => snoozeTask(id, 5)
        })
      }
    }

    for (const key of triggeredReminders) {
      const taskId = getReminderTaskId(key)
      if (!validTaskIds.has(taskId)) {
        triggeredReminders.delete(key)
      }
    }

    for (const [taskId] of snoozedReminders) {
      if (!validTaskIds.has(taskId)) {
        snoozedReminders.delete(taskId)
      }
    }
  }

  return { start, stop, snoozeTask }
}
