<template>
  <div
    class="pomodoro-timer"
    :class="[
      `mode-${pomodoroStore.currentMode}`,
      { 'is-running': pomodoroStore.isRunning, 'is-paused': !pomodoroStore.isRunning }
    ]"
  >
    <div class="timer-decoration decoration-top"></div>
    <div class="timer-decoration decoration-bottom"></div>

    <div class="mode-tabs">
      <button
        v-for="mode in pomodoroStore.modes"
        :key="mode.value"
        class="mode-tab"
        :class="{ active: pomodoroStore.currentMode === mode.value }"
        @click="pomodoroStore.switchMode(mode.value)"
      >
        <component :is="modeIcons[mode.value]" :size="14" />
        <span>{{ $t('pomodoro.' + mode.value) }}</span>
      </button>
    </div>

    <div class="timer-container">
      <div class="progress-ring-wrapper">
        <div
          class="ring-glow-outer"
          :style="{ boxShadow: `0 0 80px ${pomodoroStore.currentColor}30` }"
        ></div>
        <svg class="progress-ring" viewBox="0 0 200 200">
          <defs>
            <linearGradient
              :id="'gradient-' + pomodoroStore.currentMode"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" :stop-color="pomodoroStore.currentColor" stop-opacity="0.3" />
              <stop offset="50%" :stop-color="pomodoroStore.currentColor" stop-opacity="1" />
              <stop offset="100%" :stop-color="pomodoroStore.currentColor" stop-opacity="0.3" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle class="progress-ring-bg" cx="100" cy="100" r="88" fill="none" stroke-width="6" />
          <circle
            class="progress-ring-fill"
            cx="100"
            cy="100"
            r="88"
            fill="none"
            stroke-width="6"
            stroke-linecap="round"
            :stroke-dasharray="circumference"
            :stroke-dashoffset="progressOffset"
            :stroke="`url(#gradient-${pomodoroStore.currentMode})`"
            filter="url(#glow)"
          />
          <circle
            class="progress-ring-inner"
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke-width="1"
            :style="{ stroke: `${pomodoroStore.currentColor}20` }"
          />
        </svg>
        <div
          class="glow-effect"
          :style="{
            background: `radial-gradient(circle, ${pomodoroStore.currentColor}25 0%, transparent 70%)`
          }"
        ></div>
        <div
          class="glow-effect-inner"
          :style="{
            background: `radial-gradient(circle, ${pomodoroStore.currentColor}15 0%, transparent 60%)`
          }"
        ></div>
      </div>

      <div class="timer-display">
        <div class="time-container">
          <div class="time-unit minutes">
            <FlipCard :value="formattedMinutes" />
          </div>
          <span class="time-separator">
            <span class="dot"></span>
            <span class="dot"></span>
          </span>
          <div class="time-unit seconds">
            <FlipCard :value="formattedSeconds" />
          </div>
        </div>
        <Transition name="mode-fade" mode="out-in">
          <span :key="pomodoroStore.currentMode" class="mode-label">{{
            $t('pomodoro.' + pomodoroStore.currentMode)
          }}</span>
        </Transition>
      </div>
    </div>

    <div v-if="pomodoroStore.isCustomEditing" class="custom-duration">
      <div class="custom-row">
        <label>{{ $t('pomodoro.durationMinutes') }}</label>
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
      </div>
      <div class="custom-actions">
        <button class="custom-btn cancel" @click="pomodoroStore.isCustomEditing = false">
          {{ $t('common.cancel') }}
        </button>
        <button class="custom-btn confirm" @click="pomodoroStore.applyCustomDuration()">
          {{ $t('common.confirm') }}
        </button>
      </div>
    </div>
    <button v-else class="custom-duration-toggle" @click="pomodoroStore.isCustomEditing = true">
      <Edit3 :size="12" />
      <span>{{ $t('pomodoro.customDuration') }}</span>
    </button>

    <div v-if="taskStore.focusedTask" class="current-task">
      <Timer :size="14" class="task-icon" />
      <span class="task-title">{{ taskStore.focusedTask.title }}</span>
    </div>
    <div v-else class="current-task no-task">
      <span>{{ $t('pomodoro.selectTask') }}</span>
    </div>

    <div class="pomodoro-count">
      <div class="count-dots">
        <span
          v-for="i in settingsStore.pomodoroSessionsBeforeLongBreak"
          :key="'dot-' + i"
          class="count-dot"
          :class="{ filled: isDotFilled(i) }"
          :style="
            i <= pomodoroStore.completedPomodoros
              ? {
                  backgroundColor: pomodoroStore.currentColor,
                  boxShadow: `0 0 8px ${pomodoroStore.currentColor}60`
                }
              : {}
          "
        ></span>
      </div>
      <span class="count-text">
        <span class="count-number">{{ pomodoroStore.completedPomodoros }}</span>
        <span class="count-label">{{ $t('pomodoro.tomatoUnit') }}</span>
      </span>
    </div>

    <div class="controls">
      <button
        class="control-btn reset-btn"
        @click="pomodoroStore.resetTimer"
        :title="$t('pomodoro.reset')"
      >
        <RotateCcw :size="18" />
      </button>
      <button
        class="control-btn primary-btn"
        :class="{ running: pomodoroStore.isRunning }"
        @click="pomodoroStore.toggleTimer()"
        :title="pomodoroStore.isRunning ? $t('pomodoro.pause') : $t('pomodoro.start')"
      >
        <Play v-if="!pomodoroStore.isRunning" :size="26" />
        <Pause v-else :size="26" />
      </button>
      <button
        class="control-btn skip-btn"
        :class="{ disabled: !pomodoroStore.canSkip }"
        @click="handleSkip"
        :disabled="!pomodoroStore.canSkip"
        :title="$t('pomodoro.skip')"
      >
        <SkipForward :size="18" />
      </button>
    </div>

    <button class="fullscreen-btn" @click="openFullscreen" :title="$t('pomodoro.fullscreen')">
      <Maximize2 :size="16" />
      <span>{{ $t('pomodoro.fullscreen') }}</span>
    </button>

    <button
      v-if="isElectron"
      class="fab-btn"
      @click="pomodoroStore.toggleFab"
      :title="$t('pomodoro.desktopFab')"
    >
      <Monitor :size="16" />
      <span>{{ $t('pomodoro.desktopFab') }}</span>
    </button>

    <div class="noise-section">
      <button class="noise-toggle-btn" @click="showNoisePanel = !showNoisePanel">
        <Volume2 :size="16" />
        <span>{{ $t('pomodoro.whiteNoise') }}</span>
        <ChevronDown :size="14" class="chevron" :class="{ open: showNoisePanel }" />
      </button>

      <Transition name="collapse">
        <div v-if="showNoisePanel" class="noise-panel">
          <div class="noise-list">
            <button
              v-for="noise in pomodoroStore.whiteNoiseTypes"
              :key="noise.id"
              class="noise-item"
              :class="{ active: pomodoroStore.currentNoise === noise.id }"
              @click="pomodoroStore.toggleWhiteNoise(noise.id)"
            >
              <component :is="noiseIcons[noise.id]" :size="16" />
              <span>{{ $t('pomodoro.noise_' + noise.id) }}</span>
            </button>
          </div>
          <div class="noise-volume" v-if="pomodoroStore.isNoisePlaying">
            <VolumeX :size="14" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              :value="pomodoroStore.noiseVolume"
              @input="pomodoroStore.setNoiseVolume(parseFloat($event.target.value))"
              class="volume-slider"
            />
            <Volume2 :size="14" />
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTaskStore } from '../stores/taskStore'
import { useSettingsStore } from '../stores/settingsStore'
import { usePomodoroStore } from '../stores/pomodoroStore'
import FlipCard from './FlipCard.vue'
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Edit3,
  Maximize2,
  Monitor,
  Target,
  Coffee,
  Moon,
  Volume2,
  VolumeX,
  ChevronDown,
  Waves,
  Wind,
  Mountain,
  CloudRain,
  Coffee as CoffeeIcon
} from '@lucide/vue'

