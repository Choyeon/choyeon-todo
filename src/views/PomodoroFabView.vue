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
      <div class="fab-bg"></div>
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
        <button class="fab-btn reset-btn" @click.stop="pomodoroStore.resetTimer()" :title="$t('pomodoro.reset')">
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
  -webkit-app-region: drag;
}

.pomodoro-fab {
  position: relative;
  width: 140px;
  height: 140px;
  border-radius: 50%;
  cursor: pointer;
  -webkit-app-region: no-drag;
}

.fab-bg {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(20, 20, 28, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;
}

.progress-ring {
  position: absolute;
  inset: 8px;
  width: calc(100% - 16px);
  height: calc(100% - 16px);
  transform: rotate(-90deg);
}

.progress-bg {
  fill: none;
  stroke: rgba(255, 255, 255, 0.1);
  stroke-width: 4;
}

.progress-fill {
  fill: none;
  stroke-width: 4;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.5s ease;
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
  gap: 4px;
  z-index: 2;
}

.time-text {
  font-size: 24px;
  font-weight: 600;
  color: #fff;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.mode-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1;
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
  min-width: 120px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  z-index: 100;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  color: #fff;
  font-size: 13px;
  transition: all 0.15s ease;
}

.menu-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.menu-item + .menu-item {
  margin-top: 2px;
}
</style>
