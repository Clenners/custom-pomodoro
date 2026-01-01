// Timer Engine - Milestone 3
// Implements focus and break timers with countdown functionality

// Timer state
const TimerState = {
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused'
};

// Timer mode
const TimerMode = {
  FOCUS: 'focus',
  BREAK: 'break'
};

// Default durations (in seconds)
const DEFAULT_FOCUS_DURATION = 25 * 60; // 25 minutes
const DEFAULT_BREAK_DURATION = 5 * 60;  // 5 minutes

// Storage keys
const STORAGE_KEY_FOCUS_DURATION = 'pomodoro_focus_duration';
const STORAGE_KEY_BREAK_DURATION = 'pomodoro_break_duration';

// Load durations from localStorage or use defaults
function loadDurations() {
  const focusMinutes = localStorage.getItem(STORAGE_KEY_FOCUS_DURATION);
  const breakMinutes = localStorage.getItem(STORAGE_KEY_BREAK_DURATION);
  
  return {
    focus: focusMinutes ? parseInt(focusMinutes, 10) * 60 : DEFAULT_FOCUS_DURATION,
    break: breakMinutes ? parseInt(breakMinutes, 10) * 60 : DEFAULT_BREAK_DURATION
  };
}

// Save durations to localStorage
function saveDurations(focusMinutes, breakMinutes) {
  localStorage.setItem(STORAGE_KEY_FOCUS_DURATION, focusMinutes.toString());
  localStorage.setItem(STORAGE_KEY_BREAK_DURATION, breakMinutes.toString());
}

// Get current durations
let durations = loadDurations();

// Timer state
let timerState = {
  mode: TimerMode.FOCUS,
  state: TimerState.IDLE,
  duration: durations.focus,
  remaining: durations.focus,
  intervalId: null
};

// DOM elements
let timeDisplay, modeIndicator, playPauseBtn, resetBtn, playIcon, pauseIcon, progressRing;
let settingsBtn, settingsPanel, settingsCloseBtn, focusDurationInput, breakDurationInput;

// Initialize when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  initializeElements();
  setupEventListeners();
  
  // Load durations and initialize timer
  durations = loadDurations();
  timerState.duration = durations.focus;
  timerState.remaining = durations.focus;
  
  // Initialize settings inputs with current values
  focusDurationInput.value = Math.floor(durations.focus / 60);
  breakDurationInput.value = Math.floor(durations.break / 60);
  
  updateUI();
});

function initializeElements() {
  timeDisplay = document.querySelector('.time-display');
  modeIndicator = document.querySelector('.mode-indicator');
  playPauseBtn = document.getElementById('playPauseBtn');
  resetBtn = document.getElementById('resetBtn');
  playIcon = document.getElementById('playIcon');
  pauseIcon = document.getElementById('pauseIcon');
  progressRing = document.querySelector('.timer-ring-progress');
  settingsBtn = document.getElementById('settingsBtn');
  settingsPanel = document.getElementById('settingsPanel');
  settingsCloseBtn = document.getElementById('settingsCloseBtn');
  focusDurationInput = document.getElementById('focusDuration');
  breakDurationInput = document.getElementById('breakDuration');
}

function setupEventListeners() {
  playPauseBtn.addEventListener('click', handlePlayPause);
  resetBtn.addEventListener('click', handleReset);
  settingsBtn.addEventListener('click', toggleSettings);
  settingsCloseBtn.addEventListener('click', toggleSettings);
  focusDurationInput.addEventListener('change', handleDurationChange);
  breakDurationInput.addEventListener('change', handleDurationChange);
}

function toggleSettings() {
  settingsPanel.classList.toggle('visible');
  if (settingsPanel.classList.contains('visible')) {
    // Load current values into inputs
    focusDurationInput.value = Math.floor(durations.focus / 60);
    breakDurationInput.value = Math.floor(durations.break / 60);
  }
}