const taskStore = useTaskStore()
const settingsStore = useSettingsStore()
const pomodoroStore = usePomodoroStore()
const router = useRouter()

const isElectron = typeof window !== 'undefined' && !!window.electronAPI
const showNoisePanel = ref(false)

const handleSkip = () => {
  if (!pomodoroStore.canSkip) return
  pomodoroStore.skipTimer()
}

const modeIcons = {
  work: Target,
  shortBreak: Coffee,
  longBreak: Moon
}

const noiseIcons = {
  white: Waves,
  pink: Wind,
  brown: Mountain,
  rain: CloudRain,
  cafe: CoffeeIcon
}

const circumference = 2 * Math.PI * 88

const progressOffset = computed(() => {
  const progress = pomodoroStore.timeLeft / pomodoroStore.totalTime
  return circumference * (1 - progress)
})

const formattedMinutes = computed(() => {
  const minutes = Math.floor(pomodoroStore.timeLeft / 60)
  return String(minutes).padStart(2, '0')
})

const formattedSeconds = computed(() => {
  const seconds = pomodoroStore.timeLeft % 60
  return String(seconds).padStart(2, '0')
})

const isDotFilled = (i) => {
  const total = settingsStore.pomodoroSessionsBeforeLongBreak
  const inCycle = pomodoroStore.completedPomodoros % total
  if (inCycle === 0 && pomodoroStore.completedPomodoros > 0) return true
  return i <= inCycle
}

