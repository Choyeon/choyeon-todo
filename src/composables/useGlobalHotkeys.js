// Task 6 B: 全局快捷键 composable
//  Web: 基于 window keydown
//  Electron 增强：优先 window.electronAPI.registerHotkeys / onHotkeyPressed；
//  按题目约定也兼容 window.ct.invoke('hotkey:register') 方式。
import { onMounted, onUnmounted } from 'vue'
import { usePomodoroStore } from '../stores/pomodoroStore'
import { useRouter } from 'vue-router'

const SNOOZE_MINUTES = 10

const isEditable = (el) => {
  if (!el) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (el.isContentEditable) return true
  return false
}

// 所有绑定的统一描述，供 Electron 映射 accelerator 与 Web 映射键盘
export const DEFAULT_HOTKEY_BINDS = [
  {
    id: 'startPause',
    key: 'startPause',
    web: { key: 'Enter', ctrl: true, shift: true },
    accelerator: 'CommandOrControl+Shift+Enter',
    label: '番茄 开始/暂停'
  },
  {
    id: 'skipStage',
    key: 'skipStage',
    web: { key: 'ArrowRight', ctrl: true, shift: true },
    accelerator: 'CommandOrControl+Shift+Right',
    label: '跳过当前阶段'
  },
  {
    id: 'preset1',
    key: 'preset1',
    web: { key: '1', ctrl: true, shift: true },
    accelerator: 'CommandOrControl+Shift+1',
    label: '预设 Work (25/5)'
  },
  {
    id: 'preset2',
    key: 'preset2',
    web: { key: '2', ctrl: true, shift: true },
    accelerator: 'CommandOrControl+Shift+2',
    label: '预设 ShortBreak (5)'
  },
  {
    id: 'preset3',
    key: 'preset3',
    web: { key: '3', ctrl: true, shift: true },
    accelerator: 'CommandOrControl+Shift+3',
    label: '预设 LongBreak'
  },
  {
    id: 'preset4',
    key: 'preset4',
    web: { key: '4', ctrl: true, shift: true },
    accelerator: 'CommandOrControl+Shift+4',
    label: '预设 Custom'
  },
  {
    id: 'preset5',
    key: 'preset5',
    web: { key: '5', ctrl: true, shift: true },
    accelerator: 'CommandOrControl+Shift+5',
    label: 'AI 自适应'
  },
  {
    id: 'togglePomodoroView',
    key: 'togglePomodoroView',
    web: { key: 'F', ctrl: true, shift: true },
    accelerator: 'CommandOrControl+Shift+F',
    label: '在 Home 和专注界面之间切换'
  },
  {
    id: 'markDistractionSnooze',
    key: 'markDistractionSnooze',
    web: { key: 'D', ctrl: true, shift: true },
    accelerator: 'CommandOrControl+Shift+D',
    label: '记录一次干扰并 Snooze 10 分钟'
  }
]

const PRESET_MODE_BY_ID = {
  preset1: 'work',
  preset2: 'shortBreak',
  preset3: 'longBreak',
  preset4: 'custom',
  preset5: 'aiAdaptive'
}

const ELECTRON_ACCELERATOR_TO_KEY = DEFAULT_HOTKEY_BINDS.reduce((map, b) => {
  map[b.accelerator] = b.key
  return map
}, {})

