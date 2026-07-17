<template>
  <div class="pomodoro-fullscreen" :class="`mode-${pomodoroStore.currentMode}`">
    <div class="fullscreen-content">
      <div class="mode-tabs">
        <button
          v-for="mode in pomodoroStore.modes"
          :key="mode.value"
          class="mode-tab"
          :class="{ active: pomodoroStore.currentMode === mode.value }"
          @click="pomodoroStore.switchMode(mode.value)"
        >
          {{ $t('pomodoro.' + mode.value) }}
        </button>
      </div>

      <div class="timer-container">
        <svg class="progress-ring" viewBox="0 0 400 400">
          <circle cx="200" cy="200" r="180" fill="none" stroke-width="10" class="ring-bg" />
          <circle
            cx="200"
            cy="200"
            r="180"
            fill="none"
            stroke-width="10"
            stroke-linecap="round"
            :stroke-dasharray="circumference"
            :stroke-dashoffset="progressOffset"
            :style="{ stroke: pomodoroStore.currentColor }"
            class="ring-fill"
          />
        </svg>
        <div class="timer-display">
          <span class="time-text">{{ pomodoroStore.formattedTime }}</span>
          <span class="mode-label">{{ $t('pomodoro.' + pomodoroStore.currentMode) }}</span>
        </div>
      </div>

      <div class="current-task" v-if="taskStore.focusedTask">
        <Timer :size="18" class="task-icon" />
        <span class="task-title">{{ taskStore.focusedTask.title }}</span>
      </div>
      <div class="current-task empty" v-else>
        <span>{{ $t('pomodoro.selectTaskShort') }}</span>
      </div>

      <div class="pomodoro-count">
        <span
          v-for="i in settingsStore.pomodoroSessionsBeforeLongBreak"
          :key="'d-' + i"
          class="dot"
          :class="{ filled: isDotFilled(i) }"
        ></span>
        <span class="count-text">{{ $t('pomodoro.completedTomatoes', { count: pomodoroStore.completedPomodoros }) }}</span>
      </div>

      <div v-if="pomodoroStore.isCustomEditing" class="custom-row">
        <input
          type="number"
          class="custom-input"
          :value="pomodoroStore.customMinutes"
          min="1"
          max="180"
          @input="
            pomodoroStore.customMinutes = Math.max(
              1,
              Math.min(180, parseInt($event.target.value) || 1)
            )
          "
          @keyup.enter="pomodoroStore.applyCustomDuration()"
        />
        <span class="custom-unit">{{ $t('pomodoro.minutes') }}</span>
        <button class="custom-ok" @click="pomodoroStore.applyCustomDuration()">{{ $t('common.confirm') }}</button>
        <button class="custom-cancel" @click="pomodoroStore.isCustomEditing = false">{{ $t('common.cancel') }}</button>
      </div>
      <button v-else class="custom-toggle" @click="pomodoroStore.isCustomEditing = true">
        <Edit3 :size="13" /> {{ $t('pomodoro.customDuration') }}
      </button>

      <div class="controls">
        <button
          class="ctrl-btn"
          :class="{ disabled: !pomodoroStore.hasStarted }"
          @click="pomodoroStore.resetTimer"
          :disabled="!pomodoroStore.hasStarted"
          :title="$t('pomodoro.reset')"
        >
          <RotateCcw :size="22" />
        </button>
        <button class="ctrl-btn primary" @click="pomodoroStore.toggleTimer()">
          <Play v-if="!pomodoroStore.isRunning" :size="32" />
          <Pause v-else :size="32" />
        </button>
        <div class="ctrl-btn-placeholder"></div>
      </div>

      <button class="exit-btn" @click="exitFullscreen">{{ $t('pomodoro.exitFullscreen') }}</button>
    </div>
  </div>
</template>

<script setup>
import { computed, watch, onMounted } from 'vue'
import { useTaskStore } from '../stores/taskStore'
import { useSettingsStore } from '../stores/settingsStore'
import { usePomodoroStore } from '../stores/pomodoroStore'
import { Timer, Play, Pause, RotateCcw, Edit3 } from '@lucide/vue'

const taskStore = useTaskStore()
const settingsStore = useSettingsStore()
const pomodoroStore = usePomodoroStore()

const circumference = 2 * Math.PI * 180

const progressOffset = computed(
  () => circumference * (1 - pomodoroStore.timeLeft / pomodoroStore.totalTime)
)

const isDotFilled = (i) => {
  const total = settingsStore.pomodoroSessionsBeforeLongBreak
  const inCycle = pomodoroStore.completedPomodoros % total
  if (inCycle === 0 && pomodoroStore.completedPomodoros > 0) return true
  return i <= inCycle
}

const exitFullscreen = () => {
  if (window.electronAPI?.closePomodoroFullscreen) {
    window.electronAPI.closePomodoroFullscreen()
  }
}

onMounted(async () => {
  pomodoroStore.setupWatchers(watch)
  pomodoroStore.initElectronMode()
})

// 子窗口不清理主窗口的定时器
// cleanup() 仅在 store 销毁时调用
</script>

<style scoped>
.pomodoro-fullscreen {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  user-select: none;
}

