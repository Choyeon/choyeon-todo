import { onMounted, onUnmounted } from 'vue'

const isEditable = (el) => {
  if (!el) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (el.isContentEditable) return true
  return false
}

export function useKeyboardShortcuts(handlers) {
  const handleKeyDown = (e) => {
    if (isEditable(e.target)) return
    if (e.metaKey || e.ctrlKey) {
      const key = e.key.toLowerCase()
      if (key === 'n') {
        e.preventDefault()
        handlers.onCreateTask?.()
        return
      }
      if (key === 'f' || key === 'k') {
        e.preventDefault()
        handlers.onSearch?.()
        return
      }
      if (key === ',') {
        e.preventDefault()
        handlers.onOpenSettings?.()
        return
      }
      if (e.shiftKey && key === 'p') {
        e.preventDefault()
        handlers.onTogglePomodoro?.()
        return
      }
    } else {
      const key = e.key
      if (key === 'j') {
        e.preventDefault()
        handlers.onMoveDown?.()
        return
      }
      if (key === 'k') {
        e.preventDefault()
        handlers.onMoveUp?.()
        return
      }
      if (key === ' ' || key === 'Spacebar') {
        e.preventDefault()
        handlers.onToggleComplete?.()
        return
      }
      if (key === 'i' || key === 'I') {
        e.preventDefault()
        handlers.onToggleImportant?.()
        return
      }
      if (key === 'Escape') {
        handlers.onEscape?.()
        return
      }
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })
}