const openFullscreen = () => {
  if (window.electronAPI?.openPomodoroFullscreen) {
    window.electronAPI.openPomodoroFullscreen()
  } else {
    router.push('/pomodoro-fullscreen')
  }
}

onMounted(() => {
  pomodoroStore.requestNotificationPermission()
  pomodoroStore.setupWatchers(watch)
})
</script>

<style scoped>
.pomodoro-timer {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 32px 36px;
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border-light);
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.03),
    0 8px 32px rgba(0, 0, 0, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  transition:
    background var(--transition-fluid),
    border-color var(--transition-smooth),
    box-shadow var(--transition-smooth);
  min-width: 0;
  width: 100%;
  max-width: 440px;
  box-sizing: border-box;
  overflow: hidden;
}

.timer-decoration {
  position: absolute;
  left: 0;
  right: 0;
  height: 150px;
  pointer-events: none;
  opacity: 0.4;
}

.decoration-top {
  top: -75px;
  background: radial-gradient(
    ellipse at top center,
    var(--color-primary-light) 0%,
    transparent 70%
  );
}

.decoration-bottom {
  bottom: -75px;
  background: radial-gradient(
    ellipse at bottom center,
    var(--color-primary-light) 0%,
    transparent 70%
  );
}

.mode-tabs {
  display: flex;
  gap: 2px;
  margin-bottom: 36px;
  padding: 4px;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-full);
  position: relative;
  width: 100%;
  max-width: 340px;
  min-width: 0;
  flex-wrap: nowrap;
  z-index: 1;
}

.mode-tab {
  position: relative;
  z-index: 1;
  padding: 10px 16px;
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
  font-weight: 500;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition:
    color var(--transition-smooth),
    background var(--transition-smooth),
    transform var(--transition-spring-soft),
    box-shadow var(--transition-smooth);
  font-family: var(--font-body);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  min-height: 48px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mode-tab:hover {
  color: var(--color-text-primary);
}

.mode-tab.active {
  color: var(--color-text-primary);
  background: var(--color-surface);
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.08),
    0 1px 2px rgba(0, 0, 0, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transform: scale(1.04);
}

.pomodoro-timer.mode-work .mode-tab.active {
  color: #ef4444;
}

.pomodoro-timer.mode-shortBreak .mode-tab.active {
  color: #22c55e;
}

.pomodoro-timer.mode-longBreak .mode-tab.active {
  color: #06b6d4;
}

.timer-container {
  position: relative;
  width: 280px;
  height: 280px;
  margin-bottom: 32px;
  flex-shrink: 0;
  z-index: 1;
}

.progress-ring-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
}

