/**
 * 运行环境判定。
 *
 * 背景：main.js 在非 Electron 环境会注入一份 `window.electronAPI` polyfill，
 * 让渲染端可以无脑调用 `window.electronAPI?.xxx()`。因此
 * `!!window.electronAPI` 无法区分「真实 Electron」与「Web / PWA」——
 * 仅凭它判定会让 Web 版误走 Electron 分支（如番茄钟只发空 IPC 而不本地计时、
 * 显示无效的窗口标题栏和桌面专属开关）。
 *
 * polyfill 带有显式的 `__isWebPolyfill` 标记；真实 preload 和测试里的 mock
 * 都不带该标记，仍被视为 Electron 环境，保持既有行为不变。
 */
export const isRealElectron = () => {
  if (typeof window === 'undefined') return false
  const api = window.electronAPI
  return !!api && api.__isWebPolyfill !== true
}

export const isWebPolyfill = () => {
  if (typeof window === 'undefined') return false
  const api = window.electronAPI
  return !!api && api.__isWebPolyfill === true
}
