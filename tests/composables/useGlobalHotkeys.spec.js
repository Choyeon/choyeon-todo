// Task 6 D. useGlobalHotkeys 单元测试（Web 键盘触发 + Electron 注册/回传 mock）
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePomodoroStore } from '@/stores/pomodoroStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useTaskStore } from '@/stores/taskStore'
import { useGlobalHotkeys, DEFAULT_HOTKEY_BINDS } from '@/composables/useGlobalHotkeys'

const createRouterStub = () => {
  const current = { value: { name: 'Home', path: '/' } }
  const pushed = []
  return {
    currentRoute: current,
    pushed,
    push: (arg) => {
      pushed.push(arg)
      if (typeof arg === 'string') current.value = { name: arg === '/pomodoro' ? 'Pomodoro' : 'Home', path: arg }
      else current.value = { ...current.value, ...arg }
      return Promise.resolve()
    }
  }
}

const fireKey = (opts = {}) => {
  const e = new KeyboardEvent('keydown', {
    key: opts.key || 'Enter',
    ctrlKey: !!opts.ctrl,
    metaKey: !!opts.meta,
    shiftKey: !!opts.shift,
    bubbles: true,
    cancelable: true
  })
  // jsdom 的 defaultPrevented 不会自动反映 preventDefault 调用；手动 mirror
  const origPrevent = e.preventDefault
  e.preventDefault = function () {
    Object.defineProperty(this, 'defaultPrevented', { value: true, configurable: true })
    return origPrevent.call(this)
  }
  window.dispatchEvent(e)
  return e
}

