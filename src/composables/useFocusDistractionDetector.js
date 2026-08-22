// Task 6 A: 干扰检测 composable
//  - Web 模式：visibilitychange + blur/focus；切出超过 awayThreshold 且回到前台后记一次 focusLost 干扰
//  - Electron 模式：优先订阅主进程暴露的 CustomEvent app:blur/app:hide app:focus/app:show 或 electronAPI.focus 订阅（无则退化为 Web 行为）
import { onMounted, onUnmounted, readonly, ref } from 'vue'
import { usePomodoroStore } from '../stores/pomodoroStore'

const DEFAULT_AWAY_THRESHOLD_MS = 60000
const DEFAULT_AWAY_COUNTDOWN_MS = 30000

const isElectronEnv = () =>
  typeof window !== 'undefined' &&
  (!!window.electronAPI || !!(typeof process !== 'undefined' && process.versions && process.versions.electron))

const hasElectronFocusApi = () =>
  typeof window !== 'undefined' &&
  window.electronAPI &&
  (typeof window.electronAPI.onAppFocusLost === 'function' ||
    typeof window.electronAPI.onAppFocusGained === 'function' ||
    typeof window.electronAPI.onAppWindowHidden === 'function')

export function useFocusDistractionDetector(options = {}) {
  // 参数合法性校验（至少 5000ms；便于测试但保留最低 5000ms 规范）
  const rawThreshold = Number(options.awayThresholdMs)
  let awayThreshold = Number.isFinite(rawThreshold) && rawThreshold > 0
    ? rawThreshold
    : DEFAULT_AWAY_THRESHOLD_MS
  if (awayThreshold < 5000) awayThreshold = 5000
  const rawCountdown = Number(options.awayCountdownMs)
  // 用户显式传非正数 → 视为要求最小值 1000；未传则用默认
  let awayCountdownMs
  if (!('awayCountdownMs' in options)) {
    awayCountdownMs = DEFAULT_AWAY_COUNTDOWN_MS
  } else if (!Number.isFinite(rawCountdown) || rawCountdown <= 0) {
    awayCountdownMs = 1000
  } else {
    awayCountdownMs = rawCountdown
  }
  if (awayCountdownMs < 1000) awayCountdownMs = 1000
  if (awayCountdownMs > awayThreshold) awayCountdownMs = awayThreshold
  const onDistraction = typeof options.onDistraction === 'function' ? options.onDistraction : null

  const isAway = ref(false)
  const awaySince = ref(null)
  const awayCountdownRefreshed = ref(0) // awayCountdown 开始时间戳（0 表示未进行）
  const awayCountdownRemaining = ref(0)

  let backTimer = null
  let electronCleanups = []
  let countdownTimer = null

  const pomodoroStore = options.pomodoroStore || usePomodoroStore()

  const clearBackTimer = () => {
    if (backTimer) {
      clearTimeout(backTimer)
      backTimer = null
    }
  }
  const clearCountdownTimer = () => {
    if (countdownTimer) {
      try {
        clearInterval(countdownTimer)
      } catch (e) {
        /* ignore */
      }
      countdownTimer = null
    }
  }
  const startAwayCountdown = () => {
    clearCountdownTimer()
    awayCountdownRemaining.value = awayCountdownMs
    awayCountdownRefreshed.value += 1
    if (awayCountdownMs <= 0) return
    countdownTimer = setInterval(() => {
      if (awayCountdownRemaining.value > 0) {
        awayCountdownRemaining.value = Math.max(0, awayCountdownRemaining.value - 1000)
        if (awayCountdownRemaining.value === 0) {
          clearCountdownTimer()
        }
      } else {
        clearCountdownTimer()
      }
    }, 1000)
  }
  const stopAwayCountdown = () => {
    clearCountdownTimer()
    awayCountdownRemaining.value = 0
  }

  const tryMarkDistraction = (kind = 'focusLost') => {
    if (!pomodoroStore || typeof pomodoroStore.markDistraction !== 'function') return
    let ok = false
    try {
      ok = pomodoroStore.markDistraction(kind) === true
    } catch (e) {
      ok = false
    }
    if (ok && typeof onDistraction === 'function') {
      try {
        onDistraction({ kind, at: Date.now() })
      } catch (e) {
        /* ignore */
      }
    }
  }

  const markAway = (reason = 'focusLost') => {
    if (isAway.value) return
    isAway.value = true
    awaySince.value = Date.now()
    clearBackTimer()
    startAwayCountdown()
    // focusLost / appSwitch 本身不立即计入干扰（阈值 + 回到前台后的 backGrace 才触发）
    // 原因与 spec 一致：瞬时切换不应视为干扰
    if (reason === 'appSwitch') {
      // appSwitch 也按阈值处理（避免主进程重复上报）
    }
  }

  const markBack = (reason = 'focusGained') => {
    if (!isAway.value) return
    const goneMs = awaySince.value ? Date.now() - awaySince.value : 0
    isAway.value = false
    awaySince.value = null
    stopAwayCountdown()
    if (goneMs >= awayThreshold) {
      clearBackTimer()
      // 延迟 200ms 再记一次，给用户回到应用的 grace 时间（可随时通过 options.backGraceMs 自定义）
      const grace = Number(options.backGraceMs) > 0 ? Number(options.backGraceMs) : 200
      const mark = () => {
        // 选择 kind：切应用优先 appSwitch，否则 focusLost
        const kind = reason === 'app:show' || reason === 'app:focus' ? 'appSwitch' : 'focusLost'
        tryMarkDistraction(kind)
      }
      if (grace <= 0) mark()
      else {
        backTimer = setTimeout(mark, grace)
      }
    }
    // 低于阈值：瞬时切换，不计
  }

  // ===== Web 监听 =====
  const onVisibilityChange = () => {
    if (typeof document === 'undefined') return
    if (document.visibilityState === 'hidden') markAway('focusLost')
    else markBack('focusGained')
  }
  const onWindowBlur = () => markAway('focusLost')
  const onWindowFocus = () => markBack('focusGained')

  // Electron CustomEvent（主进程通过 preload broadcast app:blur / app:hide / app:focus / app:show）
  const onAppBlur = () => markAway('appSwitch')
  const onAppHide = () => markAway('appSwitch')
  const onAppFocus = () => markBack('app:focus')
  const onAppShow = () => markBack('app:show')

  let webInstalled = false
  const installWebListeners = () => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return
    if (webInstalled) return
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('blur', onWindowBlur)
    window.addEventListener('focus', onWindowFocus)
    window.addEventListener('app:blur', onAppBlur)
    window.addEventListener('app:hide', onAppHide)
    window.addEventListener('app:focus', onAppFocus)
    window.addEventListener('app:show', onAppShow)
    webInstalled = true
  }
  const uninstallWebListeners = () => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return
    if (!webInstalled) return
    document.removeEventListener('visibilitychange', onVisibilityChange)
    window.removeEventListener('blur', onWindowBlur)
    window.removeEventListener('focus', onWindowFocus)
    window.removeEventListener('app:blur', onAppBlur)
    window.removeEventListener('app:hide', onAppHide)
    window.removeEventListener('app:focus', onAppFocus)
    window.removeEventListener('app:show', onAppShow)
    webInstalled = false
  }

  const installElectronListeners = () => {
    if (!isElectronEnv() || !hasElectronFocusApi()) return
    const api = window.electronAPI
    const registerIf = (fnName, cb) => {
      if (typeof api[fnName] !== 'function') return
      try {
        const unsub = api[fnName](cb)
        if (typeof unsub === 'function') electronCleanups.push(unsub)
      } catch (e) {
        /* ignore */
      }
    }
    registerIf('onAppFocusLost', () => markAway('focusLost'))
    registerIf('onAppFocusGained', () => markBack('focusGained'))
    registerIf('onAppWindowHidden', () => markAway('focusLost'))
  }
  const uninstallElectronListeners = () => {
    electronCleanups.forEach((fn) => {
      try {
        fn && fn()
      } catch (e) {
        /* ignore */
      }
    })
    electronCleanups = []
  }

  const destroyFocusDistractionDetector = () => {
    clearBackTimer()
    stopAwayCountdown()
    uninstallWebListeners()
    uninstallElectronListeners()
    isAway.value = false
    awaySince.value = null
  }

  const init = () => {
    // Electron 模式下依然保留 Web 监听兜底（幂等 away + 阈值避免重复）
    installWebListeners()
    installElectronListeners()
  }

  if (typeof onMounted === 'function' && typeof onUnmounted === 'function') {
    try {
      onMounted(init)
      onUnmounted(destroyFocusDistractionDetector)
    } catch (e) {
      // 在非 setup 环境调用：忽略，手动调用 init()
    }
  }

  return {
    isAway: readonly(isAway),
    awaySince: readonly(awaySince),
    awayThreshold,
    awayCountdownMs,
    awayCountdownRemaining: readonly(awayCountdownRemaining),
    awayCountdownRefreshed: readonly(awayCountdownRefreshed),
    init,
    destroyFocusDistractionDetector,
    markAway,
    markBack,
    _markAway: markAway,
    _markBack: markBack
  }
}