function handleDurationChange() {
  const focusMinutes = parseInt(focusDurationInput.value, 10);
  const breakMinutes = parseInt(breakDurationInput.value, 10);
  
  // Validate inputs
  if (isNaN(focusMinutes) || focusMinutes < 1 || focusMinutes > 120) {
    focusDurationInput.value = Math.floor(durations.focus / 60);
    return;
  }
  if (isNaN(breakMinutes) || breakMinutes < 1 || breakMinutes > 60) {
    breakDurationInput.value = Math.floor(durations.break / 60);
    return;
  }
  
  // Update durations
  durations.focus = focusMinutes * 60;
  durations.break = breakMinutes * 60;
  
  // Save to localStorage
  saveDurations(focusMinutes, breakMinutes);
  
  // Update timer if it's idle
  if (timerState.state === TimerState.IDLE) {
    timerState.duration = timerState.mode === TimerMode.FOCUS ? durations.focus : durations.break;
    timerState.remaining = timerState.duration;
    updateUI();
    updateMenuBarIcon();
  }
}

function handlePlayPause() {
  if (timerState.state === TimerState.IDLE || timerState.state === TimerState.PAUSED) {
    startTimer();
  } else if (timerState.state === TimerState.RUNNING) {
    pauseTimer();
  }
}

function handleReset() {
  resetTimer();
}

function startTimer() {
  if (timerState.state === TimerState.IDLE) {
    // Starting fresh - set duration based on mode (use custom durations)
    timerState.duration = timerState.mode === TimerMode.FOCUS 
      ? durations.focus 
      : durations.break;
    timerState.remaining = timerState.duration;
  }
  
  timerState.state = TimerState.RUNNING;
  
  // Update interval every second
  timerState.intervalId = setInterval(() => {
    timerState.remaining--;
    
    if (timerState.remaining <= 0) {
      timerState.remaining = 0;
      completeTimer();
    }
    
    updateUI();
    updateMenuBarIcon();
  }, 1000);
  
  updateUI();
}

function pauseTimer() {
  if (timerState.intervalId) {
    clearInterval(timerState.intervalId);
    timerState.intervalId = null;
  }
  
  timerState.state = TimerState.PAUSED;
  updateUI();
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
  
  updateUI();
  updateMenuBarIcon();
}

function completeTimer() {
  if (timerState.intervalId) {
    clearInterval(timerState.intervalId);
    timerState.intervalId = null;
  }
  
  // According to PRD: "Completion triggers state change only"
  // Do NOT auto-start the other timer
  timerState.state = TimerState.IDLE;
  
  // Switch mode (focus -> break, break -> focus)
  timerState.mode = timerState.mode === TimerMode.FOCUS 
    ? TimerMode.BREAK 
    : TimerMode.FOCUS;
  
  // Reset to custom duration for new mode
  timerState.duration = timerState.mode === TimerMode.FOCUS 
    ? durations.focus 
    : durations.break;
  timerState.remaining = timerState.duration;
  
  updateUI();
  updateMenuBarIcon();
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function updateUI() {
  // Update time display
  timeDisplay.textContent = formatTime(timerState.remaining);
  
  // Update mode indicator
  modeIndicator.textContent = timerState.mode === TimerMode.FOCUS ? 'Focus' : 'Break';
  modeIndicator.className = `mode-indicator ${timerState.mode}`;
  
  // Update progress ring
  const circumference = 2 * Math.PI * 90; // radius is 90
  const progress = timerState.duration > 0 
    ? (timerState.remaining / timerState.duration) * circumference 
    : circumference;
  const offset = circumference - progress;
  
  progressRing.style.strokeDashoffset = offset;
  progressRing.className = `timer-ring-circle timer-ring-progress ${timerState.mode}`;
  
  // Update play/pause button
  if (timerState.state === TimerState.RUNNING) {
    playIcon.style.display = 'none';
    pauseIcon.style.display = 'block';
    playPauseBtn.setAttribute('aria-label', 'Pause');
  } else {
    playIcon.style.display = 'block';
    pauseIcon.style.display = 'none';
    playPauseBtn.setAttribute('aria-label', 'Play');
  }
}

function updateMenuBarIcon() {
  // Send message to main process to update menu bar icon
  // Use a small delay to ensure preload script is loaded
  if (window.electronAPI && window.electronAPI.updateTrayIcon) {
    try {
      window.electronAPI.updateTrayIcon(formatTime(timerState.remaining));
    } catch (error) {
      console.error('Error updating tray icon:', error);
    }
  }
}

// Expose timer state for debugging (optional)
window.timerState = timerState;
