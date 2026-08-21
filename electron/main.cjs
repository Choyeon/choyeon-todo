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

const loadWindowState = () => {
  try {
    const data = fs.readFileSync(windowStatePath, 'utf-8')
    const state = JSON.parse(data)
    const width = state.width || 1200
    const height = state.height || 800
    let x = typeof state.x === 'number' ? state.x : undefined
    let y = typeof state.y === 'number' ? state.y : undefined

    // Validate window position is within visible screen bounds
    if (x !== undefined && y !== undefined) {
      const displays = screen.getAllDisplays()
      const isVisible = displays.some((display) => {
        return (
          x >= display.bounds.x - 100 &&
          y >= display.bounds.y - 100 &&
          x + width <= display.bounds.x + display.bounds.width + 100 &&
          y + height <= display.bounds.y + display.bounds.height + 100
        )
      })
      if (!isVisible) {
        x = undefined
        y = undefined
      }
    }

    return {
      width,
      height,
      x,
      y,
      isMaximized: !!state.isMaximized
    }
  } catch {
    return { width: 1200, height: 800 }
  }
}

const saveWindowState = () => {
  if (!mainWindow || mainWindow.isDestroyed()) return
  try {
    const bounds = mainWindow.getBounds()
    const state = {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      isMaximized: mainWindow.isMaximized()
    }
    fs.writeFileSync(windowStatePath, JSON.stringify(state))
  } catch {
    // 忽略写入错误
  }
}

// 获取应用图标路径
function getIconPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'icon.png')
  }
  const devIcon = path.join(__dirname, '../build/icon.png')
  if (fs.existsSync(devIcon)) {
    return devIcon
  }
  return null
}

// 根据系统主题设置窗口背景色
const getBgColor = () => {
  return nativeTheme.shouldUseDarkColors ? '#202124' : '#ffffff'
}

function createWindow() {
  const iconPath = getIconPath()
  const windowState = loadWindowState()

  const windowOptions = {
    width: windowState.width,
    height: windowState.height,
    minWidth: 360,
    minHeight: 480,
    title: 'Choyeon To Do - 任务管理',
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

  // Windows 11 使用原生 Acrylic 亚克力毛玻璃材质
  if (process.platform === 'win32') {
    windowOptions.backgroundMaterial = 'acrylic'
    windowOptions.backgroundColor = '#00000000'
  } else {
    windowOptions.backgroundColor = getBgColor()
  }

  if (windowState.x !== undefined && windowState.y !== undefined) {
    windowOptions.x = windowState.x
    windowOptions.y = windowState.y
  }
  if (iconPath) windowOptions.icon = iconPath

  mainWindow = new BrowserWindow(windowOptions)

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
      if (windowState.isMaximized) {
        mainWindow.maximize()
      }
      mainWindow.show()
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

  // 安全：阻止外部导航
  mainWindow.webContents.on('will-navigate', (e, url) => {
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

  const loadPromise = process.env.VITE_DEV_SERVER_URL
    ? quickAddWindow.loadURL(process.env.VITE_DEV_SERVER_URL + '#/quick-add')
    : quickAddWindow.loadFile(path.join(__dirname, '../dist-web/index.html'), {
        hash: 'quick-add'
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
  const isMac = process.platform === 'darwin'
  const modKey = isMac ? '⌘' : 'Ctrl'

  const menuTemplate = [
    {
      label: mainWindow && mainWindow.isVisible() ? '隐藏主窗口' : '显示主窗口',
      accelerator: `${modKey}+Shift+N`,
      click: () => {
        toggleWindowVisibility()
      }
    },
    {
      label: '快速添加任务',
      accelerator: `${modKey}+Shift+Q`,
      click: () => {
        createQuickAddWindow()
      }
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
      label: `  今日待办: ${stats.todayCount}`,
      enabled: false
    },
    {
      label: `  重要任务: ${stats.importantCount}`,
      enabled: false
    },
    {
      label: `  已逾期: ${stats.overdueCount}`,
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
    { type: 'separator' },
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

function showAndFocusWindow() {
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  if (!mainWindow.isVisible()) mainWindow.show()
  mainWindow.focus()
}

function toggleWindowVisibility() {
  if (!mainWindow) return
  if (mainWindow.isVisible()) {
    mainWindow.hide()
  } else {
    showAndFocusWindow()
  }
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
          mainWindow.show()
          mainWindow.focus()
        }
      }
    })
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
  if (!isFromMain(event) && !isFromPomodoroFullscreen(event) && !isFromPomodoroFab(event) && !isFromMini(event)) return
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

// 单实例锁
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      if (!mainWindow.isVisible()) mainWindow.show()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    // 加载应用设置
    loadAppSettings()

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

    createWindow()

    setupAutoUpdater()

    // 注册全局快捷键
    registerGlobalShortcuts()

    // 同步开机自启设置
    try {
      if (appSettings.autoStart) {
        app.setLoginItemSettings({
          openAtLogin: true,
          path: process.execPath
        })
      }
    } catch (e) {
      console.error('[Main] Failed to sync auto start:', e)
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
