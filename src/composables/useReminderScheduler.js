import { useTaskStore } from '../stores/taskStore'
import { useSettingsStore } from '../stores/settingsStore'
import { getTodayStr, addDays, isValidDateStr } from '../utils/date'

// 提醒调度器 — 定期检查到期任务并发送系统通知
let checkInterval = null
const triggeredReminders = new Set() // 已触发的提醒 taskId，避免重复

export const useReminderScheduler = () => {
  const start = () => {
    if (checkInterval) return

    // 每 60 秒检查一次
    checkInterval = setInterval(() => {
      checkReminders()
    }, 60000)

    // 启动时立即检查一次
    checkReminders()
  }

  // 清理定时器，防止 HMR 或卸载时内存泄漏
  const stop = () => {
    if (checkInterval) {
      clearInterval(checkInterval)
      checkInterval = null
    }
    triggeredReminders.clear()
  }

  const checkReminders = () => {
    const taskStore = useTaskStore()
    const settingsStore = useSettingsStore()

    // 免打扰模式或通知关闭时不检查
    if (settingsStore.doNotDisturb || !settingsStore.notificationsEnabled) return

    // 非 Electron 环境尝试浏览器通知回退
    const hasElectronNotify = !!window.electronAPI?.sendNotification
    const hasBrowserNotify =
      typeof Notification !== 'undefined' && Notification.permission === 'granted'
    if (!hasElectronNotify && !hasBrowserNotify) return

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

    // 获取所有有效任务 ID，用于清理已删除任务的触发记录
    const validTaskIds = new Set()

    for (const task of taskStore.tasks) {
      if (task.completed) continue
      if (!task.reminder) continue
      validTaskIds.add(task.id)

      if (triggeredReminders.has(task.id)) continue

      // 校验日期格式
      if (!task.date || !isValidDateStr(task.date)) continue

      // 逾期任务提醒（仅一次）
      if (task.date < today) {
        const triggerKey = `${task.id}-overdue`
        if (!triggeredReminders.has(triggerKey)) {
          triggeredReminders.add(triggerKey)
          triggeredReminders.add(task.id)
          sendNotification('任务已逾期', `"${task.title}" 已逾期，请尽快处理`, task.id)
        }
        continue
      }

      // 检查今天和明天的任务（支持跨天提前提醒）
      if (task.date !== today && task.date !== addDays(today, 1)) continue
      if (!task.time) continue

      // 校验时间格式
      const timeParts = task.time.split(':').map(Number)
      if (timeParts.length !== 2 || timeParts.some(isNaN)) continue

      const [taskHour, taskMin] = timeParts
      const taskMinutes = taskHour * 60 + taskMin
      const nowMinutes = now.getHours() * 60 + now.getMinutes()

      // 跨天提醒：明天的任务，只有在提前提醒时间跨越到今天时才触发
      if (task.date !== today) {
        // 明天的任务：只有在今天 23:59 之前的最后 reminderLeadMinutes 分钟才检查
        const minutesUntilMidnight = 1440 - nowMinutes
        if (reminderLeadMinutes < minutesUntilMidnight) continue
        // 计算实际距离任务时间的分钟数
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
      }
    }

    // 清理已删除任务的触发记录，防止内存泄漏
    for (const key of triggeredReminders) {
      const taskId = key.includes('-') ? key.split('-')[0] : key
      if (!validTaskIds.has(taskId)) {
        triggeredReminders.delete(key)
      }
    }
  }

  return { start, stop }
}
