const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConfig: (cfg) => ipcRenderer.invoke('save-config', cfg),
  startAgent: (cfg) => ipcRenderer.invoke('start-agent', cfg),
  stopAgent: () => ipcRenderer.invoke('stop-agent'),
  getAgentStatus: () => ipcRenderer.invoke('get-agent-status'),
  minimizeToTray: () => ipcRenderer.invoke('minimize-to-tray'),
  closeApp: () => ipcRenderer.invoke('close-app'),

  onAgentLog: (cb) => ipcRenderer.on('agent-log', (_e, msg) => cb(msg)),
  onAgentStatus: (cb) => ipcRenderer.on('agent-status', (_e, status) => cb(status)),
});
