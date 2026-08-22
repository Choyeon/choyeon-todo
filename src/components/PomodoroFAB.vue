<template>
  <div
    v-if="!hidden"
    class="pomodoro-fab-root"
    ref="rootEl"
    :style="rootStyle"
    role="region"
    aria-label="番茄钟浮动控制"
  >
    <!-- 主 FAB 按钮：可拖拽 + 可点击 -->
    <button
      class="pfab-btn"
      ref="btnEl"
      :aria-label="`番茄钟 ${currentModeLabel} ${formattedTime}`"
      :title="`${currentModeLabel} ${formattedTime}`"
      @click="onFabClick"
      @keydown.enter.prevent="onFabClick"
      @keydown.space.prevent="onFabClick"
      @mousedown.prevent="startDrag($event, 'mouse')"
      @touchstart.prevent="startDrag($event, 'touch')"
    >
      <svg class="pfab-svg" viewBox="0 0 100 100" aria-hidden="true">
        <!-- 进度弧背景 -->
        <circle cx="50" cy="50" r="44" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)" stroke-width="4" />
        <!-- 进度弧 -->
        <path
          d=""
          :d="progressPath"
          fill="none"
          :stroke="currentColor"
          stroke-width="6"
          stroke-linecap="round"
        />
      </svg>
      <div class="pfab-inner" :style="{ color: currentColor }">
        <div class="pfab-time">{{ formattedTime }}</div>
        <div class="pfab-status">{{ currentModeLabel }}</div>
        <div v-if="currentTask" class="pfab-task" :title="currentTask.title">
          #{{ currentTask.title.slice(0, 8) }}
        </div>
      </div>
      <!-- 模式设置（gear）按钮 -->
      <button
        class="pfab-gear"
        type="button"
        aria-label="打开模式设置"
        title="模式设置"
        @click.stop="showPanel = showPanel === 'settings' ? null : 'settings'"
        @keydown.enter.prevent.stop="showPanel = showPanel === 'settings' ? null : 'settings'"
        @keydown.space.prevent.stop="showPanel = showPanel === 'settings' ? null : 'settings'"
      >
        <component :is="SettingsIcon" :size="14" />
      </button>
    </button>

    <!-- 迷你面板（点击主按钮打开） -->
    <div
      v-if="showPanel === 'mini'"
      class="pfab-panel pfab-panel-mini"
      role="dialog"
      aria-modal="true"
      aria-label="番茄钟迷你面板"
      @click.stop
      @keydown.esc="showPanel = null"
      tabindex="-1"
    >
      <div class="pfab-panel-header">
        <strong>{{ currentModeLabel }} · {{ formattedTime }}</strong>
        <button class="pfab-close" type="button" aria-label="关闭" @click="showPanel = null">×</button>
      </div>
      <div class="pfab-panel-actions">
        <button type="button" class="pfab-action" :aria-label="isRunning ? '暂停番茄钟' : '开始番茄钟'" @click="onToggleTimer">
          {{ isRunning ? '暂停' : '开始' }}
        </button>
        <button type="button" class="pfab-action" aria-label="跳过当前阶段" :disabled="!canSkip" @click="onSkipStage">
          跳过
        </button>
        <button type="button" class="pfab-action" aria-label="前往专注页面" @click="gotoPomodoro">专注页面</button>
      </div>
      <div v-if="currentTaskId" class="pfab-task-line">
        <span>绑定：{{ currentTask ? currentTask.title.slice(0, 16) : currentTaskId }}</span>
        <button type="button" class="pfab-link" aria-label="解绑当前任务" @click="onUnbindTask">解绑</button>
      </div>
      <button
        v-if="!currentTaskId"
        type="button"
        class="pfab-link pfab-link-full"
        aria-label="绑定当前任务到番茄钟"
        @click="$emit('bindTask')"
      >
        绑定当前任务
      </button>
    </div>

    <!-- 设置面板：模式选择 + 时长调整 -->
    <div
      v-if="showPanel === 'settings'"
      class="pfab-panel pfab-panel-settings"
      role="dialog"
      aria-modal="true"
      aria-label="番茄钟模式设置"
      @click.stop
      @keydown.esc="showPanel = null"
      tabindex="-1"
    >
      <div class="pfab-panel-header">
        <strong>模式与时长</strong>
        <button class="pfab-close" type="button" aria-label="关闭" @click="showPanel = null">×</button>
      </div>

      <div class="pfab-modes">
        <button
          v-for="m in modeOptions"
          :key="m.value"
          type="button"
          class="pfab-mode"
          :class="{ active: selectedMode === m.value }"
          :aria-pressed="selectedMode === m.value"
          @click="selectedMode = m.value"
        >
          {{ m.label }}
        </button>
        <button
          type="button"
          class="pfab-mode"
          :class="{ active: selectedMode === 'aiAdaptive' }"
          :aria-pressed="selectedMode === 'aiAdaptive'"
          title="根据最近干扰率自动调整 work 时长"
          @click="selectedMode = 'aiAdaptive'"
        >
          AI
        </button>
      </div>

      <div v-if="selectedMode !== 'aiAdaptive'" class="pfab-duration">
        <span class="pfab-dur-label">{{ currentModeDurationLabel }}</span>
        <div class="pfab-dur-ctrl">
          <button
            type="button"
            class="pfab-dur-btn"
            aria-label="减少 1 分钟"
            @click="adjustDuration(-1)"
            @keydown.enter.prevent="adjustDuration(-1)"
          >
            −
          </button>
          <input
            type="number"
            name="pomodoroDuration"
            class="pfab-dur-input"
            :value="modeDurations[selectedMode]"
            min="1"
            max="180"
            :aria-label="`${currentModeDurationLabel} 分钟`"
            @change="setModeDuration(Number($event.target.value))"
          />
          <button
            type="button"
            class="pfab-dur-btn"
            aria-label="增加 1 分钟"
            @click="adjustDuration(1)"
            @keydown.enter.prevent="adjustDuration(1)"
          >
            +
          </button>
        </div>
      </div>
      <div v-else class="pfab-ai">
        <div class="pfab-ai-row">
          <span>最近 7 天干扰率：</span>
          <strong>{{ aiRate }}%</strong>
        </div>
        <div class="pfab-ai-row">
          <span>AI 建议 work 时长：</span>
          <strong>{{ aiSuggested }} 分钟</strong>
        </div>
        <button type="button" class="pfab-action pfab-action-full" @click="applyAI">
          应用 AI 自适应
        </button>
      </div>

      <div class="pfab-panel-actions">
        <button type="button" class="pfab-action" @click="applyModeSwitch">应用切换</button>
        <button type="button" class="pfab-action" @click="showPanel = null">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch, h } from 'vue'
