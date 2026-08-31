import { ref } from 'vue'
import { i18n } from '../i18n'

/**
 * 全局输入弹窗状态管理
 * 替代原生 window.prompt()，避免在 Electron sandbox + file:// 协议下无法弹出
 *
 * 使用方式：
 *   const { prompt: promptDialog } = usePrompt()
 *   const name = await promptDialog({
 *     message: '请输入分类名称',
 *     defaultValue: '默认值',
 *     placeholder: '输入分类名称',
 *     confirmLabel: '确定',
 *     cancelLabel: '取消',
 *     maxLength: 60
 *   })
 *   // 用户取消返回 null；输入为空字符串也返回 null
 */
const visible = ref(false)
const title = ref('')
const message = ref('')
const defaultValue = ref('')
const placeholder = ref('')
const confirmLabel = ref(i18n.global.t('common.confirm'))
const cancelLabel = ref(i18n.global.t('common.cancel'))
const maxLength = ref(0)
const inputValue = ref('')
let resolver = null

export const usePrompt = () => {
  const prompt = (options = {}) => {
    // 支持字符串参数：prompt('请输入名称')
    if (typeof options === 'string') {
      options = { message: options }
    }

    // 如果已有未关闭的弹窗，先拒绝上一个
    if (resolver) {
      resolver(null)
      resolver = null
    }

    title.value = options.title || ''
    message.value = options.message || ''
    defaultValue.value = options.defaultValue ?? ''
    placeholder.value = options.placeholder || ''
    confirmLabel.value = options.confirmLabel || i18n.global.t('common.confirm')
    cancelLabel.value = options.cancelLabel || i18n.global.t('common.cancel')
    maxLength.value = options.maxLength || 0
    inputValue.value = defaultValue.value

    visible.value = true

    return new Promise((resolve) => {
      resolver = resolve
    })
  }

  const handleConfirm = () => {
    const val = inputValue.value?.trim()
    visible.value = false
    if (resolver) {
      resolver(val || null)
      resolver = null
    }
  }

  const handleCancel = () => {
    visible.value = false
    if (resolver) {
      resolver(null)
      resolver = null
    }
  }

  const handleInput = (e) => {
    inputValue.value = e.target.value
  }

  return {
    visible,
    title,
    message,
    defaultValue,
    placeholder,
    confirmLabel,
    cancelLabel,
    maxLength,
    inputValue,
    prompt,
    handleConfirm,
    handleCancel,
    handleInput
  }
}
