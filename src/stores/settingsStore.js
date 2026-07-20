import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const STORAGE_KEY = 'choyeon_settings_v1'

const DEFAULT_SETTINGS = {
  sidebarCollapsed: false,
  themeMode: 'light',
  primaryColor: '#4A90D9',
  fontSize: 'medium',
  language: 'zh-CN',
  notificationsEnabled: true,
  soundsEnabled: true,
  glassEffectEnabled: true,
  defaultReminderTime: 15,
  doNotDisturb: false,
  autoStart: false,
  closeToQuit: true,
  miniWindowEnabled: false,
  pomodoroWorkMinutes: 25,
  pomodoroBreakMinutes: 5,
  pomodoroLongBreakMinutes: 15,
  pomodoroSessionsBeforeLongBreak: 4
}

const THEME_COLORS = [
  { id: 'blue', name: '蓝色', value: '#4A90D9' },
  { id: 'red', name: '红色', value: '#EF4444' },
  { id: 'orange', name: '橙色', value: '#F97316' },
  { id: 'green', name: '绿色', value: '#22C55E' },
  { id: 'cyan', name: '青色', value: '#06B6D4' },
  { id: 'teal', name: '蓝绿', value: '#14B8A6' }
]

const hexToRgb = (hex) => {
  try {
    const h = hex.replace('#', '')
    const full =
      h.length === 3
        ? h
            .split('')
            .map((c) => c + c)
            .join('')
        : h
    const r = parseInt(full.substring(0, 2), 16)
    const g = parseInt(full.substring(2, 4), 16)
    const b = parseInt(full.substring(4, 6), 16)
    if (isNaN(r) || isNaN(g) || isNaN(b)) {
      return { r: 74, g: 144, b: 217 }
    }
    return { r, g, b }
  } catch (e) {
    return { r: 74, g: 144, b: 217 }
  }
}

const isValidHexColor = (hex) => {
  if (!hex || typeof hex !== 'string') return false
  return /^#[0-9A-Fa-f]{6}$/.test(hex)
}

const generateColorVariants = (baseColor) => {
  const { r, g, b } = hexToRgb(baseColor)

  const lighten = (amount) => {
    const nr = Math.min(255, Math.round(r + (255 - r) * amount))
    const ng = Math.min(255, Math.round(g + (255 - g) * amount))
    const nb = Math.min(255, Math.round(b + (255 - b) * amount))
    return `rgb(${nr}, ${ng}, ${nb})`
  }

  const darken = (amount) => {
    const nr = Math.round(r * (1 - amount))
    const ng = Math.round(g * (1 - amount))
    const nb = Math.round(b * (1 - amount))
    return `rgb(${nr}, ${ng}, ${nb})`
  }

  return {
    primary: baseColor,
    'primary-light': lighten(0.2),
    'primary-lighter': lighten(0.4),
    'primary-lightest': lighten(0.88),
    'primary-dark': darken(0.15),
    'primary-darker': darken(0.3)
  }
}

const LIGHT_THEME = {
  bg: '#F7F8FC',
  'bg-secondary': '#EEF0F7',
  surface: '#FFFFFF',
  'surface-elevated': '#FFFFFF',
  border: '#E5E7EB',
  'border-light': '#F0F2F8',
  'text-primary': '#1A1B25',
  'text-secondary': '#5A5D72',
  'text-tertiary': '#9A9DB0',
  'glass-bg': 'rgba(255, 255, 255, 0.8)',
  'glass-border': 'rgba(255, 255, 255, 0.5)'
}

const DARK_THEME = {
  bg: '#12121A',
  'bg-secondary': '#1A1B25',
  surface: '#22232E',
  'surface-elevated': '#2A2B38',
  border: '#2E3040',
  'border-light': '#262835',
  'text-primary': '#E8E9F0',
  'text-secondary': '#9A9DB0',
  'text-tertiary': '#6B6E80',
  'glass-bg': 'rgba(34, 35, 46, 0.85)',
  'glass-border': 'rgba(46, 48, 64, 0.6)'
}