import { usePomodoroStore } from '../stores/pomodoroStore'
import { useTaskStore } from '../stores/taskStore'
import { useRouter } from 'vue-router'
import * as LucideIcons from '@lucide/vue'
// 兼容命名差异：优先用 Settings，否则回退到简化 svg
const SettingsIcon = LucideIcons.Settings
  ? LucideIcons.Settings
  : {
      name: 'SettingsFallback',
      render() {
        return h(
          'svg',
          {
            width: 14,
            height: 14,
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            'stroke-width': 2,
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round'
          },
          [
            h('circle', { cx: 12, cy: 12, r: 3 }),
            h('path', {
              d: 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z'
            })
          ]
        )
      }
    }

const props = defineProps({
  hidden: { type: Boolean, default: false },
  // 初始位置偏移（从右下）
  marginRight: { type: Number, default: 24 },
  marginBottom: { type: Number, default: 96 },
  // 是否允许通过 Electron 走 FAB 专用窗口（在 Web 模式下忽略）
  preferSeparateWindow: { type: Boolean, default: false }
})

const emit = defineEmits(['bindTask', 'change'])

const pomodoroStore = usePomodoroStore()
const taskStore = useTaskStore()
const router = useRouter()

const rootEl = ref(null)
const btnEl = ref(null)
const showPanel = ref(null) // null | 'mini' | 'settings'

const pos = reactive({ x: 0, y: 0, placed: false })

const ensurePlaced = () => {
  if (pos.placed) return
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768
  const size = 96
  pos.x = Math.max(0, vw - size - props.marginRight)
  pos.y = Math.max(0, vh - size - props.marginBottom)
  pos.placed = true
}

const rootStyle = computed(() => {
  ensurePlaced()
  return {
    left: `${pos.x}px`,
    top: `${pos.y}px`,
    zIndex: 9999
  }
})