.ring-glow-outer {
  position: absolute;
  inset: -30px;
  border-radius: 50%;
  opacity: 0;
  transition: opacity var(--duration-slow) var(--ease-out-quart);
  pointer-events: none;
}

.pomodoro-timer.is-running .ring-glow-outer {
  opacity: 0.5;
  animation: glowPulse 4s ease-in-out infinite;
}

@keyframes glowPulse {
  0%,
  100% {
    opacity: 0.3;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.05);
  }
}

.progress-ring {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.progress-ring-bg {
  stroke: var(--color-border-light);
  stroke-width: 6;
  opacity: 0.4;
}

.progress-ring-fill {
  transition:
    stroke-dashoffset 0.8s var(--ease-out-expo),
    stroke 0.4s var(--ease-out-quart);
  stroke-width: 6;
  stroke-linecap: round;
}

.progress-ring-inner {
  opacity: 0.4;
}

.glow-effect {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 85%;
  height: 85%;
  border-radius: 50%;
  opacity: 0.15;
  transition:
    opacity var(--duration-slow) var(--ease-out-quart),
    filter var(--transition-smooth);
  filter: blur(30px);
  pointer-events: none;
}

.glow-effect-inner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  border-radius: 50%;
  opacity: 0.4;
  transition: opacity var(--duration-slow) var(--ease-out-quart);
  pointer-events: none;
}

.pomodoro-timer.is-paused .glow-effect {
  opacity: 0.08;
  filter: blur(25px);
}

.pomodoro-timer.is-running.mode-work .glow-effect {
  animation: glowBreathingWork 4s var(--ease-in-out-quart) infinite;
}

.pomodoro-timer.is-running.mode-shortBreak .glow-effect {
  animation: glowBreathingBreak 4.5s var(--ease-in-out-quart) infinite;
}

.pomodoro-timer.is-running.mode-longBreak .glow-effect {
  animation: glowBreathingBreak 5s var(--ease-in-out-quart) infinite;
}

@keyframes glowBreathingWork {
  0%,
  100% {
    opacity: 0.2;
    filter: blur(28px);
  }
  50% {
    opacity: 0.35;
    filter: blur(35px);
  }
}

@keyframes glowBreathingBreak {
  0%,
  100% {
    opacity: 0.15;
    filter: blur(25px);
  }
  50% {
    opacity: 0.28;
    filter: blur(32px);
  }
}

.timer-display {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  width: 100%;
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

.time-unit {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.time-separator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-top: -8px;
}

.time-separator .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-text-primary);
  opacity: 0.7;
  animation: separatorPulse 1s ease-in-out infinite;
}

.time-separator .dot:nth-child(2) {
  animation-delay: 0.5s;
}

@keyframes separatorPulse {
  0%,
  100% {
    opacity: 0.8;
    transform: scale(1);
  }
  50% {
    opacity: 0.3;
    transform: scale(0.8);
  }
}

.mode-label {
  display: block;
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  font-weight: 600;
  letter-spacing: 2px;
  text-transform: uppercase;
  transition: color var(--transition-fluid);
}

.mode-fade-enter-active {
  transition: opacity var(--duration-normal) var(--ease-out-quart);
}
.mode-fade-leave-active {
  transition: opacity var(--duration-fast) var(--ease-standard);
}
.mode-fade-enter-from,
.mode-fade-leave-to {
  opacity: 0;
}

.custom-duration-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
  font-family: var(--font-body);
  cursor: pointer;
  border-radius: var(--radius-full);
  transition:
    background var(--transition-smooth),
    color var(--transition-smooth);
  margin-bottom: 20px;
}

.custom-duration-toggle:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
}

.custom-duration {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding: 16px 20px;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  width: 100%;
  max-width: 220px;
}

.custom-row {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.custom-input {
  width: 80px;
  padding: 8px 12px;
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-body);
  text-align: center;
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-family: var(--font-mono, var(--font-body));
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
}

.custom-input:focus {
  outline: none;
  box-shadow: inset 0 0 0 2px var(--color-primary);
}

.custom-actions {
  display: flex;
  gap: 12px;
}

