const { app, BrowserWindow, Tray, nativeImage, screen, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let tray = null;
let popoverWindow = null;

// Timer state constants
const TimerState = {
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused'
};

const TimerMode = {
  FOCUS: 'focus',
  BREAK: 'break'
};

// Default durations (in seconds)
const DEFAULT_FOCUS_DURATION = 25 * 60; // 25 minutes
const DEFAULT_BREAK_DURATION = 5 * 60;  // 5 minutes

// Timer state in main process
let timerState = {
  mode: TimerMode.FOCUS,
  state: TimerState.IDLE,
  duration: DEFAULT_FOCUS_DURATION,
  remaining: DEFAULT_FOCUS_DURATION,
  intervalId: null,
  selectedTask: null,
  showingTaskSelection: false,
  showingCompletionConfirmation: false
};

// Durations (will be synced from renderer)
let durations = {
  focus: DEFAULT_FOCUS_DURATION,
  break: DEFAULT_BREAK_DURATION
};

// Helper function to format time
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Helper function to emit timer update to renderer
function emitTimerUpdate() {
  if (popoverWindow && !popoverWindow.isDestroyed()) {
    popoverWindow.webContents.send('timer-update', {
      mode: timerState.mode,
      state: timerState.state,
      duration: timerState.duration,
      remaining: timerState.remaining,
      selectedTask: timerState.selectedTask,
      showingTaskSelection: timerState.showingTaskSelection,
      showingCompletionConfirmation: timerState.showingCompletionConfirmation
    });
  }
  // Always update tray icon
  updateTrayIcon(formatTime(timerState.remaining));
}

// Simple 5x9 pixel font for rendering numbers (very basic)
const digitPatterns = {
  '0': [
    '11111',
    '10001',
    '10001',
    '10001',
    '10001',
    '10001',
    '10001',
    '10001',
    '11111'
  ],
  '1': [
    '00100',
    '01100',
    '00100',
    '00100',
    '00100',
    '00100',
    '00100',
    '00100',
    '11111'
  ],
  '2': [
    '11111',
    '00001',
    '00001',
    '00001',
    '11111',
    '10000',
    '10000',
    '10000',
    '11111'
  ],
  '3': [
    '11111',
    '00001',
    '00001',
    '00001',
    '11111',
    '00001',
    '00001',
    '00001',
    '11111'
  ],
  '4': [
    '10001',
    '10001',
    '10001',
    '10001',
    '11111',
    '00001',
    '00001',
    '00001',
    '00001'
  ],
  '5': [
    '11111',
    '10000',
    '10000',
    '10000',
    '11111',
    '00001',
    '00001',
    '00001',
    '11111'
  ],
  '6': [
    '11111',
    '10000',
    '10000',
    '10000',
    '11111',
    '10001',
    '10001',
    '10001',
    '11111'
  ],
  '7': [
    '11111',
    '00001',
    '00001',
    '00001',
    '00001',
    '00001',
    '00001',
    '00001',
    '00001'
  ],
  '8': [
    '11111',
    '10001',
    '10001',
    '10001',
    '11111',
    '10001',
    '10001',
    '10001',
    '11111'
  ],
  '9': [
    '11111',
    '10001',
    '10001',
    '10001',
    '11111',
    '00001',
    '00001',
    '00001',
    '11111'
  ],
  ':': [
    '00000',
    '00000',
    '00100',
    '00000',
    '00000',
    '00000',
    '00100',
    '00000',
    '00000'
  ]
};

// Render a single character at position
function renderChar(buffer, width, height, char, startX, startY, charWidth = 5, charHeight = 9) {
  const pattern = digitPatterns[char];
  if (!pattern) return;
  
  for (let py = 0; py < charHeight && (startY + py) < height; py++) {
    const row = pattern[py];
    if (!row) continue;
    
    for (let px = 0; px < charWidth && (startX + px) < width; px++) {
      if (row[px] === '1') {
        const x = startX + px;
        const y = startY + py;
        const index = (y * width + x) * 4;
        if (index >= 0 && index < buffer.length - 3) {
          buffer[index] = 0;       // R (black)
          buffer[index + 1] = 0;   // G
          buffer[index + 2] = 0;   // B
          buffer[index + 3] = 255; // A (opaque)
        }
      }
    }
  }
}

// Create a tray icon with timer status text
function createTrayIcon(timeText = '25:00') {
  // Try to load an icon file if it exists
  const iconPath = path.join(__dirname, 'icon.png');
  
  try {
    const trayIcon = nativeImage.createFromPath(iconPath);
    if (!trayIcon.isEmpty()) {
      return trayIcon;
    }
  } catch (error) {
    // Icon file doesn't exist, create one with timer text
  }
  
  // Create an icon wide enough to show "25:00" text
  // Standard macOS menu bar icon height is 22px
  const height = 22;
  const charWidth = 5;
  const charHeight = 9;
  const spacing = 1;
  const width = (timeText.length * (charWidth + spacing)) + 4; // Add padding
  
  const buffer = Buffer.alloc(width * height * 4);
  
  // Fill with transparent background
  for (let i = 0; i < buffer.length; i += 4) {
    buffer[i] = 0;     // R
    buffer[i + 1] = 0; // G
    buffer[i + 2] = 0; // B
    buffer[i + 3] = 0; // A (transparent)
  }
  
  // Render each character
  let xOffset = 2; // Start with small padding
  const yOffset = Math.floor((height - charHeight) / 2); // Center vertically
  
  for (let i = 0; i < timeText.length; i++) {
    renderChar(buffer, width, height, timeText[i], xOffset, yOffset, charWidth, charHeight);
    xOffset += charWidth + spacing;
  }
  
  const trayIcon = nativeImage.createFromBuffer(buffer, { width: width, height: height });
  trayIcon.setTemplateImage(true); // Make it a template image for macOS (adapts to light/dark mode)
  
  return trayIcon;
}

// Update tray icon with timer status (for future use when timer logic is added)
function updateTrayIcon(timeText) {
  if (tray) {
    const newIcon = createTrayIcon(timeText);
    tray.setImage(newIcon);
    // Also update tooltip
    tray.setToolTip(`Custom Pomodoro Timer - ${timeText}`);
  }
}

// Create the popover window
function createPopover() {
  if (popoverWindow) {
    return;
  }

  // Get tray icon position
  const trayBounds = tray.getBounds();
  const popoverWidth = 300;
  const popoverHeight = 400;
  
  // Position popover below and centered on tray icon
  // On macOS, tray icon is in the menu bar at the top
  const x = Math.round(trayBounds.x + (trayBounds.width / 2) - (popoverWidth / 2));
  const y = Math.round(trayBounds.y + trayBounds.height);
  
  // Ensure popover doesn't go off screen
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  const adjustedX = Math.max(10, Math.min(x, screenWidth - popoverWidth - 10));
  const adjustedY = Math.max(10, Math.min(y, screenHeight - popoverHeight - 10));
  
  popoverWindow = new BrowserWindow({
    width: popoverWidth,
    height: popoverHeight,
    x: adjustedX,
    y: adjustedY,
    frame: false,
    resizable: false,
    show: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    transparent: true,
    hasShadow: true,
    roundedCorners: true,
    vibrancy: 'under-window',
    visualEffectState: 'active',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load the local HTML file
  popoverWindow.loadFile('index.html');

  // Show window when ready
  popoverWindow.once('ready-to-show', () => {
    if (popoverWindow) {
      popoverWindow.show();
      // Send current timer state when window is shown
      emitTimerUpdate();
    }
  });
  
  // Send timer state when window becomes visible
  popoverWindow.on('show', () => {
    if (popoverWindow && !popoverWindow.isDestroyed()) {
      emitTimerUpdate();
    }
  });

  // Close popover when clicking outside
  popoverWindow.on('blur', () => {
    if (popoverWindow) {
      popoverWindow.hide();
    }
  });

  // Clean up when window is closed
  popoverWindow.on('closed', () => {
    popoverWindow = null;
  });
}

// Toggle popover visibility
function togglePopover() {
  if (popoverWindow && popoverWindow.isVisible()) {
    popoverWindow.hide();
  } else {
    if (!popoverWindow) {
      createPopover();
    } else {
      // Reposition popover in case tray icon moved
      const trayBounds = tray.getBounds();
      const popoverWidth = 300;
      const popoverHeight = 400;
      const x = Math.round(trayBounds.x + (trayBounds.width / 2) - (popoverWidth / 2));
      const y = Math.round(trayBounds.y + trayBounds.height);
      
      // Ensure popover doesn't go off screen
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
      const adjustedX = Math.max(10, Math.min(x, screenWidth - popoverWidth - 10));
      const adjustedY = Math.max(10, Math.min(y, screenHeight - popoverHeight - 10));
      
      popoverWindow.setPosition(adjustedX, adjustedY);
      popoverWindow.show();
      // Send current timer state when popover is shown
      emitTimerUpdate();
    }
  }
}

// Timer control functions
function startTimer() {
  if (timerState.state === TimerState.IDLE) {
    // Starting fresh - set duration based on mode
    timerState.duration = timerState.mode === TimerMode.FOCUS 
      ? durations.focus 
      : durations.break;
    timerState.remaining = timerState.duration;
  }
  
  timerState.state = TimerState.RUNNING;
  
  // Clear any existing interval
  if (timerState.intervalId) {
    clearInterval(timerState.intervalId);
  }
  
  // Update interval every second
  timerState.intervalId = setInterval(() => {
    timerState.remaining--;
    
    if (timerState.remaining <= 0) {
      timerState.remaining = 0;
      completeTimer();
    } else {
      emitTimerUpdate();
    }
  }, 1000);
  
  emitTimerUpdate();
}

function pauseTimer() {
  if (timerState.intervalId) {
    clearInterval(timerState.intervalId);
    timerState.intervalId = null;
  }
  
  timerState.state = TimerState.PAUSED;
  emitTimerUpdate();
}

function resetTimer() {
  if (timerState.intervalId) {
    clearInterval(timerState.intervalId);
    timerState.intervalId = null;
  }
  
  // Reset to custom duration for current mode
  timerState.duration = timerState.mode === TimerMode.FOCUS 
    ? durations.focus 
    : durations.break;
  timerState.remaining = timerState.duration;
  timerState.state = TimerState.IDLE;
  timerState.showingTaskSelection = false;
  timerState.showingCompletionConfirmation = false;
  
  // Clear selected task if resetting during break
  if (timerState.mode === TimerMode.BREAK) {
    timerState.selectedTask = null;
  }
  
  emitTimerUpdate();
}

function completeTimer() {
  if (timerState.intervalId) {
    clearInterval(timerState.intervalId);
    timerState.intervalId = null;
  }
  
  if (timerState.mode === TimerMode.FOCUS) {
    // Focus timer completed - show task selection screen
    timerState.state = TimerState.IDLE;
    timerState.mode = TimerMode.BREAK;
    timerState.duration = durations.break;
    timerState.remaining = timerState.duration;
    timerState.selectedTask = null;
    timerState.showingTaskSelection = true;
    timerState.showingCompletionConfirmation = false;
    
    // Request focus session increment from renderer
    if (popoverWindow && !popoverWindow.isDestroyed()) {
      popoverWindow.webContents.send('timer-focus-complete');
    }
    
    // Show popover when timer completes
    if (popoverWindow && !popoverWindow.isDestroyed()) {
      const trayBounds = tray.getBounds();
      const popoverWidth = 300;
      const popoverHeight = 400;
      const x = Math.round(trayBounds.x + (trayBounds.width / 2) - (popoverWidth / 2));
      const y = Math.round(trayBounds.y + trayBounds.height);
      
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
      const adjustedX = Math.max(10, Math.min(x, screenWidth - popoverWidth - 10));
      const adjustedY = Math.max(10, Math.min(y, screenHeight - popoverHeight - 10));
      
      popoverWindow.setPosition(adjustedX, adjustedY);
      popoverWindow.show();
    }
  } else {
    // Break timer completed - show completion confirmation
    timerState.state = TimerState.IDLE;
    timerState.showingTaskSelection = false;
    timerState.showingCompletionConfirmation = true;
    
    // Request break end audio from renderer
    if (popoverWindow && !popoverWindow.isDestroyed()) {
      popoverWindow.webContents.send('timer-break-complete');
    }
    
    // Show popover when timer completes
    if (popoverWindow && !popoverWindow.isDestroyed()) {
      const trayBounds = tray.getBounds();
      const popoverWidth = 300;
      const popoverHeight = 400;
      const x = Math.round(trayBounds.x + (trayBounds.width / 2) - (popoverWidth / 2));
      const y = Math.round(trayBounds.y + trayBounds.height);
      
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
      const adjustedX = Math.max(10, Math.min(x, screenWidth - popoverWidth - 10));
      const adjustedY = Math.max(10, Math.min(y, screenHeight - popoverHeight - 10));
      
      popoverWindow.setPosition(adjustedX, adjustedY);
      popoverWindow.show();
    }
  }
  
  emitTimerUpdate();
}

// Set up IPC handlers
ipcMain.on('update-tray-icon', (event, timeText) => {
  updateTrayIcon(timeText);
});

ipcMain.on('show-popover', () => {
  if (!popoverWindow) {
    createPopover();
  } else {
    // Reposition popover in case tray icon moved
    const trayBounds = tray.getBounds();
    const popoverWidth = 300;
    const popoverHeight = 400;
    const x = Math.round(trayBounds.x + (trayBounds.width / 2) - (popoverWidth / 2));
    const y = Math.round(trayBounds.y + trayBounds.height);
    
    // Ensure popover doesn't go off screen
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    const adjustedX = Math.max(10, Math.min(x, screenWidth - popoverWidth - 10));
    const adjustedY = Math.max(10, Math.min(y, screenHeight - popoverHeight - 10));
    
    popoverWindow.setPosition(adjustedX, adjustedY);
    popoverWindow.show();
    // Send current timer state when popover is shown
    emitTimerUpdate();
  }
});

// Timer control IPC handlers
ipcMain.on('timer-start', () => {
  startTimer();
});

ipcMain.on('timer-pause', () => {
  pauseTimer();
});

ipcMain.on('timer-reset', () => {
  resetTimer();
});

ipcMain.on('timer-get-state', (event) => {
  emitTimerUpdate();
});

ipcMain.on('timer-select-task', (event, taskName) => {
  timerState.selectedTask = taskName;
  timerState.showingTaskSelection = false;
  timerState.duration = durations.break;
  timerState.remaining = timerState.duration;
  
  // Auto-start break timer after task selection
  startTimer();
});

ipcMain.on('timer-completion-yes', () => {
  // Return to focus mode
  timerState.mode = TimerMode.FOCUS;
  timerState.state = TimerState.IDLE;
  timerState.duration = durations.focus;
  timerState.remaining = timerState.duration;
  timerState.selectedTask = null;
  timerState.showingCompletionConfirmation = false;
  
  emitTimerUpdate();
});

ipcMain.on('timer-completion-no', () => {
  // Don't log completion, just return to focus mode
  timerState.mode = TimerMode.FOCUS;
  timerState.state = TimerState.IDLE;
  timerState.duration = durations.focus;
  timerState.remaining = timerState.duration;
  timerState.selectedTask = null;
  timerState.showingCompletionConfirmation = false;
  
  emitTimerUpdate();
});

// Sync durations from renderer
ipcMain.on('timer-sync-durations', (event, focusSeconds, breakSeconds) => {
  durations.focus = focusSeconds;
  durations.break = breakSeconds;
  
  // Update timer if it's idle
  if (timerState.state === TimerState.IDLE) {
    timerState.duration = timerState.mode === TimerMode.FOCUS ? durations.focus : durations.break;
    timerState.remaining = timerState.duration;
    emitTimerUpdate();
  }
});

// When Electron is ready, create the tray
app.whenReady().then(() => {
  // Hide dock icon on macOS (menu bar only)
  if (process.platform === 'darwin') {
    app.dock.hide();
  }
  
  // Create tray icon with static timer status for Milestone 2
  const trayIcon = createTrayIcon('25:00');
  
  tray = new Tray(trayIcon);
  tray.setToolTip('Custom Pomodoro Timer - 25:00');
  
  // Handle tray icon click
  tray.on('click', () => {
    togglePopover();
  });
  
  // Also handle right-click for context menu (optional, but good UX)
  tray.on('right-click', () => {
    togglePopover();
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // Don't quit on macOS - keep running in menu bar
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Quit when app is explicitly quit
app.on('before-quit', () => {
  // Clean up timer interval
  if (timerState.intervalId) {
    clearInterval(timerState.intervalId);
    timerState.intervalId = null;
  }
  
  if (popoverWindow) {
    popoverWindow.removeAllListeners('close');
    popoverWindow.close();
  }
});