export function useGlobalHotkeys(options = {}) {
  const pomodoroStore = options.pomodoroStore || usePomodoroStore()
  let router = options.router || null
  // 允许在 vue 组件 setup 外调用：若未提供 router 则尝试懒获取
  const getRouter = () => {
    if (!router) {
      try {
        router = useRouter()
      } catch (e) {
        router = null
      }
    }
    return router
  }

  const focusHome = options.focusHome || (() => {})
  const onDistractionMarked = options.onDistractionMarked || (() => {})

  const isElectron =
    typeof window !== 'undefined' &&
    (!!window.electronAPI || !!(process && process.versions && process.versions.electron))

  const isElectronEnhanced =
    typeof window !== 'undefined' &&
    (!!(window.ct && typeof window.ct.invoke === 'function') ||
      !!(window.electronAPI && typeof window.electronAPI.registerHotkeys === 'function'))

  let webListener = null
  let electronHotkeyUnsubscribe = null
  let electronCleanupDone = false
  const handlerMap = new Map()

  // ---- dispatch 逻辑 ----
  const dispatchHotkey = (key) => {
    const h = handlerMap.get(key)
    if (typeof h === 'function') {
      try {
        h()
      } catch (e) {
        // ignore handler errors
      }
      return true
    }
    return false
  }

  // 默认 handler 实现
  const applyPresetMode = (presetId) => {
    const mode = PRESET_MODE_BY_ID[presetId]
    if (!mode) return false
    if (mode === 'custom') {
      // custom：进入自定义编辑状态（保留用户已设置的 customMinutes，不立即套用）
      pomodoroStore.isCustomEditing = true
      return true
    }
    if (mode === 'aiAdaptive') {
      if (typeof pomodoroStore.applyAIAdaptiveDuration === 'function') {
        return pomodoroStore.applyAIAdaptiveDuration()
      }
      return false
    }
    if (mode === 'work' || mode === 'shortBreak' || mode === 'longBreak') {
      if (typeof pomodoroStore.switchMode === 'function') {
        pomodoroStore.switchMode(mode)
      }
      return true
    }
    return false
  }

  const setupDefaultHandlers = () => {
    handlerMap.set('startPause', () => {
      if (pomodoroStore && typeof pomodoroStore.startPause === 'function') {
        pomodoroStore.startPause()
      } else if (pomodoroStore && typeof pomodoroStore.toggleTimer === 'function') {
        pomodoroStore.toggleTimer()
      }
    })
    handlerMap.set('skipStage', () => {
      if (pomodoroStore && typeof pomodoroStore.skipStage === 'function') {
        pomodoroStore.skipStage()
      } else if (pomodoroStore && typeof pomodoroStore.skipTimer === 'function') {
        pomodoroStore.skipTimer()
      }
    })
    handlerMap.set('preset1', () => applyPresetMode('preset1'))
    handlerMap.set('preset2', () => applyPresetMode('preset2'))
    handlerMap.set('preset3', () => applyPresetMode('preset3'))
    handlerMap.set('preset4', () => applyPresetMode('preset4'))
    handlerMap.set('preset5', () => applyPresetMode('preset5'))
    handlerMap.set('togglePomodoroView', () => {
      const r = options.router || (typeof useRouter === 'function' ? getRouter() : null)
      if (!r) return
      try {
        const cur = r.currentRoute && r.currentRoute.value ? r.currentRoute.value : r.currentRoute
        const curName = cur && cur.name
        if (curName === 'Pomodoro' || (cur && cur.path && cur.path.startsWith('/pomodoro'))) {
          r.push('/')
        } else {
          r.push('/pomodoro')
        }
      } catch (e) {
        // ignore routing errors
      }
    })
    handlerMap.set('markDistractionSnooze', () => {
      if (!pomodoroStore) return
      if (typeof pomodoroStore.markDistraction === 'function') {
        pomodoroStore.markDistraction('userMarked')
      }
      // Snooze 10 分钟：暂停当前番茄钟，并把 remaining 时间 + SNOOZE 加到下一次 work 时长处理？
      // 任务定义 "Snooze 10 分钟" 的简单实现：若正在运行 work 则暂停，
      // 且后续恢复时把剩余秒数 + 10*60 再加到 timeLeft（等效推迟 10 分钟）。
      try {
        if (pomodoroStore.isRunning && typeof pomodoroStore.resetTimer !== 'function') {
          // noop
        }
        if (pomodoroStore.isRunning && pomodoroStore.currentMode === 'work') {
          const remaining = pomodoroStore.timeLeft || 0
          if (typeof pomodoroStore.toggleTimer === 'function') {
            pomodoroStore.toggleTimer() // pause
          }
          // 手动写回 timeLeft（无 action 接口时直接操作）
          pomodoroStore.timeLeft = Math.max(0, remaining + SNOOZE_MINUTES * 60)
        }
      } catch (e) {
        /* ignore */
      }
      onDistractionMarked({ snoozeMinutes: SNOOZE_MINUTES })
    })
  }

  setupDefaultHandlers()

  // ---- Web listener ----
  const webHandleKeyDown = (e) => {
    // 输入框：除了明确的全局热键（Ctrl/Cmd+Shift）组合都跳过
    // 题目要求的所有组合都是 Ctrl/Cmd+Shift，所以对 editable 也允许响应
    if (!e) return
    const modifier = !!(e.ctrlKey || e.metaKey)
    const shift = !!e.shiftKey
    if (!modifier || !shift) return
    const key = e.key // 'Enter', 'ArrowRight', '1'-'5', 'f', 'd', 'F', 'D'

    for (const bind of DEFAULT_HOTKEY_BINDS) {
      const w = bind.web
      if (!w) continue
      if (w.ctrl !== modifier) continue
      if (w.shift !== shift) continue
      let match = false
      if (w.key === 'ArrowRight') {
        match = key === 'ArrowRight' || key === 'Right'
      } else if (w.key === 'Enter') {
        match = key === 'Enter'
      } else {
        match = String(key).toLowerCase() === String(w.key).toLowerCase()
      }
      if (match) {
        e.preventDefault()
        e.stopPropagation && e.stopPropagation()
        dispatchHotkey(bind.key)
        return
      }
    }
  }

  const installWebListener = () => {
    if (typeof window === 'undefined') return
    webListener = webHandleKeyDown
    window.addEventListener('keydown', webListener, true)
  }

  const uninstallWebListener = () => {
    if (!webListener || typeof window === 'undefined') return
    window.removeEventListener('keydown', webListener, true)
    webListener = null
  }

  // ---- Electron listener ----
  const installElectronHotkeys = async () => {
    if (!isElectronEnhanced) return { ok: false, reason: 'no_electron_enhanced' }
    const binds = DEFAULT_HOTKEY_BINDS.map((b) => ({ key: b.key, accelerator: b.accelerator }))
    let result = { ok: false, results: [] }
    // 两种 API：window.ct.invoke 优先（题目约定），否则 electronAPI.registerHotkeys
    if (window.ct && typeof window.ct.invoke === 'function') {
      try {
        result = await window.ct.invoke('hotkey:register', binds)
      } catch (e) {
        // 回落到 electronAPI
      }
    }
    if ((!result || result.ok === false) && window.electronAPI?.registerHotkeys) {
      try {
        result = await window.electronAPI.registerHotkeys(binds)
      } catch (e) {
        /* ignore */
      }
    }

    // 监听主进程回传
    const cb = (payload) => {
      if (!payload) return
      const key =
        typeof payload.key === 'string'
          ? payload.key
          : ELECTRON_ACCELERATOR_TO_KEY[payload.accelerator]
      if (key) dispatchHotkey(key)
    }
    if (window.ct && typeof window.ct.on === 'function') {
      try {
        const unsub = window.ct.on('hotkey:pressed', cb)
        electronHotkeyUnsubscribe = () => {
          try {
            if (typeof unsub === 'function') unsub()
          } catch (e) {
            /* ignore */
          }
        }
      } catch (e) {
        /* ignore */
      }
    }
    if (!electronHotkeyUnsubscribe && window.electronAPI?.onHotkeyPressed) {
      try {
        const unsub = window.electronAPI.onHotkeyPressed(cb)
        electronHotkeyUnsubscribe = () => {
          try {
            if (typeof unsub === 'function') unsub()
          } catch (e) {
            /* ignore */
          }
        }
      } catch (e) {
        /* ignore */
      }
    }
    return result
  }

  const uninstallElectronHotkeys = async () => {
    if (electronCleanupDone) return
    electronCleanupDone = true
    if (electronHotkeyUnsubscribe) {
      try {
        electronHotkeyUnsubscribe()
      } catch (e) {
        /* ignore */
      }
      electronHotkeyUnsubscribe = null
    }
    if (!isElectronEnhanced) return
    try {
      if (window.ct && typeof window.ct.invoke === 'function') {
        try {
          await window.ct.invoke('hotkey:unregisterAll')
        } catch (e) {
          // 回落到 electronAPI
          if (window.electronAPI?.unregisterAllHotkeys) {
            await window.electronAPI.unregisterAllHotkeys()
          }
        }
      } else if (window.electronAPI?.unregisterAllHotkeys) {
        await window.electronAPI.unregisterAllHotkeys()
      }
    } catch (e) {
      /* ignore */
    }
  }

  const destroyGlobalHotkeys = async () => {
    uninstallWebListener()
    try {
      await uninstallElectronHotkeys()
    } catch (e) {
      /* ignore */
    }
  }

  const init = async () => {
    installWebListener()
    if (isElectronEnhanced) {
      try {
        await installElectronHotkeys()
      } catch (e) {
        /* ignore */
      }
    }
    focusHome && focusHome()
  }

  // 若在 vue setup 上下文内，则自动初始化
  if (typeof onMounted === 'function' && typeof onUnmounted === 'function') {
    try {
      onMounted(() => {
        init()
      })
      onUnmounted(() => {
        destroyGlobalHotkeys()
      })
    } catch (e) {
      // 非 setup 环境则跳过自动挂载
    }
  }

  return {
    init,
    destroyGlobalHotkeys,
    // 便于直接触发（单测 / UI）
    dispatchHotkey,
    // 便于单测注册/替换 handler
    registerHandler: (key, fn) => {
      if (typeof fn === 'function') handlerMap.set(key, fn)
    },
    unregisterHandler: (key) => handlerMap.delete(key),
    DEFAULT_HOTKEY_BINDS
  }
}

export { useGlobalHotkeys as default }
