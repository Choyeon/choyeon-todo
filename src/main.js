import { createApp, watch } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './styles/global.css'
import { useTaskStore } from './stores/taskStore'
import { useSettingsStore } from './stores/settingsStore'
import { usePomodoroStore } from './stores/pomodoroStore'
import { useReminderScheduler } from './composables/useReminderScheduler'
import { registerSW } from 'virtual:pwa-register'
import { i18n } from './i18n'
import { setupErrorMonitoring } from './utils/errorMonitor'

const isElectron = typeof window !== 'undefined' && !!window.electronAPI

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

settingsStore.loadFromStorage()
settingsStore.applyTheme()

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

if (isElectron && window.electronAPI?.sendNotification) {
  try {
    const { start } = useReminderScheduler()
    start()
  } catch (e) {
    console.warn('[Main] Failed to start reminder scheduler:', e)
  }
}
