<template>
  <div class="pomodoro-fullscreen" :class="`mode-${pomodoroStore.currentMode}`">
    <div class="bg-particles">
      <div v-for="i in 20" :key="i" class="particle" :style="getParticleStyle(i)"></div>
    </div>
    <div class="bg-gradient-1"></div>
    <div class="bg-gradient-2"></div>

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
        <div
          class="ring-glow"
          :style="{ boxShadow: `0 0 100px ${pomodoroStore.currentColor}30` }"
        ></div>
        <svg class="progress-ring" viewBox="0 0 400 400">
          <circle cx="200" cy="200" r="180" fill="none" stroke-width="12" class="ring-bg" />
          <circle
            cx="200"
            cy="200"
            r="180"
            fill="none"
            stroke-width="12"
            stroke-linecap="round"
            :stroke-dasharray="circumference"
            :stroke-dashoffset="progressOffset"
            :style="{ stroke: pomodoroStore.currentColor }"
            class="ring-fill"
          />
          <circle
            cx="200"
            cy="200"
            r="160"
            fill="none"
            stroke-width="1"
            :style="{ stroke: `${pomodoroStore.currentColor}20` }"
            class="ring-inner"
          />
        </svg>
        <div
          class="timer-glow"
          :style="{
            background: `radial-gradient(circle, ${pomodoroStore.currentColor}15 0%, transparent 70%)`
          }"
        ></div>
        <div class="timer-display">
          <div class="time-container">
            <span class="time-text" :style="{ color: pomodoroStore.currentColor }">{{ formattedMinutes }}</span>
            <span class="time-separator">
              <span class="dot"></span>
              <span class="dot"></span>
            </span>
            <span class="time-text" :style="{ color: pomodoroStore.currentColor }">{{ formattedSeconds }}</span>
          </div>
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
        <span class="count-text">{{
          $t('pomodoro.completedTomatoes', { count: pomodoroStore.completedPomodoros })
        }}</span>
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
        <button class="custom-ok" @click="pomodoroStore.applyCustomDuration()">
          {{ $t('common.confirm') }}
        </button>
        <button class="custom-cancel" @click="pomodoroStore.isCustomEditing = false">
          {{ $t('common.cancel') }}
        </button>
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
import { useRouter } from 'vue-router'
import { useTaskStore } from '../stores/taskStore'
import { useSettingsStore } from '../stores/settingsStore'
import { usePomodoroStore } from '../stores/pomodoroStore'
import { Timer, Play, Pause, RotateCcw, Edit3 } from '@lucide/vue'

const taskStore = useTaskStore()
const settingsStore = useSettingsStore()
const pomodoroStore = usePomodoroStore()
const router = useRouter()

const circumference = 2 * Math.PI * 180

const progressOffset = computed(
  () => circumference * (1 - pomodoroStore.timeLeft / pomodoroStore.totalTime)
)

const formattedMinutes = computed(() => {
  const minutes = Math.floor(pomodoroStore.timeLeft / 60)
  return String(minutes).padStart(2, '0')
})

const formattedSeconds = computed(() => {
  const seconds = pomodoroStore.timeLeft % 60
  return String(seconds).padStart(2, '0')
})

const getParticleStyle = (_) => {
  const size = 2 + Math.random() * 4
  const left = Math.random() * 100
  const delay = Math.random() * 15
  const duration = 15 + Math.random() * 20
  const opacity = 0.2 + Math.random() * 0.4
  return {
    width: size + 'px',
    height: size + 'px',
    left: left + '%',
    animationDelay: delay + 's',
    animationDuration: duration + 's',
    opacity: opacity
  }
}

const isDotFilled = (i) => {
  const total = settingsStore.pomodoroSessionsBeforeLongBreak
  const inCycle = pomodoroStore.completedPomodoros % total
  if (inCycle === 0 && pomodoroStore.completedPomodoros > 0) return true
  return i <= inCycle
}

const exitFullscreen = () => {
  if (window.electronAPI?.closePomodoroFullscreen) {
    window.electronAPI.closePomodoroFullscreen()
  } else {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    }
    router.push('/pomodoro')
  }
}

onMounted(async () => {
  pomodoroStore.setupWatchers(watch)
  pomodoroStore.initElectronMode()

  // Web 端请求浏览器原生全屏
  if (!window.electronAPI) {
    const el = document.documentElement
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {})
    }
    // ESC 键退出
    const handleKeydown = (e) => {
      if (e.key === 'Escape') exitFullscreen()
    }
    document.addEventListener('keydown', handleKeydown)
  }
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
  position: relative;
}

.bg-particles {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}

.particle {
  position: absolute;
  bottom: -20px;
  border-radius: 50%;
  animation: floatUp linear infinite;
}

.pomodoro-fullscreen.mode-work .particle {
  background: #ef4444;
  box-shadow: 0 0 6px #ef4444;
}

.pomodoro-fullscreen.mode-shortBreak .particle {
  background: #22c55e;
  box-shadow: 0 0 6px #22c55e;
}

.pomodoro-fullscreen.mode-longBreak .particle {
  background: #06b6d4;
  box-shadow: 0 0 6px #06b6d4;
}

@keyframes floatUp {
  0% {
    transform: translateY(0) translateX(0);
    opacity: 0;
  }
  10% {
    opacity: 0.6;
  }
  90% {
    opacity: 0.6;
  }
  100% {
    transform: translateY(-100vh) translateX(50px);
    opacity: 0;
  }
}

