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
const STORAGE_KEY_BREAK_TASKS = 'pomodoro_break_tasks';
const STORAGE_KEY_SELECTED_TASKS = 'pomodoro_selected_tasks';
const STORAGE_KEY_SELECTION_DATE = 'pomodoro_selection_date';

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
  intervalId: null,
  selectedTask: null, // Currently selected break task name
  showingTaskSelection: false, // Whether to show task selection screen
  showingCompletionConfirmation: false // Whether to show completion confirmation
};

// Break tasks database
let breakTasks = [];
// Selected tasks for today (indices from breakTasks array)
let selectedTaskIndices = [];

// DOM elements
let timeDisplay, modeIndicator, playPauseBtn, resetBtn, playIcon, pauseIcon, progressRing;
let settingsBtn, settingsPanel, settingsCloseBtn, focusDurationInput, breakDurationInput;
let breakTasksList, newTaskInput, addTaskBtn;
let breakTasksChecklist, breakTasksChecklistItems;
let taskSelectionScreen, taskSelectionList, taskNameDisplay;
let completionConfirmation, completionConfirmationText, completionYesBtn, completionNoBtn;

// Load break tasks from localStorage
function loadBreakTasks() {
  const stored = localStorage.getItem(STORAGE_KEY_BREAK_TASKS);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error loading break tasks:', error);
      return [];
    }
  }
  return [];
}

// Save break tasks to localStorage
function saveBreakTasks() {
  localStorage.setItem(STORAGE_KEY_BREAK_TASKS, JSON.stringify(breakTasks));
}

// Get today's date as YYYY-MM-DD string
function getTodayDateString() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

// Load selected tasks from localStorage
function loadSelectedTasks() {
  const storedDate = localStorage.getItem(STORAGE_KEY_SELECTION_DATE);
  const today = getTodayDateString();
  
  // If stored date is different from today, reset selection
  if (storedDate !== today) {
    return [];
  }
  
  const stored = localStorage.getItem(STORAGE_KEY_SELECTED_TASKS);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error loading selected tasks:', error);
      return [];
    }
  }
  return [];
}

// Save selected tasks to localStorage
function saveSelectedTasks() {
  const today = getTodayDateString();
  localStorage.setItem(STORAGE_KEY_SELECTED_TASKS, JSON.stringify(selectedTaskIndices));
  localStorage.setItem(STORAGE_KEY_SELECTION_DATE, today);
}

// Check and reset selection if it's a new day
function checkAndResetSelection() {
  const storedDate = localStorage.getItem(STORAGE_KEY_SELECTION_DATE);
  const today = getTodayDateString();
  
  if (storedDate !== today) {
    selectedTaskIndices = [];
    saveSelectedTasks();
  }
}

// Render break tasks list
function renderBreakTasks() {
  breakTasksList.innerHTML = '';
  
  breakTasks.forEach((task, index) => {
    const item = document.createElement('div');
    item.className = 'break-task-item';
    item.dataset.index = index;
    
    // Checkbox for selection
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'break-task-checkbox';
    checkbox.checked = selectedTaskIndices.includes(index);
    checkbox.addEventListener('change', () => handleTaskSelection(index, checkbox.checked));
    
    const text = document.createElement('span');
    text.className = 'break-task-text';
    text.textContent = task;
    text.contentEditable = 'false';
    
    const actions = document.createElement('div');
    actions.className = 'break-task-actions';
    
    const editBtn = document.createElement('button');
    editBtn.className = 'btn break-task-btn';
    editBtn.setAttribute('aria-label', 'Edit task');
    editBtn.innerHTML = '<svg class="btn-icon icon-edit" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
    editBtn.addEventListener('click', () => handleEditTask(index, text, item));
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn break-task-btn';
    deleteBtn.setAttribute('aria-label', 'Delete task');
    deleteBtn.innerHTML = '<svg class="btn-icon icon-delete" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
    deleteBtn.addEventListener('click', () => handleRemoveTask(index));
    
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    
    item.appendChild(checkbox);
    item.appendChild(text);
    item.appendChild(actions);
    breakTasksList.appendChild(item);
  });
}

// Handle task selection checkbox
function handleTaskSelection(index, isSelected) {
  if (isSelected) {
    if (!selectedTaskIndices.includes(index)) {
      selectedTaskIndices.push(index);
    }
  } else {
    selectedTaskIndices = selectedTaskIndices.filter(i => i !== index);
  }
  saveSelectedTasks();
}

// Get selected tasks (for use during breaks)
function getSelectedTasks() {
  return selectedTaskIndices.map(index => breakTasks[index]).filter(task => task !== undefined);
}

