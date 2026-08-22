import { createApp, watch } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './styles/global.css'
import { useTaskStore } from './stores/taskStore'
import { useSettingsStore } from './stores/settingsStore'
import { usePomodoroStore } from './stores/pomodoroStore'
import { useAreaStore } from './stores/areaStore'
import { useListStore } from './stores/listStore'
import { useFilterStore } from './stores/filterStore'
import { registerSW } from 'virtual:pwa-register'
import { i18n } from './i18n'
import { setupErrorMonitoring } from './utils/errorMonitor'

const isElectron = typeof window !== 'undefined' && !!window.electronAPI

// ========== Web 环境下的 Electron API polyfill（Task 9 兜底 + 向后兼容） ==========
// 防止 `await window.electronAPI?.getAutoLaunch()` 等在非 Electron 环境抛错或返回 undefined。
// 渲染端统一可调用，不强制分平台写 if/else。
if (typeof window !== 'undefined' && !window.electronAPI) {
  const noop = () => {}
  const noopCleanup = () => () => {}
  const pFalse = () => Promise.resolve(false)
  const pFalseObj = () => Promise.resolve({ ok: true, openAtLogin: false, openAsHidden: false })
  const pDrag = () => Promise.resolve({ ok: true, webFallback: true })
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    enumerable: true,
    writable: false,
    value: {
      platform: (typeof navigator !== 'undefined' && navigator.platform) || 'web',
      versions: {
        electron: null,
        chrome: (typeof navigator !== 'undefined' && navigator.userAgent.match(/Chrome\/(\d+)/)?.[1]) || null,
        node: null
      },
      // 常用窗口控制
      minimizeWindow: noop,
      toggleMaximizeWindow: noop,
      closeWindow: noop,
      isMaximized: pFalse,
      openDevTools: noop,
      openDebugWindow: noop,
      closeDebugWindow: noop,
      minimizeDebugWindow: noop,
      sendNotification: noop,
      syncTasks: noop,
      onNotificationResponse: noopCleanup,
      onNotificationTaskClick: noopCleanup,
      onReminderAction: noopCleanup,
      onTaskNew: noopCleanup,
      onTaskFocus: noopCleanup,
      onNavigateSettings: noopCleanup,
      onDoNotDisturbChanged: noopCleanup,
      onMaximizeChange: noopCleanup,
      // 自启动：旧名字和新名字
      setAutoStart: () => Promise.resolve(false),
      getAutoStart: pFalse,
      // Task 9 B: 新自启动 API
      setAutoLaunch: pFalseObj,
      getAutoLaunch: () =>
        Promise.resolve({ ok: true, openAtLogin: false, openAsHidden: false, webFallback: true }),
      // Task 9 B: 协议 URL
      onProtocolUrl: noopCleanup,
      // Task 9 C: 拖拽
      startTaskDrag: pDrag,
      onFilesDropped: noopCleanup,
      setCloseToQuit: () => Promise.resolve(true),
      getCloseToQuit: () => Promise.resolve(true),
      setDoNotDisturb: () => Promise.resolve(false),
      getDoNotDisturb: pFalse,
      getBingWallpaper: () => Promise.resolve(null),
      setGlobalShortcutEnabled: () => Promise.resolve(false),
      getGlobalShortcutEnabled: pFalse,
      isWindowVisible: pFalse,
      showWindow: noop,
      hideWindow: noop,
      onFocusSearch: noopCleanup,
      onTogglePomodoro: noopCleanup,
      openPomodoroFullscreen: noop,
      closePomodoroFullscreen: noop,
      onPomodoroFullscreenClosed: noopCleanup,
      openPomodoroFab: noop,
      closePomodoroFab: noop,
      togglePomodoroFab: noop,
      openMiniWindow: noop,
      closeMiniWindow: noop,
      toggleMiniWindow: noop,
      showMainWindow: noop,
      toggleMiniAlwaysOnTop: () => Promise.resolve(false),
      closeQuickAdd: noop,
      syncPomodoroState: noop,
      sendPomodoroAction: noop,
      getPomodoroState: () => Promise.resolve(null),
      notifyPomodoroReady: noop,
      onPomodoroStateUpdated: noopCleanup,
      onPomodoroAction: noopCleanup,
      onPomodoroSessionComplete: noopCleanup,
      onPomodoroTimerEnded: noopCleanup,
      setPomodoroDuration: noop,
      checkForUpdates: () => Promise.resolve(null),
      downloadUpdate: () => Promise.resolve(null),
      quitAndInstallUpdate: () => Promise.resolve(null),
      onUpdateChecking: noopCleanup,
      onUpdateAvailable: noopCleanup,
      onUpdateNotAvailable: noopCleanup,
      onUpdateDownloadProgress: noopCleanup,
      onUpdateDownloaded: noopCleanup,
      onUpdateError: noopCleanup,
      onAppFocusLost: noopCleanup,
      onAppFocusGained: noopCleanup,
      onAppWindowHidden: noopCleanup,
      registerHotkeys: () => Promise.resolve({ ok: true, webFallback: true, results: [] }),
      unregisterAllHotkeys: () => Promise.resolve({ ok: true, webFallback: true }),
      onHotkeyPressed: noopCleanup,
      getAppVersion: () => Promise.resolve(null)
    }
  })
}

