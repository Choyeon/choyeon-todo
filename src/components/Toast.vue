<template>
  <Teleport to="body">
    <Transition name="toast-fade">
      <div
        v-if="visible"
        role="alert"
        aria-live="polite"
        class="toast-wrapper"
        :class="[`toast--${variant}`, `toast--${position}`]"
        @mouseenter="onHoverEnter"
        @mouseleave="onHoverLeave"
      >
        <div class="toast-icon" v-if="iconHtml" v-html="iconHtml" />
        <div class="toast-body">
          <div v-if="title" class="toast-title">{{ title }}</div>
          <div v-if="message" class="toast-message">
            <span v-for="(seg, i) in messageSegments" :key="i" :class="seg.class">
              {{ seg.text }}
            </span>
          </div>
          <div v-if="actions && actions.length" class="toast-actions">
            <button
              v-for="act in actions"
              :key="act.action"
              type="button"
              class="toast-action-btn"
              :class="[`toast-action-btn--${act.variant || 'default'}`]"
              @click="onAction(act)"
            >
              {{ act.title }}
            </button>
          </div>
        </div>
        <button
          type="button"
          v-if="dismissible"
          class="toast-close"
          aria-label="Close"
          @click="close('dismiss')"
        >
          ×
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  // 受控显示，可选。为空则走 internalVisible
  modelValue: { type: Boolean, default: undefined },
  visible: { type: Boolean, default: false },
  title: { type: String, default: '' },
  message: { type: String, default: '' },
  variant: {
    type: String,
    default: 'default',
    validator: (v) => ['default', 'success', 'warning', 'danger', 'info'].includes(v)
  },
  position: {
    type: String,
    default: 'bottom-right',
    validator: (v) =>
      ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'top-center'].includes(v)
  },
  duration: { type: Number, default: 6000 }, // 0 = stay forever
  dismissible: { type: Boolean, default: true },
  iconHtml: { type: String, default: '' },
  actions: {
    type: Array,
    default: () => [],
    // { action:string, title:string, variant?:string, snoozeMinutes?:number }
    validator: (arr) => Array.isArray(arr)
  },
  // 任务元数据（不渲染，但用于回传 action）
  taskId: { type: String, default: null },
  pauseOnHover: { type: Boolean, default: true }
})

const emit = defineEmits([
  'update:modelValue',
  'update:visible',
  'close',
  'action',
  'dismiss'
])

const internalVisible = ref(!!(props.modelValue ?? props.visible))
const hovered = ref(false)
let timer = null
let remainingMs = Math.max(0, Number(props.duration) || 0)
let startedAt = 0

const derivedVisible = computed(() => {
  const ctrl = props.modelValue !== undefined ? props.modelValue : props.visible
  return ctrl !== undefined ? ctrl : internalVisible.value
})

const messageSegments = computed(() => {
  // 将 \n 与 markdown-like **粗体** 切分成段
  const parts = []
  const raw = props.message || ''
  const lines = raw.split('\n')
  lines.forEach((line, li) => {
    if (li > 0) parts.push({ text: '\n', class: 'toast-br' })
    const re = /\*\*([^*]+)\*\*/g
    let lastIdx = 0
    let m
    while ((m = re.exec(line)) !== null) {
      if (m.index > lastIdx) {
        parts.push({ text: line.slice(lastIdx, m.index), class: '' })
      }
      parts.push({ text: m[1], class: 'toast-bold' })
      lastIdx = re.lastIndex
    }
    if (lastIdx < line.length) {
      parts.push({ text: line.slice(lastIdx), class: '' })
    }
  })
  return parts
})