const getSystemTheme = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const useSettingsStore = defineStore('settings', () => {
  const sidebarCollapsed = ref(DEFAULT_SETTINGS.sidebarCollapsed)
  const themeMode = ref(DEFAULT_SETTINGS.themeMode)
  const primaryColor = ref(DEFAULT_SETTINGS.primaryColor)
  const fontSize = ref(DEFAULT_SETTINGS.fontSize)
  const language = ref(DEFAULT_SETTINGS.language)
  const notificationsEnabled = ref(DEFAULT_SETTINGS.notificationsEnabled)
  const soundsEnabled = ref(DEFAULT_SETTINGS.soundsEnabled)
  const glassEffectEnabled = ref(DEFAULT_SETTINGS.glassEffectEnabled)
  const defaultReminderTime = ref(DEFAULT_SETTINGS.defaultReminderTime)
  const doNotDisturb = ref(DEFAULT_SETTINGS.doNotDisturb)
  const autoStart = ref(DEFAULT_SETTINGS.autoStart)
  const closeToQuit = ref(DEFAULT_SETTINGS.closeToQuit)
  const miniWindowEnabled = ref(DEFAULT_SETTINGS.miniWindowEnabled)
  const pomodoroWorkMinutes = ref(DEFAULT_SETTINGS.pomodoroWorkMinutes)
  const pomodoroBreakMinutes = ref(DEFAULT_SETTINGS.pomodoroBreakMinutes)
  const pomodoroLongBreakMinutes = ref(DEFAULT_SETTINGS.pomodoroLongBreakMinutes)
  const pomodoroSessionsBeforeLongBreak = ref(DEFAULT_SETTINGS.pomodoroSessionsBeforeLongBreak)

  const resolvedTheme = computed(() => {
    if (themeMode.value === 'system') {
      return getSystemTheme()
    }
    return themeMode.value
  })

  const isDark = computed(() => resolvedTheme.value === 'dark')

  const applyTheme = () => {
    if (typeof document === 'undefined') return

    try {
      const root = document.documentElement
      const colors = generateColorVariants(primaryColor.value)
      const theme = resolvedTheme.value === 'dark' ? DARK_THEME : LIGHT_THEME

      root.style.setProperty('--color-primary', colors.primary)
      root.style.setProperty('--color-primary-light', colors['primary-light'])
      root.style.setProperty('--color-primary-lighter', colors['primary-lighter'])
      root.style.setProperty('--color-primary-lightest', colors['primary-lightest'])
      root.style.setProperty('--color-primary-dark', colors['primary-dark'])
      root.style.setProperty('--color-primary-darker', colors['primary-darker'])

      Object.entries(theme).forEach(([key, value]) => {
        root.style.setProperty(`--color-${key}`, value)
      })

      if (resolvedTheme.value === 'dark') {
        root.classList.add('dark')
        root.setAttribute('data-theme', 'dark')
      } else {
        root.classList.remove('dark')
        root.setAttribute('data-theme', 'light')
      }

      root.setAttribute('data-font-size', fontSize.value)
      root.setAttribute('data-glass', glassEffectEnabled.value ? 'true' : 'false')
    } catch (e) {
      console.error('[SettingsStore] Failed to apply theme:', e)
    }
  }

  const loadFromStorage = () => {
    try {
      if (typeof localStorage === 'undefined') return
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const data = JSON.parse(saved)
        if (typeof data.sidebarCollapsed === 'boolean')
          sidebarCollapsed.value = data.sidebarCollapsed
        if (data.themeMode && ['light', 'dark', 'system'].includes(data.themeMode)) {
          themeMode.value = data.themeMode
        }
        if (data.primaryColor && isValidHexColor(data.primaryColor)) {
          primaryColor.value = data.primaryColor
        }
        if (data.fontSize && ['small', 'medium', 'large'].includes(data.fontSize)) {
          fontSize.value = data.fontSize
        }
        if (data.language && typeof data.language === 'string') {
          language.value = data.language
        }
        if (typeof data.notificationsEnabled === 'boolean') {
          notificationsEnabled.value = data.notificationsEnabled
        }
        if (typeof data.soundsEnabled === 'boolean') {
          soundsEnabled.value = data.soundsEnabled
        }
        if (typeof data.glassEffectEnabled === 'boolean') {
          glassEffectEnabled.value = data.glassEffectEnabled
        }
        if (
          typeof data.defaultReminderTime === 'number' &&
          data.defaultReminderTime > 0 &&
          data.defaultReminderTime <= 1440
        ) {
          defaultReminderTime.value = data.defaultReminderTime
        }
        if (typeof data.doNotDisturb === 'boolean') doNotDisturb.value = data.doNotDisturb
        if (typeof data.autoStart === 'boolean') autoStart.value = data.autoStart
        if (typeof data.closeToQuit === 'boolean') closeToQuit.value = data.closeToQuit
        if (typeof data.miniWindowEnabled === 'boolean') miniWindowEnabled.value = data.miniWindowEnabled
        if (
          typeof data.pomodoroWorkMinutes === 'number' &&
          data.pomodoroWorkMinutes > 0 &&
          data.pomodoroWorkMinutes <= 180
        ) {
          pomodoroWorkMinutes.value = data.pomodoroWorkMinutes
        }
        if (
          typeof data.pomodoroBreakMinutes === 'number' &&
          data.pomodoroBreakMinutes > 0 &&
          data.pomodoroBreakMinutes <= 60
        ) {
          pomodoroBreakMinutes.value = data.pomodoroBreakMinutes
        }
        if (
          typeof data.pomodoroLongBreakMinutes === 'number' &&
          data.pomodoroLongBreakMinutes > 0 &&
          data.pomodoroLongBreakMinutes <= 120
        ) {
          pomodoroLongBreakMinutes.value = data.pomodoroLongBreakMinutes
        }
        if (
          typeof data.pomodoroSessionsBeforeLongBreak === 'number' &&
          data.pomodoroSessionsBeforeLongBreak > 0 &&
          data.pomodoroSessionsBeforeLongBreak <= 12
        ) {
          pomodoroSessionsBeforeLongBreak.value = data.pomodoroSessionsBeforeLongBreak
        }
      }
      applyTheme()
    } catch (e) {
      console.error('[SettingsStore] Failed to load settings:', e)
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch (_) {}
      applyTheme()
    }
  }

  const saveToStorage = () => {
    try {
      if (typeof localStorage === 'undefined') return
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          sidebarCollapsed: sidebarCollapsed.value,
          themeMode: themeMode.value,
          primaryColor: primaryColor.value,
          fontSize: fontSize.value,
          language: language.value,
          notificationsEnabled: notificationsEnabled.value,
          soundsEnabled: soundsEnabled.value,
          glassEffectEnabled: glassEffectEnabled.value,
          defaultReminderTime: defaultReminderTime.value,
          doNotDisturb: doNotDisturb.value,
          autoStart: autoStart.value,
          closeToQuit: closeToQuit.value,
          miniWindowEnabled: miniWindowEnabled.value,
          pomodoroWorkMinutes: pomodoroWorkMinutes.value,
          pomodoroBreakMinutes: pomodoroBreakMinutes.value,
          pomodoroLongBreakMinutes: pomodoroLongBreakMinutes.value,
          pomodoroSessionsBeforeLongBreak: pomodoroSessionsBeforeLongBreak.value
        })
      )
    } catch (e) {
      console.error('[SettingsStore] Failed to save settings:', e)
    }
  }

  let saveTimeout = null
  const debouncedSave = () => {
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => {
      saveToStorage()
    }, 200)
  }

  const setupStorageWatch = (watchFn) => {
    const watchSources = [
      sidebarCollapsed,
      themeMode,
      primaryColor,
      fontSize,
      language,
      notificationsEnabled,
      soundsEnabled,
      glassEffectEnabled,
      defaultReminderTime,
      doNotDisturb,
      autoStart,
      closeToQuit,
      miniWindowEnabled,
      pomodoroWorkMinutes,
      pomodoroBreakMinutes,
      pomodoroLongBreakMinutes,
      pomodoroSessionsBeforeLongBreak
    ]
    watchFn(watchSources, debouncedSave)
  }

  const toggleSounds = () => {
    soundsEnabled.value = !soundsEnabled.value
  }

  const toggleGlassEffect = () => {
    glassEffectEnabled.value = !glassEffectEnabled.value
    applyTheme()
  }

  const setThemeMode = (mode) => {
    if (!['light', 'dark', 'system'].includes(mode)) return
    themeMode.value = mode
    applyTheme()
  }

  const setPrimaryColor = (color) => {
    if (!isValidHexColor(color)) return
    primaryColor.value = color
    applyTheme()
  }

  const setFontSize = (size) => {
    if (!['small', 'medium', 'large'].includes(size)) return
    fontSize.value = size
    applyTheme()
  }

  const toggleSidebar = () => {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  const setDoNotDisturb = async (enabled) => {
    doNotDisturb.value = !!enabled
    if (typeof window !== 'undefined' && window.electronAPI?.setDoNotDisturb) {
      try {
        await window.electronAPI.setDoNotDisturb(!!enabled)
      } catch (e) {
        console.error('[SettingsStore] Failed to sync doNotDisturb to main:', e)
      }
    }
  }

  const toggleDoNotDisturb = () => {
    setDoNotDisturb(!doNotDisturb.value)
  }

  const setAutoStart = async (enabled) => {
    autoStart.value = !!enabled
    if (typeof window !== 'undefined' && window.electronAPI?.setAutoStart) {
      try {
        await window.electronAPI.setAutoStart(!!enabled)
      } catch (e) {
        console.error('[SettingsStore] Failed to sync autoStart to main:', e)
      }
    }
  }

  const toggleAutoStart = () => {
    setAutoStart(!autoStart.value)
  }

  const setCloseToQuit = async (enabled) => {
    closeToQuit.value = !!enabled
    if (typeof window !== 'undefined' && window.electronAPI?.setCloseToQuit) {
      try {
        await window.electronAPI.setCloseToQuit(!!enabled)
      } catch (e) {
        console.error('[SettingsStore] Failed to sync closeToQuit to main:', e)
      }
    }
  }

  const toggleCloseToQuit = () => {
    setCloseToQuit(!closeToQuit.value)
  }

  const setMiniWindowEnabled = async (enabled) => {
    miniWindowEnabled.value = !!enabled
    if (typeof window !== 'undefined' && window.electronAPI?.toggleMiniWindow) {
      try {
        if (enabled) {
          window.electronAPI.openMiniWindow()
        } else {
          window.electronAPI.closeMiniWindow()
        }
      } catch (e) {
        console.error('[SettingsStore] Failed to toggle mini window:', e)
      }
    }
  }

  const toggleMiniWindow = () => {
    setMiniWindowEnabled(!miniWindowEnabled.value)
  }

  const toggleTheme = () => {
    if (themeMode.value === 'system') {
      themeMode.value = 'light'
    } else if (themeMode.value === 'light') {
      themeMode.value = 'dark'
    } else {
      themeMode.value = 'system'
    }
    applyTheme()
  }

  const resetSettings = () => {
    sidebarCollapsed.value = DEFAULT_SETTINGS.sidebarCollapsed
    themeMode.value = DEFAULT_SETTINGS.themeMode
    primaryColor.value = DEFAULT_SETTINGS.primaryColor
    fontSize.value = DEFAULT_SETTINGS.fontSize
    language.value = DEFAULT_SETTINGS.language
    notificationsEnabled.value = DEFAULT_SETTINGS.notificationsEnabled
    glassEffectEnabled.value = DEFAULT_SETTINGS.glassEffectEnabled
    defaultReminderTime.value = DEFAULT_SETTINGS.defaultReminderTime
    doNotDisturb.value = DEFAULT_SETTINGS.doNotDisturb
    autoStart.value = DEFAULT_SETTINGS.autoStart
    closeToQuit.value = DEFAULT_SETTINGS.closeToQuit
    pomodoroWorkMinutes.value = DEFAULT_SETTINGS.pomodoroWorkMinutes
    pomodoroBreakMinutes.value = DEFAULT_SETTINGS.pomodoroBreakMinutes
    pomodoroLongBreakMinutes.value = DEFAULT_SETTINGS.pomodoroLongBreakMinutes
    pomodoroSessionsBeforeLongBreak.value = DEFAULT_SETTINGS.pomodoroSessionsBeforeLongBreak
    applyTheme()
  }

  let systemThemeMediaQuery = null
  let systemThemeHandler = null
  const setupSystemThemeListener = () => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    systemThemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    systemThemeHandler = () => {
      if (themeMode.value === 'system') {
        applyTheme()
      }
    }
    if (systemThemeMediaQuery.addEventListener) {
      systemThemeMediaQuery.addEventListener('change', systemThemeHandler)
    } else if (systemThemeMediaQuery.addListener) {
      systemThemeMediaQuery.addListener(systemThemeHandler)
    }
  }

  const cleanupSystemThemeListener = () => {
    if (systemThemeMediaQuery && systemThemeHandler) {
      if (systemThemeMediaQuery.removeEventListener) {
        systemThemeMediaQuery.removeEventListener('change', systemThemeHandler)
      } else if (systemThemeMediaQuery.removeListener) {
        systemThemeMediaQuery.removeListener(systemThemeHandler)
      }
      systemThemeHandler = null
    }
  }

  return {
    sidebarCollapsed,
    themeMode,
    isDark,
    primaryColor,
    fontSize,
    language,
    notificationsEnabled,
    soundsEnabled,
    glassEffectEnabled,
    defaultReminderTime,
    doNotDisturb,
    autoStart,
    closeToQuit,
    miniWindowEnabled,
    pomodoroWorkMinutes,
    pomodoroBreakMinutes,
    pomodoroLongBreakMinutes,
    pomodoroSessionsBeforeLongBreak,
    themeColors: THEME_COLORS,
    loadFromStorage,
    applyTheme,
    setupStorageWatch,
    setupSystemThemeListener,
    cleanupSystemThemeListener,
    setThemeMode,
    setPrimaryColor,
    setFontSize,
    setDoNotDisturb,
    toggleSidebar,
    toggleTheme,
    toggleSounds,
    toggleGlassEffect,
    toggleDoNotDisturb,
    setAutoStart,
    toggleAutoStart,
    setCloseToQuit,
    toggleCloseToQuit,
    setMiniWindowEnabled,
    toggleMiniWindow,
    resetSettings
  }
})
