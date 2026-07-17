import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useSettingsStore } from './settingsStore'
import { useTaskStore } from './taskStore'

const STORAGE_KEY = 'choyeon_pomodoro_v1'

export const usePomodoroStore = defineStore('pomodoro', () => {
  const settingsStore = useSettingsStore()
  const taskStore = useTaskStore()

  const currentMode = ref('work')
  const timeLeft = ref(settingsStore.pomodoroWorkMinutes * 60)
  const isRunning = ref(false)
  const hasStarted = ref(false)
  const completedPomodoros = ref(0)
  const isCustomEditing = ref(false)
  const customMinutes = ref(settingsStore.pomodoroWorkMinutes)

  const lastTickTimestamp = ref(null)
  const lastSyncState = ref(null)
  const lastSyncTime = ref(null)

  let timerInterval = null
  let audioContext = null
  let stateUnsubscribe = null
  let sessionCompleteUnsubscribe = null
  let timerEndedUnsubscribe = null
  let watchersSetup = false

  const isElectron = typeof window !== 'undefined' && !!window.electronAPI

  const getSlaveParam = () => {
    if (typeof window === 'undefined') return false
    if (new URLSearchParams(window.location.search).has('slave')) return true
    const hash = window.location.hash
    const queryIndex = hash.indexOf('?')
    if (queryIndex >= 0) {
      const queryString = hash.substring(queryIndex + 1)
      return new URLSearchParams(queryString).has('slave')
    }
    return false
  }

  const isSlaveWindow = isElectron && getSlaveParam()

  const modes = [
    { value: 'work', label: '专注' },
    { value: 'shortBreak', label: '短休息' },
    { value: 'longBreak', label: '长休息' }
  ]

  const currentModeLabel = computed(() => {
    const mode = modes.find(m => m.value === currentMode.value)
    return mode ? mode.label : ''
  })

  const currentColor = computed(() => {
    switch (currentMode.value) {
      case 'work': return '#EF4444'
      case 'shortBreak': return '#22C55E'
      case 'longBreak': return '#06B6D4'
      default: return '#EF4444'
    }
  })

  const totalTime = computed(() => {
    switch (currentMode.value) {
      case 'work': return settingsStore.pomodoroWorkMinutes * 60
      case 'shortBreak': return settingsStore.pomodoroBreakMinutes * 60
      case 'longBreak': return settingsStore.pomodoroLongBreakMinutes * 60
      default: return settingsStore.pomodoroWorkMinutes * 60
    }
  })

  const formattedTime = computed(() => {
    const minutes = Math.floor(timeLeft.value / 60)
    const seconds = timeLeft.value % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  })

  const canSkip = computed(() => hasStarted.value)

  const playBeep = (type = 'default') => {
    if (!settingsStore.soundsEnabled) return
    try {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)()
      }
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      const configs = {
        default: { freq: 800, type: 'sine', duration: 0.5, volume: 0.3 },
        complete: { freq: 600, type: 'sine', duration: 0.3, volume: 0.3 },
        success: { freq: 523, type: 'sine', duration: 0.15, volume: 0.25 }
      }

      const config = configs[type] || configs.default
      oscillator.frequency.value = config.freq
      oscillator.type = config.type
      gainNode.gain.setValueAtTime(config.volume, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + config.duration)
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + config.duration)

      if (type === 'success') {
        setTimeout(() => {
          const osc2 = audioContext.createOscillator()
          const gain2 = audioContext.createGain()
          osc2.connect(gain2)
          gain2.connect(audioContext.destination)
          osc2.frequency.value = 659
          osc2.type = 'sine'
          gain2.gain.setValueAtTime(0.25, audioContext.currentTime)
          gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)
          osc2.start(audioContext.currentTime)
          osc2.stop(audioContext.currentTime + 0.2)

          setTimeout(() => {
            const osc3 = audioContext.createOscillator()
            const gain3 = audioContext.createGain()
            osc3.connect(gain3)
            gain3.connect(audioContext.destination)
            osc3.frequency.value = 784
            osc3.type = 'sine'
            gain3.gain.setValueAtTime(0.3, audioContext.currentTime)
            gain3.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
            osc3.start(audioContext.currentTime)
            osc3.stop(audioContext.currentTime + 0.3)
          }, 150)
        }, 150)
      }
    } catch (e) {
      console.warn('[Pomodoro] Audio not available:', e)
    }
  }

  const showNotification = (title, body) => {
    if (!settingsStore.notificationsEnabled) return
    if (typeof Notification === 'undefined') return
    if (Notification.permission === 'granted') {
      try {
        if (window.electronAPI?.sendNotification) {
          window.electronAPI.sendNotification(title, body)
        } else {
          new Notification(title, { body, icon: 'favicon.svg' })
        }
      } catch (e) {
        console.warn('[Pomodoro] Notification failed:', e)
      }
    }
  }

  const requestNotificationPermission = () => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
  }

  const buildState = () => ({
    currentMode: currentMode.value,
    timeLeft: timeLeft.value,
    totalTime: totalTime.value,
    isRunning: isRunning.value,
    hasStarted: hasStarted.value,
    completedPomodoros: completedPomodoros.value,
    currentModeLabel: currentModeLabel.value,
    currentColor: currentColor.value,
    formattedTime: formattedTime.value,
    syncTimestamp: isRunning.value ? Date.now() : null
  })

  const sendAction = (action) => {
    if (!isElectron) return
    if (window.electronAPI?.sendPomodoroAction) {
      try {
        window.electronAPI.sendPomodoroAction(action)
      } catch (e) {
        console.warn('[Pomodoro] Failed to send action:', e)
      }
    }
  }

  const startLocalInterpolation = () => {
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }

    if (!isRunning.value) return

    const interpolateTick = () => {
      if (!isRunning.value || !lastSyncState.value || !lastSyncTime.value) {
        return
      }

      const now = Date.now()
      const elapsed = Math.floor((now - lastSyncTime.value) / 1000)
      const interpolatedTime = Math.max(0, lastSyncState.value.timeLeft - elapsed)

      if (timeLeft.value !== interpolatedTime) {
        timeLeft.value = interpolatedTime
      }
    }

    timerInterval = setInterval(interpolateTick, 200)
  }

  const stopLocalInterpolation = () => {
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
  }

  const applyState = (state) => {
    if (!state) return

    lastSyncState.value = { ...state }
    lastSyncTime.value = state.syncTimestamp || Date.now()

    if (state.currentMode && modes.some(m => m.value === state.currentMode)) {
      if (currentMode.value !== state.currentMode) {
        currentMode.value = state.currentMode
        customMinutes.value = currentMode.value === 'work'
          ? settingsStore.pomodoroWorkMinutes
          : currentMode.value === 'shortBreak'
            ? settingsStore.pomodoroBreakMinutes
            : settingsStore.pomodoroLongBreakMinutes
      }
    }

    if (typeof state.timeLeft === 'number') {
      let adjustedTimeLeft = state.timeLeft
      if (state.isRunning && state.syncTimestamp) {
        const elapsed = Math.floor((Date.now() - state.syncTimestamp) / 1000)
        adjustedTimeLeft = Math.max(0, state.timeLeft - elapsed)
      }
      if (timeLeft.value !== adjustedTimeLeft) {
        timeLeft.value = adjustedTimeLeft
      }
    }

    if (typeof state.isRunning === 'boolean') {
      if (isRunning.value !== state.isRunning) {
        isRunning.value = state.isRunning
        if (isRunning.value) {
          startLocalInterpolation()
        } else {
          stopLocalInterpolation()
        }
      }
    }

    if (typeof state.hasStarted === 'boolean') {
      if (hasStarted.value !== state.hasStarted) {
        hasStarted.value = state.hasStarted
      }
    }

    if (typeof state.completedPomodoros === 'number') {
      if (completedPomodoros.value !== state.completedPomodoros) {
        completedPomodoros.value = state.completedPomodoros
      }
    }
  }

  const handleSessionComplete = (data) => {
    playBeep()
    if (data?.wasWorkMode) {
      showNotification('专注完成！', '休息一下吧')
    } else {
      showNotification('休息结束！', '开始新的专注吧')
    }
  }

  const handleTimerEnded = (data) => {
    if (isSlaveWindow) return
    
    const wasWorkMode = data?.currentMode === 'work'
    
    playBeep('complete')
    
    if (wasWorkMode) {
      if (taskStore.focusedTaskId && hasStarted.value) {
        const elapsed = totalTime.value - timeLeft.value
        taskStore.addPomodoroSession(taskStore.focusedTaskId, elapsed)
      }
      completedPomodoros.value++
      showNotification('专注完成！', '休息一下吧')

      const sessionsBeforeLongBreak = settingsStore.pomodoroSessionsBeforeLongBreak
      let nextMode
      if (completedPomodoros.value % sessionsBeforeLongBreak === 0) {
        nextMode = 'longBreak'
      } else {
        nextMode = 'shortBreak'
      }
      sendAction('switch' + nextMode.charAt(0).toUpperCase() + nextMode.slice(1))
    } else {
      showNotification('休息结束！', '开始新的专注吧')
      sendAction('switchWork')
    }
    
    saveToStorage()
  }

  const tick = () => {
    const now = Date.now()
    if (lastTickTimestamp.value) {
      const elapsed = Math.floor((now - lastTickTimestamp.value) / 1000)
      if (elapsed > 0) {
        timeLeft.value = Math.max(0, timeLeft.value - elapsed)
      }
    }
    lastTickTimestamp.value = now

    if (timeLeft.value <= 0) {
      completeSessionInternal()
    }
  }

  const startTimerInternal = () => {
    if (timeLeft.value <= 0) return
    hasStarted.value = true
    isRunning.value = true
    lastTickTimestamp.value = Date.now()

    if (timerInterval) clearInterval(timerInterval)
    timerInterval = setInterval(tick, 200)

    saveToStorage()
  }

  const pauseTimerInternal = () => {
    isRunning.value = false
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
    lastTickTimestamp.value = null
    saveToStorage()
  }

  const toggleTimerInternal = () => {
    if (isRunning.value) {
      pauseTimerInternal()
    } else {
      startTimerInternal()
    }
  }

  const resetTimerInternal = () => {
    pauseTimerInternal()
    hasStarted.value = false
    timeLeft.value = totalTime.value
    saveToStorage()
  }

  const skipTimerInternal = () => {
    if (!canSkip.value) return
    resetTimerInternal()
  }

  const completeSessionInternal = () => {
    const wasRunning = hasStarted.value
    pauseTimerInternal()
    hasStarted.value = false
    playBeep()

    if (currentMode.value === 'work') {
      if (taskStore.focusedTaskId && wasRunning) {
        const elapsed = totalTime.value - timeLeft.value
        taskStore.addPomodoroSession(taskStore.focusedTaskId, elapsed)
      }
      completedPomodoros.value++
      showNotification('专注完成！', '休息一下吧')

      const sessionsBeforeLongBreak = settingsStore.pomodoroSessionsBeforeLongBreak
      if (completedPomodoros.value % sessionsBeforeLongBreak === 0) {
        switchModeInternal('longBreak')
      } else {
        switchModeInternal('shortBreak')
      }
    } else {
      showNotification('休息结束！', '开始新的专注吧')
      switchModeInternal('work')
    }
  }

  const switchModeInternal = (mode) => {
    if (currentMode.value === mode) return
    pauseTimerInternal()
    hasStarted.value = false
    currentMode.value = mode
    timeLeft.value = totalTime.value
    customMinutes.value = currentMode.value === 'work'
      ? settingsStore.pomodoroWorkMinutes
      : currentMode.value === 'shortBreak'
        ? settingsStore.pomodoroBreakMinutes
        : settingsStore.pomodoroLongBreakMinutes
    saveToStorage()
  }

  const toggleTimer = () => {
    if (isElectron) {
      sendAction('toggle')
      return
    }
    toggleTimerInternal()
  }

  const resetTimer = () => {
    if (isElectron) {
      sendAction('reset')
      return
    }
    resetTimerInternal()
  }

  const skipTimer = () => {
    if (isElectron) {
      sendAction('skip')
      return
    }
    skipTimerInternal()
  }

  const switchMode = (mode) => {
    if (isElectron) {
      if (mode === 'work') sendAction('switchWork')
      else if (mode === 'shortBreak') sendAction('switchShortBreak')
      else if (mode === 'longBreak') sendAction('switchLongBreak')
      return
    }
    switchModeInternal(mode)
  }

  const applyCustomDuration = () => {
    if (customMinutes.value < 1 || customMinutes.value > 180) return
    if (currentMode.value === 'work') {
      settingsStore.pomodoroWorkMinutes = customMinutes.value
    } else if (currentMode.value === 'shortBreak') {
      settingsStore.pomodoroBreakMinutes = customMinutes.value
    } else {
      settingsStore.pomodoroLongBreakMinutes = customMinutes.value
    }
    timeLeft.value = customMinutes.value * 60
    isCustomEditing.value = false
    saveToStorage()

    if (isElectron && !isRunning.value) {
      if (window.electronAPI?.setPomodoroDuration) {
        try {
          window.electronAPI.setPomodoroDuration(currentMode.value, customMinutes.value)
        } catch (e) {
          console.warn('[Pomodoro] Failed to set duration:', e)
        }
      }
    }
  }

  const saveToStorage = () => {
    if (isSlaveWindow) return
    try {
      if (typeof localStorage === 'undefined') return
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        currentMode: currentMode.value,
        timeLeft: timeLeft.value,
        isRunning: false,
        hasStarted: hasStarted.value,
        completedPomodoros: completedPomodoros.value
      }))
    } catch (e) {
      console.warn('[Pomodoro] Failed to save to storage:', e)
    }
  }

  const loadFromStorage = () => {
    if (isSlaveWindow) return
    try {
      if (typeof localStorage === 'undefined') return
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const data = JSON.parse(saved)
        if (data.currentMode && modes.some(m => m.value === data.currentMode)) {
          currentMode.value = data.currentMode
        }
        if (typeof data.timeLeft === 'number' && data.timeLeft > 0) {
          timeLeft.value = Math.min(data.timeLeft, totalTime.value)
        }
        if (typeof data.hasStarted === 'boolean') {
          hasStarted.value = data.hasStarted
        }
        if (typeof data.completedPomodoros === 'number') {
          completedPomodoros.value = Math.max(0, data.completedPomodoros)
        }
        customMinutes.value = currentMode.value === 'work'
          ? settingsStore.pomodoroWorkMinutes
          : currentMode.value === 'shortBreak'
            ? settingsStore.pomodoroBreakMinutes
            : settingsStore.pomodoroLongBreakMinutes
      }
    } catch (e) {
      console.warn('[Pomodoro] Failed to load from storage:', e)
    }
  }

  const initElectronMode = () => {
    if (!isElectron) return

    if (!isSlaveWindow) {
      loadFromStorage()
    }

    if (window.electronAPI?.onPomodoroStateUpdated) {
      try {
        stateUnsubscribe = window.electronAPI.onPomodoroStateUpdated((state) => {
          applyState(state)
        })
      } catch (e) {
        console.warn('[Pomodoro] Failed to subscribe state updates:', e)
      }
    }

    if (window.electronAPI?.onPomodoroSessionComplete) {
      try {
        sessionCompleteUnsubscribe = window.electronAPI.onPomodoroSessionComplete((data) => {
          handleSessionComplete(data)
        })
      } catch (e) {
        console.warn('[Pomodoro] Failed to subscribe session complete:', e)
      }
    }

    if (window.electronAPI?.onPomodoroTimerEnded) {
      try {
        timerEndedUnsubscribe = window.electronAPI.onPomodoroTimerEnded((data) => {
          handleTimerEnded(data)
        })
      } catch (e) {
        console.warn('[Pomodoro] Failed to subscribe timer ended:', e)
      }
    }

    if (!isSlaveWindow) {
      if (window.electronAPI?.syncPomodoroState) {
        try {
          window.electronAPI.syncPomodoroState(buildState())
        } catch (e) {
          console.warn('[Pomodoro] Failed to sync initial state:', e)
        }
      }
    } else {
      if (window.electronAPI?.notifyPomodoroReady) {
        try {
          window.electronAPI.notifyPomodoroReady()
        } catch (e) {
          console.warn('[Pomodoro] Failed to notify ready:', e)
        }
      }
    }
  }

  const initWebMode = () => {
    if (isElectron) return
    loadFromStorage()
  }

  const setupWatchers = (watchFn) => {
    if (watchersSetup) return
    watchersSetup = true

    watchFn(() => settingsStore.pomodoroWorkMinutes, () => {
      if (currentMode.value === 'work' && !isRunning.value && !hasStarted.value) {
        timeLeft.value = settingsStore.pomodoroWorkMinutes * 60
      }
    })

    watchFn(() => settingsStore.pomodoroBreakMinutes, () => {
      if (currentMode.value === 'shortBreak' && !isRunning.value && !hasStarted.value) {
        timeLeft.value = settingsStore.pomodoroBreakMinutes * 60
      }
    })

    watchFn(() => settingsStore.pomodoroLongBreakMinutes, () => {
      if (currentMode.value === 'longBreak' && !isRunning.value && !hasStarted.value) {
        timeLeft.value = settingsStore.pomodoroLongBreakMinutes * 60
      }
    })

    if (!isElectron) {
      watchFn(
        () => [timeLeft.value, isRunning.value, currentMode.value, hasStarted.value, completedPomodoros.value],
        () => {
          saveToStorage()
        }
      )
    }
  }

  const toggleFab = () => {
    if (window.electronAPI?.togglePomodoroFab) {
      try {
        window.electronAPI.togglePomodoroFab()
      } catch (e) {
        console.warn('[Pomodoro] Failed to toggle fab:', e)
      }
    }
  }

  const cleanup = () => {
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
    if (stateUnsubscribe) {
      stateUnsubscribe()
      stateUnsubscribe = null
    }
    if (sessionCompleteUnsubscribe) {
      sessionCompleteUnsubscribe()
      sessionCompleteUnsubscribe = null
    }
    if (timerEndedUnsubscribe) {
      timerEndedUnsubscribe()
      timerEndedUnsubscribe = null
    }
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close().catch(() => {})
      audioContext = null
    }
  }

  return {
    modes,
    currentMode,
    currentModeLabel,
    currentColor,
    totalTime,
    timeLeft,
    formattedTime,
    isRunning,
    hasStarted,
    completedPomodoros,
    isCustomEditing,
    customMinutes,
    canSkip,
    isSlaveWindow,
    toggleTimer,
    resetTimer,
    skipTimer,
    switchMode,
    applyCustomDuration,
    requestNotificationPermission,
    setupWatchers,
    toggleFab,
    initElectronMode,
    initWebMode,
    cleanup
  }
})
