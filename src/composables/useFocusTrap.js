import { nextTick, onUnmounted } from 'vue'

/**
 * 焦点陷阱 composable — 将 Tab 键焦点限制在模态框内
 * 符合 WAI-ARIA Dialog 规范：打开时聚焦首个可交互元素，关闭时归还焦点
 */
export const useFocusTrap = (containerRef, options = {}) => {
  const { initialFocusSelector = 'input, textarea, button' } = options
  let previouslyFocused = null
  let keydownHandler = null
  let isActive = false

  const activate = async () => {
    if (isActive) {
      deactivate()
    }

    // 记录触发焦点，关闭模态后归还
    previouslyFocused = document.activeElement

    await nextTick()

    if (containerRef.value) {
      const focusable = containerRef.value.querySelector(initialFocusSelector)
      if (focusable) {
        focusable.focus()
      } else if (containerRef.value.setAttribute) {
        // 无可聚焦子元素时，聚焦容器本身以满足键盘可达性
        containerRef.value.setAttribute('tabindex', '-1')
        containerRef.value.focus()
      }
    }

    // Tab/Shift+Tab 循环焦点
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
    // 归还焦点到触发元素（检查是否仍在 DOM 中）
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
