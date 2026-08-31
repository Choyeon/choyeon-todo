const {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  Notification,
  session,
  shell,
  nativeTheme,
  Tray,
  screen,
  globalShortcut
} = require('electron')
const path = require('path')
const fs = require('fs')
const { autoUpdater } = require('electron-updater')

let mainWindow = null
let debugWindow = null
let pomodoroWindow = null
let pomodoroFabWindow = null
let miniWindow = null
let quickAddWindow = null
let tray = null
let isQuitting = false
let updateDownloaded = false
let isCheckingUpdate = false
let updateCheckInterval = null
let crashReloadTimeout = null
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000

const autoUpdaterListeners = []

const ALLOWED_EXTERNAL_DOMAINS = ['github.com', 'www.github.com', 'chuyuchoyeon.github.io']

// 子窗口统一安全钩子：禁用外部导航 & 外部链接走系统浏览器；返回可选 cleanup（用于 close 时避免内存引用）
const applyChildWindowSecurity = (win, { allowDevNavigationTo } = {}) => {
  if (!win || win.isDestroyed()) return
  const wc = win.webContents
  if (!wc || wc.isDestroyed()) return

  // 1) 阻止外部 / 非同源导航
  wc.on('will-navigate', (e, url) => {
    if (!url) return
    // file:// 不允许（子窗口不接受拖入文件）
    if (url.startsWith('file://')) {
      e.preventDefault()
      return
    }
    // 开发服务器：允许 dev 页内同源跳转（hash 路由不会触发 will-navigate，但保险处理）
    if (
      allowDevNavigationTo &&
      typeof allowDevNavigationTo === 'string' &&
      url.startsWith(allowDevNavigationTo)
    ) {
      return
    }
    e.preventDefault()
  })

  // 2) 新窗口一律系统浏览器（http/https 白名单）或直接拒绝
  wc.setWindowOpenHandler(({ url }) => {
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      try {
        const parsedUrl = new URL(url)
        const isAllowed = ALLOWED_EXTERNAL_DOMAINS.some(
          (domain) => parsedUrl.hostname === domain || parsedUrl.hostname.endsWith(`.${domain}`)
        )
        if (isAllowed) {
          shell.openExternal(url)
        } else {
          console.warn('[Main] Blocked external URL from child window:', url)
        }
      } catch (e) {
        console.warn('[Main] Failed to parse external URL from child window:', url, e)
      }
    }
    return { action: 'deny' }
  })
}

let renderCrashCount = 0
let lastCrashTime = 0
const MAX_CRASH_BEFORE_SAFE_MODE = 3
const CRASH_BACKOFF_BASE_MS = 2000

let appSettings = {
  closeToQuit: true,
  autoStart: false,
  doNotDisturb: false,
  globalShortcutEnabled: true
}

let pomodoroState = {
  currentMode: 'work',
  timeLeft: 25 * 60,
  totalTime: 25 * 60,
  isRunning: false,
  hasStarted: false,
  completedPomodoros: 0,
  currentModeLabel: '专注',
  currentColor: '#EF4444',
  formattedTime: '25:00',
  syncTimestamp: null
}

let pomodoroTimer = null
let pomodoroEndTime = null
let pomodoroPauseTimeLeft = 25 * 60

const getPomodoroModes = () => [
  { value: 'work', label: '专注', color: '#EF4444' },
  { value: 'shortBreak', label: '短休息', color: '#22C55E' },
  { value: 'longBreak', label: '长休息', color: '#06B6D4' }
]

const getPomodoroModeInfo = (mode) => {
  return getPomodoroModes().find((m) => m.value === mode) || getPomodoroModes()[0]
}

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

const calculateTimeLeft = () => {
  if (!pomodoroState.isRunning || !pomodoroEndTime) {
    return pomodoroPauseTimeLeft
  }
  const now = Date.now()
  const remaining = Math.max(0, Math.ceil((pomodoroEndTime - now) / 1000))
  return remaining
}

const updatePomodoroState = () => {
  const timeLeft = calculateTimeLeft()
  const modeInfo = getPomodoroModeInfo(pomodoroState.currentMode)

  pomodoroState.timeLeft = timeLeft
  pomodoroState.totalTime = getPomodoroTotalTime(pomodoroState.currentMode)
  pomodoroState.currentModeLabel = modeInfo.label
  pomodoroState.currentColor = modeInfo.color
  pomodoroState.formattedTime = formatTime(timeLeft)
  pomodoroState.syncTimestamp = Date.now()
}

const getPomodoroTotalTime = (mode) => {
  // 使用来自模式表（若已经通过 setDuration 覆盖），否则回落到默认
  const override = modeDurations && modeDurations[mode]
  if (typeof override === 'number' && override > 0) return override
  // 使用默认值，实际值由渲染进程设置同步
  switch (mode) {
    case 'work':
      return 25 * 60
    case 'shortBreak':
      return 5 * 60
    case 'longBreak':
      return 15 * 60
    default:
      return 25 * 60
  }
}

// 持久化各模式的总时长覆盖（由 pomodoro:setDuration 设置），
// 保证 reset / switchMode 时不会回到硬编码默认值，避免 UI 与主进程总时间互斥
const modeDurations = {
  work: null,
  shortBreak: null,
  longBreak: null
}

const broadcastPomodoroState = (senderWebContents = null) => {
  updatePomodoroState()

  const targets = [mainWindow, pomodoroWindow, pomodoroFabWindow, miniWindow]
  targets.forEach((win) => {
    if (!win || win.isDestroyed()) return
    if (senderWebContents && win.webContents.id === senderWebContents.id) return
    if (!win.webContents || win.webContents.isDestroyed()) return
    win.webContents.send('pomodoro:stateUpdated', pomodoroState)
  })
}

const pomodoroTick = () => {
  if (!pomodoroState.isRunning) return

  const timeLeft = calculateTimeLeft()

  if (timeLeft <= 0) {
    completePomodoroSession()
    return
  }

  // 每秒广播一次状态
  broadcastPomodoroState()
}

const startPomodoroTimer = () => {
  if (pomodoroState.isRunning) {
    // 重复启动：无操作，防止重复 setInterval 造成 tick 叠加
    return
  }
  if (pomodoroTimer) {
    clearInterval(pomodoroTimer)
    pomodoroTimer = null
  }

  // 若暂停剩余时间为 0（例如刚刚完整结束一个会话），用当前模式总时间补齐，避免计时器永远无法再次启动
  if (pomodoroPauseTimeLeft <= 0) {
    pomodoroPauseTimeLeft = getPomodoroTotalTime(pomodoroState.currentMode)
  }

  if (pomodoroPauseTimeLeft <= 0) return

  pomodoroState.isRunning = true
  pomodoroState.hasStarted = true
  pomodoroEndTime = Date.now() + pomodoroPauseTimeLeft * 1000

  pomodoroTimer = setInterval(pomodoroTick, 1000)

  broadcastPomodoroState()
  refreshTrayMenu()
}

const pausePomodoroTimer = () => {
  if (pomodoroTimer) {
    clearInterval(pomodoroTimer)
    pomodoroTimer = null
  }

  pomodoroPauseTimeLeft = calculateTimeLeft()
  pomodoroState.isRunning = false
  pomodoroEndTime = null

  broadcastPomodoroState()
  refreshTrayMenu()
}

const resetPomodoroTimer = () => {
  if (pomodoroTimer) {
    clearInterval(pomodoroTimer)
    pomodoroTimer = null
  }

  pomodoroPauseTimeLeft = getPomodoroTotalTime(pomodoroState.currentMode)
  pomodoroState.isRunning = false
  pomodoroState.hasStarted = false
  pomodoroEndTime = null

  broadcastPomodoroState()
  refreshTrayMenu()
}

const switchPomodoroMode = (mode) => {
  if (pomodoroState.currentMode === mode) return

  if (pomodoroTimer) {
    clearInterval(pomodoroTimer)
    pomodoroTimer = null
  }

  pomodoroState.currentMode = mode
  pomodoroPauseTimeLeft = getPomodoroTotalTime(mode)
  pomodoroState.isRunning = false
  pomodoroState.hasStarted = false
  pomodoroEndTime = null

  broadcastPomodoroState()
  refreshTrayMenu()
}

const completePomodoroSession = () => {
  if (pomodoroTimer) {
    clearInterval(pomodoroTimer)
    pomodoroTimer = null
  }

  const endedMode = pomodoroState.currentMode
  const wasWorkMode = endedMode === 'work'

  pomodoroState.isRunning = false
  pomodoroState.hasStarted = false
  pomodoroEndTime = null
  pomodoroState.timeLeft = 0
  // 关键：停止后也必须把暂停剩余时间归零，否则下一次 updatePomodoroState 会把 calculateTimeLeft 恢复成旧值，
  // 造成主从窗口状态互斥（主端显示 00:00，从端又跳回剩余秒数）
  pomodoroPauseTimeLeft = 0

  // 通知所有窗口计时结束，由渲染进程处理后续逻辑
  const targets = [mainWindow, pomodoroWindow, pomodoroFabWindow, miniWindow]
  targets.forEach((win) => {
    if (!win || win.isDestroyed()) return
    win.webContents.send('pomodoro:timerEnded', {
      currentMode: endedMode,
      wasWorkMode
    })
    // 同步会话完成事件，保证 preload 暴露的 onPomodoroSessionComplete 有对应来源
    win.webContents.send('pomodoro:sessionComplete', {
      currentMode: endedMode,
      wasWorkMode,
      completedPomodoros: pomodoroState.completedPomodoros
    })
  })

  updatePomodoroState()
  broadcastPomodoroState()
  refreshTrayMenu()
}

const skipPomodoroSession = () => {
  if (!pomodoroState.hasStarted) return

  if (pomodoroTimer) {
    clearInterval(pomodoroTimer)
    pomodoroTimer = null
  }

  pomodoroPauseTimeLeft = getPomodoroTotalTime(pomodoroState.currentMode)
  pomodoroState.isRunning = false
  pomodoroState.hasStarted = false
  pomodoroEndTime = null

  broadcastPomodoroState()
  refreshTrayMenu()
}

// 任务数据缓存（用于托盘菜单显示）
let taskCache = {
  tasks: [],
  categories: []
}

const settingsPath = path.join(app.getPath('userData'), 'app-settings.json')

const loadAppSettings = () => {
  try {
    if (fs.existsSync(settingsPath)) {
      const data = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
      if (typeof data.closeToQuit === 'boolean') appSettings.closeToQuit = data.closeToQuit
      if (typeof data.autoStart === 'boolean') appSettings.autoStart = data.autoStart
      if (typeof data.doNotDisturb === 'boolean') appSettings.doNotDisturb = data.doNotDisturb
      if (typeof data.globalShortcutEnabled === 'boolean')
        appSettings.globalShortcutEnabled = data.globalShortcutEnabled
    }
  } catch (e) {
    console.error('[Main] Failed to load app settings:', e)
  }
}

