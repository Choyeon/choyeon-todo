import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useSettingsStore } from './settingsStore'
import { useTaskStore } from './taskStore'
import { getTodayStr, formatDateStr, addDays } from '../utils/date'

const STORAGE_KEY = 'choyeon_pomodoro_v1'
const SUMMARY_STORAGE_KEY = 'choyeon_pomodoro_summary_v1'
const INTERRUPTION_LOG_LIMIT = 200
const SESSION_HISTORY_LIMIT = 2000

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
    const mode = modes.find((m) => m.value === currentMode.value)
    return mode ? mode.label : ''
  })

  const currentColor = computed(() => {
    switch (currentMode.value) {
      case 'work':
        return '#EF4444'
      case 'shortBreak':
        return '#22C55E'
      case 'longBreak':
        return '#06B6D4'
      default:
        return '#EF4444'
    }
  })

  const totalTime = computed(() => {
    switch (currentMode.value) {
      case 'work':
        return settingsStore.pomodoroWorkMinutes * 60
      case 'shortBreak':
        return settingsStore.pomodoroBreakMinutes * 60
      case 'longBreak':
        return settingsStore.pomodoroLongBreakMinutes * 60
      default:
        return settingsStore.pomodoroWorkMinutes * 60
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

    if (state.currentMode && modes.some((m) => m.value === state.currentMode)) {
      if (currentMode.value !== state.currentMode) {
        currentMode.value = state.currentMode
        customMinutes.value =
          currentMode.value === 'work'
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

  // ===== 会话完成去重：避免 handleTimerEnded (主进程广播) 与本地 completeSessionInternal 重复记账 =====
  // Electron 模式下，主进程触发 timerEnded 后由 applyState 驱动状态切换，
  // 此时 completeSessionInternal 不得再重复增加 completedPomodoros / 重复记账。
  let sessionCompletedGuardKey = null
  const buildSessionKey = (state) =>
    `${state?.currentMode ?? currentMode.value}:${state?.syncTimestamp ?? 0}:${state?.timeLeft ?? timeLeft.value}`

  const handleTimerEnded = (data) => {
    if (isSlaveWindow) return
    // 标记：本次会话完成已由主进程 timerEnded 事件统一处理，
    // 后续 applyState 触发的 completeSessionInternal 跳过增量部分，仅做状态清理。
    sessionCompletedGuardKey = buildSessionKey({
      currentMode: data?.currentMode,
      syncTimestamp: Date.now(),
      timeLeft: 0
    })

    const wasWorkMode = data?.currentMode === 'work'

    playBeep('complete')

    if (wasWorkMode) {
      if (taskStore.focusedTaskId && hasStarted.value) {
        const elapsed = Math.max(0, totalTime.value - timeLeft.value)
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

    // 通知其他订阅者（例如悬浮/Fab 窗口）播放提示音
    try {
      handleSessionComplete({ wasWorkMode })
    } catch (e) {
      console.warn('[Pomodoro] handleSessionComplete error:', e)
    }

    saveToStorage()
  }

  const tick = () => {
    const now = Date.now()
    if (lastTickTimestamp.value) {
      const elapsed = Math.floor((now - lastTickTimestamp.value) / 1000)
      if (elapsed > 0) {
        timeLeft.value = Math.max(0, timeLeft.value - elapsed)
        lastTickTimestamp.value = now
      }
    } else {
      lastTickTimestamp.value = now
    }

    if (timeLeft.value <= 0) {
      completeSessionInternal()
    }
  }

  const startTimerInternal = () => {
    if (timeLeft.value <= 0) return
    if (!hasStarted.value) {
      // 新会话开始：记录干扰快照 + 开始时间
      sessionStartDistractions = sessionDistractions.value
      sessionStartAt = Date.now()
    }
    hasStarted.value = true
    isRunning.value = true
    lastTickTimestamp.value = Date.now()

    if (timerInterval) clearInterval(timerInterval)
    timerInterval = setInterval(tick, 200)

    saveToStorage()
    saveSummaryToStorage()
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
    // 放弃当前会话：清空 session 级别的干扰计数快照（不等于全局 log）
    sessionStartAt = null
    sessionStartDistractions = sessionDistractions.value
    saveToStorage()
    saveSummaryToStorage()
  }

  const skipTimerInternal = () => {
    if (!canSkip.value) return
    resetTimerInternal()
  }

  const completeSessionInternal = () => {
    const wasRunning = hasStarted.value
    const completedMode = currentMode.value
    const sessionDurationSec = Math.max(0, totalTime.value - timeLeft.value)
    const sessionDurationMin = Math.round((sessionDurationSec || totalTime.value) / 60)
    const sessDistractions = Math.max(0, sessionDistractions.value - sessionStartDistractions)
    const wasWork = completedMode === 'work'
    const deep = wasWork && sessionDurationMin >= 25 && sessDistractions === 0

    // Electron 模式下，若主进程 timerEnded 已先处理（通过 handleTimerEnded），
    // 本函数只负责清理运行时状态，不再重复计数/通知/切换模式，防止双重互斥。
    const handledByMain = isElectron && sessionCompletedGuardKey !== null
    pauseTimerInternal()
    hasStarted.value = false

    // 无论是否 handledByMain，只要是真实完成的会话都记入 sessionHistory（单次会话只记一次由 guard 保证）
    if (!handledByMain) {
      if (wasRunning || sessionStartAt) {
        pushSessionHistory({
          at: sessionStartAt || Date.now() - sessionDurationMin * 60 * 1000,
          mode: completedMode,
          durationMin: sessionDurationMin,
          distractions: sessDistractions,
          taskId: currentTaskId.value || taskStore?.focusedTaskId || null,
          deep,
          completedAt: Date.now(),
          dateStr: getTodayStr()
        })
      }
    }

    // sessionDistractions 只重置 sessionStart 快照，不清空总累计（摘要用）
    sessionStartAt = null
    sessionStartDistractions = sessionDistractions.value
    saveSummaryToStorage()

    // 清除一次性去重标志
    if (handledByMain) {
      sessionCompletedGuardKey = null
      timeLeft.value = 0
      return
    }
    playBeep()

    if (wasWork) {
      if (taskStore.focusedTaskId && wasRunning) {
        const elapsed = Math.max(0, sessionDurationSec)
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
    customMinutes.value =
      currentMode.value === 'work'
        ? settingsStore.pomodoroWorkMinutes
        : currentMode.value === 'shortBreak'
          ? settingsStore.pomodoroBreakMinutes
          : settingsStore.pomodoroLongBreakMinutes
    sessionStartAt = null
    sessionStartDistractions = sessionDistractions.value
    saveToStorage()
    saveSummaryToStorage()
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
    saveSummaryToStorage()

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

  // ===== Task 6 A. setDuration：FAB 可调时长 =====
  const VALID_MODES = ['work', 'shortBreak', 'longBreak']
  const setDuration = (mode, minutes) => {
    if (!VALID_MODES.includes(mode)) return false
    const mins = Math.max(1, Math.min(180, Math.floor(Number(minutes) || 0)))
    if (mins < 1) return false
    if (mode === 'work') settingsStore.pomodoroWorkMinutes = mins
    else if (mode === 'shortBreak') settingsStore.pomodoroBreakMinutes = mins
    else settingsStore.pomodoroLongBreakMinutes = mins
    if (!isRunning.value && !hasStarted.value && currentMode.value === mode) {
      timeLeft.value = mins * 60
    }
    customMinutes.value =
      currentMode.value === 'work'
        ? settingsStore.pomodoroWorkMinutes
        : currentMode.value === 'shortBreak'
          ? settingsStore.pomodoroBreakMinutes
          : settingsStore.pomodoroLongBreakMinutes
    saveToStorage()
    saveSummaryToStorage()
    if (isElectron) {
      if (window.electronAPI?.setPomodoroDuration) {
        try {
          window.electronAPI.setPomodoroDuration(mode, mins)
        } catch (e) {
          console.warn('[Pomodoro] Failed to set duration:', e)
        }
      }
    }
    return true
  }

  const modeDurations = computed(() => ({
    work: settingsStore.pomodoroWorkMinutes,
    shortBreak: settingsStore.pomodoroBreakMinutes,
    longBreak: settingsStore.pomodoroLongBreakMinutes,
    custom: customMinutes.value
  }))

  // ===== Task 6 A. markDistraction =====
  const markDistraction = (kind = 'manual') => {
    const allowedKinds = ['appSwitch', 'focusLost', 'manual', 'userMarked']
    const finalKind = allowedKinds.includes(kind) ? kind : 'manual'
    sessionDistractions.value += 1
    interruptionLog.value.push({ at: Date.now(), kind: finalKind })
    if (interruptionLog.value.length > INTERRUPTION_LOG_LIMIT) {
      interruptionLog.value.splice(0, interruptionLog.value.length - INTERRUPTION_LOG_LIMIT)
    }
    saveSummaryToStorage()
    return true
  }

  // ===== Task 6 A. 绑定当前任务 =====
  const bindCurrentTask = (taskId) => {
    currentTaskId.value = taskId || null
    if (taskStore && typeof taskStore.focusTask === 'function') {
      taskId ? taskStore.focusTask(taskId) : taskStore.unfocusTask?.()
    }
    saveSummaryToStorage()
    return true
  }
  const unbindCurrentTask = () => bindCurrentTask(null)

  // ===== Task 6 A. sessionHistory 入队（带上限） =====
  const pushSessionHistory = (entry) => {
    if (!entry) return
    sessionHistory.value.push(entry)
    if (sessionHistory.value.length > SESSION_HISTORY_LIMIT) {
      sessionHistory.value.splice(0, sessionHistory.value.length - SESSION_HISTORY_LIMIT)
    }
  }

  // ===== Task 6 A. Streak 派生计算 =====
  const parseDateLocal = (str) => {
    if (!str) return new Date()
    const [y, m, d] = String(str).split('-').map(Number)
    if (!y || !m || !d) return new Date(str)
    return new Date(y, m - 1, d)
  }
  // ISO 周键（YYYY-Www），周从周一开始
  const getWeekKey = (dStr) => {
    const dt = dStr instanceof Date ? dStr : parseDateLocal(dStr)
    const tmp = new Date(dt.valueOf())
    tmp.setHours(0, 0, 0, 0)
    tmp.setDate(tmp.getDate() + 4 - (tmp.getDay() || 7))
    const yearStart = new Date(tmp.getFullYear(), 0, 1)
    const weekNo = Math.ceil(((tmp - yearStart) / 86400000 + 1) / 7)
    return `${tmp.getFullYear()}-W${String(weekNo).padStart(2, '0')}`
  }
  const computeStreaks = (history = sessionHistory.value, todayStr = getTodayStr()) => {
    const workDaysSet = new Set()
    history.forEach((h) => {
      if (h.mode === 'work' && h.durationMin > 0) {
        workDaysSet.add(h.dateStr || formatDateStr(new Date(h.at || h.completedAt || Date.now())))
      }
    })
    let dayStreak = 0
    let cursor = todayStr
    while (workDaysSet.has(cursor)) {
      dayStreak++
      cursor = addDays(cursor, -1)
    }
    const weekKeys = new Set()
    history.forEach((h) => {
      if (h.mode === 'work' && h.durationMin > 0) {
        const ds = h.dateStr || formatDateStr(new Date(h.at || h.completedAt || Date.now()))
        weekKeys.add(getWeekKey(ds))
      }
    })
    let weekStreak = 0
    let today = parseDateLocal(todayStr)
    // 向前逐周查找
    while (true) {
      const wk = getWeekKey(today)
      if (weekKeys.has(wk)) {
        weekStreak++
        today = new Date(today.valueOf() - 7 * 86400000)
      } else {
        break
      }
    }
    return { dayStreak, weekStreak }
  }

  // ===== Task 6 A. getFocusSummary =====
  const sessionsInRange = (range) => {
    const now = Date.now()
    let days = 1
    if (range === 'last7') days = 7
    else if (range === 'last30') days = 30
    const cutoff = now - (days - 1) * 86400000
    const today = parseDateLocal(getTodayStr())
    const cutoffDate = new Date(today.valueOf() - (days - 1) * 86400000)
    const cutoffStr = formatDateStr(cutoffDate)
    return sessionHistory.value.filter((h) => {
      const ds = h.dateStr || formatDateStr(new Date(h.at || h.completedAt || now))
      return ds >= cutoffStr
    })
  }

  const countTasksCompletedInRange = (range) => {
    // 使用 taskStore 的 activity log 近似：今日/范围 pomodoroComplete 且后续 completed
    // 简化实现：统计任务中 pomodoroSessions>0 且 completed 且 completedAt 在范围内
    if (!taskStore || !Array.isArray(taskStore.tasks)) return 0
    const now = Date.now()
    let days = 1
    if (range === 'last7') days = 7
    else if (range === 'last30') days = 30
    const cutoff = now - days * 86400000
    return taskStore.tasks.filter((t) => {
      if (!t.completed) return false
      if ((t.pomodoroSessions || 0) < 1) return false
      const cat = t.completedAt || t.updatedAt || t.createdAt || 0
      return cat >= cutoff
    }).length
  }

  const getFocusSummary = (range = 'today') => {
    const validRanges = ['today', 'last7', 'last30']
    const r = validRanges.includes(range) ? range : 'today'
    const workSessions = sessionsInRange(r).filter((h) => h.mode === 'work')
    const totalMinutes = workSessions.reduce((s, h) => s + (h.durationMin || 0), 0)
    const sessions = workSessions.length
    const avgSessionMin = sessions > 0 ? Math.round((totalMinutes / sessions) * 10) / 10 : 0
    const distractions = workSessions.reduce((s, h) => s + (h.distractions || 0), 0)
    const distractionRate = totalMinutes > 0 ? Math.min(1, distractions / totalMinutes) : 0
    const deepFocusMinutes = workSessions.reduce(
      (s, h) => s + (h.deep ? h.durationMin || 0 : 0),
      0
    )
    const tasksCompleted = countTasksCompletedInRange(r)

    // Streak 基于全量 history，不因 range 而变
    const { dayStreak, weekStreak } = computeStreaks()

    // 最佳专注日（范围里专注分钟最多的一天）
    const dayMap = new Map()
    workSessions.forEach((h) => {
      const ds = h.dateStr || formatDateStr(new Date(h.at || h.completedAt || Date.now()))
      dayMap.set(ds, (dayMap.get(ds) || 0) + (h.durationMin || 0))
    })
    let bestFocusDay = null
    let bestMin = 0
    dayMap.forEach((min, d) => {
      if (min > bestMin) {
        bestMin = min
        bestFocusDay = d
      }
    })

    return {
      totalMinutes,
      sessions,
      avgSessionMin,
      distractions,
      distractionRate,
      deepFocusMinutes,
      tasksCompleted,
      streakDay: dayStreak,
      streakWeek: weekStreak,
      bestFocusDay
    }
  }

  const todayFocusMinutes = computed(() => getFocusSummary('today').totalMinutes)
  const dayStreak = computed(() => computeStreaks().dayStreak)
  const weekStreak = computed(() => computeStreaks().weekStreak)

  // ===== Task 6 C. AI 自适应：根据 distractionRate 调整 work 时长 =====
  const computeAIAdaptiveDuration = (range = 'last7') => {
    const summary = getFocusSummary(range)
    const base = settingsStore.pomodoroWorkMinutes
    let delta = 0
    if (summary.sessions === 0) return base
    if (summary.distractionRate > 0.2) delta = -Math.max(1, Math.round(base * 0.1))
    else if (summary.distractionRate < 0.05) delta = Math.max(1, Math.round(base * 0.1))
    // ±10min 钳制（delta）；整体结果落在 [1,180] 间与 setDuration 一致
    delta = Math.max(-10, Math.min(10, delta))
    return Math.max(1, Math.min(180, base + delta))
  }
  const applyAIAdaptiveDuration = () => {
    const mins = computeAIAdaptiveDuration()
    return setDuration('work', mins)
  }

  // ===== Task 6: startPause / skipStage 对外统一 API（供全局热键） =====
  const startPause = () => toggleTimer()
  const skipStage = () => skipTimer()

  // ===== 摘要与干扰持久化 =====
  const saveSummaryToStorage = () => {
    if (isSlaveWindow) return
    try {
      if (typeof localStorage === 'undefined') return
      localStorage.setItem(
        SUMMARY_STORAGE_KEY,
        JSON.stringify({
          sessionDistractions: sessionDistractions.value,
          interruptionLog: interruptionLog.value,
          sessionHistory: sessionHistory.value,
          currentTaskId: currentTaskId.value
        })
      )
    } catch (e) {
      console.warn('[Pomodoro] Failed to save summary:', e)
    }
  }

  const loadSummaryFromStorage = () => {
    if (isSlaveWindow) return
    try {
      if (typeof localStorage === 'undefined') return
      const raw = localStorage.getItem(SUMMARY_STORAGE_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      if (typeof data.sessionDistractions === 'number') {
        sessionDistractions.value = Math.max(0, data.sessionDistractions)
      }
      if (Array.isArray(data.interruptionLog)) {
        interruptionLog.value = data.interruptionLog
          .filter(
            (l) =>
              l &&
              typeof l.at === 'number' &&
              ['appSwitch', 'focusLost', 'manual', 'userMarked'].includes(l.kind)
          )
          .slice(-INTERRUPTION_LOG_LIMIT)
      }
      if (Array.isArray(data.sessionHistory)) {
        sessionHistory.value = data.sessionHistory
          .filter((h) => h && typeof h.at === 'number')
          .slice(-SESSION_HISTORY_LIMIT)
      }
      if (data.currentTaskId !== undefined) {
        currentTaskId.value = data.currentTaskId
      }
    } catch (e) {
      console.warn('[Pomodoro] Failed to load summary:', e)
    }
  }

  const saveToStorage = () => {
    if (isSlaveWindow) return
    try {
      if (typeof localStorage === 'undefined') return
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          currentMode: currentMode.value,
          timeLeft: timeLeft.value,
          isRunning: false,
          hasStarted: hasStarted.value,
          completedPomodoros: completedPomodoros.value
        })
      )
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
        if (data.currentMode && modes.some((m) => m.value === data.currentMode)) {
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
        customMinutes.value =
          currentMode.value === 'work'
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
      loadSummaryFromStorage()
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
    loadSummaryFromStorage()
  }

  const setupWatchers = (watchFn) => {
    if (watchersSetup) return
    watchersSetup = true

    watchFn(
      () => settingsStore.pomodoroWorkMinutes,
      () => {
        if (currentMode.value === 'work' && !isRunning.value && !hasStarted.value) {
          timeLeft.value = settingsStore.pomodoroWorkMinutes * 60
        }
      }
    )

    watchFn(
      () => settingsStore.pomodoroBreakMinutes,
      () => {
        if (currentMode.value === 'shortBreak' && !isRunning.value && !hasStarted.value) {
          timeLeft.value = settingsStore.pomodoroBreakMinutes * 60
        }
      }
    )

    watchFn(
      () => settingsStore.pomodoroLongBreakMinutes,
      () => {
        if (currentMode.value === 'longBreak' && !isRunning.value && !hasStarted.value) {
          timeLeft.value = settingsStore.pomodoroLongBreakMinutes * 60
        }
      }
    )

    if (!isElectron) {
      watchFn(
        () => [
          timeLeft.value,
          isRunning.value,
          currentMode.value,
          hasStarted.value,
          completedPomodoros.value
        ],
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

  const whiteNoiseTypes = [
    { id: 'white', label: '白噪音' },
    { id: 'pink', label: '粉噪音' },
    { id: 'brown', label: '棕噪音' },
    { id: 'rain', label: '雨声' },
    { id: 'cafe', label: '咖啡厅' }
  ]

  const currentNoise = ref(null)
  const noiseVolume = ref(0.5)
  const isNoisePlaying = ref(false)

  // ===== Task 6 A. 专注摘要 & 干扰检测 =====
  const sessionDistractions = ref(0)
  const interruptionLog = ref([])
  // 历史已完成 session：{ at, mode, durationMin, distractions, taskId, deep: boolean, dateStr }
  const sessionHistory = ref([])
  // dayStreak / weekStreak / todayFocusMinutes 为计算值（派生状态），避免重复持久化
  const currentTaskId = ref(null)
  // session 开始时 distractions 计数快照（用于完成时判断 deepFocus）
  let sessionStartDistractions = 0
  let sessionStartAt = null

  let noiseNode = null
  let noiseGainNode = null
  let noiseFilterNode = null

  const createNoiseBuffer = (type) => {
    if (typeof window === 'undefined') return null
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)()
    }
    const bufferSize = 2 * audioContext.sampleRate
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate)
    const output = buffer.getChannelData(0)

    if (type === 'white') {
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1
      }
    } else if (type === 'pink') {
      let b0 = 0,
        b1 = 0,
        b2 = 0,
        b3 = 0,
        b4 = 0,
        b5 = 0,
        b6 = 0
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1
        b0 = 0.99886 * b0 + white * 0.0555179
        b1 = 0.99332 * b1 + white * 0.0750759
        b2 = 0.969 * b2 + white * 0.153852
        b3 = 0.8665 * b3 + white * 0.3104856
        b4 = 0.55 * b4 + white * 0.5329522
        b5 = -0.7616 * b5 - white * 0.016898
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
        b6 = white * 0.115926
      }
    } else if (type === 'brown') {
      let lastOut = 0
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1
        output[i] = (lastOut + 0.02 * white) / 1.02
        lastOut = output[i]
        output[i] *= 3.5
      }
    } else if (type === 'rain') {
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * 0.5
        if (Math.random() < 0.001) {
          output[i] = (Math.random() * 2 - 1) * 0.8
        }
      }
    } else if (type === 'cafe') {
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * 0.3
        if (Math.random() < 0.0005) {
          output[i] = (Math.random() * 2 - 1) * 0.6
        }
      }
    }
    return buffer
  }

  const playWhiteNoise = (type) => {
    if (typeof window === 'undefined') return
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)()
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume()
    }

    stopWhiteNoise()

    const buffer = createNoiseBuffer(type)
    if (!buffer) return

    noiseNode = audioContext.createBufferSource()
    noiseNode.buffer = buffer
    noiseNode.loop = true

    noiseGainNode = audioContext.createGain()
    noiseGainNode.gain.value = noiseVolume.value * 0.5

    if (type === 'rain' || type === 'cafe') {
      noiseFilterNode = audioContext.createBiquadFilter()
      noiseFilterNode.type = 'lowpass'
      noiseFilterNode.frequency.value = type === 'rain' ? 2000 : 1500
      noiseNode.connect(noiseFilterNode)
      noiseFilterNode.connect(noiseGainNode)
    } else {
      noiseNode.connect(noiseGainNode)
    }

    noiseGainNode.connect(audioContext.destination)
    noiseNode.start()

    currentNoise.value = type
    isNoisePlaying.value = true
  }

  const stopWhiteNoise = () => {
    if (noiseNode) {
      try {
        noiseNode.stop()
        noiseNode.disconnect()
      } catch {
        // ignore errors when stopping noise
      }
      noiseNode = null
    }
    if (noiseGainNode) {
      noiseGainNode.disconnect()
      noiseGainNode = null
    }
    if (noiseFilterNode) {
      noiseFilterNode.disconnect()
      noiseFilterNode = null
    }
    isNoisePlaying.value = false
    currentNoise.value = null
  }

  const toggleWhiteNoise = (type) => {
    if (isNoisePlaying.value && currentNoise.value === type) {
      stopWhiteNoise()
    } else {
      playWhiteNoise(type)
    }
  }

  const setNoiseVolume = (vol) => {
    noiseVolume.value = Math.max(0, Math.min(1, vol))
    if (noiseGainNode) {
      noiseGainNode.gain.value = noiseVolume.value * 0.5
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
    stopWhiteNoise()
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
    whiteNoiseTypes,
    currentNoise,
    noiseVolume,
    isNoisePlaying,
    // Task 6 新增 state & computed
    sessionDistractions,
    interruptionLog,
    sessionHistory,
    currentTaskId,
    modeDurations,
    todayFocusMinutes,
    dayStreak,
    weekStreak,
    // Task 6 新增 actions
    setDuration,
    markDistraction,
    getFocusSummary,
    bindCurrentTask,
    unbindCurrentTask,
    computeAIAdaptiveDuration,
    applyAIAdaptiveDuration,
    startPause,
    skipStage,
    // 内部工具（用于测试）
    completeSessionInternal,
    // 原有
    toggleTimer,
    resetTimer,
    skipTimer,
    switchMode,
    applyCustomDuration,
    requestNotificationPermission,
    setupWatchers,
    toggleFab,
    toggleWhiteNoise,
    setNoiseVolume,
    stopWhiteNoise,
    initElectronMode,
    initWebMode,
    cleanup
  }
})
