import { ref, computed } from 'vue'

/**
 * useSnackbar — 全局 Snackbar/Toast 状态管理
 * 支持：多类型（success / error / info / warning）+ action 按钮 + 堆叠队列（可选）
 */

const VALID_TYPES = ['info', 'success', 'warning', 'error']

// 单例状态（模块级）
const visible = ref(false)
const message = ref('')
const type = ref('info')
const actionLabel = ref('')
let actionCallback = null
let hideTimeout = null

// 类型图标（供 Snackbar.vue 组件按类型渲染）
const typeIcons = {
  success: 'check-circle',
  error: 'alert-circle',
  warning: 'alert-triangle',
  info: 'info'
}

const normalizeType = (t) => (VALID_TYPES.includes(t) ? t : 'info')

export const useSnackbar = () => {
  // -------- show：兼容新旧调用签名 --------
  // 旧: show(msg, { duration, actionLabel, onAction })
  // 新: show({ message, type, duration, actionLabel, onAction })
  const show = (arg1, arg2 = {}) => {
    if (hideTimeout) {
      clearTimeout(hideTimeout)
      hideTimeout = null
    }

    // 归一化参数
    let msg = ''
    let opts = {}
    if (typeof arg1 === 'string') {
      msg = arg1
      opts = arg2 || {}
    } else if (arg1 && typeof arg1 === 'object') {
      opts = arg1
      msg = arg1.message || arg1.text || ''
    }

    message.value = String(msg || '')
    type.value = normalizeType(opts.type || 'info')
    actionLabel.value = opts.actionLabel || opts.action?.label || ''
    actionCallback =
      opts.onAction || (opts.action && typeof opts.action.onClick === 'function' ? opts.action.onClick : null)

    visible.value = true

    const duration = typeof opts.duration === 'number' ? opts.duration : 4000
    if (duration > 0) {
      hideTimeout = setTimeout(() => {
        hide()
      }, duration)
    }
  }

  // -------- 便捷方法（语义化） --------
  const success = (msg, opts = {}) => show(msg, { ...opts, type: 'success' })
  const error = (msg, opts = {}) => show(msg, { ...opts, type: 'error' })
  const warning = (msg, opts = {}) => show(msg, { ...opts, type: 'warning' })
  const info = (msg, opts = {}) => show(msg, { ...opts, type: 'info' })

  const hide = () => {
    visible.value = false
    if (hideTimeout) {
      clearTimeout(hideTimeout)
      hideTimeout = null
    }
    actionCallback = null
  }

  const handleAction = () => {
    const cb = actionCallback
    try {
      if (typeof cb === 'function') cb()
    } finally {
      hide()
    }
  }

  const typeIcon = computed(() => typeIcons[type.value])
  const typeClass = computed(() => `type-${type.value}`)

  return {
    // state
    visible,
    message,
    type,
    actionLabel,
    typeIcon,
    typeClass,
    // actions
    show,
    success,
    error,
    warning,
    info,
    hide,
    handleAction,
    // internals (for test / debug)
    _VALID_TYPES: VALID_TYPES
  }
}

export default useSnackbar