const saveAppSettings = () => {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(appSettings))
  } catch (e) {
    console.error('[Main] Failed to save app settings:', e)
  }
}

// 统一 AppUserModelId（与 package.json appId 一致）
app.setAppUserModelId('com.choyeon.todo')

// 窗口状态持久化
const windowStatePath = path.join(app.getPath('userData'), 'window-state.json')

const clampBoundsToWorkArea = (x, y, width, height) => {
  try {
    const displays = screen.getAllDisplays()
    // 找到与窗口重叠最多的显示区
    let best = screen.getPrimaryDisplay()
    let bestArea = 0
    for (const d of displays) {
      const bx = Math.max(x, d.workArea.x)
      const by = Math.max(y, d.workArea.y)
      const ex = Math.min(x + width, d.workArea.x + d.workArea.width)
      const ey = Math.min(y + height, d.workArea.y + d.workArea.height)
      const area = Math.max(0, ex - bx) * Math.max(0, ey - by)
      if (area > bestArea) {
        bestArea = area
        best = d
      }
    }
    const wa = best.workArea
    // clamp：保证至少 80% 可见区域在 workArea 内
    let nx = x
    let ny = y
    if (x + width * 0.8 < wa.x) nx = wa.x
    if (y + height * 0.8 < wa.y) ny = wa.y
    if (x + width > wa.x + wa.width + width * 0.2) nx = wa.x + wa.width - width
    if (y + height > wa.y + wa.height + height * 0.2) ny = wa.y + wa.height - height
    return { x: nx, y: ny }
  } catch {
    return { x, y }
  }
}

const loadWindowState = () => {
  try {
    const data = fs.readFileSync(windowStatePath, 'utf-8')
    const state = JSON.parse(data)
    const minW = 360
    const minH = 480
    const width = Math.max(minW, Number(state.width) || 1200)
    const height = Math.max(minH, Number(state.height) || 800)
    let x = typeof state.x === 'number' ? state.x : undefined
    let y = typeof state.y === 'number' ? state.y : undefined

    // Validate window position is within visible screen bounds and clamp to workArea
    if (x !== undefined && y !== undefined) {
      const displays = screen.getAllDisplays()
      const isVisible = displays.some((display) => {
        return (
          x >= display.bounds.x - 200 &&
          y >= display.bounds.y - 200 &&
          x + width <= display.bounds.x + display.bounds.width + 200 &&
          y + height <= display.bounds.y + display.bounds.height + 200
        )
      })
      if (!isVisible) {
        x = undefined
        y = undefined
      } else {
        const clamped = clampBoundsToWorkArea(x, y, width, height)
        x = clamped.x
        y = clamped.y
      }
    }

    return {
      width,
      height,
      x,
      y,
      isMaximized: !!state.isMaximized,
      isFullscreen: !!state.isFullscreen,
      zoomFactor: typeof state.zoomFactor === 'number' ? state.zoomFactor : 1
    }
  } catch {
    return { width: 1200, height: 800, isMaximized: false, isFullscreen: false, zoomFactor: 1 }
  }
}

const saveWindowState = () => {
  if (!mainWindow || mainWindow.isDestroyed()) return
  try {
    const bounds = mainWindow.getBounds()
    const zoomFactor = mainWindow.webContents
      ? mainWindow.webContents.getZoomFactor()
      : 1
    const state = {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      isMaximized: mainWindow.isMaximized(),
      isFullscreen: mainWindow.isFullScreen(),
      zoomFactor: typeof zoomFactor === 'number' ? zoomFactor : 1
    }
    fs.writeFileSync(windowStatePath, JSON.stringify(state))
  } catch {
    // 忽略写入错误
  }
}

// 获取应用图标路径（优先 .ico，Windows 任务栏/托盘多尺寸显示更清晰）
function getIconPath() {
  if (app.isPackaged) {
    const ico = path.join(process.resourcesPath, 'icon.ico')
    if (fs.existsSync(ico)) return ico
    return path.join(process.resourcesPath, 'icon.png')
  }
  const devIco = path.join(__dirname, '../build/icon.ico')
  if (fs.existsSync(devIco)) return devIco
  const devPng = path.join(__dirname, '../build/icon.png')
  if (fs.existsSync(devPng)) return devPng
  return null
}

// 根据系统主题设置窗口背景色
const getBgColor = () => {
  return nativeTheme.shouldUseDarkColors ? '#202124' : '#ffffff'
}

// 是否以 --hidden 启动（开机自启静默启动）
const isHiddenLaunch = () => process.argv.some((a) => a === '--hidden' || a === '-hidden')

function createWindow() {
  const iconPath = getIconPath()
  const windowState = loadWindowState()

  const windowOptions = {
    width: windowState.width,
    height: windowState.height,
    minWidth: 360,
    minHeight: 480,
    title: 'Choyeon To Do - 任务管理',
    hasShadow: true,
    resizable: true,
    maximizable: true,
    minimizable: true,
    fullscreenable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // 启用硬件加速
      enableBlinkFeatures: 'CSSBackdropFilter'
    },
    frame: false,
    show: false,
    // 启用透明以支持毛玻璃效果
    transparent: process.platform === 'win32'
  }

  // Windows 11：优先 Mica，失败时静默回落 Acrylic
  if (process.platform === 'win32') {
    let applied = false
    const materials = ['mica', 'acrylic', 'tabbed']
    for (const mat of materials) {
      try {
        windowOptions.backgroundMaterial = mat
        windowOptions.backgroundColor = '#00000000'
        applied = true
        break
      } catch {
        // 尝试下一种
      }
    }
    if (!applied) {
      windowOptions.backgroundMaterial = 'none'
      windowOptions.backgroundColor = getBgColor()
    }
  } else {
    windowOptions.backgroundColor = getBgColor()
  }

  if (windowState.x !== undefined && windowState.y !== undefined) {
    windowOptions.x = windowState.x
    windowOptions.y = windowState.y
  }
  if (iconPath) windowOptions.icon = iconPath

  mainWindow = new BrowserWindow(windowOptions)

  // 创建后设置 zoomFactor
  try {
    if (typeof windowState.zoomFactor === 'number' && mainWindow.webContents) {
      const zf = Math.max(0.25, Math.min(5, windowState.zoomFactor))
      mainWindow.webContents.setZoomFactor(zf)
    }
  } catch {
    /* ignore */
  }

  Menu.setApplicationMenu(null)

  // 使用异步加载避免阻塞
  const loadPromise = process.env.VITE_DEV_SERVER_URL
    ? mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    : mainWindow.loadFile(path.join(__dirname, '../dist-web/index.html'))

  loadPromise.catch((err) => {
    console.error('[Main] Failed to load window:', err)
  })

  // 优化 ready-to-show 逻辑
  mainWindow.once('ready-to-show', () => {
    setImmediate(() => {
      if (windowState.isFullscreen && !mainWindow.isFullScreen()) {
        try {
          mainWindow.setFullScreen(true)
        } catch {
          /* ignore */
        }
      }
      if (windowState.isMaximized) {
        mainWindow.maximize()
      }
      // --hidden 启动时：显示托盘、隐藏主窗口
      if (isHiddenLaunch()) {
        createTray()
        refreshTrayMenu()
      } else {
        mainWindow.show()
      }
    })
  })

  let maximizeNotifyTimer = null
  let saveStateTimer = null

  const notifyMaximizeChange = (isMaximized) => {
    if (maximizeNotifyTimer) clearTimeout(maximizeNotifyTimer)
    maximizeNotifyTimer = setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('window:maximizeChanged', isMaximized)
      }
    }, 50)
  }

  const debouncedSaveWindowState = () => {
    if (saveStateTimer) clearTimeout(saveStateTimer)
    saveStateTimer = setTimeout(() => saveWindowState(), 500)
  }

  mainWindow.on('maximize', () => notifyMaximizeChange(true))
  mainWindow.on('unmaximize', () => notifyMaximizeChange(false))
  mainWindow.on('resize', debouncedSaveWindowState)
  mainWindow.on('move', debouncedSaveWindowState)
  mainWindow.on('enter-full-screen', debouncedSaveWindowState)
  mainWindow.on('leave-full-screen', debouncedSaveWindowState)

  mainWindow.on('minimize', (e) => {
    if (!appSettings.closeToQuit) {
      const iconPath = getIconPath()
      if (iconPath) {
        e.preventDefault()
        mainWindow.hide()
        createTray()
        refreshTrayMenu()
      }
    }
  })

  mainWindow.on('close', (e) => {
    saveWindowState()
    if (!isQuitting && (!appSettings.closeToQuit || process.platform === 'darwin')) {
      const iconPath = getIconPath()
      if (!iconPath) {
        return
      }
      e.preventDefault()
      mainWindow.hide()
      createTray()
      refreshTrayMenu()
    }
  })

  mainWindow.on('closed', () => {
    if (saveStateTimer) {
      clearTimeout(saveStateTimer)
      saveStateTimer = null
    }
    if (maximizeNotifyTimer) {
      clearTimeout(maximizeNotifyTimer)
      maximizeNotifyTimer = null
    }
    mainWindow = null
  })

  // 安全：阻止外部导航；同时拦截 file:// 开头的拖入文件，并广播到 renderer
  mainWindow.webContents.on('will-navigate', (e, url) => {
    // 文件拖入检测：如果是 file:// 协议，则解析并分发到 app:filesDropped
    if (url && url.startsWith('file://')) {
      e.preventDefault()
      try {
        let filePath = decodeURIComponent(url.slice(7))
        // Windows 下路径可能是 /C:/xxx 形式，去掉前导 /
        if (/^\/[A-Za-z]:\//.test(filePath)) {
          filePath = filePath.slice(1)
        }
        const files = [{ path: filePath, name: path.basename(filePath) || 'file' }]
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('app:filesDropped', files)
        }
      } catch {
        /* ignore parse errors */
      }
      return
    }
    // 仅允许开发服务器内部导航
    if (process.env.VITE_DEV_SERVER_URL && url.startsWith(process.env.VITE_DEV_SERVER_URL)) {
      return
    }
    e.preventDefault()
  })

  // 安全：阻止打开新窗口，仅允许白名单域名在系统浏览器中打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      try {
        const parsedUrl = new URL(url)
        const isAllowed = ALLOWED_EXTERNAL_DOMAINS.some(
          (domain) => parsedUrl.hostname === domain || parsedUrl.hostname.endsWith(`.${domain}`)
        )
        if (isAllowed) {
          shell.openExternal(url)
        } else {
          console.warn('[Main] Blocked external URL (not in whitelist):', url)
        }
      } catch (e) {
        console.warn('[Main] Failed to parse external URL:', url, e)
      }
    }
    return { action: 'deny' }
  })

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('[Main] Render process gone:', details.reason)
    if (!mainWindow || mainWindow.isDestroyed()) return

    if (crashReloadTimeout) {
      clearTimeout(crashReloadTimeout)
      crashReloadTimeout = null
    }

    const now = Date.now()
    if (now - lastCrashTime > 30000) {
      renderCrashCount = 0
    }

    renderCrashCount++
    lastCrashTime = now

    if (renderCrashCount >= MAX_CRASH_BEFORE_SAFE_MODE) {
      console.error(
        `[Main] Render process crashed ${renderCrashCount} times consecutively, entering safe mode`
      )
      return
    }

    const backoffMs = CRASH_BACKOFF_BASE_MS * Math.pow(2, renderCrashCount - 1)
    console.warn(`[Main] Reloading in ${backoffMs}ms (attempt ${renderCrashCount})`)

    crashReloadTimeout = setTimeout(() => {
      crashReloadTimeout = null
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.reload()
      }
    }, backoffMs)
  })

  mainWindow.webContents.on('unresponsive', () => {
    console.warn('[Main] Window unresponsive')
  })
}

