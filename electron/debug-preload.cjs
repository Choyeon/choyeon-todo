const { contextBridge, ipcRenderer } = require('electron')

// 仅暴露主版本号，避免精确版本信息泄露用于 CVE 匹配
const safeVersions = {
  electron: process.versions.electron?.split('.')[0],
  node: process.versions.node?.split('.')[0],
  chrome: process.versions.chrome?.split('.')[0]
}

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  versions: safeVersions,
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  closeDebugWindow: () => ipcRenderer.send('debug:closeWindow'),
  minimizeDebugWindow: () => ipcRenderer.send('debug:minimizeWindow'),
  openDevTools: () => ipcRenderer.send('debug:openDevTools'),
  sendNotification: (title, body) => ipcRenderer.send('notification:send', { title, body }),
  onNotificationResponse: (callback) => {
    const listener = (event, response) => callback(response)
    ipcRenderer.on('notification:response', listener)
    return () => ipcRenderer.removeListener('notification:response', listener)
  }
})