const clearTimer = () => {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

const startTimer = (overrideMs) => {
  clearTimer()
  const ms = typeof overrideMs === 'number' ? overrideMs : remainingMs
  if (!ms) return // 0 = infinite
  startedAt = Date.now()
  remainingMs = ms
  timer = setTimeout(() => {
    close('timeout')
  }, ms)
}

const open = (opts = {}) => {
  if (opts.duration !== undefined) remainingMs = Math.max(0, Number(opts.duration))
  internalVisible.value = true
  emit('update:visible', true)
  emit('update:modelValue', true)
  startTimer(remainingMs || undefined)
}

const close = (reason = 'dismiss') => {
  clearTimer()
  internalVisible.value = false
  emit('update:visible', false)
  emit('update:modelValue', false)
  emit('close', { reason, taskId: props.taskId })
  if (reason === 'dismiss') emit('dismiss', { taskId: props.taskId })
}

const onAction = (act) => {
  if (!act || !act.action) return
  emit('action', {
    taskId: props.taskId,
    action: act.action,
    snoozeMinutes:
      typeof act.snoozeMinutes === 'number' ? act.snoozeMinutes : null,
    raw: act
  })
  if (act.closeAfterAction !== false) close('action')
}

const onHoverEnter = () => {
  if (!props.pauseOnHover) return
  hovered.value = true
  if (timer) {
    const elapsed = Date.now() - startedAt
    remainingMs = Math.max(0, remainingMs - elapsed)
    clearTimer()
  }
}

const onHoverLeave = () => {
  if (!props.pauseOnHover) return
  hovered.value = false
  if (derivedVisible.value && remainingMs > 0) {
    startTimer()
  }
}

defineExpose({ open, close })

// 同步外部受控
watch(
  () => [props.modelValue, props.visible],
  ([mv, v]) => {
    const next = mv !== undefined ? mv : v
    if (next) {
      internalVisible.value = true
      if (props.duration > 0) startTimer(props.duration)
    } else {
      clearTimer()
      internalVisible.value = false
    }
  },
  { immediate: true }
)

// duration 变化重置
watch(
  () => props.duration,
  (d) => {
    remainingMs = Math.max(0, Number(d) || 0)
    if (derivedVisible.value && remainingMs > 0 && !hovered.value) {
      startTimer()
    }
  }
)

onBeforeUnmount(() => clearTimer())
</script>

<style scoped>
.toast-wrapper {
  position: fixed;
  z-index: 9999;
  max-width: 420px;
  min-width: 280px;
  padding: 12px 14px;
  border-radius: 12px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  color: var(--color-text-primary, #fff);
  background: var(--toast-bg, rgba(30, 32, 46, 0.96));
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  font-family: inherit;
  font-size: 14px;
  line-height: 1.4;
}
.toast--top-left { top: 24px; left: 24px; }
.toast--top-right { top: 24px; right: 24px; }
.toast--bottom-left { bottom: 24px; left: 24px; }
.toast--bottom-right { bottom: 24px; right: 24px; }
.toast--top-center { top: 24px; left: 50%; transform: translateX(-50%); }

.toast--success { background: var(--toast-success-bg, linear-gradient(135deg,#26a364,#1f8a55)); }
.toast--warning { background: var(--toast-warning-bg, linear-gradient(135deg,#d98a1e,#c77a14)); }
.toast--danger  { background: var(--toast-danger-bg,  linear-gradient(135deg,#c73e3e,#a83030)); }
.toast--info    { background: var(--toast-info-bg,    linear-gradient(135deg,#2d7bd1,#2469b5)); }

.toast-icon {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  line-height: 1;
  margin-top: 1px;
}
.toast-body { flex: 1; min-width: 0; }
.toast-title { font-weight: 600; margin-bottom: 4px; font-size: 14.5px; }
.toast-message { white-space: pre-wrap; word-break: break-word; opacity: 0.94; }
.toast-bold { font-weight: 600; }
.toast-br { display: block; height: 2px; content: ' '; }
.toast-actions {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.toast-action-btn {
  border: 0;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  background: rgba(255, 255, 255, 0.14);
  color: inherit;
  transition: background 0.15s ease, transform 0.05s ease;
}
.toast-action-btn:hover { background: rgba(255, 255, 255, 0.24); }
.toast-action-btn:active { transform: translateY(1px); }
.toast-action-btn--primary { background: rgba(255,255,255,0.9); color: #20222b; }
.toast-action-btn--primary:hover { background: #fff; }
.toast-action-btn--danger  { background: rgba(255,100,100,0.28); }
.toast-close {
  border: 0;
  background: transparent;
  color: inherit;
  opacity: 0.7;
  cursor: pointer;
  padding: 0 2px;
  font-size: 20px;
  line-height: 1;
  margin-left: 6px;
}
.toast-close:hover { opacity: 1; }

.toast-fade-enter-active,
.toast-fade-leave-active { transition: opacity 0.22s ease, transform 0.22s ease; }
.toast-fade-enter-from { opacity: 0; transform: translateY(8px) scale(0.98); }
.toast-fade-leave-to { opacity: 0; transform: translateY(-4px) scale(0.98); }

@media (max-width: 520px) {
  .toast-wrapper {
    left: 12px !important;
    right: 12px !important;
    transform: none !important;
    max-width: calc(100vw - 24px);
  }
  .toast--top-left, .toast--top-right, .toast--top-center { top: 12px; }
  .toast--bottom-left, .toast--bottom-right { bottom: 12px; }
}
</style>