function createDebugWindow() {
  if (debugWindow && !debugWindow.isDestroyed()) {
    debugWindow.focus()
    return
  }
  if (!mainWindow || mainWindow.isDestroyed()) return

  const iconPath = getIconPath()
  const debugOptions = {
    width: 420,
    height: 560,
    minWidth: 360,
    minHeight: 400,
    title: '调试工具',
    backgroundColor: getBgColor(),
    webPreferences: {
      preload: path.join(__dirname, 'debug-preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    },
    frame: false,
    resizable: true,
    parent: mainWindow,
    show: false
  }
  if (iconPath) debugOptions.icon = iconPath

  debugWindow = new BrowserWindow(debugOptions)

  const loadPromise = process.env.VITE_DEV_SERVER_URL
    ? debugWindow.loadURL(process.env.VITE_DEV_SERVER_URL + '#/debug')
    : debugWindow.loadFile(path.join(__dirname, '../dist-web/index.html'), { hash: 'debug' })

  loadPromise.catch((err) => {
    console.error('[Main] Failed to load debug window:', err)
  })

  debugWindow.once('ready-to-show', () => {
    debugWindow.show()
  })

  debugWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  debugWindow.on('closed', () => {
    debugWindow = null
  })
}

function createPomodoroWindow() {
  if (pomodoroWindow && !pomodoroWindow.isDestroyed()) {
    pomodoroWindow.focus()
    return
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.size
  const iconPath = getIconPath()

  const options = {
    width,
    height,
    x: 0,
    y: 0,
    title: 'Choyeon To Do - 专注模式',
    backgroundColor: '#1a0505',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    },
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    transparent: false
  }
  if (iconPath) options.icon = iconPath

  pomodoroWindow = new BrowserWindow(options)

  pomodoroWindow.setAlwaysOnTop(true, 'screen-saver')
  pomodoroWindow.setVisibleOnAllWorkspaces(true)

  applyChildWindowSecurity(pomodoroWindow, {
    allowDevNavigationTo: process.env.VITE_DEV_SERVER_URL || undefined
  })

  const loadPromise = process.env.VITE_DEV_SERVER_URL
    ? pomodoroWindow.loadURL(process.env.VITE_DEV_SERVER_URL + '#/pomodoro-fullscreen?slave=1')
    : pomodoroWindow.loadFile(path.join(__dirname, '../dist-web/index.html'), {
        hash: 'pomodoro-fullscreen',
        query: { slave: '1' }
      })

  loadPromise.catch((err) => {
    console.error('[Main] Failed to load pomodoro window:', err)
  })

  pomodoroWindow.once('ready-to-show', () => {
    pomodoroWindow.setFullScreen(true)
    pomodoroWindow.show()
    pomodoroWindow.focus()
  })

  pomodoroWindow.on('closed', () => {
    pomodoroWindow = null
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('pomodoro:fullscreenClosed')
    }
  })
}

function createPomodoroFabWindow() {
  if (pomodoroFabWindow && !pomodoroFabWindow.isDestroyed()) {
    pomodoroFabWindow.show()
    pomodoroFabWindow.focus()
    return
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const { workArea } = primaryDisplay
  const iconPath = getIconPath()

  const fabSize = 160
  const margin = 24

  const options = {
    width: fabSize,
    height: fabSize,
    x: workArea.x + workArea.width - fabSize - margin,
    y: workArea.y + workArea.height - fabSize - margin,
    title: '番茄钟悬浮球',
    backgroundColor: '#00000000',
    type: 'toolbar',
    frame: false,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    transparent: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  }
  if (iconPath) options.icon = iconPath

  pomodoroFabWindow = new BrowserWindow(options)

  pomodoroFabWindow.setAlwaysOnTop(true, 'floating')
  pomodoroFabWindow.setVisibleOnAllWorkspaces(true)

  applyChildWindowSecurity(pomodoroFabWindow, {
    allowDevNavigationTo: process.env.VITE_DEV_SERVER_URL || undefined
  })

  const loadPromise = process.env.VITE_DEV_SERVER_URL
    ? pomodoroFabWindow.loadURL(process.env.VITE_DEV_SERVER_URL + '#/pomodoro-fab?slave=1')
    : pomodoroFabWindow.loadFile(path.join(__dirname, '../dist-web/index.html'), {
        hash: 'pomodoro-fab',
        query: { slave: '1' }
      })

  loadPromise.catch((err) => {
    console.error('[Main] Failed to load pomodoro fab window:', err)
  })

  pomodoroFabWindow.once('ready-to-show', () => {
    pomodoroFabWindow.show()
  })

  pomodoroFabWindow.on('closed', () => {
    pomodoroFabWindow = null
  })
}

function togglePomodoroFab() {
  if (pomodoroFabWindow && !pomodoroFabWindow.isDestroyed()) {
    if (pomodoroFabWindow.isVisible()) {
      pomodoroFabWindow.hide()
    } else {
      pomodoroFabWindow.show()
    }
  } else {
    createPomodoroFabWindow()
  }
}

function createMiniWindow() {
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.show()
    miniWindow.focus()
    return
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const { workArea } = primaryDisplay
  const windowWidth = 280
  const windowHeight = 400

  const options = {
    width: windowWidth,
    height: windowHeight,
    x: workArea.x + workArea.width - windowWidth - 20,
    y: workArea.y + workArea.height - windowHeight - 20,
    frame: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    transparent: true,
    hasShadow: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  }

  miniWindow = new BrowserWindow(options)

  miniWindow.setAlwaysOnTop(true, 'floating')
  miniWindow.setVisibleOnAllWorkspaces(true)

  applyChildWindowSecurity(miniWindow, {
    allowDevNavigationTo: process.env.VITE_DEV_SERVER_URL || undefined
  })

  const loadPromise = process.env.VITE_DEV_SERVER_URL
    ? miniWindow.loadURL(process.env.VITE_DEV_SERVER_URL + '#/mini-window?slave=1')
    : miniWindow.loadFile(path.join(__dirname, '../dist-web/index.html'), {
        hash: 'mini-window',
        query: { slave: '1' }
      })

  loadPromise.catch((err) => {
    console.error('[Main] Failed to load mini window:', err)
  })

  miniWindow.once('ready-to-show', () => {
    miniWindow.show()
  })

  miniWindow.on('closed', () => {
    miniWindow = null
  })
}

function toggleMiniWindow() {
  if (miniWindow && !miniWindow.isDestroyed()) {
    if (miniWindow.isVisible()) {
      miniWindow.hide()
    } else {
      miniWindow.show()
    }
  } else {
    createMiniWindow()
  }
}

function createQuickAddWindow() {
  if (quickAddWindow && !quickAddWindow.isDestroyed()) {
    quickAddWindow.show()
    quickAddWindow.focus()
    return
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const { workArea } = primaryDisplay
  const windowWidth = 400
  const windowHeight = 120

  const options = {
    width: windowWidth,
    height: windowHeight,
    x: workArea.x + (workArea.width - windowWidth) / 2,
    y: workArea.y + 100,
    title: '快速添加任务',
    frame: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    transparent: true,
    hasShadow: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  }

  const iconPath = getIconPath()
  if (iconPath) options.icon = iconPath

  quickAddWindow = new BrowserWindow(options)

  quickAddWindow.setAlwaysOnTop(true, 'floating')

  applyChildWindowSecurity(quickAddWindow, {
    allowDevNavigationTo: process.env.VITE_DEV_SERVER_URL || undefined
  })

  const loadPromise = process.env.VITE_DEV_SERVER_URL
    ? quickAddWindow.loadURL(process.env.VITE_DEV_SERVER_URL + '#/quick-add?slave=1')
    : quickAddWindow.loadFile(path.join(__dirname, '../dist-web/index.html'), {
        hash: 'quick-add',
        query: { slave: '1' }
      })

  loadPromise.catch((err) => {
    console.error('[Main] Failed to load quick add window:', err)
  })

  quickAddWindow.once('ready-to-show', () => {
    quickAddWindow.show()
    quickAddWindow.focus()
  })

  quickAddWindow.on('closed', () => {
    quickAddWindow = null
  })
}

// 注意：此函数逻辑与 src/utils/date.js 中的 getTodayStr 重复。
// 由于 main.cjs 是 CommonJS 格式，而项目 package.json 设置 "type": "module"，
// 主进程无法直接 require ES module 文件，因此在此保留一份实现用于托盘菜单统计。
function getTodayStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function getTaskStats() {
  const today = getTodayStr()
  let todayCount = 0
  let importantCount = 0
  let overdueCount = 0
  const todayTasks = []

  for (const task of taskCache.tasks) {
    if (!task.completed) {
      if (task.date === today) {
        todayCount++
        todayTasks.push(task)
      }
      if (task.important) importantCount++
      if (task.date < today) overdueCount++
    }
  }

  return { todayCount, importantCount, overdueCount, todayTasks: todayTasks.slice(0, 5) }
}

function updateTrayTooltip() {
  if (!tray) return
  const stats = getTaskStats()
  let tip = 'Choyeon To Do'
  if (stats.todayCount > 0) {
    tip += `\n今日任务: ${stats.todayCount}`
  }
  if (stats.overdueCount > 0) {
    tip += `\n已逾期: ${stats.overdueCount}`
  }
  if (appSettings.doNotDisturb) {
    tip += '\n免打扰模式'
  }
  tray.setToolTip(tip)
}

function buildTrayMenu() {
  const stats = getTaskStats()
  const v2 = getTodayStatsV2()
  const isMac = process.platform === 'darwin'
  const modKey = isMac ? '⌘' : 'Ctrl'

  // 常用列表：取前 5 个 category
  const topCategories = Array.isArray(taskCache.categories)
    ? taskCache.categories.slice(0, 5)
    : []

  const sendQuickAddPreset = (preset, extra) => {
    showAndFocusWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      const params = new URLSearchParams()
      if (preset) params.set('preset', preset)
      if (extra && extra.listId) params.set('listId', extra.listId)
      if (extra && extra.title) params.set('title', String(extra.title))
      const url = `choyeon-todo://quickadd?${params.toString()}`
      mainWindow.webContents.send('app:handleProtocolUrl', url)
    }
  }

  // 快速添加子菜单：我的一天 / 重要 / 5 个常用列表
  const quickAddSubmenu = [
    {
      label: '我的一天',
      click: () => sendQuickAddPreset('myDay')
    },
    {
      label: '重要',
      click: () => sendQuickAddPreset('important')
    },
    { type: 'separator' }
  ]
  if (topCategories.length === 0) {
    quickAddSubmenu.push({
      label: '（暂无列表）',
      enabled: false
    })
  } else {
    for (const c of topCategories) {
      const label = (c && c.name ? String(c.name) : '未命名').slice(0, 40)
      const listId = c && c.id ? String(c.id) : null
      quickAddSubmenu.push({
        label,
        click: () => sendQuickAddPreset('list', { listId })
      })
    }
  }

  // 番茄钟子菜单：开始25 / 暂停 / 跳过 / AI 模式
  const pomodoroSubmenu = [
    {
      label: '开始番茄工作 25 分钟',
      enabled: !pomodoroState.isRunning,
      click: () => {
        switchPomodoroMode('work')
        if (modeDurations.work !== 25 * 60) modeDurations.work = 25 * 60
        if (!pomodoroState.isRunning) {
          pomodoroPauseTimeLeft = 25 * 60
        }
        startPomodoroTimer()
      }
    },
    {
      label: '暂停',
      enabled: pomodoroState.isRunning,
      click: () => pausePomodoroTimer()
    },
    {
      label: '跳过当前段',
      enabled: pomodoroState.hasStarted,
      click: () => skipPomodoroSession()
    },
    { type: 'separator' },
    {
      label: 'AI 模式（智能切换）',
      enabled: true,
      click: () => {
        showAndFocusWindow()
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('pomodoro:aiMode')
        }
      }
    }
  ]

  // 启动项状态
  let autoLaunchChecked = !!appSettings.autoStart
  try {
    const s = app.getLoginItemSettings()
    autoLaunchChecked = !!s.openAtLogin
  } catch {
    /* ignore */
  }

  const menuTemplate = [
    {
      label: mainWindow && mainWindow.isVisible() ? '隐藏主界面' : '打开主界面',
      accelerator: `${modKey}+Shift+N`,
      click: () => toggleWindowVisibility()
    },
    {
      label: '快速添加任务',
      accelerator: `${modKey}+Shift+Q`,
      submenu: quickAddSubmenu
    },
    {
      label: '新建任务',
      accelerator: `${modKey}+N`,
      click: () => {
        showAndFocusWindow()
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('task:new')
        }
      }
    },
    {
      label: '搜索任务',
      accelerator: `${modKey}+Shift+K`,
      click: () => {
        showAndFocusWindow()
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('shortcut:focusSearch')
        }
      }
    },
    { type: 'separator' },
    {
      label: '今日统计',
      enabled: false
    },
    {
      label: `  已完成：${v2.completedToday} 项`,
      enabled: false
    },
    {
      label: `  专注分：${v2.focusScore}（${v2.focusMinutes} 分钟）`,
      enabled: false
    },
    {
      label: `  待提醒：${v2.remindersPending} 项`,
      enabled: false
    },
    {
      label: `  今日待办：${stats.todayCount} · 重要：${stats.importantCount} · 逾期：${stats.overdueCount}`,
      enabled: false
    },
    { type: 'separator' },
    {
      label: `今日任务 (${stats.todayCount})`,
      enabled: false
    }
  ]

  if (stats.todayTasks.length > 0) {
    for (const task of stats.todayTasks) {
      let label = task.title
      if (task.time) label = `[${task.time}] ${label}`
      if (task.important) label = '★ ' + label
      menuTemplate.push({
        label: label.length > 40 ? label.substring(0, 40) + '...' : label,
        click: () => {
          showAndFocusWindow()
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('task:focus', { taskId: task.id })
          }
        }
      })
    }
  } else {
    menuTemplate.push({
      label: '暂无今日任务',
      enabled: false
    })
  }

  menuTemplate.push(
    { type: 'separator' },
    {
      label: '番茄钟',
      submenu: pomodoroSubmenu
    },
    {
      label: '窗口布局',
      submenu: snapSubmenu
    },
    {
      label: pomodoroState.isRunning ? '停止专注模式' : '开始专注模式',
      accelerator: `${modKey}+Shift+P`,
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('shortcut:togglePomodoro')
        }
      }
    },
    {
      label: '免打扰模式',
      type: 'checkbox',
      accelerator: `${modKey}+Alt+M`,
      checked: appSettings.doNotDisturb,
      click: (menuItem) => {
        appSettings.doNotDisturb = menuItem.checked
        saveAppSettings()
        updateTrayTooltip()
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('settings:doNotDisturbChanged', appSettings.doNotDisturb)
        }
      }
    },
    {
      label: '开机自启',
      type: 'checkbox',
      checked: autoLaunchChecked,
      click: (menuItem) => {
        const enabled = !!menuItem.checked
        try {
          app.setLoginItemSettings({
            openAtLogin: enabled,
            openAsHidden: true,
            path: process.execPath,
            args: enabled ? ['--hidden'] : []
          })
          appSettings.autoStart = enabled
          saveAppSettings()
        } catch (e) {
          console.error('[Main] setAutoLaunch from tray failed:', e)
        }
        refreshTrayMenu()
      }
    },
    { type: 'separator' },
    {
      label: '检查更新',
      click: () => {
        try {
          autoUpdater.checkForUpdates().catch(() => {})
        } catch {
          /* ignore */
        }
      }
    },
    {
      label: '设置',
      click: () => {
        showAndFocusWindow()
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('navigate:settings')
        }
      }
    },
    {
      label: '退出',
      click: () => {
        isQuitting = true
        app.quit()
      }
    }
  )

  return Menu.buildFromTemplate(menuTemplate)
}

