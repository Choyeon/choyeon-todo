import { ref } from 'vue'

const visible = ref(false)
const currentTaskId = ref(null)
const isOverdue = ref(false)
let snoozeCallback = null
let viewCallback = null

export const useReminderModal = () => {
  const show = (taskId, options = {}) => {
    currentTaskId.value = taskId
    isOverdue.value = options.overdue || false
    snoozeCallback = options.onSnooze || null
    viewCallback = options.onView || null
    visible.value = true
  }

  const hide = () => {
    visible.value = false
    currentTaskId.value = null
    isOverdue.value = false
    snoozeCallback = null
    viewCallback = null
  }

  const handleSnooze = () => {
    try {
      if (snoozeCallback) {
        snoozeCallback(currentTaskId.value)
      }
    } finally {
      hide()
    }
  }

  const handleView = (taskId) => {
    try {
      if (viewCallback) {
        viewCallback(taskId)
      }
    } finally {
      hide()
    }
  }

  return {
    visible,
    currentTaskId,
    isOverdue,
    show,
    hide,
    handleSnooze,
    handleView
  }
}