// Render task selection screen
function renderTaskSelection() {
  if (!taskSelectionScreen || !taskSelectionList) {
    return;
  }
  
  if (timerState.showingTaskSelection) {
    taskSelectionScreen.classList.add('visible');
    taskSelectionList.innerHTML = '';
    
    const selectedTasks = getSelectedTasks();
    
    // Add buttons for each selected task
    selectedTasks.forEach((task) => {
      const btn = document.createElement('button');
      btn.className = 'task-selection-btn';
      btn.textContent = task;
      btn.addEventListener('click', () => handleTaskSelection(task));
      taskSelectionList.appendChild(btn);
    });
    
    // Add "No break task" option
    const noTaskBtn = document.createElement('button');
    noTaskBtn.className = 'task-selection-btn no-task';
    noTaskBtn.textContent = 'No break task';
    noTaskBtn.addEventListener('click', () => handleTaskSelection(null));
    taskSelectionList.appendChild(noTaskBtn);
  } else {
    taskSelectionScreen.classList.remove('visible');
  }
}

// Handle task selection
function handleTaskSelection(taskName) {
  timerState.selectedTask = taskName;
  timerState.showingTaskSelection = false;
  timerState.state = TimerState.IDLE;
  timerState.duration = durations.break;
  timerState.remaining = timerState.duration;
  
  updateUI();
  updateMenuBarIcon();
}

// Handle completion confirmation - Yes
function handleCompletionYes() {
  // Log completion (prepare for Milestone 7)
  if (timerState.selectedTask) {
    // TODO: Store completion in Milestone 7
    console.log('Task completed:', timerState.selectedTask);
  }
  
  // Return to focus mode
  timerState.mode = TimerMode.FOCUS;
  timerState.state = TimerState.IDLE;
  timerState.duration = durations.focus;
  timerState.remaining = timerState.duration;
  timerState.selectedTask = null;
  timerState.showingCompletionConfirmation = false;
  
  updateUI();
  updateMenuBarIcon();
}

// Handle completion confirmation - No
function handleCompletionNo() {
  // Don't log completion, just return to focus mode
  timerState.mode = TimerMode.FOCUS;
  timerState.state = TimerState.IDLE;
  timerState.duration = durations.focus;
  timerState.remaining = timerState.duration;
  timerState.selectedTask = null;
  timerState.showingCompletionConfirmation = false;
  
  updateUI();
  updateMenuBarIcon();
}

// Handle adding a new task
function handleAddTask() {
  const taskText = newTaskInput.value.trim();
  if (taskText === '') {
    return;
  }
  
  breakTasks.push(taskText);
  saveBreakTasks();
  renderBreakTasks();
  newTaskInput.value = '';
}

// Handle editing a task
function handleEditTask(index, textElement, itemElement) {
  const isEditing = itemElement.classList.contains('editing');
  
  if (isEditing) {
    // Save changes
    const newText = textElement.textContent.trim();
    if (newText === '') {
      // If empty, restore original
      textElement.textContent = breakTasks[index];
    } else {
      breakTasks[index] = newText;
      saveBreakTasks();
    }
    textElement.contentEditable = 'false';
    itemElement.classList.remove('editing');
    textElement.classList.remove('editing');
  } else {
    // Start editing
    textElement.contentEditable = 'true';
    itemElement.classList.add('editing');
    textElement.classList.add('editing');
    textElement.focus();
    
    // Select all text
    const range = document.createRange();
    range.selectNodeContents(textElement);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    
    // Handle blur (clicking outside) to save
    const saveOnBlur = () => {
      const newText = textElement.textContent.trim();
      if (newText === '') {
        textElement.textContent = breakTasks[index];
      } else {
        breakTasks[index] = newText;
        saveBreakTasks();
      }
      textElement.contentEditable = 'false';
      itemElement.classList.remove('editing');
      textElement.classList.remove('editing');
      textElement.removeEventListener('blur', saveOnBlur);
    };
    
    textElement.addEventListener('blur', saveOnBlur);
    
    // Handle Enter key to save
    const saveOnEnter = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveOnBlur();
        textElement.removeEventListener('keydown', saveOnEnter);
      }
    };
    
    textElement.addEventListener('keydown', saveOnEnter);
  }
}

