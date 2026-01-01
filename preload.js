// Preload script - exposes safe APIs to renderer process
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to update the tray icon
contextBridge.exposeInMainWorld('electronAPI', {
  updateTrayIcon: (timeText) => ipcRenderer.send('update-tray-icon', timeText)
});