// 标记运行平台，用于 CSS 条件启用原生亚克力/毛玻璃透明效果
if (isElectron && window.electronAPI?.platform) {
  document.documentElement.classList.add(`platform-${window.electronAPI.platform}`)
}

const safeElectronCall = (method, ...args) => {
  if (!isElectron || !window.electronAPI?.[method]) return undefined
  try {
    return window.electronAPI[method](...args)
  } catch (e) {
    console.warn(`[Electron] ${method} call failed:`, e)
    return undefined
  }
}

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(i18n)

setupErrorMonitoring(app)

// 全局错误处理
// 安全最佳实践：统一捕获错误并记录上下文，避免静默失败
app.config.errorHandler = (err, instance, info) => {
  console.error('[App Error]', err)
  console.error('[Error Info]', info)
}

// 捕获未处理的 Promise rejection，防止静默失败
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Rejection]', event.reason)
})

// 捕获未捕获的同步错误
window.addEventListener('error', (event) => {
  console.error('[Uncaught Error]', event.error || event.message)
})

const settingsStore = useSettingsStore()
const taskStore = useTaskStore()
const pomodoroStore = usePomodoroStore()
const areaStore = useAreaStore()
const listStore = useListStore()
const filterStore = useFilterStore()

settingsStore.loadFromStorage()
settingsStore.applyTheme()

// Task 4: v3 area/list/filter 加载与持久化监听
areaStore.loadFromStorage()
listStore.loadFromStorage()
filterStore.loadFromStorage()

taskStore.loadFromStorage()
if (taskStore.tasks.length === 0) {
  let skipSample = false
  try {
    skipSample = localStorage.getItem('choyeon_skip_sample') === '1'
    if (skipSample) localStorage.removeItem('choyeon_skip_sample')
  } catch (e) {
    console.warn('[Main] Failed to check skip sample flag:', e)
  }
  if (!skipSample) {
    taskStore.initSampleData()
  }
}

pomodoroStore.setupWatchers(watch)

taskStore.setupStorageWatch(watch)
settingsStore.setupStorageWatch(watch)
areaStore.setupStorageWatch(watch)
listStore.setupStorageWatch(watch)
filterStore.setupStorageWatch(watch)

if (isElectron) {
  const syncSetting = async (getter, prop) => {
    try {
      const val = await safeElectronCall(getter)
      if (typeof val === 'boolean') {
        settingsStore[prop] = val
      }
    } catch (e) {
      console.warn(`[Electron] Failed to sync ${prop}:`, e)
    }
  }

  syncSetting('getCloseToQuit', 'closeToQuit')
  syncSetting('getAutoStart', 'autoStart')
  syncSetting('getDoNotDisturb', 'doNotDisturb')

  if (window.electronAPI?.onDoNotDisturbChanged) {
    try {
      window.electronAPI.onDoNotDisturbChanged((enabled) => {
        if (typeof enabled === 'boolean') {
          settingsStore.doNotDisturb = enabled
        }
      })
    } catch (e) {
      console.warn('[Electron] Failed to setup doNotDisturb listener:', e)
    }
  }

  if (window.electronAPI?.onTogglePomodoro) {
    try {
      window.electronAPI.onTogglePomodoro(() => {
        pomodoroStore.toggleTimer()
      })
    } catch (e) {
      console.warn('[Electron] Failed to setup pomodoro shortcut listener:', e)
    }
  }

  pomodoroStore.initElectronMode()
} else {
  pomodoroStore.initWebMode()
}

settingsStore.setupSystemThemeListener()

app.mount('#app')

if (!isElectron) {
  registerSW({
    immediate: true,
    onOfflineReady() {
      console.warn('[PWA] App ready for offline use')
    },
    onNeedRefresh() {
      console.warn('[PWA] New content available, refreshing...')
      window.location.reload()
    },
    onRegisteredSW(swUrl) {
      console.warn('[PWA] Service Worker registered:', swUrl)
    },
    onRegisterError(error) {
      console.warn('[PWA] Service Worker registration failed:', error)
    }
  })
}