describe('useGlobalHotkeys', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useSettingsStore()
    const ts = useTaskStore()
    ts.resetAll()
    vi.useFakeTimers()
    // 清理旧状态：window.*
    try {
      localStorage.removeItem('choyeon_pomodoro_v1')
      localStorage.removeItem('choyeon_pomodoro_summary_v1')
    } catch (e) {
      /* ignore */
    }
    // 清理 window.electronAPI / window.ct
    delete window.electronAPI
    delete window.ct
  })

  afterEach(() => {
    vi.useRealTimers()
    delete window.electronAPI
    delete window.ct
  })

  // 基础导出
  test('DEFAULT_HOTKEY_BINDS 包含 9 个绑定', () => {
    expect(Array.isArray(DEFAULT_HOTKEY_BINDS)).toBe(true)
    expect(DEFAULT_HOTKEY_BINDS.length).toBe(9)
  })

  test('每个绑定都有 web、accelerator、key 字段', () => {
    for (const b of DEFAULT_HOTKEY_BINDS) {
      expect(b).toHaveProperty('key')
      expect(b).toHaveProperty('web')
      expect(b.web).toHaveProperty('key')
      expect(b).toHaveProperty('accelerator')
    }
  })

  test('Web: Ctrl+Shift+Enter 触发 startPause → 启动 timer', () => {
    const store = usePomodoroStore()
    const router = createRouterStub()
    const { destroyGlobalHotkeys, init } = useGlobalHotkeys({
      pomodoroStore: store,
      router
    })
    init()
    expect(store.isRunning).toBe(false)
    const e = fireKey({ ctrl: true, shift: true, key: 'Enter' })
    expect(e.defaultPrevented).toBe(true)
    expect(store.isRunning).toBe(true)
    destroyGlobalHotkeys()
  })

  test('Web: Ctrl+Shift+Enter 再次按下 → 暂停 timer', () => {
    const store = usePomodoroStore()
    const router = createRouterStub()
    const { destroyGlobalHotkeys, init } = useGlobalHotkeys({ pomodoroStore: store, router })
    init()
    fireKey({ ctrl: true, shift: true, key: 'Enter' })
    fireKey({ ctrl: true, shift: true, key: 'Enter' })
    expect(store.isRunning).toBe(false)
    destroyGlobalHotkeys()
  })

  test('Web: Cmd+Shift+Enter 也能触发（meta 替代 ctrl）', () => {
    const store = usePomodoroStore()
    const router = createRouterStub()
    const { destroyGlobalHotkeys, init } = useGlobalHotkeys({ pomodoroStore: store, router })
    init()
    fireKey({ meta: true, shift: true, key: 'Enter' })
    expect(store.isRunning).toBe(true)
    destroyGlobalHotkeys()
  })

  test('Web: Ctrl+Shift+Right 触发 skipStage（先启动才能 skip）', () => {
    const store = usePomodoroStore()
    const router = createRouterStub()
    const { destroyGlobalHotkeys, init } = useGlobalHotkeys({ pomodoroStore: store, router })
    init()
    fireKey({ ctrl: true, shift: true, key: 'Enter' }) // 启动
    expect(store.hasStarted).toBe(true)
    fireKey({ ctrl: true, shift: true, key: 'ArrowRight' })
    expect(store.hasStarted).toBe(false)
    destroyGlobalHotkeys()
  })

  test('Web: Ctrl+Shift+1 切到 work 模式', () => {
    const store = usePomodoroStore()
    const router = createRouterStub()
    store.switchMode('shortBreak')
    expect(store.currentMode).toBe('shortBreak')
    const { destroyGlobalHotkeys, init } = useGlobalHotkeys({ pomodoroStore: store, router })
    init()
    fireKey({ ctrl: true, shift: true, key: '1' })
    expect(store.currentMode).toBe('work')
    destroyGlobalHotkeys()
  })

  test('Web: Ctrl+Shift+2 切到 shortBreak', () => {
    const store = usePomodoroStore()
    const router = createRouterStub()
    const { destroyGlobalHotkeys, init } = useGlobalHotkeys({ pomodoroStore: store, router })
    init()
    fireKey({ ctrl: true, shift: true, key: '2' })
    expect(store.currentMode).toBe('shortBreak')
    destroyGlobalHotkeys()
  })

  test('Web: Ctrl+Shift+3 切到 longBreak', () => {
    const store = usePomodoroStore()
    const router = createRouterStub()
    const { destroyGlobalHotkeys, init } = useGlobalHotkeys({ pomodoroStore: store, router })
    init()
    fireKey({ ctrl: true, shift: true, key: '3' })
    expect(store.currentMode).toBe('longBreak')
    destroyGlobalHotkeys()
  })

  test('Web: Ctrl+Shift+4 custom → isCustomEditing = true', () => {
    const store = usePomodoroStore()
    const router = createRouterStub()
    store.isCustomEditing = false
    const { destroyGlobalHotkeys, init } = useGlobalHotkeys({ pomodoroStore: store, router })
    init()
    fireKey({ ctrl: true, shift: true, key: '4' })
    expect(store.isCustomEditing).toBe(true)
    destroyGlobalHotkeys()
  })

  test('Web: Ctrl+Shift+5 → 应用 AI 自适应（有历史记录）', () => {
    const store = usePomodoroStore()
    const router = createRouterStub()
    const settings = useSettingsStore()
    settings.pomodoroWorkMinutes = 25
    store.sessionHistory.push({
      at: Date.now(),
      mode: 'work',
      durationMin: 25,
      distractions: 0,
      deep: true,
      dateStr: new Date().toISOString().slice(0, 10)
    })
    const { destroyGlobalHotkeys, init } = useGlobalHotkeys({ pomodoroStore: store, router })
    init()
    fireKey({ ctrl: true, shift: true, key: '5' })
    // 0 干扰 → 0% < 5%，增加 10% = +3 → 28
    expect(settings.pomodoroWorkMinutes).toBe(28)
    destroyGlobalHotkeys()
  })

  test('Web: Ctrl+Shift+F 在 Home → 跳转到 /pomodoro', () => {
    const store = usePomodoroStore()
    const router = createRouterStub()
    router.currentRoute.value = { name: 'Home', path: '/' }
    const { destroyGlobalHotkeys, init } = useGlobalHotkeys({ pomodoroStore: store, router })
    init()
    fireKey({ ctrl: true, shift: true, key: 'f' })
    expect(router.pushed.includes('/pomodoro')).toBe(true)
    destroyGlobalHotkeys()
  })

  test('Web: Ctrl+Shift+F 在 PomodoroView → 跳回 /', () => {
    const store = usePomodoroStore()
    const router = createRouterStub()
    router.currentRoute.value = { name: 'Pomodoro', path: '/pomodoro' }
    const { destroyGlobalHotkeys, init } = useGlobalHotkeys({ pomodoroStore: store, router })
    init()
    fireKey({ ctrl: true, shift: true, key: 'F' })
    expect(router.pushed.includes('/')).toBe(true)
    destroyGlobalHotkeys()
  })

  test('Web: Ctrl+Shift+D → markDistraction + Snooze 10 分钟（运行中 work）', () => {
    const store = usePomodoroStore()
    store.setDuration('work', 25)
    store.toggleTimer()
    const tBefore = store.timeLeft
    const router = createRouterStub()
    const marked = []
    const origMark = store.markDistraction.bind(store)
    store.markDistraction = (k) => {
      marked.push(k)
      return origMark(k)
    }
    const { destroyGlobalHotkeys, init } = useGlobalHotkeys({
      pomodoroStore: store,
      router,
      onDistractionMarked: (p) => marked.push({ marked: 'cb', p })
    })
    init()
    fireKey({ ctrl: true, shift: true, key: 'd' })
    expect(marked.includes('userMarked')).toBe(true)
    // Snooze: 暂停并增加 600 秒
    expect(store.isRunning).toBe(false)
    expect(store.timeLeft).toBeGreaterThanOrEqual(tBefore + 600 - 2) // fuzz
    destroyGlobalHotkeys()
  })

  test('非 Ctrl/Cmd+Shift 组合不触发（确保不拦截普通键）', () => {
    const store = usePomodoroStore()
    const router = createRouterStub()
    const { destroyGlobalHotkeys, init } = useGlobalHotkeys({ pomodoroStore: store, router })
    init()
    fireKey({ key: 'Enter' }) // 无 modifier
    expect(store.isRunning).toBe(false)
    destroyGlobalHotkeys()
  })

  test('destroyGlobalHotkeys 后按键不再触发 store 变更', async () => {
    const store = usePomodoroStore()
    const router = createRouterStub()
    // 捕获 dispatchHotkey 调用次数
    const { destroyGlobalHotkeys, init, dispatchHotkey, registerHandler, unregisterHandler } =
      useGlobalHotkeys({ pomodoroStore: store, router })
    await init()
    const calls = []
    registerHandler('startPause', () => calls.push('before-destroy'))
    await destroyGlobalHotkeys()
    registerHandler('startPause', () => calls.push('after-destroy'))
    fireKey({ ctrl: true, shift: true, key: 'Enter' })
    // dispatchHotkey 已卸载 → store 不应启动
    expect(store.isRunning).toBe(false)
    expect(calls.includes('before-destroy')).toBe(false)
    expect(calls.includes('after-destroy')).toBe(false)
    unregisterHandler('startPause')
  })

  test('registerHandler / unregisterHandler 可替换默认处理', () => {
    const store = usePomodoroStore()
    const router = createRouterStub()
    const { destroyGlobalHotkeys, init, registerHandler, unregisterHandler, dispatchHotkey } =
      useGlobalHotkeys({ pomodoroStore: store, router })
    init()
    const called = []
    registerHandler('startPause', () => called.push('custom'))
    dispatchHotkey('startPause')
    expect(called.includes('custom')).toBe(true)
    unregisterHandler('startPause')
    destroyGlobalHotkeys()
  })

  test('dispatchHotkey 未知 key → 返回 false', () => {
    const store = usePomodoroStore()
    const router = createRouterStub()
    const { destroyGlobalHotkeys, init, dispatchHotkey } = useGlobalHotkeys({
      pomodoroStore: store,
      router
    })
    init()
    expect(dispatchHotkey('fooBar')).not.toBe(true)
    destroyGlobalHotkeys()
  })

  test('dispatchHotkey 已知 key → 返回 true', () => {
    const store = usePomodoroStore()
    const router = createRouterStub()
    const { destroyGlobalHotkeys, init, dispatchHotkey } = useGlobalHotkeys({
      pomodoroStore: store,
      router
    })
    init()
    expect(dispatchHotkey('startPause')).toBe(true)
    destroyGlobalHotkeys()
  })

  // ===== Electron 增强：window.ct API =====
  test('Electron: window.ct.invoke(hotkey:register) 在 init 时被调用', async () => {
    const store = usePomodoroStore()
    const router = createRouterStub()
    const calls = []
    window.ct = {
      invoke: (name, payload) => {
        calls.push({ name, payload })
        if (name === 'hotkey:register') {
          return Promise.resolve({
            ok: true,
            results: payload.map((b) => ({ key: b.key, accelerator: b.accelerator, ok: true }))
          })
        }
        if (name === 'hotkey:unregisterAll') return Promise.resolve({ ok: true })
        return Promise.resolve(null)
      },
      on: (name, cb) => {
        calls.push({ on: name })
        // 不保留回调，仅做计数
        return () => {}
      }
    }
    const { destroyGlobalHotkeys, init } = useGlobalHotkeys({ pomodoroStore: store, router })
    await init()
    expect(calls.some((c) => c.name === 'hotkey:register')).toBe(true)
    const regCall = calls.find((c) => c.name === 'hotkey:register')
    expect(Array.isArray(regCall.payload)).toBe(true)
    expect(regCall.payload.length).toBe(9)
    // 注册后还会 on('hotkey:pressed')
    expect(calls.some((c) => c.on === 'hotkey:pressed')).toBe(true)
    await destroyGlobalHotkeys()
  })

  test('Electron: window.ct.on 回调收到 hotkey:pressed → 调用 startPause', async () => {
    const store = usePomodoroStore()
    const router = createRouterStub()
    let savedCb = null
    window.ct = {
      invoke: async (name) => {
        if (name === 'hotkey:register') return { ok: true, results: [] }
        if (name === 'hotkey:unregisterAll') return { ok: true }
        return null
      },
      on: (name, cb) => {
        if (name === 'hotkey:pressed') savedCb = cb
        return () => {}
      }
    }
    const { destroyGlobalHotkeys, init } = useGlobalHotkeys({ pomodoroStore: store, router })
    await init()
    expect(typeof savedCb).toBe('function')
    savedCb({ key: 'startPause', accelerator: 'CommandOrControl+Shift+Enter' })
    expect(store.isRunning).toBe(true)
    await destroyGlobalHotkeys()
  })

  test('Electron: payload 无 key 但有 accelerator 会映射回 key', async () => {
    const store = usePomodoroStore()
    const router = createRouterStub()
    let savedCb = null
    window.ct = {
      invoke: async (name) => {
        if (name === 'hotkey:register') return { ok: true, results: [] }
        if (name === 'hotkey:unregisterAll') return { ok: true }
        return null
      },
      on: (name, cb) => {
        if (name === 'hotkey:pressed') savedCb = cb
        return () => {}
      }
    }
    const { destroyGlobalHotkeys, init } = useGlobalHotkeys({ pomodoroStore: store, router })
    await init()
    savedCb({ accelerator: 'CommandOrControl+Shift+Enter' })
    expect(store.isRunning).toBe(true)
    await destroyGlobalHotkeys()
  })

  test('Electron: 回传 skipStage 生效', async () => {
    const store = usePomodoroStore()
    const router = createRouterStub()
    let savedCb = null
    window.ct = {
      invoke: async (name) => {
        if (name === 'hotkey:register') return { ok: true, results: [] }
        if (name === 'hotkey:unregisterAll') return { ok: true }
        return null
      },
      on: (name, cb) => {
        if (name === 'hotkey:pressed') savedCb = cb
        return () => {}
      }
    }
    const { destroyGlobalHotkeys, init } = useGlobalHotkeys({ pomodoroStore: store, router })
    await init()
    store.toggleTimer() // start
    expect(store.hasStarted).toBe(true)
    savedCb({ key: 'skipStage' })
    expect(store.hasStarted).toBe(false)
    await destroyGlobalHotkeys()
  })

  test('Electron: register 返回失败不抛异常', async () => {
    const store = usePomodoroStore()
    const router = createRouterStub()
    window.ct = {
      invoke: async (name) => {
        if (name === 'hotkey:register') throw new Error('boom')
        return null
      },
      on: () => () => {}
    }
    const { destroyGlobalHotkeys, init } = useGlobalHotkeys({ pomodoroStore: store, router })
    await expect(init()).resolves.not.toThrow()
    await destroyGlobalHotkeys()
  })

  // ===== Electron 备选 API：window.electronAPI.registerHotkeys =====
  test('Electron fallback 到 electronAPI.registerHotkeys（当 ct 抛出）', async () => {
    const store = usePomodoroStore()
    const router = createRouterStub()
    const calls = []
    let unregisterCalled = false
    window.ct = {
      invoke: async () => {
        throw new Error('ct failed')
      },
      on: () => () => {}
    }
    window.electronAPI = {
      registerHotkeys: (binds) => {
        calls.push(binds)
        return Promise.resolve({ ok: true, results: [] })
      },
      unregisterAllHotkeys: () => {
        unregisterCalled = true
        return Promise.resolve({ ok: true })
      },
      onHotkeyPressed: (_cb) => () => {}
    }
    const { destroyGlobalHotkeys, init } = useGlobalHotkeys({ pomodoroStore: store, router })
    await init()
    // 调用了 fallback 的 registerHotkeys 且参数是绑定数组（9个）
    expect(calls.length).toBeGreaterThanOrEqual(1)
    expect(Array.isArray(calls[0])).toBe(true)
    expect(calls[0].length).toBe(9)
    await destroyGlobalHotkeys()
    // 销毁时 fallback 路径也应调用 unregisterAllHotkeys（ct.unregisterAll 抛出后走到 electronAPI 分支 → 由 catch 兜底）
    expect(unregisterCalled).toBe(true)
  }, 30000)

  test('Electron fallback onHotkeyPressed 回传 toggleView 生效', async () => {
    const store = usePomodoroStore()
    const router = createRouterStub()
    router.currentRoute.value = { name: 'Home', path: '/' }
    let savedCb = null
    window.electronAPI = {
      registerHotkeys: () => Promise.resolve({ ok: true, results: [] }),
      unregisterAllHotkeys: () => Promise.resolve({ ok: true }),
      onHotkeyPressed: (cb) => {
        savedCb = cb
        return () => {}
      }
    }
    const { destroyGlobalHotkeys, init } = useGlobalHotkeys({ pomodoroStore: store, router })
    await init()
    savedCb({ key: 'togglePomodoroView' })
    expect(router.pushed.includes('/pomodoro')).toBe(true)
    await destroyGlobalHotkeys()
  })

  // ===== 大小写均支持 =====
  test('Web: 小写 f 与大写 F 都能触发 togglePomodoroView', () => {
    const store = usePomodoroStore()
    const router = createRouterStub()
    const { destroyGlobalHotkeys, init } = useGlobalHotkeys({ pomodoroStore: store, router })
    init()
    fireKey({ ctrl: true, shift: true, key: 'f' })
    fireKey({ ctrl: true, shift: true, key: 'F' })
    expect(router.pushed.length).toBe(2)
    destroyGlobalHotkeys()
  })

  test('Web: 没有 modifier 不响应 Shift+1 等普通按键', () => {
    const store = usePomodoroStore()
    const router = createRouterStub()
    store.switchMode('shortBreak')
    const { destroyGlobalHotkeys, init } = useGlobalHotkeys({ pomodoroStore: store, router })
    init()
    // Shift+1（无 ctrl/meta）
    fireKey({ shift: true, key: '1' })
    expect(store.currentMode).toBe('shortBreak')
    destroyGlobalHotkeys()
  })

  test('destroyGlobalHotkeys 可重复调用不抛异常', async () => {
    const store = usePomodoroStore()
    const router = createRouterStub()
    window.electronAPI = {
      registerHotkeys: () => Promise.resolve({ ok: true, results: [] }),
      unregisterAllHotkeys: () => Promise.resolve({ ok: true }),
      onHotkeyPressed: () => () => {}
    }
    const { destroyGlobalHotkeys, init } = useGlobalHotkeys({ pomodoroStore: store, router })
    await init()
    expect(() => destroyGlobalHotkeys()).not.toThrow()
    expect(() => destroyGlobalHotkeys()).not.toThrow()
  })

  test('Electron 环境但无任何增强 API 时仅启用 Web 监听', async () => {
    const store = usePomodoroStore()
    const router = createRouterStub()
    // 模拟有 electron 版本但没有 register/on API（process.versions 只读，通过 defineProperty 覆盖）
    const origVals = Object.getOwnPropertyDescriptor(process, 'versions')
    Object.defineProperty(process, 'versions', {
      value: { ...(process.versions || {}), electron: '28.0.0' },
      writable: true,
      configurable: true
    })
    const { destroyGlobalHotkeys, init } = useGlobalHotkeys({ pomodoroStore: store, router })
    await expect(init()).resolves.not.toThrow()
    fireKey({ ctrl: true, shift: true, key: 'Enter' })
    expect(store.isRunning).toBe(true)
    delete process.versions.electron
    if (origVals) Object.defineProperty(process, 'versions', origVals)
    destroyGlobalHotkeys()
  })
})