.custom-btn {
  padding: 6px 20px;
  border: none;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-family: var(--font-body);
  font-weight: 500;
  cursor: pointer;
  transition:
    background var(--transition-smooth),
    color var(--transition-smooth),
    opacity var(--transition-smooth),
    transform var(--transition-micro);
}

.custom-btn.cancel {
  background: transparent;
  color: var(--color-text-secondary);
}

.custom-btn.cancel:hover {
  background: var(--color-border-light);
}

.custom-btn.confirm {
  background: var(--color-primary);
  color: white;
}

.custom-btn.confirm:hover {
  opacity: 0.9;
}

.current-task {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 24px;
  padding: 12px 20px;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  max-width: 100%;
  transition:
    background var(--transition-smooth),
    transform var(--transition-smooth);
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
}

.current-task.no-task {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
}

.task-icon {
  color: var(--color-text-secondary);
  flex-shrink: 0;
  opacity: 0.6;
}

.pomodoro-timer.mode-work .task-icon {
  color: #ef4444;
  opacity: 1;
}

.task-title {
  font-size: var(--font-size-body);
  color: var(--color-text-primary);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 240px;
  min-width: 0;
  flex: 1;
}

.pomodoro-count {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 36px;
}

.count-dots {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 15px;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-full);
  transition: background var(--transition-smooth);
}

.count-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-border-light);
  transition:
    transform var(--transition-spring-soft),
    background-color var(--transition-smooth),
    box-shadow var(--transition-smooth);
}

.count-dot.filled {
  transform: scale(1.4);
}

.count-text {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  margin-left: 4px;
  letter-spacing: 0.3px;
}

.count-number {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text-secondary);
  font-family: var(--font-mono, var(--font-body));
  font-variant-numeric: tabular-nums;
  transition: color var(--transition-smooth);
}

.count-label {
  font-size: var(--font-size-2xs);
  color: var(--color-text-tertiary);
  font-weight: 500;
}

.controls {
  display: flex;
  align-items: center;
  gap: 28px;
  margin-bottom: 24px;
  min-width: 0;
  flex-wrap: nowrap;
}

.control-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition:
    background var(--transition-smooth),
    color var(--transition-smooth),
    transform var(--transition-spring-soft),
    box-shadow var(--transition-smooth),
    opacity var(--transition-smooth);
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
}

.control-btn.reset-btn,
.control-btn.reset-btn-secondary {
  width: 56px;
  height: 56px;
  min-width: 44px;
  min-height: 44px;
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
}

.control-btn.reset-btn:hover,
.control-btn.reset-btn-secondary:hover {
  background: var(--color-border-light);
  color: var(--color-text-primary);
  transform: translateY(-2px);
}

.control-btn.reset-btn:active,
.control-btn.reset-btn-secondary:active {
  transform: translateY(0) scale(0.92);
}

.control-btn.reset-btn-secondary.disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.control-btn.reset-btn-secondary.disabled:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  transform: none;
}

.control-btn.skip-btn {
  width: 56px;
  height: 56px;
  min-width: 44px;
  min-height: 44px;
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
}

.control-btn.skip-btn:hover {
  background: var(--color-border-light);
  color: var(--color-text-primary);
  transform: translateY(-2px);
}

.control-btn.skip-btn:active {
  transform: translateY(0) scale(0.92);
}

.control-btn.skip-btn.disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.control-btn.skip-btn.disabled:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  transform: none;
}

.control-btn.primary-btn {
  width: 80px;
  height: 80px;
  background: #ef4444;
  color: white;
  box-shadow: 0 8px 24px rgba(239, 68, 68, 0.35);
  transition:
    background var(--transition-fluid),
    transform var(--transition-spring-soft),
    box-shadow var(--transition-fluid);
}

.pomodoro-timer.mode-shortBreak .control-btn.primary-btn {
  background: #22c55e;
  box-shadow: 0 8px 24px rgba(34, 197, 94, 0.35);
}

.pomodoro-timer.mode-longBreak .control-btn.primary-btn {
  background: #06b6d4;
  box-shadow: 0 8px 24px rgba(6, 182, 212, 0.35);
}

