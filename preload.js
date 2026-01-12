// Preload script - exposes safe APIs to renderer process
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to update the tray icon
contextBridge.exposeInMainWorld('electronAPI', {
  updateTrayIcon: (timeText) => ipcRenderer.send('update-tray-icon', timeText),
  showPopover: () => ipcRenderer.send('show-popover'),
  
  // Timer control methods
  timerStart: () => ipcRenderer.send('timer-start'),
  timerPause: () => ipcRenderer.send('timer-pause'),
  timerReset: () => ipcRenderer.send('timer-reset'),
  timerGetState: () => ipcRenderer.send('timer-get-state'),
  timerSelectTask: (taskName) => ipcRenderer.send('timer-select-task', taskName),
  timerCompletionYes: () => ipcRenderer.send('timer-completion-yes'),
  timerCompletionNo: () => ipcRenderer.send('timer-completion-no'),
  timerSyncDurations: (focusSeconds, breakSeconds) => ipcRenderer.send('timer-sync-durations', focusSeconds, breakSeconds),
  
  // Listen for timer updates from main process
  onTimerUpdate: (callback) => {
    ipcRenderer.on('timer-update', (event, state) => callback(state));
  },
  onTimerFocusComplete: (callback) => {
    ipcRenderer.on('timer-focus-complete', () => callback());
  },
  onTimerBreakComplete: (callback) => {
    ipcRenderer.on('timer-break-complete', () => callback());
  },
  
  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

