/**
 * Electron -> Tauri 兼容桥（渲染进程侧）
 *
 * 目标：让 src/ 下所有 Vue 组件 / store / composable 保持原样。
 * 这里复制 electron/preload.cjs 暴露的 window.electronAPI 与 window.ct 的
 * 完整签名（方法名、参数、返回值、事件 payload 形状、清理函数），
 * 底层改走 Tauri v2 的 invoke / listen。
 *
 * 注意：不设置 __isWebPolyfill，因此 src/utils/platform.js 的 isRealElectron()
 * 会把它识别为“桌面端”，与 Electron 行为完全一致（标题栏、番茄钟 Electron 模式、
 * 桌面专属设置项全部保留）。
 */
import { invoke as tauriInvoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

/**
 * Electron IPC channel -> Tauri command 名映射。
 * preload 用 'window:minimize' 这类带冒号的 channel；Rust #[tauri::command]
 * 注册的是 snake_case 名（window_minimize）。Tauri 按字符串精确查找命令，
 * 若直接把 Electron channel 传给 invoke，所有调用都会静默失败。
 */
const COMMAND_MAP = {
  'app:getVersion': 'app_get_version',
  'app:setAutoLaunch': 'app_set_auto_launch',
  'app:getAutoLaunch': 'app_get_auto_launch',
  'window:minimize': 'window_minimize',
  'window:toggleMaximize': 'window_toggle_maximize',
  'window:close': 'window_close',
  'window:isMaximized': 'window_is_maximized',
  'window:isVisible': 'window_is_visible',
  'window:show': 'window_show',
  'window:hide': 'window_hide',
  'window:snapLayout': 'window_snap_layout',
  'debug:openDevTools': 'open_dev_tools',
  'notification:send': 'notification_send',
  'notification:show': 'notification_show',
  'tasks:sync': 'tasks_sync',
  'settings:setAutoStart': 'settings_set_auto_start',
  'settings:getAutoStart': 'settings_get_auto_start',
  'settings:setCloseToQuit': 'settings_set_close_to_quit',
  'settings:getCloseToQuit': 'settings_get_close_to_quit',
  'settings:setDoNotDisturb': 'settings_set_do_not_disturb',
  'settings:getDoNotDisturb': 'settings_get_do_not_disturb',
  'settings:setGlobalShortcutEnabled': 'settings_set_global_shortcut_enabled',
  'settings:getGlobalShortcutEnabled': 'settings_get_global_shortcut_enabled',
  'bing:getWallpaper': 'bing_get_wallpaper',
  'pomodoro:openFullscreen': 'pomodoro_open_fullscreen',
  'pomodoro:closeFullscreen': 'pomodoro_close_fullscreen',
  'pomodoro:openFab': 'pomodoro_open_fab',
  'pomodoro:closeFab': 'pomodoro_close_fab',
  'pomodoro:toggleFab': 'pomodoro_toggle_fab',
  'pomodoro:stateSync': 'pomodoro_state_sync',
  'pomodoro:action': 'pomodoro_action',
  'pomodoro:getState': 'pomodoro_get_state',
  'pomodoro:ready': 'pomodoro_ready',
  'pomodoro:setDuration': 'pomodoro_set_duration',
  'mini:open': 'mini_open',
  'mini:close': 'mini_close',
  'mini:toggle': 'mini_toggle',
  'mini:showMain': 'mini_show_main',
  'mini:toggleAlwaysOnTop': 'mini_toggle_always_on_top',
  'quickAdd:close': 'quick_add_close',
  'hotkey:register': 'hotkey_register',
  'hotkey:unregisterAll': 'hotkey_unregister_all',
  'task:startDrag': 'task_start_drag',
  'dialog:saveJson': 'dialog_save_json',
  'updater:checkForUpdates': 'updater_check_for_updates',
  'updater:downloadUpdate': 'updater_download_update',
  'updater:quitAndInstall': 'updater_quit_and_install'
}

const invoke = (channel, args) =>
  tauriInvoke(COMMAND_MAP[channel] || channel.replace(/:/g, '_'), args)

const isTauri = () => typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__

// 把 Tauri listen 的 Promise<unlisten> 包成 Electron preload 的同步清理函数
const sub = (event, callback) => {
  let off = null
  let disposed = false
  listen(event, (e) => callback(e.payload)).then((fn) => {
    if (disposed) fn()
    else off = fn
  })
  return () => {
    disposed = true
    if (off) off()
  }
}

// 无副作用的 no-op 清理函数，供“仅 Electron 有、Tauri 不适用”的监听器使用
const noopCleanup = () => () => {}

const toPlatform = (p) => {
  const s = String(p || '').toLowerCase()
  if (s.includes('win')) return 'win32'
  if (s.includes('mac') || s.includes('darwin')) return 'darwin'
  if (s.includes('linux')) return 'linux'
  return 'linux'
}

export function installTauriBridge() {
  if (!isTauri() || window.electronAPI) return

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const chromeVersion = ua.match(/Chrome\/(\d+)/)?.[1] || null
  const platform =
    toPlatform(typeof navigator !== 'undefined' ? navigator.platform : '') ||
    toPlatform(ua)

  const api = {
    platform,
    versions: { electron: null, chrome: chromeVersion, node: null },

    getAppVersion: () => invoke('app:getVersion'),
    minimizeWindow: () => invoke('window:minimize'),
    toggleMaximizeWindow: () => invoke('window:toggleMaximize'),
    closeWindow: () => invoke('window:close'),
    isMaximized: () => invoke('window:isMaximized'),
    openDevTools: () => invoke('debug:openDevTools'),

    sendNotification: (title, body, taskId) =>
      invoke('notification:send', { title, body, taskId }),
    syncTasks: (tasks, categories) => invoke('tasks:sync', { tasks, categories }),

    onNotificationResponse: (cb) => sub('notification:response', cb),
    onNotificationTaskClick: (cb) => sub('notification:taskClick', cb),
    onReminderAction: (cb) => sub('reminder:action', cb),
    onTaskNew: (cb) => sub('task:new', cb),
    onTaskFocus: (cb) => sub('task:focus', cb),
    onNavigateSettings: (cb) => sub('navigate:settings', cb),
    onDoNotDisturbChanged: (cb) => sub('settings:doNotDisturbChanged', cb),
    onMaximizeChange: (cb) => sub('window:maximizeChanged', cb),

    setAutoStart: (enabled) => invoke('settings:setAutoStart', { enabled }),
    getAutoStart: () => invoke('settings:getAutoStart'),
    setCloseToQuit: (enabled) => invoke('settings:setCloseToQuit', { enabled }),
    getCloseToQuit: () => invoke('settings:getCloseToQuit'),
    setDoNotDisturb: (enabled) => invoke('settings:setDoNotDisturb', { enabled }),
    getDoNotDisturb: () => invoke('settings:getDoNotDisturb'),
    getBingWallpaper: () => invoke('bing:getWallpaper'),
    setGlobalShortcutEnabled: (enabled) =>
      invoke('settings:setGlobalShortcutEnabled', { enabled }),
    getGlobalShortcutEnabled: () => invoke('settings:getGlobalShortcutEnabled'),

    isWindowVisible: () => invoke('window:isVisible'),
    showWindow: () => invoke('window:show'),
    hideWindow: () => invoke('window:hide'),

    onFocusSearch: (cb) => sub('shortcut:focusSearch', cb),
    onTogglePomodoro: (cb) => sub('shortcut:togglePomodoro', cb),

    openPomodoroFullscreen: () => invoke('pomodoro:openFullscreen'),
    closePomodoroFullscreen: () => invoke('pomodoro:closeFullscreen'),
    onPomodoroFullscreenClosed: (cb) => sub('pomodoro:fullscreenClosed', cb),
    onPomodoroAiMode: (cb) => sub('pomodoro:aiMode', cb),

    openPomodoroFab: () => invoke('pomodoro:openFab'),
    closePomodoroFab: () => invoke('pomodoro:closeFab'),
    togglePomodoroFab: () => invoke('pomodoro:toggleFab'),

    openMiniWindow: () => invoke('mini:open'),
    closeMiniWindow: () => invoke('mini:close'),
    toggleMiniWindow: () => invoke('mini:toggle'),
    showMainWindow: () => invoke('mini:showMain'),
    toggleMiniAlwaysOnTop: () => invoke('mini:toggleAlwaysOnTop'),
    closeQuickAdd: () => invoke('quickAdd:close'),

    syncPomodoroState: (state) => invoke('pomodoro:stateSync', { state }),
    sendPomodoroAction: (action) => invoke('pomodoro:action', { action }),
    getPomodoroState: () => invoke('pomodoro:getState'),
    notifyPomodoroReady: () => invoke('pomodoro:ready'),
    onPomodoroStateUpdated: (cb) => sub('pomodoro:stateUpdated', cb),
    onPomodoroAction: (cb) => sub('pomodoro:action', cb),
    onPomodoroSessionComplete: (cb) => sub('pomodoro:sessionComplete', cb),
    onPomodoroTimerEnded: (cb) => sub('pomodoro:timerEnded', cb),
    setPomodoroDuration: (mode, minutes) =>
      invoke('pomodoro:setDuration', { mode, minutes }),

    checkForUpdates: () => invoke('updater:checkForUpdates'),
    downloadUpdate: () => invoke('updater:downloadUpdate'),
    quitAndInstallUpdate: () => invoke('updater:quitAndInstall'),
    onUpdateChecking: (cb) => sub('updater:checking', cb),
    onUpdateAvailable: (cb) => sub('updater:update-available', cb),
    onUpdateNotAvailable: (cb) => sub('updater:update-not-available', cb),
    onUpdateDownloadProgress: (cb) => sub('updater:download-progress', cb),
    onUpdateDownloaded: (cb) => sub('updater:update-downloaded', cb),
    onUpdateError: (cb) => sub('updater:error', cb),

    onAppFocusLost: (cb) => sub('app:focus-lost', cb),
    onAppFocusGained: (cb) => sub('app:focus-gained', cb),
    onAppWindowHidden: (cb) => sub('app:window-hidden', cb),

    registerHotkeys: (binds) => invoke('hotkey:register', { binds }),
    unregisterAllHotkeys: () => invoke('hotkey:unregisterAll'),
    onHotkeyPressed: (cb) => sub('hotkey:pressed', cb),

    setAutoLaunch: (enabled) => invoke('app:setAutoLaunch', { enabled }),
    getAutoLaunch: () => invoke('app:getAutoLaunch'),
    onProtocolUrl: (cb) => sub('app:handleProtocolUrl', cb),

    startTaskDrag: (payload) => invoke('task:startDrag', { payload }),
    onFilesDropped: (cb) => sub('app:filesDropped', cb)
  }

  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    enumerable: true,
    writable: false,
    value: api
  })

  // 与 preload.cjs 暴露的 window.ct 命名空间保持一致
  Object.defineProperty(window, 'ct', {
    configurable: true,
    enumerable: true,
    writable: false,
    value: {
      invoke: (channel, payload) => {
        if (typeof channel !== 'string') return Promise.reject(new Error('invalid channel'))
        switch (channel) {
          case 'notification:show':
            return invoke('notification:show', { payload })
          case 'dialog:saveJson':
            return invoke('dialog:saveJson', { payload })
          case 'hotkey:register':
            return invoke('hotkey:register', { binds: payload })
          case 'hotkey:unregisterAll':
            return invoke('hotkey:unregisterAll')
          default:
            return Promise.reject(new Error(`unknown channel: ${channel}`))
        }
      },
      on: (channel, callback) => {
        if (typeof channel !== 'string') throw new Error('invalid channel')
        if (channel === 'reminder:action') return sub('reminder:action', callback)
        if (channel === 'hotkey:pressed') return sub('hotkey:pressed', callback)
        throw new Error(`unknown channel: ${channel}`)
      }
    }
  })

  return api
}

// 自安装：作为入口第一个 import 时，在 main.js 任何模块体执行前完成注入，
// 保证 isRealElectron() 与 electronAPI polyfill 判定都走桌面端路径。
installTauriBridge()