// Handle removing a task
function handleRemoveTask(index) {
  breakTasks.splice(index, 1);
  // Remove from selected tasks and adjust indices
  selectedTaskIndices = selectedTaskIndices
    .filter(i => i !== index)
    .map(i => i > index ? i - 1 : i);
  saveBreakTasks();
  saveSelectedTasks();
  renderBreakTasks();
}

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
  
  // Load break tasks
  breakTasks = loadBreakTasks();
  
  // Load selected tasks and check for midnight reset
  checkAndResetSelection();
  selectedTaskIndices = loadSelectedTasks();
  
  renderBreakTasks();
  
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
  breakTasksList = document.getElementById('breakTasksList');
  newTaskInput = document.getElementById('newTaskInput');
  addTaskBtn = document.getElementById('addTaskBtn');
  breakTasksChecklist = document.getElementById('breakTasksChecklist');
  breakTasksChecklistItems = document.getElementById('breakTasksChecklistItems');
  taskSelectionScreen = document.getElementById('taskSelectionScreen');
  taskSelectionList = document.getElementById('taskSelectionList');
  taskNameDisplay = document.getElementById('taskNameDisplay');
  completionConfirmation = document.getElementById('completionConfirmation');
  completionConfirmationText = document.getElementById('completionConfirmationText');
  completionYesBtn = document.getElementById('completionYesBtn');
  completionNoBtn = document.getElementById('completionNoBtn');
}

function setupEventListeners() {
  playPauseBtn.addEventListener('click', handlePlayPause);
  resetBtn.addEventListener('click', handleReset);
  settingsBtn.addEventListener('click', toggleSettings);
  settingsCloseBtn.addEventListener('click', toggleSettings);
  focusDurationInput.addEventListener('change', handleDurationChange);
  breakDurationInput.addEventListener('change', handleDurationChange);
  addTaskBtn.addEventListener('click', handleAddTask);
  newTaskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleAddTask();
    }
  });
  completionYesBtn.addEventListener('click', handleCompletionYes);
  completionNoBtn.addEventListener('click', handleCompletionNo);
}

function toggleSettings() {
  settingsPanel.classList.toggle('visible');
  if (settingsPanel.classList.contains('visible')) {
    // Load current values into inputs
    focusDurationInput.value = Math.floor(durations.focus / 60);
    breakDurationInput.value = Math.floor(durations.break / 60);
    // Check for midnight reset before rendering
    checkAndResetSelection();
    selectedTaskIndices = loadSelectedTasks();
    // Refresh break tasks list
    renderBreakTasks();
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
  timerState.showingTaskSelection = false;
  timerState.showingCompletionConfirmation = false;
  
  // Clear selected task if resetting during break
  if (timerState.mode === TimerMode.BREAK) {
    timerState.selectedTask = null;
  }
  
  updateUI();
  updateMenuBarIcon();
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
  } else {
    // Break timer completed - show completion confirmation
    timerState.state = TimerState.IDLE;
    timerState.showingTaskSelection = false;
    timerState.showingCompletionConfirmation = true;
  }
  
  updateUI();
  updateMenuBarIcon();
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function updateUI() {
  // Show/hide task selection screen
  renderTaskSelection();
  
  // Show/hide completion confirmation
  if (completionConfirmation) {
    if (timerState.showingCompletionConfirmation) {
      completionConfirmation.classList.add('visible');
      if (completionConfirmationText && timerState.selectedTask) {
        completionConfirmationText.textContent = `Did you complete "${timerState.selectedTask}"?`;
      } else {
        completionConfirmationText.textContent = 'Did you complete this break task?';
      }
    } else {
      completionConfirmation.classList.remove('visible');
    }
  }
  
  // Always hide old checklist (replaced by new flow)
  if (breakTasksChecklist) {
    breakTasksChecklist.style.display = 'none';
  }
  
  // Hide timer and controls when showing task selection or confirmation
  const hideMainUI = timerState.showingTaskSelection || timerState.showingCompletionConfirmation;
  
  if (hideMainUI) {
    if (timeDisplay && timeDisplay.parentElement) timeDisplay.parentElement.style.display = 'none';
    if (modeIndicator) modeIndicator.style.display = 'none';
    if (playPauseBtn && playPauseBtn.parentElement) playPauseBtn.parentElement.style.display = 'none';
    if (resetBtn && resetBtn.parentElement) resetBtn.parentElement.style.display = 'none';
  } else {
    if (timeDisplay) timeDisplay.parentElement.style.display = 'flex';
    if (modeIndicator) modeIndicator.style.display = 'block';
    if (playPauseBtn) playPauseBtn.parentElement.style.display = 'flex';
    if (resetBtn) resetBtn.parentElement.style.display = 'flex';
    
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
    
    // Update task name display
    if (taskNameDisplay) {
      if (timerState.mode === TimerMode.BREAK && timerState.selectedTask) {
        taskNameDisplay.textContent = timerState.selectedTask;
        taskNameDisplay.className = 'task-name-display break';
        taskNameDisplay.style.display = 'block';
      } else {
        taskNameDisplay.textContent = '';
        taskNameDisplay.style.display = 'none';
      }
    }
    
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
  
  updateMenuBarIcon();
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