.pomodoro-fullscreen.mode-work {
  background: linear-gradient(135deg, #1a0505 0%, #2d0a0a 50%, #1a0505 100%);
}
.pomodoro-fullscreen.mode-shortBreak {
  background: linear-gradient(135deg, #051a0a 0%, #0a2d12 50%, #051a0a 100%);
}
.pomodoro-fullscreen.mode-longBreak {
  background: linear-gradient(135deg, #051520 0%, #0a2535 50%, #051520 100%);
}

.fullscreen-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
}

.mode-tabs {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 999px;
  backdrop-filter: blur(8px);
}

.mode-tab {
  padding: 8px 24px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.4);
  font-size: 14px;
  font-weight: 500;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: var(--font-body);
}

.mode-tab:hover {
  color: rgba(255, 255, 255, 0.6);
}

.mode-tab.active {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
}

.mode-work .mode-tab.active {
  color: #ef4444;
}
.mode-shortBreak .mode-tab.active {
  color: #22c55e;
}
.mode-longBreak .mode-tab.active {
  color: #06b6d4;
}

.timer-container {
  position: relative;
  width: 360px;
  height: 360px;
}

.progress-ring {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ring-bg {
  stroke: rgba(255, 255, 255, 0.06);
}
.ring-fill {
  transition: stroke-dashoffset 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.timer-display {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.time-text {
  display: block;
  font-size: 80px;
  font-weight: 200;
  color: rgba(255, 255, 255, 0.95);
  font-family: var(--font-mono, var(--font-body));
  letter-spacing: 4px;
  line-height: 1;
  margin-bottom: 10px;
}

.mode-label {
  display: block;
  font-size: 15px;
  color: rgba(255, 255, 255, 0.35);
  font-weight: 500;
  letter-spacing: 2px;
}

.current-task {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 18px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 999px;
  max-width: 400px;
  backdrop-filter: blur(8px);
}

.current-task.empty {
  color: rgba(255, 255, 255, 0.25);
  font-size: 14px;
}

.task-icon {
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.3);
}
.mode-work .task-icon {
  color: #ef4444;
}

.task-title {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pomodoro-count {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  transition: all 0.3s;
}

.dot.filled {
  background: #ef4444;
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.5);
}

.mode-shortBreak .dot.filled,
.mode-longBreak .dot.filled {
  background: #22c55e;
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
}

.count-text {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.25);
  margin-left: 4px;
}

.custom-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: transparent;
  color: rgba(255, 255, 255, 0.3);
  font-size: 13px;
  font-family: var(--font-body);
  cursor: pointer;
  border-radius: 999px;
  transition: all 0.15s;
}

.custom-toggle:hover {
  border-color: rgba(255, 255, 255, 0.25);
  color: rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.03);
}

.custom-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.custom-input {
  width: 60px;
  padding: 6px 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  font-size: 14px;
  text-align: center;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.8);
  font-family: var(--font-body);
}

.custom-input:focus {
  outline: none;
  border-color: rgba(255, 255, 255, 0.3);
}
.custom-unit {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.3);
}

.custom-ok,
.custom-cancel {
  padding: 4px 14px;
  border: none;
  border-radius: 999px;
  font-size: 13px;
  font-family: var(--font-body);
  cursor: pointer;
  transition: all 0.15s;
}

.custom-ok {
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.7);
}

.custom-ok:hover {
  background: rgba(255, 255, 255, 0.2);
}
.custom-cancel {
  background: transparent;
  color: rgba(255, 255, 255, 0.25);
}
.custom-cancel:hover {
  color: rgba(255, 255, 255, 0.5);
}

.controls {
  display: flex;
  align-items: center;
  gap: 20px;
}

.ctrl-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
}

.ctrl-btn:not(.primary) {
  width: 52px;
  height: 52px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(8px);
}

.ctrl-btn:not(.primary):hover {
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.7);
}

.ctrl-btn.disabled {
  opacity: 0.25;
  cursor: not-allowed;
}

.ctrl-btn.primary {
  width: 76px;
  height: 76px;
  background: #ef4444;
  color: white;
  box-shadow: 0 4px 20px rgba(239, 68, 68, 0.3);
}

.mode-shortBreak .ctrl-btn.primary {
  background: #22c55e;
  box-shadow: 0 4px 20px rgba(34, 197, 94, 0.3);
}

.mode-longBreak .ctrl-btn.primary {
  background: #06b6d4;
  box-shadow: 0 4px 20px rgba(6, 182, 212, 0.3);
}

.ctrl-btn.primary:hover {
  transform: scale(1.05);
}
.ctrl-btn.primary:active {
  transform: scale(0.97);
}

.ctrl-btn-placeholder {
  width: 52px;
  height: 52px;
}

.exit-btn {
  padding: 10px 32px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  background: transparent;
  color: rgba(255, 255, 255, 0.3);
  font-size: 14px;
  font-family: var(--font-body);
  cursor: pointer;
  transition: all 0.2s;
  letter-spacing: 0.5px;
}

.exit-btn:hover {
  border-color: rgba(255, 255, 255, 0.3);
  color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.03);
}
</style>
