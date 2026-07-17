import { ref } from 'vue'

// 全局确认弹窗状态管理
// 替代原生 confirm()，避免在 Electron 中阻塞主进程
const visible = ref(false)
const title = ref('')
const message = ref('')
const confirmLabel = ref('确定')
const cancelLabel = ref('取消')
const danger = ref(false)
let resolver = null

export const useConfirm = () => {
  const confirm = (options = {}) => {
    // 支持字符串或对象参数
    if (typeof options === 'string') {
      options = { message: options }
    }

    // 如果已有未关闭的确认框，先拒绝上一个
    if (resolver) {
      resolver(false)
      resolver = null
    }

    title.value = options.title || ''
    message.value = options.message || ''
    confirmLabel.value = options.confirmLabel || '确定'
    cancelLabel.value = options.cancelLabel || '取消'
    danger.value = !!options.danger
    visible.value = true

    return new Promise((resolve) => {
      resolver = resolve
    })
  }

  const handleConfirm = () => {
    visible.value = false
    if (resolver) {
      resolver(true)
      resolver = null
    }
  }

  const handleCancel = () => {
    visible.value = false
    if (resolver) {
      resolver(false)
      resolver = null
    }
  }

  return {
    visible,
    title,
    message,
    confirmLabel,
    cancelLabel,
    danger,
    confirm,
    handleConfirm,
    handleCancel
  }
}
