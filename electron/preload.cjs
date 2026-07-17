const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  versions: { electron: process.versions.electron, chrome: process.versions.chrome, node: process.versions.node },
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  toggleMaximizeWindow: () => ipcRenderer.send('window:toggleMaximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  openDevTools: () => ipcRenderer.send('debug:openDevTools'),
  openDebugWindow: () => ipcRenderer.send('debug:openWindow'),
  closeDebugWindow: () => ipcRenderer.send('debug:closeWindow'),
  minimizeDebugWindow: () => ipcRenderer.send('debug:minimizeWindow'),
  sendNotification: (title, body, taskId) => ipcRenderer.send('notification:send', { title, body, taskId }),
  syncTasks: (tasks, categories) => ipcRenderer.send('tasks:sync', { tasks, categories }),
  // 返回清理函数，避免监听器累积泄漏
  onNotificationResponse: (callback) => {
    const listener = (event, response) => callback(response)
    ipcRenderer.on('notification:response', listener)
    return () => ipcRenderer.removeListener('notification:response', listener)
  },
  onNotificationTaskClick: (callback) => {
    const listener = (event, data) => callback(data)
    ipcRenderer.on('notification:taskClick', listener)
    return () => ipcRenderer.removeListener('notification:taskClick', listener)
  },
  onTaskNew: (callback) => {
    const listener = () => callback()
    ipcRenderer.on('task:new', listener)
    return () => ipcRenderer.removeListener('task:new', listener)
  },
  onTaskFocus: (callback) => {
    const listener = (event, data) => callback(data)
    ipcRenderer.on('task:focus', listener)
    return () => ipcRenderer.removeListener('task:focus', listener)
  },
  onNavigateSettings: (callback) => {
    const listener = () => callback()
    ipcRenderer.on('navigate:settings', listener)
    return () => ipcRenderer.removeListener('navigate:settings', listener)
  },
  onDoNotDisturbChanged: (callback) => {
    const listener = (event, enabled) => callback(enabled)
    ipcRenderer.on('settings:doNotDisturbChanged', listener)
    return () => ipcRenderer.removeListener('settings:doNotDisturbChanged', listener)
  },
  // 监听窗口最大化状态变化
  onMaximizeChange: (callback) => {
    const listener = (event, maximized) => callback(maximized)
    ipcRenderer.on('window:maximizeChanged', listener)
    return () => ipcRenderer.removeListener('window:maximizeChanged', listener)
  },
  // 设置开机自启
  setAutoStart: (enabled) => ipcRenderer.invoke('settings:setAutoStart', enabled),
  // 获取开机自启状态
  getAutoStart: () => ipcRenderer.invoke('settings:getAutoStart'),
  // 设置关闭窗口行为
  setCloseToQuit: (enabled) => ipcRenderer.invoke('settings:setCloseToQuit', enabled),
  // 获取关闭窗口行为
  getCloseToQuit: () => ipcRenderer.invoke('settings:getCloseToQuit'),
  // 设置免打扰模式
  setDoNotDisturb: (enabled) => ipcRenderer.invoke('settings:setDoNotDisturb', enabled),
  // 获取免打扰模式
  getDoNotDisturb: () => ipcRenderer.invoke('settings:getDoNotDisturb'),
  // 设置全局快捷键开关
  setGlobalShortcutEnabled: (enabled) => ipcRenderer.invoke('settings:setGlobalShortcutEnabled', enabled),
  // 获取全局快捷键开关状态
  getGlobalShortcutEnabled: () => ipcRenderer.invoke('settings:getGlobalShortcutEnabled'),
  // 查询窗口是否可见
  isWindowVisible: () => ipcRenderer.invoke('window:isVisible'),
  // 显示主窗口
  showWindow: () => ipcRenderer.send('window:show'),
  // 隐藏主窗口
  hideWindow: () => ipcRenderer.send('window:hide'),
  // 监听搜索框聚焦快捷键
  onFocusSearch: (callback) => {
    const listener = () => callback()
    ipcRenderer.on('shortcut:focusSearch', listener)
    return () => ipcRenderer.removeListener('shortcut:focusSearch', listener)
  },
  // 监听番茄钟切换快捷键
  onTogglePomodoro: (callback) => {
    const listener = () => callback()
    ipcRenderer.on('shortcut:togglePomodoro', listener)
    return () => ipcRenderer.removeListener('shortcut:togglePomodoro', listener)
  },
  // 番茄钟全屏窗口
  openPomodoroFullscreen: () => ipcRenderer.send('pomodoro:openFullscreen'),
  closePomodoroFullscreen: () => ipcRenderer.send('pomodoro:closeFullscreen'),
  onPomodoroFullscreenClosed: (callback) => {
    const listener = () => callback()
    ipcRenderer.on('pomodoro:fullscreenClosed', listener)
    return () => ipcRenderer.removeListener('pomodoro:fullscreenClosed', listener)
  },

  openPomodoroFab: () => ipcRenderer.send('pomodoro:openFab'),
  closePomodoroFab: () => ipcRenderer.send('pomodoro:closeFab'),
  togglePomodoroFab: () => ipcRenderer.send('pomodoro:toggleFab'),
  syncPomodoroState: (state) => ipcRenderer.send('pomodoro:stateSync', state),
  sendPomodoroAction: (action) => ipcRenderer.send('pomodoro:action', action),
  getPomodoroState: () => ipcRenderer.invoke('pomodoro:getState'),
  notifyPomodoroReady: () => ipcRenderer.send('pomodoro:ready'),
  onPomodoroStateUpdated: (callback) => {
    const listener = (_, state) => callback(state)
    ipcRenderer.on('pomodoro:stateUpdated', listener)
    return () => ipcRenderer.removeListener('pomodoro:stateUpdated', listener)
  },
  onPomodoroAction: (callback) => {
    const listener = (_, action) => callback(action)
    ipcRenderer.on('pomodoro:action', listener)
    return () => ipcRenderer.removeListener('pomodoro:action', listener)
  },
  onPomodoroSessionComplete: (callback) => {
    const listener = (_, data) => callback(data)
    ipcRenderer.on('pomodoro:sessionComplete', listener)
    return () => ipcRenderer.removeListener('pomodoro:sessionComplete', listener)
  },
  onPomodoroTimerEnded: (callback) => {
    const listener = (_, data) => callback(data)
    ipcRenderer.on('pomodoro:timerEnded', listener)
    return () => ipcRenderer.removeListener('pomodoro:timerEnded', listener)
  },
  setPomodoroDuration: (mode, minutes) => ipcRenderer.send('pomodoro:setDuration', { mode, minutes })
})
