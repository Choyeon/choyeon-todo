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

let mainWindow = null
let debugWindow = null
let pomodoroWindow = null
let pomodoroFabWindow = null
let tray = null
let isQuitting = false

// 应用设置（主进程维护一份，用于窗口关闭行为等）
let appSettings = {
  closeToQuit: true,
  autoStart: false,
  doNotDisturb: false,
  globalShortcutEnabled: true
}

// 番茄钟状态
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

// 精确计时相关变量
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

const broadcastPomodoroState = (senderWebContents = null) => {
  updatePomodoroState()

  const targets = [mainWindow, pomodoroWindow, pomodoroFabWindow]
  targets.forEach((win) => {
    if (!win || win.isDestroyed()) return
    if (senderWebContents && win.webContents.id === senderWebContents.id) return
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
  if (pomodoroTimer) {
    clearInterval(pomodoroTimer)
    pomodoroTimer = null
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

  pomodoroState.isRunning = false
  pomodoroState.hasStarted = false
  pomodoroEndTime = null
  pomodoroState.timeLeft = 0

  // 通知所有窗口计时结束，由渲染进程处理后续逻辑
  const targets = [mainWindow, pomodoroWindow, pomodoroFabWindow]
  targets.forEach((win) => {
    if (!win || win.isDestroyed()) return
    win.webContents.send('pomodoro:timerEnded', { currentMode: pomodoroState.currentMode })
  })

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
  } catch (e) {
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
  } catch (e) {
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
      sandbox: true
    },
    frame: false,
    show: false
  }

  // Windows 11 使用原生 Acrylic 亚克力毛玻璃材质（不能同时设置 backgroundColor）
  if (process.platform === 'win32') {
    windowOptions.backgroundMaterial = 'acrylic'
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

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    if (windowState.isMaximized) {
      mainWindow.maximize()
    }
    mainWindow.show()
  })

  // 通知渲染进程最大化状态变化
  mainWindow.on('maximize', () => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window:maximizeChanged', true)
    }
  })
  mainWindow.on('unmaximize', () => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window:maximizeChanged', false)
    }
  })

  // 保存窗口状态
  let saveStateTimer = null
  const debouncedSaveWindowState = () => {
    if (saveStateTimer) clearTimeout(saveStateTimer)
    saveStateTimer = setTimeout(() => saveWindowState(), 300)
  }
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

  // 安全：阻止打开新窗口
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // 对外部链接用系统浏览器打开
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  // 渲染进程崩溃处理
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('[Main] Render process gone:', details.reason)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.reload()
    }
  })

  mainWindow.webContents.on('unresponsive', () => {
    console.warn('[Main] Window unresponsive')
  })
}

function createDebugWindow() {
  if (debugWindow) {
    debugWindow.focus()
    return
  }
  if (!mainWindow) return

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

  if (process.env.VITE_DEV_SERVER_URL) {
    debugWindow.loadURL(process.env.VITE_DEV_SERVER_URL + '#/debug')
  } else {
    debugWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: 'debug' })
  }

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
  if (pomodoroWindow) {
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

  if (process.env.VITE_DEV_SERVER_URL) {
    pomodoroWindow.loadURL(process.env.VITE_DEV_SERVER_URL + '#/pomodoro-fullscreen?slave=1')
  } else {
    pomodoroWindow.loadFile(path.join(__dirname, '../dist/index.html'), {
      hash: 'pomodoro-fullscreen',
      query: { slave: '1' }
    })
  }

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
  if (pomodoroFabWindow) {
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

  if (process.env.VITE_DEV_SERVER_URL) {
    pomodoroFabWindow.loadURL(process.env.VITE_DEV_SERVER_URL + '#/pomodoro-fab?slave=1')
  } else {
    pomodoroFabWindow.loadFile(path.join(__dirname, '../dist/index.html'), {
      hash: 'pomodoro-fab',
      query: { slave: '1' }
    })
  }

  pomodoroFabWindow.once('ready-to-show', () => {
    pomodoroFabWindow.show()
  })

  pomodoroFabWindow.on('closed', () => {
    pomodoroFabWindow = null
  })
}

function togglePomodoroFab() {
  if (pomodoroFabWindow) {
    if (pomodoroFabWindow.isVisible()) {
      pomodoroFabWindow.hide()
    } else {
      pomodoroFabWindow.show()
    }
  } else {
    createPomodoroFabWindow()
  }
}

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
  const today = getTodayStr()
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
      label: '新建任务',
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
  } catch (e) {
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
  if (!isFromMain(event)) return
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
  if (!isFromMain(event)) return
  if (pomodoroFabWindow && !pomodoroFabWindow.isDestroyed()) {
    pomodoroFabWindow.close()
  }
})

ipcMain.on('pomodoro:toggleFab', (event) => {
  if (!isFromMain(event)) return
  togglePomodoroFab()
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
      if (!POMODORO_SYNC_FIELDS.has(key)) return
    }
    if (state.currentMode && ['work', 'shortBreak', 'longBreak'].includes(state.currentMode)) {
      pomodoroState.currentMode = state.currentMode
    }
    if (typeof state.timeLeft === 'number' && !pomodoroState.isRunning) {
      pomodoroPauseTimeLeft = Math.max(0, state.timeLeft)
    }
    if (typeof state.totalTime === 'number') {
      pomodoroState.totalTime = state.totalTime
    }
    if (typeof state.hasStarted === 'boolean') {
      pomodoroState.hasStarted = state.hasStarted
    }
    if (typeof state.completedPomodoros === 'number') {
      pomodoroState.completedPomodoros = state.completedPomodoros
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
  if (!isFromMain(event)) return
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
  if (!isFromMain(event)) return
  // 更新模式对应的时长（仅在未运行时生效）
  if (!pomodoroState.isRunning && pomodoroState.currentMode === mode) {
    pomodoroPauseTimeLeft = Math.max(1, Math.min(180, minutes)) * 60
    updatePomodoroState()
    broadcastPomodoroState()
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
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; " +
              "script-src 'self'; " +
              "style-src 'self' 'unsafe-inline'; " +
              "img-src 'self' data:; " +
              (process.env.VITE_DEV_SERVER_URL
                ? "connect-src 'self' ws://localhost:5173 http://localhost:5173; "
                : "connect-src 'self'; ") +
              "font-src 'self'; " +
              "object-src 'none'; " +
              "base-uri 'self'"
          ]
        }
      })
    })

    createWindow()

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

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  unregisterGlobalShortcuts()
})

app.on('before-quit', () => {
  isQuitting = true
  saveWindowState()
  if (tray) {
    tray.destroy()
    tray = null
  }
})

app.on('child-process-gone', (event, details) => {
  if (details.type === 'GPU') {
    console.error('[Main] GPU process gone:', details.reason)
  }
})