// ===== Store 投影 =====
const currentMode = computed(() => pomodoroStore.currentMode)
const currentModeLabel = computed(() => pomodoroStore.currentModeLabel)
const formattedTime = computed(() => pomodoroStore.formattedTime)
const totalTime = computed(() => pomodoroStore.totalTime || 1)
const timeLeft = computed(() => Math.max(0, pomodoroStore.timeLeft || 0))
const isRunning = computed(() => pomodoroStore.isRunning)
const canSkip = computed(() => pomodoroStore.canSkip)
const currentColor = computed(() => pomodoroStore.currentColor || '#EF4444')
const modeDurations = computed(() => pomodoroStore.modeDurations || {})
const currentTaskId = computed(() => pomodoroStore.currentTaskId || taskStore.focusedTaskId || null)
const currentTask = computed(() => {
  const id = currentTaskId.value
  if (!id || !taskStore.tasks) return null
  return taskStore.tasks.find((t) => t.id === id) || null
})

const progressPath = computed(() => {
  const pct = totalTime.value > 0 ? 1 - timeLeft.value / totalTime.value : 0
  const clamped = Math.max(0, Math.min(1, pct))
  if (clamped <= 0) return ''
  const cx = 50,
    cy = 50,
    r = 44
  const a0 = -Math.PI / 2
  const a1 = a0 + clamped * Math.PI * 2
  const x0 = cx + r * Math.cos(a0)
  const y0 = cy + r * Math.sin(a0)
  const x1 = cx + r * Math.cos(a1)
  const y1 = cy + r * Math.sin(a1)
  const large = clamped > 0.5 ? 1 : 0
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`
})

// ===== 模式选择器 =====
const modeOptions = [
  { value: 'work', label: '专注' },
  { value: 'shortBreak', label: '短休' },
  { value: 'longBreak', label: '长休' },
  { value: 'custom', label: '自定义' }
]
const selectedMode = ref('work')

watch(currentMode, (m) => {
  if (m) selectedMode.value = m
})

const currentModeDurationLabel = computed(() => {
  const m = selectedMode.value
  if (m === 'work') return '专注时长'
  if (m === 'shortBreak') return '短休时长'
  if (m === 'longBreak') return '长休时长'
  return '自定义时长'
})

const adjustDuration = (delta) => {
  const m = selectedMode.value
  if (m === 'custom') {
    pomodoroStore.customMinutes = Math.max(
      1,
      Math.min(180, (pomodoroStore.customMinutes || 1) + delta)
    )
    return
  }
  if (!['work', 'shortBreak', 'longBreak'].includes(m)) return
  const cur = modeDurations.value[m] || 25
  pomodoroStore.setDuration(m, cur + delta)
}

const setModeDuration = (val) => {
  const m = selectedMode.value
  if (m === 'custom') {
    pomodoroStore.customMinutes = Math.max(1, Math.min(180, Math.floor(val || 1)))
    return
  }
  if (!['work', 'shortBreak', 'longBreak'].includes(m)) return
  pomodoroStore.setDuration(m, val)
}

const applyModeSwitch = () => {
  const m = selectedMode.value
  if (m === 'aiAdaptive') return // AI 单独处理
  if (m === 'custom') {
    pomodoroStore.isCustomEditing = true
    pomodoroStore.applyCustomDuration && pomodoroStore.applyCustomDuration()
    return
  }
  if (['work', 'shortBreak', 'longBreak'].includes(m)) {
    pomodoroStore.switchMode(m)
  }
  showPanel.value = null
}

// ===== AI 自适应 =====
const aiSummary = computed(() => pomodoroStore.getFocusSummary('last7'))
const aiRate = computed(() => {
  const r = aiSummary.value.distractionRate
  return Math.round(Number(r || 0) * 100)
})
const aiSuggested = computed(() => {
  return typeof pomodoroStore.computeAIAdaptiveDuration === 'function'
    ? pomodoroStore.computeAIAdaptiveDuration('last7')
    : 25
})
const applyAI = () => {
  pomodoroStore.applyAIAdaptiveDuration && pomodoroStore.applyAIAdaptiveDuration()
  showPanel.value = null
}

// ===== Actions =====
const onFabClick = (e) => {
  // 只有单击（不是拖拽后）才触发
  if (dragMoved) {
    dragMoved = false
    return
  }
  // Electron 模式下：若 preferSeparateWindow 则尝试打开独立窗口
  if (props.preferSeparateWindow) {
    try {
      if (window.electronAPI?.togglePomodoroFab) {
        window.electronAPI.togglePomodoroFab()
        return
      }
    } catch (e) {
      /* ignore */
    }
  }
  showPanel.value = showPanel.value === 'mini' ? null : 'mini'
  emit('change')
}

const onToggleTimer = () => {
  if (pomodoroStore.startPause && typeof pomodoroStore.startPause === 'function') {
    pomodoroStore.startPause()
  } else if (pomodoroStore.toggleTimer && typeof pomodoroStore.toggleTimer === 'function') {
    pomodoroStore.toggleTimer()
  }
  emit('change')
}
const onSkipStage = () => {
  if (pomodoroStore.skipStage && typeof pomodoroStore.skipStage === 'function') {
    pomodoroStore.skipStage()
  } else if (pomodoroStore.skipTimer && typeof pomodoroStore.skipTimer === 'function') {
    pomodoroStore.skipTimer()
  }
  emit('change')
}
const gotoPomodoro = () => {
  router.push('/pomodoro').catch(() => {})
  showPanel.value = null
}
const onUnbindTask = () => {
  pomodoroStore.unbindCurrentTask && pomodoroStore.unbindCurrentTask()
  emit('change')
}

// ===== 拖拽 =====
let dragData = null
let dragMoved = false
const DRAG_THRESHOLD = 4

const getPointer = (ev, mode) => {
  if (mode === 'touch' && ev.touches && ev.touches[0]) {
    return { x: ev.touches[0].clientX, y: ev.touches[0].clientY }
  }
  return { x: ev.clientX, y: ev.clientY }
}

const startDrag = (ev, mode) => {
  ensurePlaced()
  const p = getPointer(ev, mode)
  dragData = {
    mode,
    startX: p.x,
    startY: p.y,
    origX: pos.x,
    origY: pos.y
  }
  dragMoved = false
  if (mode === 'mouse') {
    window.addEventListener('mousemove', onDragMove)
    window.addEventListener('mouseup', onDragEnd, { once: true })
  } else {
    window.addEventListener('touchmove', onDragMove, { passive: false })
    window.addEventListener('touchend', onDragEnd, { once: true })
    window.addEventListener('touchcancel', onDragEnd, { once: true })
  }
}

const onDragMove = (ev) => {
  if (!dragData) return
  const mode = dragData.mode
  const p = getPointer(ev, mode)
  const dx = p.x - dragData.startX
  const dy = p.y - dragData.startY
  if (!dragMoved && Math.hypot(dx, dy) > DRAG_THRESHOLD) dragMoved = true
  if (!dragMoved) return
  if (ev.cancelable) ev.preventDefault()
  const vw = window.innerWidth
  const vh = window.innerHeight
  const btn = btnEl.value
  const w = btn ? btn.offsetWidth : 96
  const h = btn ? btn.offsetHeight : 96
  const nx = Math.max(0, Math.min(vw - w, dragData.origX + dx))
  const ny = Math.max(0, Math.min(vh - h, dragData.origY + dy))
  pos.x = nx
  pos.y = ny
}

const onDragEnd = () => {
  if (!dragData) return
  if (dragData.mode === 'mouse') {
    window.removeEventListener('mousemove', onDragMove)
  } else {
    window.removeEventListener('touchmove', onDragMove)
    window.removeEventListener('touchcancel', onDragEnd)
  }
  dragData = null
}

const onResize = () => {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const btn = btnEl.value
  const w = btn ? btn.offsetWidth : 96
  const h = btn ? btn.offsetHeight : 96
  pos.x = Math.max(0, Math.min(vw - w, pos.x))
  pos.y = Math.max(0, Math.min(vh - h, pos.y))
}

// 点击页面其他位置关闭面板
const onDocClick = (ev) => {
  if (!showPanel.value) return
  if (!rootEl.value) return
  if (!rootEl.value.contains(ev.target)) showPanel.value = null
}

onMounted(() => {
  ensurePlaced()
  window.addEventListener('resize', onResize)
  document.addEventListener('click', onDocClick, true)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  document.removeEventListener('click', onDocClick, true)
  if (dragData) {
    onDragEnd()
  }
})
</script>

<style scoped>
.pomodoro-fab-root {
  position: fixed;
  z-index: 9999;
}

.pfab-btn {
  position: relative;
  width: 96px;
  height: 96px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(17, 18, 22, 0.72);
  backdrop-filter: blur(14px) saturate(1.2);
  -webkit-backdrop-filter: blur(14px) saturate(1.2);
  cursor: grab;
  user-select: none;
  touch-action: none;
  padding: 0;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(255, 255, 255, 0.04) inset;
  color: #fff;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.pfab-btn:hover {
  transform: translateY(-1px) scale(1.02);
  box-shadow: 0 14px 38px rgba(0, 0, 0, 0.32), 0 0 0 1px rgba(255, 255, 255, 0.06) inset;
}

.pfab-btn:active {
  cursor: grabbing;
  transform: scale(0.98);
}

.pfab-btn:focus-visible {
  outline: 3px solid rgba(74, 144, 217, 0.8);
  outline-offset: 3px;
}

.pfab-svg {
  position: absolute;
  inset: 6px;
  width: calc(100% - 12px);
  height: calc(100% - 12px);
  pointer-events: none;
}

.pfab-inner {
  position: relative;
  z-index: 1;
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.pfab-time {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
}

.pfab-status {
  font-size: 11px;
  font-weight: 500;
  opacity: 0.9;
}

.pfab-task {
  font-size: 10px;
  opacity: 0.75;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pfab-gear {
  position: absolute;
  right: 4px;
  bottom: 4px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.pfab-gear:hover {
  background: rgba(255, 255, 255, 0.22);
}

.pfab-gear:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.5);
  outline-offset: 2px;
}

.pfab-panel {
  position: absolute;
  right: 0;
  bottom: 108px;
  min-width: 240px;
  background: rgba(20, 22, 28, 0.96);
  color: #fff;
  border-radius: 14px;
  padding: 12px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.06) inset;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  z-index: 10000;
  animation: pfabIn 0.16s ease-out;
}

@keyframes pfabIn {
  from {
    opacity: 0;
    transform: translateY(6px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.pfab-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 13px;
}

.pfab-close {
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.65);
  width: 24px;
  height: 24px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
}

.pfab-close:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.pfab-panel-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.pfab-action {
  border: none;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.pfab-action:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.16);
}

.pfab-action:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pfab-action-full {
  width: 100%;
}

.pfab-task-line {
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  opacity: 0.9;
}

.pfab-link {
  background: transparent;
  border: none;
  color: #8bb8ff;
  padding: 2px 6px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
}

.pfab-link:hover {
  background: rgba(139, 184, 255, 0.12);
}

.pfab-link-full {
  display: block;
  width: 100%;
  margin-top: 6px;
  text-align: left;
}

.pfab-modes {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
  margin: 8px 0 12px;
}

.pfab-mode {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 6px 4px;
  font-size: 12px;
  cursor: pointer;
}

.pfab-mode:hover {
  background: rgba(255, 255, 255, 0.1);
}

.pfab-mode.active {
  background: rgba(74, 144, 217, 0.28);
  border-color: rgba(74, 144, 217, 0.6);
  color: #fff;
}

.pfab-duration {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
  font-size: 13px;
}

.pfab-dur-label {
  opacity: 0.85;
}

.pfab-dur-ctrl {
  display: flex;
  align-items: center;
  gap: 4px;
}

.pfab-dur-btn {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: 16px;
  cursor: pointer;
}

.pfab-dur-btn:hover {
  background: rgba(255, 255, 255, 0.16);
}

.pfab-dur-btn:focus-visible {
  outline: 2px solid rgba(74, 144, 217, 0.8);
  outline-offset: 2px;
}

.pfab-dur-input {
  width: 58px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.25);
  color: #fff;
  text-align: center;
  font-size: 13px;
  -moz-appearance: textfield;
}

.pfab-dur-input::-webkit-outer-spin-button,
.pfab-dur-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.pfab-ai {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 12px;
  margin-bottom: 6px;
}

.pfab-ai-row {
  display: flex;
  justify-content: space-between;
  padding: 2px 0;
}

@media (max-width: 767px) {
  .pfab-btn {
    width: 84px;
    height: 84px;
  }
  .pfab-time {
    font-size: 16px;
  }
  .pfab-panel {
    min-width: 220px;
    bottom: 96px;
  }
}
</style>