function refreshTrayMenu() {
  if (!tray) return
  try {
    tray.setContextMenu(buildTrayMenu())
    updateTrayTooltip()
  } catch (e) {
    console.error('[Main] Failed to refresh tray menu:', e)
  }
}

function getTodayStatsV2() {
  const today = getTodayStr()
  const y = new Date()
  y.setDate(y.getDate() - 1)
  const yesterday = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`

  let completedToday = 0
  let completedYesterday = 0
  let pendingToday = 0
  let importantToday = 0
  let overdue = 0
  let remindersPending = 0

  for (const task of taskCache.tasks) {
    if (task.completed) {
      // 完成日期以 completedAt 优先，否则用 date
      const cd = task.completedAt ? new Date(task.completedAt) : null
      const cdStr = cd
        ? `${cd.getFullYear()}-${String(cd.getMonth() + 1).padStart(2, '0')}-${String(cd.getDate()).padStart(2, '0')}`
        : task.date
      if (cdStr === today) completedToday++
      else if (cdStr === yesterday) completedYesterday++
    } else {
      if (task.date === today) {
        pendingToday++
        if (task.important) importantToday++
      }
      if (task.date && task.date < today) overdue++
      if (task.reminder || task.time) remindersPending++
    }
  }

  // 专注分粗略：从 completedPomodoros 换算
  const focusMinutes = Math.max(0, (pomodoroState.completedPomodoros || 0) * 25)
  const focusScore = Math.min(100, focusMinutes) // 0-100 分，25*4 = 100

  return {
    completedToday,
    completedYesterday,
    pendingToday,
    importantToday,
    overdue,
    remindersPending,
    focusMinutes,
    focusScore
  }
}

// ================= Snap Layouts：按 workArea 切分 =================
function applyWindowSnap(position) {
  if (!mainWindow || mainWindow.isDestroyed()) return
  try {
    if (mainWindow.isMaximized()) mainWindow.unmaximize()
    if (mainWindow.isFullScreen()) mainWindow.setFullScreen(false)
    const display = screen.getDisplayMatching(mainWindow.getBounds())
    const wa = display.workArea
    let x = wa.x,
      y = wa.y,
      w = wa.width,
      h = wa.height
    const halfW = Math.floor(wa.width / 2)
    const halfH = Math.floor(wa.height / 2)
    switch (position) {
      case 'left-half':
        w = halfW
        break
      case 'right-half':
        x = wa.x + halfW
        w = halfW
        break
      case 'top-half':
        h = halfH
        break
      case 'bottom-half':
        y = wa.y + halfH
        h = halfH
        break
      case 'top-left':
        w = halfW
        h = halfH
        break
      case 'top-right':
        x = wa.x + halfW
        w = halfW
        h = halfH
        break
      case 'bottom-left':
        w = halfW
        y = wa.y + halfH
        h = halfH
        break
      case 'bottom-right':
        x = wa.x + halfW
        w = halfW
        y = wa.y + halfH
        h = halfH
        break
      default:
        return
    }
    mainWindow.setBounds({ x, y, width: w, height: h }, true)
    saveWindowState()
  } catch (e) {
    console.error('[Main] applyWindowSnap error:', e)
  }
}

const snapSubmenu = [
  { label: '左半屏', click: () => applyWindowSnap('left-half') },
  { label: '右半屏', click: () => applyWindowSnap('right-half') },
  { label: '上半屏', click: () => applyWindowSnap('top-half') },
  { label: '下半屏', click: () => applyWindowSnap('bottom-half') },
  { type: 'separator' },
  { label: '左上象限', click: () => applyWindowSnap('top-left') },
  { label: '右上象限', click: () => applyWindowSnap('top-right') },
  { label: '左下象限', click: () => applyWindowSnap('bottom-left') },
  { label: '右下象限', click: () => applyWindowSnap('bottom-right') }
]

function showAndFocusWindow() {
  if (!mainWindow) return
  try {
    mainWindow.setVisibleOnAllWorkspaces(false)
  } catch {
    /* ignore */
  }
  if (mainWindow.isMinimized()) mainWindow.restore()
  if (!mainWindow.isVisible()) mainWindow.show()
  mainWindow.focus()
  // 将迷你窗口也带到前面（不抢焦点）
  if (miniWindow && !miniWindow.isDestroyed() && miniWindow.isVisible()) {
    try {
      miniWindow.showInactive()
    } catch {
      try {
        miniWindow.show()
      } catch {
        /* ignore */
      }
    }
  }
}

function restoreAndFocusMainWindow() {
  showAndFocusWindow()
}

function toggleWindowVisibility() {
  if (!mainWindow) return
  if (mainWindow.isVisible()) {
    mainWindow.hide()
  } else {
    showAndFocusWindow()
  }
}

// ================= 定时气泡通知：启动 10s + 每日 0 点复盘 =================
let trayStartupNoticeShown = false
let dailyReviewTimer = null

function getMsUntilNextMidnight() {
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5, 0)
  return Math.max(1000, next.getTime() - now.getTime())
}

function scheduleDailyReviewBalloon() {
  if (dailyReviewTimer) {
    clearTimeout(dailyReviewTimer)
    dailyReviewTimer = null
  }
  const schedule = () => {
    dailyReviewTimer = setTimeout(() => {
      try {
        if (tray && !tray.isDestroyed() && Notification && Notification.isSupported() && !appSettings.doNotDisturb) {
          const s = getTodayStatsV2()
          const iconPath = getIconPath()
          tray.displayBalloon({
            icon: iconPath || undefined,
            title: '昨日复盘',
            content: `完成 ${s.completedYesterday} 项，专注 ${s.focusMinutes} 分钟`,
            largeIcon: false,
            noSound: true
          })
        }
      } catch {
        /* ignore balloon errors */
      } finally {
        schedule()
      }
    }, getMsUntilNextMidnight())
  }
  schedule()
}

function scheduleStartupBalloon() {
  if (trayStartupNoticeShown) return
  trayStartupNoticeShown = true
  setTimeout(() => {
    try {
      if (tray && !tray.isDestroyed() && Notification && Notification.isSupported() && !appSettings.doNotDisturb) {
        const iconPath = getIconPath()
        tray.displayBalloon({
          icon: iconPath || undefined,
          title: 'Choyeon To Do',
          content: '已在后台运行，可通过托盘图标快速操作',
          largeIcon: false,
          noSound: true
        })
      }
    } catch {
      /* ignore */
    }
  }, 10 * 1000)
}

function registerGlobalShortcuts() {
  if (!appSettings.globalShortcutEnabled) return

  try {
    const ret1 = globalShortcut.register('CommandOrControl+Shift+N', () => {
      toggleWindowVisibility()
    })
    if (!ret1) {
      console.error('[Main] Failed to register global shortcut: CommandOrControl+Shift+N')
    }

    const ret2 = globalShortcut.register('CommandOrControl+Shift+K', () => {
      showAndFocusWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('shortcut:focusSearch')
      }
    })
    if (!ret2) {
      console.error('[Main] Failed to register global shortcut: CommandOrControl+Shift+K')
    }

    const ret3 = globalShortcut.register('CommandOrControl+Alt+M', () => {
      appSettings.doNotDisturb = !appSettings.doNotDisturb
      saveAppSettings()
      refreshTrayMenu()
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('settings:doNotDisturbChanged', appSettings.doNotDisturb)
      }
    })
    if (!ret3) {
      console.error('[Main] Failed to register global shortcut: CommandOrControl+Alt+M')
    }

    const ret4 = globalShortcut.register('CommandOrControl+Shift+P', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('shortcut:togglePomodoro')
      }
    })
    if (!ret4) {
      console.error('[Main] Failed to register global shortcut: CommandOrControl+Shift+P')
    }
  } catch (e) {
    console.error('[Main] Failed to register global shortcuts:', e)
  }
}

function unregisterGlobalShortcuts() {
  try {
    globalShortcut.unregisterAll()
  } catch (e) {
    console.error('[Main] Failed to unregister global shortcuts:', e)
  }
}

function refreshGlobalShortcuts() {
  unregisterGlobalShortcuts()
  if (appSettings.globalShortcutEnabled) {
    registerGlobalShortcuts()
  }
}

function createTray() {
  if (tray) return

  const iconPath = getIconPath()
  if (!iconPath) return

  try {
    tray = new Tray(iconPath)
    tray.setToolTip('Choyeon To Do')
    tray.setContextMenu(buildTrayMenu())
    updateTrayTooltip()

    tray.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide()
        } else {
          showAndFocusWindow()
        }
      }
    })

    // 启动 10s 后台气泡（免打扰时不弹）
    scheduleStartupBalloon()
    // 每日 0 点复盘气泡
    scheduleDailyReviewBalloon()
  } catch (e) {
    console.error('[Main] Failed to create tray:', e)
    tray = null
  }
}

// IPC 参数验证辅助函数
const validateString = (val, maxLen = 256) => {
  return typeof val === 'string' && val.length <= maxLen
}

// 发送方校验：确保 IPC 来自主窗口
const isFromMain = (event) => {
  return mainWindow && !mainWindow.isDestroyed() && event.sender === mainWindow.webContents
}

// 发送方校验：确保 IPC 来自调试窗口
const isFromDebug = (event) => {
  return debugWindow && !debugWindow.isDestroyed() && event.sender === debugWindow.webContents
}

// 发送方校验：确保 IPC 来自迷你窗口
const isFromMini = (event) => {
  return miniWindow && !miniWindow.isDestroyed() && event.sender === miniWindow.webContents
}

// 发送方校验：确保 IPC 来自番茄钟全屏窗口
const isFromPomodoroFullscreen = (event) => {
  return (
    pomodoroWindow && !pomodoroWindow.isDestroyed() && event.sender === pomodoroWindow.webContents
  )
}

// 发送方校验：确保 IPC 来自番茄钟悬浮球窗口
const isFromPomodoroFab = (event) => {
  return (
    pomodoroFabWindow &&
    !pomodoroFabWindow.isDestroyed() &&
    event.sender === pomodoroFabWindow.webContents
  )
}

// 发送方校验：确保 IPC 来自快速添加窗口
const isFromQuickAdd = (event) => {
  return (
    quickAddWindow &&
    !quickAddWindow.isDestroyed() &&
    event.sender === quickAddWindow.webContents
  )
}

ipcMain.on('window:minimize', (event) => {
  if (!isFromMain(event)) return
  mainWindow.minimize()
})

ipcMain.on('window:toggleMaximize', (event) => {
  if (!isFromMain(event)) return
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow.maximize()
  }
})

ipcMain.on('window:close', (event) => {
  if (!isFromMain(event)) return
  mainWindow.close()
})

// 查询当前最大化状态
ipcMain.handle('window:isMaximized', (event) => {
  if (!isFromMain(event)) return false
  return mainWindow.isMaximized()
})

// 设置开机自启
ipcMain.handle('settings:setAutoStart', (event, enabled) => {
  if (!isFromMain(event)) return false
  try {
    app.setLoginItemSettings({
      openAtLogin: !!enabled,
      path: process.execPath
    })
    appSettings.autoStart = !!enabled
    saveAppSettings()
    return true
  } catch (e) {
    console.error('[Main] Failed to set auto start:', e)
    return false
  }
})

// 获取开机自启状态
ipcMain.handle('settings:getAutoStart', (event) => {
  if (!isFromMain(event)) return false
  try {
    const settings = app.getLoginItemSettings()
    return settings.openAtLogin
  } catch {
    return appSettings.autoStart
  }
})

// 设置关闭窗口行为
ipcMain.handle('settings:setCloseToQuit', (event, enabled) => {
  if (!isFromMain(event)) return false
  appSettings.closeToQuit = !!enabled
  saveAppSettings()
  // 如果关闭到托盘，确保托盘已创建
  if (!enabled) {
    createTray()
  }
  return true
})

// 获取关闭窗口行为
ipcMain.handle('settings:getCloseToQuit', (event) => {
  if (!isFromMain(event)) return true
  return appSettings.closeToQuit
})

// 设置免打扰模式
ipcMain.handle('settings:setDoNotDisturb', (event, enabled) => {
  if (!isFromMain(event)) return false
  appSettings.doNotDisturb = !!enabled
  saveAppSettings()
  refreshTrayMenu()
  return true
})

// 获取免打扰模式
ipcMain.handle('settings:getDoNotDisturb', (event) => {
  if (!isFromMain(event)) return false
  return appSettings.doNotDisturb
})

// 获取Bing每日壁纸
ipcMain.handle('bing:getWallpaper', async (event) => {
  if (!isFromMain(event)) return null
  try {
    const https = require('https')
    const http = require('http')

    const endpoints = [
      'https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN',
      'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=en-US'
    ]

    const fetchUrl = (urlStr) => {
      return new Promise((resolve, reject) => {
        const urlObj = new URL(urlStr)
        const lib = urlObj.protocol === 'https:' ? https : http
        const req = lib.get(
          urlStr,
          {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              Accept: 'application/json, text/plain, */*',
              'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
            },
            timeout: 10000
          },
          (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
              fetchUrl(new URL(res.headers.location, urlStr).href).then(resolve).catch(reject)
              return
            }
            if (res.statusCode !== 200) {
              reject(new Error(`HTTP ${res.statusCode}`))
              return
            }
            let data = ''
            res.on('data', (chunk) => {
              data += chunk
            })
            res.on('end', () => {
              try {
                const json = JSON.parse(data)
                if (json.images && json.images.length > 0) {
                  const img = json.images[0]
                  let imageUrl = img.url
                  if (imageUrl.startsWith('/')) {
                    imageUrl = `${urlObj.protocol}//${urlObj.host}${imageUrl}`
                  }
                  if (!imageUrl.includes('_1920x1080') && imageUrl.includes('UHD')) {
                    imageUrl = imageUrl.replace('UHD', '1920x1080')
                  }
                  resolve({ url: imageUrl, copyright: img.copyright || '', title: img.title || '' })
                } else {
                  resolve(null)
                }
              } catch (e) {
                reject(e)
              }
            })
          }
        )
        req.on('error', reject)
        req.on('timeout', () => {
          req.destroy()
          reject(new Error('timeout'))
        })
      })
    }

    for (const endpoint of endpoints) {
      try {
        const result = await fetchUrl(endpoint)
        if (result?.url) return result
      } catch (e) {
        console.warn(`[Main] Bing endpoint ${endpoint} failed:`, e.message)
      }
    }
    return null
  } catch (e) {
    console.error('[Main] Failed to get Bing wallpaper:', e)
    return null
  }
})

