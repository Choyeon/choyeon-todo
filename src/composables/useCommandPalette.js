import { ref, onBeforeUnmount } from 'vue'
import { getDefaultCommandRegistry } from './useCommandRegistry'
import { useSnackbar } from './useSnackbar'

/**
 * useCommandPalette — 控制 CommandPalette 组件的打开/关闭
 * 并负责初始化命令注册表（传入 bridges）。
 */

let _registry = null

const visible = ref(false)
const _openHandlers = new Set()
const _closeHandlers = new Set()
let _globalToggle = null
let _globalClose = null

export const getCommandRegistry = (bridges = {}) => {
  if (!_registry) {
    const snackbar = useSnackbar()
    _registry = getDefaultCommandRegistry({
      bridges: { snackbar, ...bridges }
    })
  }
  return _registry
}

// 全局 Ctrl+K / ESC 快捷键：仅注册一次
let _keyHandlerInstalled = false
let _keyHandlerCleanup = null
const _installGlobalKeyHandler = () => {
  if (_keyHandlerInstalled || typeof window === 'undefined') return
  _keyHandlerInstalled = true
  const handler = (e) => {
    const modifier = e.ctrlKey || e.metaKey
    if (modifier && e.key && e.key.toLowerCase() === 'k') {
      // 仅在 App.vue 未处理时生效；双保险统一通过 composable 共享 state
      e.preventDefault()
      _globalToggle && _globalToggle()
    } else if (e.key === 'Escape' && visible.value) {
      // ESC 关闭：避免抢占输入框 ESC 逻辑，只在面板打开时生效
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) {
        // 让面板内部 input 自行处理
        return
      }
      _globalClose ? _globalClose() : (visible.value = false)
    }
  }
  window.addEventListener('keydown', handler)
  _keyHandlerCleanup = () => {
    window.removeEventListener('keydown', handler)
    _keyHandlerInstalled = false
    _keyHandlerCleanup = null
  }
}

export const useCommandPalette = (options = {}) => {
  const { bridges, registerGlobalShortcut = true } = options
  const snackbar = useSnackbar()
  const registry = getCommandRegistry(bridges)

  const open = () => {
    visible.value = true
    _openHandlers.forEach((fn) => {
      try { fn() } catch (_e) { /* ignore */ }
    })
  }
  const close = () => {
    visible.value = false
    _closeHandlers.forEach((fn) => {
      try { fn() } catch (_e) { /* ignore */ }
    })
  }
  const toggle = () => (visible.value ? close() : open())

  // 全局快捷键内部使用：必须先让 _globalToggle 有定义（避免模块级别引用失败）
  _globalToggle = _globalToggle || toggle
  _globalClose = _globalClose || close

  const onOpen = (fn) => { _openHandlers.add(fn); return () => _openHandlers.delete(fn) }
  const onClose = (fn) => { _closeHandlers.add(fn); return () => _closeHandlers.delete(fn) }

  /**
   * 执行命令并统一错误处理
   * @param {string} id 命令 id
   * @param {any} ctx 上下文参数
   * @param {{ showError?: boolean, showSuccess?: boolean|string }} opts
   */
  const runCommand = async (id, ctx = undefined, opts = {}) => {
    const { showError = true, showSuccess = false } = opts
    const result = registry.run(id, ctx)
    if (!result.ok) {
      if (showError) {
        snackbar.error(result.error || `命令执行失败: ${id}`)
      }
      return result
    }
    if (result.promise) {
      try {
        const v = await result.promise
        if (showSuccess) {
          snackbar.success(typeof showSuccess === 'string' ? showSuccess : '执行成功')
        }
        return { ok: true, value: v }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        if (showError) snackbar.error(msg)
        return { ok: false, error: msg }
      }
    }
    if (showSuccess) {
      snackbar.success(typeof showSuccess === 'string' ? showSuccess : '执行成功')
    }
    return result
  }

  if (registerGlobalShortcut) {
    _installGlobalKeyHandler()
  }

  return {
    visible,
    open,
    close,
    toggle,
    onOpen,
    onClose,
    registry,
    runCommand
  }
}

export default useCommandPalette