.bg-gradient-1 {
  position: absolute;
  top: -30%;
  left: -10%;
  width: 60%;
  height: 60%;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.3;
  z-index: 0;
  animation: gradientFloat 20s ease-in-out infinite;
}

.bg-gradient-2 {
  position: absolute;
  bottom: -20%;
  right: -10%;
  width: 50%;
  height: 50%;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.2;
  z-index: 0;
  animation: gradientFloat 25s ease-in-out infinite reverse;
}

.pomodoro-fullscreen.mode-work .bg-gradient-1 {
  background: #ef4444;
}
.pomodoro-fullscreen.mode-work .bg-gradient-2 {
  background: #dc2626;
}

.pomodoro-fullscreen.mode-shortBreak .bg-gradient-1 {
  background: #22c55e;
}
.pomodoro-fullscreen.mode-shortBreak .bg-gradient-2 {
  background: #16a34a;
}

.pomodoro-fullscreen.mode-longBreak .bg-gradient-1 {
  background: #06b6d4;
}
.pomodoro-fullscreen.mode-longBreak .bg-gradient-2 {
  background: #0891b2;
}

@keyframes gradientFloat {
  0% {
    transform: translate(0, 0) scale(1);
  }
  20% {
    transform: translate(30px, -20px) scale(1.08);
  }
  40% {
    transform: translate(15px, -10px) scale(1);
  }
  60% {
    transform: translate(-20px, 15px) scale(0.95);
  }
  80% {
    transform: translate(10px, -5px) scale(1.03);
  }
  100% {
    transform: translate(0, 0) scale(1);
  }
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
  position: relative;
  z-index: 1;
}

.mode-tabs {
  display: flex;
  gap: 4px;
  padding: 6px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 999px;
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
}

.mode-tab {
  padding: 10px 28px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.4);
  font-size: var(--font-size-body);
  font-weight: 500;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: var(--font-body);
}

.mode-tab:hover {
  color: rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.03);
}

.mode-tab.active {
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.95);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
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
  width: 400px;
  height: 400px;
}

.ring-glow {
  position: absolute;
  inset: -30px;
  border-radius: 50%;
  opacity: 0.4;
  animation: ringGlowPulse 4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  pointer-events: none;
}

@keyframes ringGlowPulse {
  0% {
    opacity: 0.35;
    transform: scale(1);
  }
  25% {
    opacity: 0.55;
    transform: scale(1.02);
  }
  50% {
    opacity: 0.35;
    transform: scale(1);
  }
  75% {
    opacity: 0.25;
    transform: scale(0.98);
  }
  100% {
    opacity: 0.35;
    transform: scale(1);
  }
}

.progress-ring {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
  filter: drop-shadow(0 4px 16px rgba(0, 0, 0, 0.3));
}

.ring-bg {
  stroke: rgba(255, 255, 255, 0.06);
  stroke-width: 4;
}
.ring-fill {
  transition: stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  filter: drop-shadow(0 0 12px currentColor);
  stroke-linecap: round;
}

.ring-inner {
  opacity: 0.3;
}

.timer-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80%;
  height: 80%;
  border-radius: 50%;
  filter: blur(40px);
  opacity: 0.5;
  pointer-events: none;
  animation: timerGlow 5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

@keyframes timerGlow {
  0% {
    opacity: 0.45;
    transform: translate(-50%, -50%) scale(1);
  }
  20% {
    opacity: 0.7;
    transform: translate(-50%, -50%) scale(1.05);
  }
  40% {
    opacity: 0.45;
    transform: translate(-50%, -50%) scale(1);
  }
  60% {
    opacity: 0.35;
    transform: translate(-50%, -50%) scale(0.97);
  }
  80% {
    opacity: 0.55;
    transform: translate(-50%, -50%) scale(1.02);
  }
  100% {
    opacity: 0.45;
    transform: translate(-50%, -50%) scale(1);
  }
}

.timer-display {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.time-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.time-text {
  font-family: var(--font-mono, 'SF Mono', 'Monaco', 'Courier New', monospace);
  font-variant-numeric: tabular-nums;
  font-size: 120px;
  font-weight: 200;
  line-height: 1;
  letter-spacing: 4px;
  text-shadow: 0 0 20px currentColor;
}

.time-separator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
}

.time-separator .dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  animation: separatorPulse 1s ease-in-out infinite;
}

.time-separator .dot:nth-child(2) {
  animation-delay: 0.5s;
}

@keyframes separatorPulse {
  0%,
  100% {
    opacity: 0.9;
    transform: scale(1);
  }
  50% {
    opacity: 0.3;
    transform: scale(0.7);
  }
}

.mode-label {
  display: block;
  font-size: var(--font-size-base);
  color: rgba(255, 255, 255, 0.4);
  font-weight: 500;
  letter-spacing: 3px;
  text-transform: uppercase;
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
  font-size: var(--font-size-body);
}

.task-icon {
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.3);
}
.mode-work .task-icon {
  color: #ef4444;
}

.task-title {
  font-size: var(--font-size-base);
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
  font-size: var(--font-size-sm);
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
  font-size: var(--font-size-sm);
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
  font-size: var(--font-size-body);
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
  font-size: var(--font-size-sm);
  color: rgba(255, 255, 255, 0.3);
}

.custom-ok,
.custom-cancel {
  padding: 4px 14px;
  border: none;
  border-radius: 999px;
  font-size: var(--font-size-sm);
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
  font-size: var(--font-size-body);
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