// 设置全局快捷键开关
ipcMain.handle('settings:setGlobalShortcutEnabled', (event, enabled) => {
  if (!isFromMain(event)) return false
  appSettings.globalShortcutEnabled = !!enabled
  saveAppSettings()
  refreshGlobalShortcuts()
  return true
})

// 获取全局快捷键开关状态
ipcMain.handle('settings:getGlobalShortcutEnabled', (event) => {
  if (!isFromMain(event)) return false
  return appSettings.globalShortcutEnabled
})

// 查询窗口是否可见
ipcMain.handle('window:isVisible', (event) => {
  if (!isFromMain(event)) return false
  return mainWindow ? mainWindow.isVisible() : false
})

// 显示主窗口
ipcMain.on('window:show', (event) => {
  if (!isFromMain(event)) return
  showAndFocusWindow()
})

// 隐藏主窗口
ipcMain.on('window:hide', (event) => {
  if (!isFromMain(event)) return
  if (mainWindow) {
    mainWindow.hide()
    createTray()
    refreshTrayMenu()
  }
})

// 番茄钟全屏窗口
ipcMain.on('pomodoro:openFullscreen', (event) => {
  if (!isFromMain(event)) return
  createPomodoroWindow()
})

ipcMain.on('pomodoro:closeFullscreen', (event) => {
  if (!isFromPomodoroFullscreen(event)) return
  if (pomodoroWindow && !pomodoroWindow.isDestroyed()) {
    pomodoroWindow.setFullScreen(false)
    pomodoroWindow.close()
  }
})