.control-btn.primary-btn:hover:not(.running) {
  transform: translateY(-4px) scale(1.08);
  box-shadow: 0 14px 36px rgba(239, 68, 68, 0.45);
}

.pomodoro-timer.mode-shortBreak .control-btn.primary-btn:hover:not(.running) {
  box-shadow: 0 14px 36px rgba(34, 197, 94, 0.45);
}

.pomodoro-timer.mode-longBreak .control-btn.primary-btn:hover:not(.running) {
  box-shadow: 0 14px 36px rgba(6, 182, 212, 0.45);
}

.control-btn.primary-btn:active {
  transform: scale(0.92);
}

.control-btn.primary-btn.running {
  animation: btnPulse 3s var(--ease-in-out-quart) infinite;
}

@keyframes btnPulse {
  0%,
  100% {
    box-shadow: 0 8px 24px rgba(239, 68, 68, 0.35);
  }
  50% {
    box-shadow: 0 8px 40px rgba(239, 68, 68, 0.55);
  }
}

.fullscreen-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border: none;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
  font-family: var(--font-body);
  font-weight: 500;
  cursor: pointer;
  transition:
    background var(--transition-smooth),
    color var(--transition-smooth);
  margin-top: 4px;
}

.fullscreen-btn:hover {
  color: var(--color-text-secondary);
  background: var(--color-bg-secondary);
}

.fab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border: none;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
  font-family: var(--font-body);
  font-weight: 500;
  cursor: pointer;
  transition:
    background var(--transition-smooth),
    color var(--transition-smooth);
  margin-top: 4px;
}

.fab-btn:hover {
  color: var(--color-text-secondary);
  background: var(--color-bg-secondary);
}

.noise-section {
  width: 100%;
  max-width: 340px;
  margin-top: 20px;
}

.noise-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 12px 18px;
  border: none;
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: 500;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition:
    background var(--transition-smooth),
    color var(--transition-smooth);
}

.noise-toggle-btn:hover {
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.noise-toggle-btn .chevron {
  transition: transform var(--transition-smooth);
}

.noise-toggle-btn .chevron.open {
  transform: rotate(180deg);
}

.noise-panel {
  margin-top: 14px;
  padding: 18px;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
}

.noise-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.noise-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: none;
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: 500;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition:
    background var(--transition-smooth),
    color var(--transition-smooth),
    transform var(--transition-smooth);
}

.noise-item:hover {
  background: var(--color-bg-tertiary);
  transform: translateY(-1px);
}

.noise-item.active {
  background: var(--color-primary-surface);
  color: var(--color-primary);
}

.noise-volume {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--color-border-light);
}

.volume-slider {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--color-bg-tertiary);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  background: var(--color-primary);
  border-radius: 50%;
  cursor: pointer;
  transition: transform var(--transition-smooth);
}

.volume-slider::-webkit-slider-thumb:hover {
  transform: scale(1.3);
}

.volume-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: var(--color-primary);
  border: none;
  border-radius: 50%;
  cursor: pointer;
}

.collapse-enter-active,
.collapse-leave-active {
  transition: all var(--transition-smooth);
  overflow: hidden;
}

.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
  margin-top: 0;
}

.collapse-enter-to,
.collapse-leave-from {
  opacity: 1;
  max-height: 300px;
}

