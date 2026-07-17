import { ref } from 'vue'

// 全局 Snackbar 状态管理
const visible = ref(false)
const message = ref('')
const actionLabel = ref('')
let actionCallback = null
let hideTimeout = null

export const useSnackbar = () => {
  const show = (msg, options = {}) => {
    // 清除之前的定时器
    if (hideTimeout) clearTimeout(hideTimeout)

    message.value = msg
    actionLabel.value = options.actionLabel || ''
    actionCallback = options.onAction || null
    visible.value = true

    const duration = options.duration !== undefined ? options.duration : 4000
    if (duration > 0) {
      hideTimeout = setTimeout(() => {
        hide()
      }, duration)
    }
  }

  const hide = () => {
    visible.value = false
    if (hideTimeout) {
      clearTimeout(hideTimeout)
      hideTimeout = null
    }
    actionCallback = null
  }

  const handleAction = () => {
    try {
      if (actionCallback) {
        actionCallback()
      }
    } finally {
      hide()
    }
  }

  return {
    visible,
    message,
    actionLabel,
    show,
    hide,
    handleAction
  }
}
