<template>
  <Teleport to="body">
    <Transition name="snackbar-slide">
      <div
        v-if="visible"
        class="snackbar"
        :class="typeClass"
        role="alert"
        :aria-live="type === 'error' || type === 'warning' ? 'assertive' : 'polite'"
      >
        <!-- 类型图标 -->
        <span class="snackbar-icon" :aria-hidden="true">
          <CheckCircle2 v-if="typeIcon === 'check-circle'" :size="20" />
          <AlertCircle v-else-if="typeIcon === 'alert-circle'" :size="20" />
          <AlertTriangle v-else-if="typeIcon === 'alert-triangle'" :size="20" />
          <Info v-else :size="20" />
        </span>

        <span class="snackbar-message">{{ message }}</span>

        <button
          v-if="actionLabel"
          type="button"
          class="snackbar-action"
          @click="handleAction"
          :aria-label="actionLabel"
        >
          {{ actionLabel }}
        </button>

        <button
          type="button"
          class="snackbar-close"
          @click="hide"
          :aria-label="$t('common.close') || '关闭'"
        >
          <X :size="16" />
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { useSnackbar } from '../composables/useSnackbar'
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from '@lucide/vue'

const {
  visible,
  message,
  actionLabel,
  hide,
  handleAction,
  typeIcon,
  typeClass
} = useSnackbar()
</script>

<style scoped>
.snackbar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px 10px 14px;
  border-radius: var(--radius-md);
  background: var(--snackbar-bg, #1f2937);
  color: var(--snackbar-text, #ffffff);
  box-shadow:
    0 8px 20px rgba(0, 0, 0, 0.14),
    0 3px 8px rgba(0, 0, 0, 0.1);
  z-index: var(--z-toast, 9999);
  font-size: var(--font-size-body);
  font-family: var(--font-body);
  min-width: 280px;
  max-width: 90vw;
  border: 1px solid transparent;
  backdrop-filter: blur(12px) saturate(1.1);
  -webkit-backdrop-filter: blur(12px) saturate(1.1);
}

/* ---- 按类型配色（成功绿 / 失败红 / 警告橙 / 信息蓝） ---- */
.snackbar.type-success {
  --snackbar-bg: rgba(22, 101, 52, 0.92);
  --snackbar-text: #ffffff;
  --snackbar-accent: #4ade80;
  --snackbar-action-color: #bbf7d0;
  border-color: rgba(74, 222, 128, 0.3);
}
.snackbar.type-error {
  --snackbar-bg: rgba(153, 27, 27, 0.92);
  --snackbar-text: #ffffff;
  --snackbar-accent: #f87171;
  --snackbar-action-color: #fecaca;
  border-color: rgba(248, 113, 113, 0.3);
}
.snackbar.type-warning {
  --snackbar-bg: rgba(146, 64, 14, 0.92);
  --snackbar-text: #ffffff;
  --snackbar-accent: #fbbf24;
  --snackbar-action-color: #fde68a;
  border-color: rgba(251, 191, 36, 0.3);
}
.snackbar.type-info {
  --snackbar-bg: rgba(30, 64, 175, 0.92);
  --snackbar-text: #ffffff;
  --snackbar-accent: #60a5fa;
  --snackbar-action-color: #bfdbfe;
  border-color: rgba(96, 165, 250, 0.3);
}

/* 暗色模式下更柔和 */
html[data-theme='dark'] .snackbar.type-success {
  --snackbar-bg: rgba(6, 78, 59, 0.94);
  --snackbar-accent: #34d399;
}
html[data-theme='dark'] .snackbar.type-error {
  --snackbar-bg: rgba(127, 29, 29, 0.94);
  --snackbar-accent: #ef4444;
}
html[data-theme='dark'] .snackbar.type-warning {
  --snackbar-bg: rgba(120, 53, 15, 0.94);
  --snackbar-accent: #f59e0b;
}
html[data-theme='dark'] .snackbar.type-info {
  --snackbar-bg: rgba(30, 58, 138, 0.94);
  --snackbar-accent: #3b82f6;
}

.snackbar-icon {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--snackbar-accent);
  flex-shrink: 0;
}

.snackbar-message {
  flex: 1;
  line-height: 1.4;
  font-weight: 400;
  color: var(--snackbar-text);
  min-width: 0;
  word-break: break-word;
}

.snackbar-action {
  background: transparent;
  border: none;
  color: var(--snackbar-action-color, #93c5fd);
  font-weight: 600;
  font-size: var(--font-size-sm);
  cursor: pointer;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  font-family: var(--font-body);
  white-space: nowrap;
  transition: background 0.15s ease, transform 0.1s ease;
}
.snackbar-action:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-1px);
}
.snackbar-action:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.3);
}

.snackbar-close {
  background: transparent;
  border: none;
  color: var(--snackbar-text);
  opacity: 0.72;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.15s ease, background 0.15s ease;
  flex-shrink: 0;
}
.snackbar-close:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.08);
}
.snackbar-close:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.3);
  opacity: 1;
}

/* ---- 从下方浮入动画 ---- */
.snackbar-slide-enter-active,
.snackbar-slide-leave-active {
  transition:
    transform 0.35s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.25s ease,
    filter 0.25s ease;
}
.snackbar-slide-enter-from {
  opacity: 0;
  transform: translate(-50%, 40px);
  filter: blur(4px);
}
.snackbar-slide-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px) scale(0.98);
  filter: blur(2px);
}

@media (max-width: 767px) {
  .snackbar {
    bottom: 88px;
    left: 16px;
    right: 16px;
    transform: none;
    max-width: none;
    min-width: 0;
  }
  .snackbar-slide-enter-from {
    transform: translateY(40px);
  }
  .snackbar-slide-leave-to {
    transform: translateY(20px) scale(0.98);
  }
}
</style>