ipcMain.on('pomodoro:openFab', (event) => {
  if (!isFromMain(event)) return
  createPomodoroFabWindow()
})

ipcMain.on('pomodoro:closeFab', (event) => {
  if (!isFromPomodoroFab(event)) return
  if (pomodoroFabWindow && !pomodoroFabWindow.isDestroyed()) {
    pomodoroFabWindow.close()
  }
})

ipcMain.on('pomodoro:toggleFab', (event) => {
  if (!isFromMain(event)) return
  togglePomodoroFab()
})

ipcMain.on('mini:open', (event) => {
  if (!isFromMain(event)) return
  if (!miniWindow) {
    createMiniWindow()
  } else {
    miniWindow.show()
  }
})

ipcMain.on('mini:close', (event) => {
  if (!isFromMain(event) && !isFromMini(event)) return
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.close()
  }
})

ipcMain.on('mini:toggle', (event) => {
  if (!isFromMain(event)) return
  toggleMiniWindow()
})

ipcMain.on('mini:showMain', (event) => {
  if (!isFromMini(event)) return
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show()
    mainWindow.focus()
  }
})

ipcMain.handle('mini:toggleAlwaysOnTop', (event) => {
  if (!isFromMini(event)) return false
  if (miniWindow && !miniWindow.isDestroyed()) {
    const isOnTop = miniWindow.isAlwaysOnTop()
    miniWindow.setAlwaysOnTop(!isOnTop, 'floating')
    return !isOnTop
  }
  return false
})

// 快速添加窗口
ipcMain.on('quickAdd:close', (_event) => {
  if (quickAddWindow && !quickAddWindow.isDestroyed()) {
    quickAddWindow.close()
  }
})

// 允许同步的字段白名单
const POMODORO_SYNC_FIELDS = new Set([
  'currentMode',
  'timeLeft',
  'totalTime',
  'hasStarted',
  'completedPomodoros'
])

ipcMain.on('pomodoro:stateSync', (event, state) => {
  if (!isFromMain(event)) return
  if (state && typeof state === 'object') {
    // 拒绝未知字段，防止类型混淆
    for (const key of Object.keys(state)) {
      if (!POMODORO_SYNC_FIELDS.has(key)) {
        console.warn('[Main] Invalid pomodoro sync field:', key)
        return
      }
    }
    if (state.currentMode && ['work', 'shortBreak', 'longBreak'].includes(state.currentMode)) {
      pomodoroState.currentMode = state.currentMode
    }
    if (typeof state.timeLeft === 'number' && !pomodoroState.isRunning) {
      pomodoroPauseTimeLeft = Math.max(0, Math.min(state.timeLeft, 24 * 60 * 60)) // 限制最大 24 小时
    }
    if (typeof state.totalTime === 'number') {
      pomodoroState.totalTime = Math.max(0, Math.min(state.totalTime, 24 * 60 * 60))
    }
    if (typeof state.hasStarted === 'boolean') {
      pomodoroState.hasStarted = state.hasStarted
    }
    if (typeof state.completedPomodoros === 'number') {
      pomodoroState.completedPomodoros = Math.max(0, state.completedPomodoros)
    }
  }
  updatePomodoroState()
  event.reply('pomodoro:stateUpdated', pomodoroState)
  refreshTrayMenu()
})

ipcMain.on('pomodoro:ready', (event) => {
  updatePomodoroState()
  event.reply('pomodoro:stateUpdated', pomodoroState)
})

ipcMain.handle('pomodoro:getState', () => {
  updatePomodoroState()
  return pomodoroState
})

ipcMain.on('pomodoro:action', (event, action) => {
  if (!isFromMain(event) && !isFromPomodoroFullscreen(event) && !isFromPomodoroFab(event)) return
  switch (action) {
    case 'toggle':
      if (pomodoroState.isRunning) {
        pausePomodoroTimer()
      } else {
        startPomodoroTimer()
      }
      break
    case 'start':
      startPomodoroTimer()
      break
    case 'pause':
      pausePomodoroTimer()
      break
    case 'reset':
      resetPomodoroTimer()
      break
    case 'skip':
      skipPomodoroSession()
      break
    case 'switchWork':
      switchPomodoroMode('work')
      break
    case 'switchShortBreak':
      switchPomodoroMode('shortBreak')
      break
    case 'switchLongBreak':
      switchPomodoroMode('longBreak')
      break
  }
})

ipcMain.on('pomodoro:setDuration', (event, { mode, minutes }) => {
  if (!isFromMain(event) && !isFromPomodoroFullscreen(event) && !isFromPomodoroFab(event) && !isFromMini(event) && !isFromQuickAdd(event)) return
  if (!mode || typeof minutes !== 'number') return
  if (!['work', 'shortBreak', 'longBreak'].includes(mode)) return
  const clamped = Math.max(1, Math.min(180, minutes))
  modeDurations[mode] = clamped * 60
  // 更新模式对应的时长（仅在未运行时立即同步暂停剩余秒数，避免状态抖动）
  if (!pomodoroState.isRunning && pomodoroState.currentMode === mode) {
    pomodoroPauseTimeLeft = clamped * 60
    updatePomodoroState()
    broadcastPomodoroState()
  } else {
    // 运行中也刷新 totalTime（只影响 totalTime 展示，不影响正在运行的倒计时）
    updatePomodoroState()
    broadcastPomodoroState(event.sender)
  }
})

// 调试通道 — 仅在开发环境或非打包时注册
if (!app.isPackaged) {
  ipcMain.on('debug:openDevTools', (event) => {
    if (!isFromDebug(event) && !isFromMain(event)) return
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.openDevTools({ mode: 'detach' })
    }
  })

  ipcMain.on('debug:openWindow', (event) => {
    if (!isFromMain(event)) return
    createDebugWindow()
  })

  ipcMain.on('debug:closeWindow', (event) => {
    if (!isFromDebug(event)) return
    if (debugWindow) debugWindow.close()
  })

  ipcMain.on('debug:minimizeWindow', (event) => {
    if (!isFromDebug(event)) return
    if (debugWindow) debugWindow.minimize()
  })
}

// ============== Task 6: 应用焦点事件（空桩，不强制硬件级检测） ==============
//  广播窗口/焦点变化给各主窗口，供 useFocusDistractionDetector 使用。
function broadcastAppFocus(eventName, payload = {}) {
  const targets = [mainWindow, pomodoroWindow, pomodoroFabWindow, miniWindow]
  targets.forEach((win) => {
    if (!win || win.isDestroyed()) return
    if (!win.webContents || win.webContents.isDestroyed()) return
    try {
      win.webContents.send(eventName, payload)
    } catch (e) {
      /* ignore */
    }
  })
}

const APP_FOCUS_EVENTS_ENABLED = !!process.versions?.electron
if (APP_FOCUS_EVENTS_ENABLED) {
  app.on('browser-window-blur', (_e, _win) => {
    broadcastAppFocus('app:focus-lost', { reason: 'browser-window-blur' })
  })
  app.on('browser-window-focus', (_e, _win) => {
    broadcastAppFocus('app:focus-gained', { reason: 'browser-window-focus' })
  })
  app.on('browser-window-hide', (_e, win) => {
    if (win && win === mainWindow) {
      broadcastAppFocus('app:window-hidden', { reason: 'browser-window-hide' })
    }
  })
  app.on('browser-window-minimize', (_e, win) => {
    if (win && win === mainWindow) {
      broadcastAppFocus('app:window-hidden', { reason: 'browser-window-minimize' })
    }
  })
}

// ============== Task 6 B: hotkey IPC 动态注册/反注册 ==============
const registeredHotkeys = new Set()

function isFromRenderer(event) {
  // 允许所有已知渲染进程注册（主/番茄/悬浮球/迷你窗口）
  if (isFromMain(event)) return true
  if (isFromDebug(event)) return true
  if (isFromMini(event)) return true
  if (isFromPomodoroFullscreen(event)) return true
  if (isFromPomodoroFab(event)) return true
  return false
}

ipcMain.handle('hotkey:register', (event, binds) => {
  if (!isFromRenderer(event)) return { ok: false, err: 'forbidden' }
  if (!process.versions?.electron) return { ok: false, err: 'not_electron' }
  if (!globalShortcut) return { ok: false, err: 'globalShortcut_unavailable' }
  if (!Array.isArray(binds)) binds = []
  const results = []
  for (const bind of binds) {
    if (!bind || typeof bind !== 'object') continue
    const key = typeof bind.key === 'string' ? bind.key : null
    const accelerator = typeof bind.accelerator === 'string' ? bind.accelerator : null
    if (!key || !accelerator) {
      results.push({ key, accelerator, ok: false, err: 'invalid_bind' })
      continue
    }
    try {
      // 先注销相同 accelerator，避免重复
      if (registeredHotkeys.has(accelerator)) {
        try {
          globalShortcut.unregister(accelerator)
        } catch (e) {
          /* ignore */
        }
      }
      const ok = globalShortcut.register(accelerator, () => {
        // 发送到渲染进程（主/子窗口都广播）
        broadcastAppFocus('hotkey:pressed', { key, accelerator })
      })
      if (ok) {
        registeredHotkeys.add(accelerator)
        results.push({ key, accelerator, ok: true })
      } else {
        results.push({ key, accelerator, ok: false, err: 'register_failed' })
      }
    } catch (err) {
      results.push({ key, accelerator, ok: false, err: (err && err.message) || String(err) })
    }
  }
  return { ok: true, results }
})

ipcMain.handle('hotkey:unregisterAll', (event) => {
  if (!isFromRenderer(event)) return { ok: false, err: 'forbidden' }
  try {
    if (globalShortcut) {
      for (const acc of Array.from(registeredHotkeys)) {
        try {
          globalShortcut.unregister(acc)
        } catch (e) {
          /* ignore */
        }
      }
    }
    registeredHotkeys.clear()
    return { ok: true }
  } catch (err) {
    return { ok: false, err: (err && err.message) || String(err) }
  }
})

// 同步任务数据到主进程（用于托盘菜单显示）
ipcMain.on('tasks:sync', (event, { tasks, categories }) => {
  if (!isFromMain(event)) return
  if (Array.isArray(tasks)) {
    taskCache.tasks = tasks
  }
  if (Array.isArray(categories)) {
    taskCache.categories = categories
  }
  refreshTrayMenu()
})

