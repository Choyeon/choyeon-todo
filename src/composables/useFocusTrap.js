import { nextTick, onUnmounted } from 'vue'

// 焦点陷阱 composable — 用于模态框，将 Tab 键焦点限制在模态内
export const useFocusTrap = (containerRef, options = {}) => {
  const { initialFocusSelector = 'input, textarea, button' } = options
  let previouslyFocused = null
  let keydownHandler = null
  let isActive = false

  const activate = async () => {
    // 防重入：已激活时先清理
    if (isActive) {
      deactivate()
    }

    // 保存之前焦点元素
    previouslyFocused = document.activeElement

    await nextTick()

    // 聚焦到模态内第一个可聚焦元素
    if (containerRef.value) {
      const focusable = containerRef.value.querySelector(initialFocusSelector)
      if (focusable) {
        focusable.focus()
      } else if (containerRef.value.setAttribute) {
        // 无可聚焦元素时，聚焦容器本身
        containerRef.value.setAttribute('tabindex', '-1')
        containerRef.value.focus()
      }
    }

    // 监听 Tab 键循环焦点
    keydownHandler = (e) => {
      if (e.key !== 'Tab') return
      if (!containerRef.value) return

      const focusableElements = containerRef.value.querySelectorAll(
        'button:not([disabled]):not([hidden]), input:not([disabled]):not([hidden]), textarea:not([disabled]):not([hidden]), select:not([disabled]):not([hidden]), a[href]:not([hidden]), [tabindex]:not([tabindex="-1"]):not([hidden])'
      )
      if (focusableElements.length === 0) return

      const first = focusableElements[0]
      const last = focusableElements[focusableElements.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', keydownHandler)
    isActive = true
  }

  const deactivate = () => {
    if (keydownHandler) {
      document.removeEventListener('keydown', keydownHandler)
      keydownHandler = null
    }
    // 焦点返回触发元素（检查是否仍在 DOM 中）
    if (previouslyFocused && previouslyFocused.focus && previouslyFocused.isConnected) {
      previouslyFocused.focus()
    }
    previouslyFocused = null
    isActive = false
  }

  onUnmounted(() => {
    deactivate()
  })

  return { activate, deactivate }
}
