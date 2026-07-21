<div align="center">

<img src="build/icon.png" width="120" height="120" alt="Choyeon To Do Logo" />

# Choyeon To Do

**A simple task manager that helps you plan your day**

<p align="center">
  <a href="#features">Features</a> ·
  <a href="#download">Download</a> ·
  <a href="#try-it-online">Try it online</a> ·
  <a href="#screenshots">Screenshots</a> ·
  <a href="#getting-started">Getting started</a> ·
  <a href="#development">Development</a>
</p>

[![Release](https://img.shields.io/github/v/release/Choyeon/choyeon-todo?style=flat-square&logo=github&label=Release)](https://github.com/Choyeon/choyeon-todo/releases)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Web-0078D4?style=flat-square&logo=windows-terminal&logoColor=white)](#download)
[![Web Demo](https://img.shields.io/badge/demo-online-4FC08D?style=flat-square&logo=vuedotjs&logoColor=white)](https://chuyuchoyeon.github.io/choyeon-todo/)
[![License](https://img.shields.io/github/license/Choyeon/choyeon-todo?style=flat-square)](./LICENSE)

[中文](README.zh-CN.md) · [日本語](README.ja-JP.md)

</div>

---

## Features

- **Quick add** — Just type and press enter. Dates, times, and priorities are detected automatically as you type.
- **Calendar view** — See your tasks on a month view or timeline. Drag tasks around to reschedule.
- **Pomodoro timer** — Focus sessions with short and long breaks. Fullscreen focus mode. Attach a timer to any task.
- **Stats** — Track how many tasks you've finished, how long you've focused, and your streak.
- **Light & dark themes** — Follows your system preference, or pick manually.
- **Cross-platform** — Same experience on Windows, macOS, and web.
- **Keyboard shortcuts** — Add, search, and navigate without touching the mouse.
- **PWA support** — Install the web version to your desktop and use it offline.
- **Available in** — 简体中文 · English · 日本語

---

## Screenshots

| Main view | Calendar |
| :---: | :---: |
| <img src="img/main.png" width="100%" alt="Main view" /> | <img src="img/🗓.png" width="100%" alt="Calendar view" /> |
| **Stats** | **Pomodoro** |
| <img src="img/data.png" width="100%" alt="Stats" /> | <img src="img/potato.png" width="100%" alt="Pomodoro" /> |

---

## Try it online

The web version is available here:

**🌐 https://chuyuchoyeon.github.io/choyeon-todo/**

> The web version doesn't include system notifications, tray menu, or global shortcuts.

---

## Download

### Latest release: v1.3.0

| Platform | Download |
|----------|----------|
| **Windows** | [Setup](https://github.com/Choyeon/choyeon-todo/releases/latest) · [Portable](https://github.com/Choyeon/choyeon-todo/releases/latest) |
| **macOS** | [DMG / ZIP](https://github.com/Choyeon/choyeon-todo/releases/latest) (Intel & Apple Silicon) |
| **Linux** | [tar.gz](https://github.com/Choyeon/choyeon-todo/releases/latest) |

All downloads are on the [Releases page](https://github.com/Choyeon/choyeon-todo/releases).

### Install notes

**Windows**
- Setup: run the installer and follow the steps
- Portable: extract and run `Choyeon To Do.exe` directly

**macOS**
- Open the DMG and drag the app into Applications
- If you see a security warning, go to System Settings → Privacy & Security and click "Open Anyway"

---

## Getting started

1. **Add a task** — Type in the input box at the top and press Enter
2. **Smart detection** — Dates, times, priorities, and categories are picked up automatically
   - Example: `Meeting tomorrow 3pm #work important`
3. **Manage tasks** — Click the checkbox to complete, click the text to edit details
4. **Switch views** — Use the sidebar to navigate between different views

### Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + N` | New task |
| `Ctrl/Cmd + F` | Search tasks |
| `Ctrl/Cmd + ,` | Open settings |
| `Esc` | Close dialog / cancel editing |

---

## Development

### Requirements

- Node.js >= 18
- npm >= 9

### Setup

```bash
# Clone the repo
git clone https://github.com/Choyeon/choyeon-todo.git
cd choyeon-todo

# Install dependencies
npm install

# Dev mode (web)
npm run dev

# Dev mode (Electron)
npm run electron:dev
```

### Build

```bash
# Build web version
npm run build

# Build Windows (run on Windows)
npm run electron:build:win

# Build macOS (run on macOS)
npm run electron:build:mac

# Build Linux
npm run electron:build:linux
```

Build output goes to `app-build/`.

### Testing

```bash
# Run unit tests
npm run test:run

# Coverage
npm run test:coverage
```

### Tech stack

Vue 3 · Vite · Pinia · Vue Router · Electron · electron-builder · Vitest · Lucide Icons · vue-i18n · vite-plugin-pwa

---

## Changelog

### v1.3.0 — 2026-07-22

- Redesigned pomodoro timer with glowing text and ring effects
- Added task picker directly in pomodoro view — select tasks without leaving the timer
- Web fullscreen focus mode with browser native Fullscreen API
- Removed flip card animation for a cleaner, more stable display
- Enhanced progress ring with glow effects and smoother transitions
- Fixed pomodoro timer countdown accuracy
- Optimized code quality: ESLint, Prettier, 94 unit tests passing
- Multiple UI refinements for better visual consistency

### v1.0.2 — 2026-07-18

- Fixed: weekday names showing as single characters in stats and calendar views
- Fixed: dark mode text contrast issue on stats primary card
- Fixed: version number hardcoded in About page — now reads from package.json
- Added: app version exposed via Electron IPC for runtime consistency

### v1.0.1 — 2026-07-18

- README restructure, more focus on the app itself
- About page copy updated
- Fixed: Windows build path issue
- Fixed: Completed task styling consistency across views

### v1.0.0 — 2026-07-18

Initial release.

Core features:
- Smart task input with natural language parsing
- Calendar (month view + timeline)
- Pomodoro timer (3 modes + fullscreen focus)
- Statistics (line chart, pie chart, heatmap, bar chart)
- System notifications and reminders
- Light / dark theme
- PWA offline support
- 3 languages: 简体中文 / English / 日本語

---

## License

[MIT](./LICENSE) © Choyeon