ipcMain.handle('app:getVersion', () => {
  return app.getVersion()
})

ipcMain.handle('updater:checkForUpdates', async (event) => {
  if (!isFromMain(event)) return { success: false, error: 'forbidden' }

  // 防止重复检查
  if (isCheckingUpdate) {
    console.warn('[Updater] Already checking for updates, skipping...')
    return { success: false, error: 'already_checking' }
  }

  // 开发模式下不调用真实更新
  if (!app.isPackaged) {
    console.warn('[Updater] Development mode, skipping real update check')
    return { success: true, version: app.getVersion(), devMode: true }
  }

  isCheckingUpdate = true
  try {
    console.warn('[Updater] Checking for updates...')
    console.warn('[Updater] Current app version:', app.getVersion())

    const result = await autoUpdater.checkForUpdates()
    console.warn('[Updater] Check result:', result ? result.updateInfo : 'no info')

    if (result && result.updateInfo) {
      console.warn('[Updater] Update found:', result.updateInfo.version)
    }

    return { success: true, version: app.getVersion() }
  } catch (err) {
    console.error('[Updater] Check failed:', err)
    sendToMainWindow('updater:error', { message: err.message })
    return { success: false, error: err.message }
  } finally {
    isCheckingUpdate = false
  }
})

ipcMain.handle('updater:downloadUpdate', async (event) => {
  if (!isFromMain(event)) return { success: false, error: 'forbidden' }

  // 开发模式下不下载
  if (!app.isPackaged) {
    console.warn('[Updater] Development mode, skipping download')
    return { success: false, error: 'dev_mode' }
  }

  try {
    console.warn('[Updater] Starting download...')
    await autoUpdater.downloadUpdate()
    return { success: true }
  } catch (err) {
    console.error('[Updater] Download failed:', err)
    sendToMainWindow('updater:error', { message: err.message })
    return { success: false, error: err.message }
  }
})

ipcMain.handle('updater:quitAndInstall', (event) => {
  if (!isFromMain(event)) return false
  if (updateDownloaded) {
    isQuitting = true
    autoUpdater.quitAndInstall()
  }
  return updateDownloaded
})

function addAutoUpdaterListener(event, handler) {
  autoUpdater.on(event, handler)
  autoUpdaterListeners.push({ event, handler })
}

function removeAllAutoUpdaterListeners() {
  for (const { event, handler } of autoUpdaterListeners) {
    autoUpdater.removeListener(event, handler)
  }
  autoUpdaterListeners.length = 0
}

function setupAutoUpdater() {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  console.warn('[Updater] Auto updater setup started, isPackaged:', app.isPackaged)
  console.warn('[Updater] App version:', app.getVersion())
  console.warn('[Updater] AppId:', app.getAppUserModelId())

  if (!app.isPackaged) {
    console.warn('[Updater] Development mode, auto updater disabled')
    return
  }

  addAutoUpdaterListener('checking-for-update', () => {
    console.warn('[Updater] Checking for update...')
    sendToMainWindow('updater:checking')
  })

  addAutoUpdaterListener('update-available', (info) => {
    console.warn('[Updater] Update available:', info)
    sendToMainWindow('updater:update-available', {
      version: info.version,
      releaseNotes: info.releaseNotes,
      releaseDate: info.releaseDate
    })
  })

  addAutoUpdaterListener('update-not-available', (info) => {
    console.warn('[Updater] No update available, current version:', info.version)
    sendToMainWindow('updater:update-not-available', {
      version: info.version
    })
  })

  addAutoUpdaterListener('download-progress', (progressObj) => {
    console.warn('[Updater] Download progress:', progressObj.percent, '%')
    sendToMainWindow('updater:download-progress', {
      percent: progressObj.percent,
      speed: progressObj.bytesPerSecond,
      transferred: progressObj.transferred,
      total: progressObj.total
    })
  })

  addAutoUpdaterListener('update-downloaded', () => {
    console.warn('[Updater] Update downloaded')
    updateDownloaded = true
    sendToMainWindow('updater:update-downloaded')
  })

  addAutoUpdaterListener('error', (err) => {
    console.error('[Updater] Error:', err)
    sendToMainWindow('updater:error', {
      message: err.message
    })
  })

  if (!updateCheckInterval) {
    updateCheckInterval = setInterval(() => {
      if (!isQuitting) {
        console.warn('[Updater] Periodic update check...')
        autoUpdater.checkForUpdates().catch((err) => {
          console.error('[Updater] Periodic check failed:', err)
        })
      }
    }, UPDATE_CHECK_INTERVAL_MS)
    console.warn('[Updater] Periodic update check enabled (every hour)')
  }

  console.warn('[Updater] Auto updater setup complete')
}

function sendToMainWindow(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data)
  }
}

ipcMain.on('notification:send', (event, { title, body, taskId }) => {
  // 允许主窗口和调试窗口发送通知
  if (!isFromMain(event) && !isFromDebug(event)) return

  // 参数验证
  if (!validateString(title) || !validateString(body, 2048)) {
    return
  }

  if (!Notification.isSupported()) {
    if (!event.sender.isDestroyed()) {
      event.reply('notification:response', { action: 'unsupported' })
    }
    return
  }

  // 免打扰模式时不发送通知
  if (appSettings.doNotDisturb) {
    return
  }

  const iconPath = getIconPath()
  const notification = new Notification({
    title: title || 'Choyeon To Do',
    body: body || '',
    icon: iconPath || undefined,
    silent: false,
    timeoutType: 'default',
    urgency: 'normal'
  })

  notification.on('click', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      if (!mainWindow.isVisible()) mainWindow.show()
      mainWindow.focus()
      // 如果有 taskId，发送定位事件
      if (taskId) {
        mainWindow.webContents.send('notification:taskClick', { taskId })
      }
    }
    if (!event.sender.isDestroyed()) {
      event.reply('notification:response', { action: 'clicked', taskId })
    }
    notification.removeAllListeners()
  })

  notification.on('close', () => {
    if (!event.sender.isDestroyed()) {
      event.reply('notification:response', { action: 'closed', taskId })
    }
    notification.removeAllListeners()
  })

  notification.show()
})

// Task 5: 新的高级通知通道（带 actions），通过 ipcMain.handle + send 回发 reminder:action
// reminder:action 只会回发到 mainWindow（提醒调度器只在 mainWindow 运行、所有变更/导航的真实载体也是它），
// 避免 slave 子窗口（pomodoroFab/fullscreen/mini/quick-add）重复收到后通过它们的全局监听器再次触发副作用。
const sendReminderAction = (payload, preferredSender) => {
  const channel = 'reminder:action'
  // 首选 mainWindow：提醒调度、store mutations 与任务导航的真实载体
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
    try {
      mainWindow.webContents.send(channel, payload)
      return
    } catch {
      /* fallback to preferredSender */
    }
  }
  if (preferredSender && !preferredSender.isDestroyed()) {
    try {
      preferredSender.send(channel, payload)
    } catch {
      /* ignore */
    }
  }
}

const parseSnoozeActionToMinutes = (action) => {
  if (!action) return null
  switch (action) {
    case 'snooze5':
      return 5
    case 'snooze10':
      return 10
    case 'snooze30':
      return 30
    case 'snooze1h':
    case 'snooze60':
      return 60
    case 'snoozeTmr':
      return 24 * 60 // 交给 renderer 根据语义再判定
    default:
      if (typeof action === 'string' && action.startsWith('snooze')) {
        const m = Number(action.slice(6))
        if (Number.isFinite(m) && m >= 0) return m
      }
      return null
  }
}

ipcMain.handle('notification:show', (event, payload) => {
  try {
    // 允许所有本 app 窗口（主端/调试/番茄钟/迷你/快速添加窗口）发送通知
    const allowed =
      isFromMain(event) ||
      isFromDebug(event) ||
      isFromMini(event) ||
      isFromPomodoroFullscreen(event) ||
      isFromPomodoroFab(event) ||
      isFromQuickAdd(event)
    if (!allowed) return { success: false, error: 'forbidden' }

    if (!payload || typeof payload !== 'object') {
      return { success: false, error: 'invalid_payload' }
    }
    const title = typeof payload.title === 'string' ? payload.title : 'Choyeon To Do'
    const body = typeof payload.body === 'string' ? payload.body : ''
    const silent = !!payload.silent
    const iconPath = getIconPath()
    const taskId = typeof payload.taskId === 'string' ? payload.taskId : null
    const actions = Array.isArray(payload.actions) ? payload.actions : []

    if (!validateString(title) || !validateString(body, 2048)) {
      return { success: false, error: 'invalid_fields' }
    }

    if (!Notification.isSupported()) {
      return { success: false, error: 'unsupported' }
    }

    if (appSettings.doNotDisturb) {
      return { success: true, suppressed: true }
    }

    const notifOptions = {
      title,
      body,
      icon: iconPath || undefined,
      silent,
      hasReply: false,
      timeoutType: 'never',
      urgency: 'normal'
    }
    // Electron 在 win32 下的 actions（Toast 原生按钮）最多允许 5 个
    if (Array.isArray(actions) && actions.length) {
      notifOptions.actions = actions
        .filter((a) => a && a.action && a.title)
        .slice(0, 5)
        .map((a) => ({ type: 'button', text: String(a.title).slice(0, 64) }))
    }

    const notification = new Notification(notifOptions)

    // 点击 -> 打开任务
    notification.on('click', () => {
      showAndFocusWindow()
      if (taskId) {
        sendReminderAction({ taskId, action: 'openTask' }, event.sender)
      }
      try {
        notification.removeAllListeners()
      } catch {
        /* ignore */
      }
    })

    // Windows Toast actions 按钮
    notification.on('action', (actionIndex) => {
      const act = Array.isArray(actions) ? actions[Number(actionIndex) || 0] : null
      if (!act || !act.action) return
      const snoozeMinutes = parseSnoozeActionToMinutes(act.action)
      const outPayload = {
        taskId,
        action: act.action,
        snoozeMinutes: snoozeMinutes ?? null
      }
      sendReminderAction(outPayload, event.sender)
      try {
        notification.removeAllListeners()
      } catch {
        /* ignore */
      }
    })

    notification.on('close', () => {
      try {
        notification.removeAllListeners()
      } catch {
        /* ignore */
      }
    })

    notification.show()
    return { success: true }
  } catch (e) {
    console.error('[Main] notification:show error:', e)
    return { success: false, error: e && e.message ? e.message : 'unknown' }
  }
})

// ===================== Task 9: Protocol URL 路由 =====================
const PROTOCOL_SCHEME = 'choyeon-todo'

