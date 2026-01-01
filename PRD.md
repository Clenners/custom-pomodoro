Product Requirements Document — Local Pomodoro Timer App (v1)

⸻

1. Overview

This is a local-only macOS menu bar Pomodoro timer app designed for focused work and intentional breaks.
The app runs entirely offline, stores all data locally, and is not distributed via any app store.
The app appears in the macOS menu bar and is hidden from the Dock.

The UI and interaction model should closely resemble a modern, minimal Pomodoro timer with a central circular timer, minimal text, and low cognitive load.

⸻

2. Goals
	•	Support focused work using configurable Pomodoro intervals
	•	Encourage intentional breaks via user-selected break tasks
	•	Provide lightweight daily tracking without long-term analytics
	•	Feel calm, responsive, and visually restrained

⸻

3. Non-Goals
	•	No accounts or authentication
	•	No cloud sync
	•	No analytics or telemetry
	•	No mobile or web version
	•	No collaboration or sharing features

⸻

4. Core Features

4.1 Timer System

Timer Types
	•	Focus Timer
	•	Break Timer

Each timer:
	•	Can be started manually
	•	Can be paused
	•	Can be reset

Default Durations
	•	Focus: 25 minutes
	•	Break: 5 minutes

Custom Durations
	•	User can adjust:
	•	Focus duration
	•	Break duration
	•	Changes persist locally
	•	Defaults are restored on first install

Transition Rules
	•	Focus timer does not auto-start break timer
	•	Break timer does not auto-start focus timer
	•	User must explicitly start each session

⸻

4.2 Break Task System

Break Task Database
	•	User maintains a persistent list of break tasks (e.g. stretch, water, walk)
	•	Tasks can be:
	•	Added
	•	Edited
	•	Removed
	•	This list acts as a task database

Daily Break Task Selection
	•	Each day, user selects a subset of tasks (e.g. 5 out of 20)
	•	Only selected tasks appear during breaks that day
	•	Daily task selection resets at midnight

During Breaks
	•	Selected break tasks are displayed as a checklist
	•	User can mark tasks as completed
	•	Completion is tracked per day

⸻

4.3 Daily Tracking

Tracked per calendar day:
	•	Number of completed focus sessions
	•	Which break tasks were completed

Rules:
	•	Focus session counts only when the timer reaches zero
	•	Reset happens automatically at local midnight
	•	No historical views beyond "today" (v1)

UI displays:
	•	"Today X / Y" focus sessions completed

⸻

4.4 Local Persistence
	•	All data stored locally on the device
	•	No internet required
	•	Data persists across app restarts
	•	Storage includes:
	•	Timer settings
	•	Break task database
	•	Daily selections
	•	Daily completion stats

⸻

5. UI & Interaction (Pixel-Focused)

5.1 Main Timer View

Menu Bar Display
	•	Menu bar icon shows timer status (e.g., time remaining in compact format)
	•	Icon updates to reflect current timer state (running, paused, idle)
	•	Visual indicator distinguishes focus vs break mode

Popover Interface
	•	Clicking the menu bar icon opens a popover containing the full timer UI
	•	Popover appears below the menu bar icon
	•	Popover dismisses when clicking outside of it
	•	Popover contains:
	•	Centered circular timer ring
	•	Large time display in the center (MM:SS)
	•	Single primary action button (play / pause)
	•	Secondary reset control
	•	Minimal text

Visual Style
	•	Flat, minimal, neutral colors
	•	No visual clutter
	•	Smooth transitions
	•	Timer ring visually represents remaining time

State Indicators
	•	Focus vs break mode is visually distinct (color or label)
	•	Paused state is visually obvious
	•	Disabled states are clearly communicated

⸻

5.2 Break Task UI
	•	Appears only during break mode
	•	Checklist-style layout
	•	Clear affordance for completion
	•	No modal stacking or intrusive overlays

⸻

5.3 Settings UI
	•	Lightweight settings panel
	•	Controls for:
	•	Focus duration
	•	Break duration
	•	Break task database
	•	Daily task selection
	•	Accessible but visually secondary

⸻

6. App State Model (High-Level)

Timer State
	•	idle
	•	running
	•	paused

Mode
	•	focus
	•	break

Daily State
	•	date
	•	focusSessionsCompleted
	•	selectedBreakTasks[]
	•	completedBreakTasks[]

⸻

7. Technical Constraints
	•	macOS menu bar app
	•	App is hidden from Dock (menu bar only)
	•	Built using web technologies
	•	Runs fully offline
	•	Wrapped using Electron or equivalent
	•	No external APIs or services

⸻

8. Out of Scope (v1)
	•	Weekly or historical analytics
	•	Data export
	•	Themes
	•	Gamification
	•	Notifications customization beyond on/off

⸻

9. Milestones
	1.	Menu bar app shell + popover
	2.	Static UI replication
	3.	Timer engine (focus + break)
	4.	Pause/reset + custom durations
	5.	Break task database
	6.	Daily task selection
	7.	Daily tracking + persistence
	8.	Packaging as macOS app

