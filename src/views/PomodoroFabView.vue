<template>
  <div
    class="fab-wrapper"
    @contextmenu.prevent="showContextMenu = true"
    @click="showContextMenu = false"
  >
    <div
      class="pomodoro-fab"
      :class="[`mode-${pomodoroStore.currentMode}`, { running: pomodoroStore.isRunning }]"
    >
      <div class="fab-outer-glow"></div>
      <div class="fab-bg"></div>
      <div class="fab-inner-glow"></div>
      <svg class="progress-ring" viewBox="0 0 120 120">
        <circle class="progress-bg" cx="60" cy="60" r="52" />
        <circle
          class="progress-fill"
          cx="60"
          cy="60"
          r="52"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="progressOffset"
        />
      </svg>
      <div class="time-display" @click.stop="pomodoroStore.toggleTimer()">
        <span class="time-text">{{ pomodoroStore.formattedTime }}</span>
        <span class="mode-label">{{ $t('pomodoro.' + pomodoroStore.currentMode) }}</span>
      </div>
      <div class="fab-actions">
        <button
          class="fab-btn reset-btn"
          @click.stop="pomodoroStore.resetTimer()"
          :title="$t('pomodoro.reset')"
        >
          <RotateCcw :size="12" />
        </button>
      </div>
    </div>

    <div v-if="showContextMenu" class="context-menu" @click.stop>
      <div class="menu-item" @click="handleClose">
        <X :size="14" />
        <span>{{ $t('pomodoro.closeFab') }}</span>
      </div>
      <div class="menu-item" @click="handleTogglePause">
        <Play v-if="!pomodoroStore.isRunning" :size="14" />
        <Pause v-else :size="14" />
        <span>{{ pomodoroStore.isRunning ? $t('pomodoro.pause') : $t('pomodoro.resume') }}</span>
      </div>
      <div class="menu-item" @click="handleReset">
        <RotateCcw :size="14" />
        <span>{{ $t('pomodoro.reset') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { RotateCcw, X, Play, Pause } from '@lucide/vue'
import { usePomodoroStore } from '../stores/pomodoroStore'

const pomodoroStore = usePomodoroStore()
const showContextMenu = ref(false)

const circumference = 2 * Math.PI * 52

const progressOffset = computed(() => {
  const progress = 1 - pomodoroStore.timeLeft / pomodoroStore.totalTime
  return circumference * progress
})

const handleClose = () => {
  showContextMenu.value = false
  if (window.electronAPI?.closePomodoroFab) {
    try {
      window.electronAPI.closePomodoroFab()
    } catch (e) {
      console.warn('[Fab] Failed to close:', e)
    }
  }
}

const handleTogglePause = () => {
  showContextMenu.value = false
  pomodoroStore.toggleTimer()
}

const handleReset = () => {
  showContextMenu.value = false
  pomodoroStore.resetTimer()
}

onMounted(async () => {
  if (typeof document !== 'undefined') {
    document.documentElement.style.background = 'transparent'
    document.documentElement.style.backgroundColor = 'transparent'
    document.body.style.background = 'transparent'
    document.body.style.backgroundColor = 'transparent'
    document.body.style.margin = '0'
    document.body.style.padding = '0'
    document.body.style.overflow = 'hidden'
    const app = document.getElementById('app')
    if (app) {
      app.style.background = 'transparent'
      app.style.backgroundColor = 'transparent'
    }
    const containers = document.querySelectorAll('.app-container, .standalone-content')
    containers.forEach((el) => {
      el.style.background = 'transparent'
      el.style.backgroundColor = 'transparent'
    })
  }

  pomodoroStore.initElectronMode()
})

// 子窗口不清理主窗口的定时器
// cleanup() 仅在 store 销毁时调用
</script>

<style scoped>
.fab-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.pomodoro-fab {
  position: relative;
  width: 150px;
  height: 150px;
  border-radius: 50%;
  cursor: pointer;
  -webkit-app-region: drag;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.pomodoro-fab:hover {
  transform: scale(1.05);
}

.pomodoro-fab:active {
  transform: scale(0.98);
}

.fab-outer-glow {
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.5s ease;
  pointer-events: none;
}

.pomodoro-fab.running .fab-outer-glow {
  opacity: 0.5;
  animation: outerGlowPulse 3s ease-in-out infinite;
}

.pomodoro-fab.mode-work.running .fab-outer-glow {
  box-shadow: 0 0 30px rgba(239, 68, 68, 0.4);
}

.pomodoro-fab.mode-shortBreak.running .fab-outer-glow {
  box-shadow: 0 0 30px rgba(34, 197, 94, 0.4);
}

.pomodoro-fab.mode-longBreak.running .fab-outer-glow {
  box-shadow: 0 0 30px rgba(6, 182, 212, 0.4);
}

@keyframes outerGlowPulse {
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

.fab-bg {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(20, 20, 28, 0.9);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  box-shadow:
    0 10px 40px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.08) inset;
}

.fab-inner-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 70%;
  height: 70%;
  border-radius: 50%;
  opacity: 0.3;
  filter: blur(20px);
  pointer-events: none;
  transition: opacity 0.5s ease;
}

.pomodoro-fab.mode-work .fab-inner-glow {
  background: radial-gradient(circle, rgba(239, 68, 68, 0.3) 0%, transparent 70%);
}

.pomodoro-fab.mode-shortBreak .fab-inner-glow {
  background: radial-gradient(circle, rgba(34, 197, 94, 0.3) 0%, transparent 70%);
}

.pomodoro-fab.mode-longBreak .fab-inner-glow {
  background: radial-gradient(circle, rgba(6, 182, 212, 0.3) 0%, transparent 70%);
}

.pomodoro-fab.running .fab-inner-glow {
  opacity: 0.5;
  animation: innerGlowPulse 4s ease-in-out infinite;
}

@keyframes innerGlowPulse {
  0%,
  100% {
    opacity: 0.3;
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    opacity: 0.6;
    transform: translate(-50%, -50%) scale(1.1);
  }
}

.progress-ring {
  position: absolute;
  inset: 10px;
  width: calc(100% - 20px);
  height: calc(100% - 20px);
  transform: rotate(-90deg);
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.progress-bg {
  fill: none;
  stroke: rgba(255, 255, 255, 0.12);
  stroke-width: 4;
}

.progress-fill {
  fill: none;
  stroke-width: 4;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  filter: drop-shadow(0 0 4px currentColor);
}

.mode-work .progress-fill {
  stroke: #ef4444;
}

.mode-shortBreak .progress-fill {
  stroke: #22c55e;
}

.mode-longBreak .progress-fill {
  stroke: #06b6d4;
}

.time-display {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  z-index: 2;
  -webkit-app-region: no-drag;
}

.time-text {
  font-size: 28px;
  font-weight: 600;
  color: #fff;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  letter-spacing: 1px;
}

.mode-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 1.5px;
}

.fab-actions {
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.2s ease;
  z-index: 3;
}

.pomodoro-fab:hover .fab-actions {
  opacity: 1;
}

.fab-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: rgba(40, 40, 50, 0.9);
  color: #fff;
  backdrop-filter: blur(10px);
  transition: all 0.15s ease;
  -webkit-app-region: no-drag;
}

.fab-btn:hover {
  background: rgba(60, 60, 75, 0.95);
  transform: scale(1.1);
}

.reset-btn:hover {
  color: #9ca3af;
}

.skip-btn:hover {
  color: #22c55e;
}

.context-menu {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(20, 20, 28, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 12px;
  padding: 6px;
  min-width: 150px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  z-index: 100;
  -webkit-app-region: no-drag;
  white-space: nowrap;
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  color: #fff;
  font-size: var(--font-size-sm);
  transition: all 0.15s ease;
}

.menu-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.menu-item + .menu-item {
  margin-top: 2px;
}
</style>