// 在所有可用窗口中广播协议 URL（主/子窗口都可能需要 quickadd）
function broadcastProtocolUrl(url) {
  if (!url) return
  const allWindows = [
    mainWindow,
    miniWindow,
    pomodoroFabWindow,
    pomodoroWindow,
    quickAddWindow,
    debugWindow
  ]
  for (const win of allWindows) {
    if (!win || win.isDestroyed()) continue
    if (!win.webContents || win.webContents.isDestroyed()) continue
    try {
      win.webContents.send('app:handleProtocolUrl', url)
    } catch {
      /* ignore */
    }
  }
}

// 从 argv / commandLine 中提取协议 URL
function extractProtocolUrl(argv) {
  if (!Array.isArray(argv)) return null
  for (const a of argv) {
    if (typeof a === 'string' && a.startsWith(PROTOCOL_SCHEME + '://')) {
      return a
    }
  }
  return null
}

// ===================== Task 9: 新增 IPC（B / C / D） =====================
function registerTask9IPC() {
  // ---- B. 自启动（新 API：带 openAsHidden + --hidden） ----
  ipcMain.handle('app:setAutoLaunch', (event, enabled) => {
    if (!isFromMain(event)) return { ok: false, err: 'forbidden' }
    try {
      app.setLoginItemSettings({
        openAtLogin: !!enabled,
        openAsHidden: true,
        path: process.execPath,
        args: enabled ? ['--hidden'] : []
      })
      appSettings.autoStart = !!enabled
      saveAppSettings()
      refreshTrayMenu()
      return { ok: true, openAtLogin: !!enabled, openAsHidden: true }
    } catch (e) {
      console.error('[Main] setAutoLaunch error:', e)
      return { ok: false, err: (e && e.message) || String(e) }
    }
  })

  ipcMain.handle('app:getAutoLaunch', (event) => {
    if (!isFromMain(event)) return { ok: false, err: 'forbidden' }
    try {
      const s = app.getLoginItemSettings()
      return {
        ok: true,
        openAtLogin: !!s.openAtLogin,
        openAsHidden: !!s.openAsHidden,
        wasOpenedAtLogin: !!s.wasOpenedAtLogin,
        willLaunchAtLogin: !!s.willLaunchAtLogin,
        path: process.execPath,
        args: appSettings.autoStart ? ['--hidden'] : []
      }
    } catch (e) {
      // fallback 到内存设置
      return {
        ok: true,
        openAtLogin: !!appSettings.autoStart,
        openAsHidden: true,
        path: process.execPath,
        args: appSettings.autoStart ? ['--hidden'] : []
      }
    }
  })

  // ---- C. 拖拽：startDrag ----
  // 在 Electron 中调用 webContents.startDrag 发起系统级拖拽
  // 如果用户传了 files，则生成临时文件供拖出
  const tempDragFiles = new Map() // taskId -> [tmp file paths]，进程退出时清理
  const cleanupTempDragFiles = () => {
    for (const paths of tempDragFiles.values()) {
      for (const p of paths) {
        try {
          if (fs.existsSync(p)) fs.unlinkSync(p)
        } catch {
          /* ignore */
        }
      }
    }
    tempDragFiles.clear()
  }
  // 在 will-quit 清理
  app.once('will-quit', cleanupTempDragFiles)

  ipcMain.handle('task:startDrag', (event, payload) => {
    const allowed = isFromMain(event) || isFromMini(event) || isFromDebug(event)
    if (!allowed) return { ok: false, err: 'forbidden' }
    if (!payload || typeof payload !== 'object') return { ok: false, err: 'invalid_payload' }
    try {
      const sender = event.sender
      if (!sender || sender.isDestroyed()) return { ok: false, err: 'sender_gone' }

      const taskId = typeof payload.taskId === 'string' ? payload.taskId : `task_${Date.now()}`
      const html = typeof payload.html === 'string' ? payload.html : ''
      const plainText = typeof payload.plainText === 'string' ? payload.plainText : String(payload.title || taskId)

      const dragItem = {
        data: {
          text: plainText,
          html: html || undefined
        },
        // 使用 nativeImage 自定义拖拽图：没有时留空，Electron 会自动用选择区域
        icon: undefined,
        dragImage: undefined
      }

      // 可选：生成临时 .html 预览文件供拖入外部文件夹
      if (payload && payload.exportAsFile !== false) {
        try {
          const safeTitle = (String(payload.title || taskId) || 'task').replace(
            /[\\/:*?"<>|\r\n\t]/g,
            '_'
          )
          const tmpDir = app.getPath('temp')
          const baseName = `${safeTitle.slice(0, 60)}_${taskId.slice(0, 8)}`
          const tmpHtml = path.join(tmpDir, `${baseName}.html`)
          const content =
            html && html.length > 0
              ? html
              : `<!doctype html><meta charset="utf-8"><title>${safeTitle}</title><body><h1>${safeTitle}</h1><pre>${escapeHtml(plainText)}</pre></body>`
          fs.writeFileSync(tmpHtml, content, 'utf-8')
          // 可选 .url link
          const tmpUrl = path.join(tmpDir, `${baseName}.url`)
          const urlContent =
            '[InternetShortcut]\r\nURL=choyeon-todo://task/' + encodeURIComponent(taskId) + '\r\n'
          try {
            fs.writeFileSync(tmpUrl, urlContent, 'utf-8')
            dragItem.file = tmpHtml // startDrag 的 file 字段可选
            tempDragFiles.set(taskId, [tmpHtml, tmpUrl])
          } catch {
            tempDragFiles.set(taskId, [tmpHtml])
          }
        } catch {
          /* ignore file export errors */
        }
      }

      if (typeof sender.startDrag === 'function') {
        sender.startDrag(dragItem)
      }
      return { ok: true, taskId }
    } catch (e) {
      return { ok: false, err: (e && e.message) || String(e) }
    }
  })

  // ---- D. Snap Layouts：通过 IPC 让 renderer 也能触发（可选） ----
  ipcMain.on('window:snapLayout', (event, position) => {
    if (!isFromMain(event)) return
    applyWindowSnap(position)
  })
}

// 简单 HTML escape，避免 XSS
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// 单实例锁
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // 还原主窗口 + 迷你窗口到前面
    restoreAndFocusMainWindow()
    // 从二次启动的命令行中解析协议 URL，并分发
    const url = extractProtocolUrl(commandLine)
    if (url) {
      // 稍延迟，确保主窗口已 ready
      setTimeout(() => broadcastProtocolUrl(url), 80)
    }
  })

  // macOS：open-url 事件（协议 URL 点击触发）
  app.on('open-url', (event, url) => {
    event.preventDefault()
    if (url && url.startsWith(PROTOCOL_SCHEME + '://')) {
      restoreAndFocusMainWindow()
      setTimeout(() => broadcastProtocolUrl(url), 80)
    }
  })

  app.whenReady().then(() => {
    // 加载应用设置
    loadAppSettings()

    // 注册 Task 9 新增 IPC
    try {
      registerTask9IPC()
    } catch (e) {
      console.error('[Main] registerTask9IPC failed:', e)
    }

    // 注入 CSP 响应头
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      // Bing wallpaper fallback URL (renderer may fetch directly when IPC is unavailable)
      const bingWallpaperSrc = 'https://www.bing.com https://cn.bing.com'
      let connectSrc = `connect-src 'self' ${bingWallpaperSrc}; `
      if (process.env.VITE_DEV_SERVER_URL) {
        try {
          const url = new URL(process.env.VITE_DEV_SERVER_URL)
          const wsUrl = `ws://${url.host}`
          const httpUrl = `http://${url.host}`
          connectSrc = `connect-src 'self' ${bingWallpaperSrc} ${wsUrl} ${httpUrl}; `
        } catch {
          connectSrc = `connect-src 'self' ${bingWallpaperSrc} ws://localhost:5173 http://localhost:5173; `
        }
      }

      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; " +
              "script-src 'self'; " +
              "style-src 'self' 'unsafe-inline'; " +
              `img-src 'self' data: ${bingWallpaperSrc} https://cn.bing.com; ` +
              connectSrc +
              "font-src 'self'; " +
              "object-src 'none'; " +
              "base-uri 'self'"
          ]
        }
      })
    })

    // B. 协议注册：choyeon-todo://
    try {
      app.setAsDefaultProtocolClient(PROTOCOL_SCHEME, process.execPath, ['--protocol-url'])
    } catch (e) {
      console.warn('[Main] setAsDefaultProtocolClient failed:', e)
    }

    createWindow()

    setupAutoUpdater()

    // 注册全局快捷键
    registerGlobalShortcuts()

    // 同步开机自启设置（Task 9 增强版：含 openAsHidden + --hidden）
    try {
      app.setLoginItemSettings({
        openAtLogin: !!appSettings.autoStart,
        openAsHidden: true,
        path: process.execPath,
        args: appSettings.autoStart ? ['--hidden'] : []
      })
    } catch (e) {
      console.error('[Main] Failed to sync auto start:', e)
    }

    // 启动时如果 process.argv 中携带 protocol URL，也分发一次（首次打开）
    const launchUrl = extractProtocolUrl(process.argv)
    if (launchUrl) {
      setTimeout(() => {
        restoreAndFocusMainWindow()
        broadcastProtocolUrl(launchUrl)
      }, 600) // 等主窗口加载完毕
    }

    // 如果用户选择"关闭到托盘"，启动时默认也创建好托盘，避免首次最小化/关闭时卡顿
    if (!appSettings.closeToQuit) {
      try {
        createTray()
        refreshTrayMenu()
      } catch {
        /* ignore */
      }
    }

    app.on('activate', function () {
      if (mainWindow) {
        mainWindow.show()
      } else {
        createWindow()
      }
    })
  })
}

function cleanupAllResources() {
  if (pomodoroTimer) {
    clearInterval(pomodoroTimer)
    pomodoroTimer = null
  }

  if (updateCheckInterval) {
    clearInterval(updateCheckInterval)
    updateCheckInterval = null
  }

  if (crashReloadTimeout) {
    clearTimeout(crashReloadTimeout)
    crashReloadTimeout = null
  }

  removeAllAutoUpdaterListeners()

  unregisterGlobalShortcuts()

  if (tray) {
    tray.destroy()
    tray = null
  }
}

function closeAllChildWindows() {
  const windows = [debugWindow, pomodoroWindow, pomodoroFabWindow, miniWindow, quickAddWindow]
  for (const win of windows) {
    if (win && !win.isDestroyed()) {
      win.removeAllListeners()
      win.close()
    }
  }
  debugWindow = null
  pomodoroWindow = null
  pomodoroFabWindow = null
  miniWindow = null
  quickAddWindow = null
}

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  isQuitting = true
  saveWindowState()
  closeAllChildWindows()
})

app.on('will-quit', () => {
  cleanupAllResources()
})

app.on('child-process-gone', (event, details) => {
  if (details.type === 'GPU') {
    console.error('[Main] GPU process gone:', details.reason)
  }
})