@media (max-width: 768px) {
  .pomodoro-timer {
    padding: 24px 18px 28px;
    border-radius: var(--radius-lg);
  }

  .mode-tabs {
    margin-bottom: 28px;
    max-width: 100%;
  }

  .mode-tab {
    padding: 8px 12px;
    font-size: var(--font-size-xs);
    min-height: 48px;
    gap: 6px;
  }

  .mode-tab span {
    display: none;
  }

  .timer-container {
    width: 220px;
    height: 220px;
    margin-bottom: 28px;
  }

  .glow-effect {
    filter: blur(25px);
  }

  .mode-label {
    font-size: var(--font-size-2xs);
    letter-spacing: 1.5px;
  }

  .custom-duration {
    max-width: 100%;
    padding: 14px 16px;
  }

  .current-task {
    padding: 12px 16px;
    margin-bottom: 20px;
  }

  .task-title {
    max-width: none;
    font-size: var(--font-size-sm);
  }

  .pomodoro-count {
    margin-bottom: 28px;
    gap: 10px;
  }

  .count-dots {
    padding: 7px 13px;
    gap: 7px;
  }

  .count-dot {
    width: 7px;
    height: 7px;
  }

  .count-text {
    margin-left: 2px;
  }

  .count-number {
    font-size: var(--font-size-sm);
  }

  .count-label {
    font-size: var(--font-size-3xs);
  }

  .controls {
    gap: 24px;
    margin-bottom: 20px;
  }

  .control-btn.reset-btn,
  .control-btn.reset-btn-secondary {
    width: 52px;
    height: 52px;
  }

  .control-btn.primary-btn {
    width: 72px;
    height: 72px;
  }

  .fullscreen-btn,
  .fab-btn {
    padding: 12px 16px;
    min-height: 44px;
  }
}

@media (max-width: 380px) {
  .pomodoro-timer {
    padding: 20px 14px 24px;
    max-width: 340px;
  }

  .mode-tabs {
    margin-bottom: 20px;
    padding: 3px;
  }

  .mode-tab {
    padding: 10px 8px;
    font-size: var(--font-size-2xs);
    min-height: 44px;
  }

  .mode-tab span {
    display: none;
  }

  .timer-container {
    width: 190px;
    height: 190px;
    margin-bottom: 20px;
  }

  .mode-label {
    font-size: var(--font-size-3xs);
    letter-spacing: 1px;
  }

  .current-task {
    padding: 10px 14px;
    margin-bottom: 16px;
  }

  .task-title {
    font-size: var(--font-size-xs);
  }

  .pomodoro-count {
    margin-bottom: 20px;
    gap: 8px;
  }

  .count-dots {
    padding: 6px 11px;
    gap: 6px;
  }

  .count-dot {
    width: 6px;
    height: 6px;
  }

  .count-number {
    font-size: var(--font-size-xs);
  }

  .count-label {
    font-size: 9px;
  }

  .controls {
    gap: 16px;
    margin-bottom: 16px;
  }

  .control-btn.reset-btn,
  .control-btn.reset-btn-secondary {
    width: 48px;
    height: 48px;
    min-width: 44px;
    min-height: 44px;
  }

  .control-btn.primary-btn {
    width: 60px;
    height: 60px;
    min-width: 60px;
    min-height: 60px;
  }

  .fullscreen-btn,
  .fab-btn {
    padding: 10px 14px;
    font-size: var(--font-size-2xs);
    min-height: 44px;
  }
}

@media (max-height: 568px) {
  .pomodoro-timer {
    padding: 16px 14px 20px;
  }

  .mode-tabs {
    margin-bottom: 18px;
  }

  .timer-container {
    width: 160px;
    height: 160px;
    margin-bottom: 18px;
  }

  .mode-label {
    font-size: var(--font-size-3xs);
  }

  .current-task {
    padding: 8px 12px;
    margin-bottom: 12px;
  }

  .task-title {
    font-size: var(--font-size-xs);
  }

  .pomodoro-count {
    margin-bottom: 18px;
  }

  .controls {
    gap: 14px;
    margin-bottom: 14px;
  }

  .control-btn.reset-btn,
  .control-btn.reset-btn-secondary {
    width: 44px;
    height: 44px;
  }

  .control-btn.primary-btn {
    width: 56px;
    height: 56px;
  }

  .fullscreen-btn,
  .fab-btn {
    padding: 8px 12px;
    font-size: var(--font-size-2xs);
  }
}

@media (prefers-reduced-motion: reduce) {
  .progress-ring-fill,
  .glow-effect,
  .mode-label,
  .count-dot,
  .control-btn,
  .mode-tab {
    transition-duration: 0.01ms !important;
  }

  .pomodoro-timer.is-running .glow-effect,
  .control-btn.primary-btn.running,
  .time-separator .dot {
    animation: none !important;
  }
}
</style>
