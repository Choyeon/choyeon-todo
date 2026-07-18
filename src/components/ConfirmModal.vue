<template>
  <Teleport to="body">
    <Transition name="confirm-fade">
      <div v-if="visible" class="confirm-backdrop" @click.self="handleCancel">
        <Transition name="confirm-pop">
          <div
            v-if="visible"
            class="confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            :aria-label="title || message"
            @keydown.esc="handleCancel"
            tabindex="-1"
            ref="dialogRef"
          >
            <h3 v-if="title" class="confirm-title">{{ title }}</h3>
            <p class="confirm-message">{{ message }}</p>
            <div class="confirm-actions">
              <button class="confirm-btn cancel-btn" @click="handleCancel">
                {{ cancelLabel }}
              </button>
              <button
                class="confirm-btn confirm-action-btn"
                :class="{ danger }"
                @click="handleConfirm"
              >
                {{ confirmLabel }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { useConfirm } from '../composables/useConfirm'

const { visible, title, message, confirmLabel, cancelLabel, danger, handleConfirm, handleCancel } =
  useConfirm()

const dialogRef = ref(null)

// 弹窗显示时自动聚焦到确认按钮，便于键盘操作
watch(visible, (val) => {
  if (val) {
    nextTick(() => {
      if (dialogRef.value) {
        dialogRef.value.focus()
      }
    })
  }
})
</script>

<style scoped>
.confirm-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: rgba(60, 64, 67, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: confirmFadeIn var(--duration-normal) var(--ease-out-quart);
}

@keyframes confirmFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.confirm-dialog {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-float);
  padding: 24px;
  width: 360px;
  max-width: calc(100vw - 32px);
  display: flex;
  flex-direction: column;
  gap: 16px;
  outline: none;
}

.confirm-title {
  font-size: var(--font-size-xl);
  font-weight: 500;
  color: var(--color-text-primary);
  margin: 0;
  line-height: 1.3;
  font-family: var(--font-title);
  letter-spacing: -0.2px;
}

.confirm-message {
  font-size: var(--font-size-body);
  color: var(--color-text-secondary);
  margin: 0;
  line-height: 1.5;
  font-family: var(--font-body);
  word-break: break-word;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

.confirm-btn {
  padding: 8px 20px;
  border-radius: var(--radius-md);
  font-size: var(--font-size-body);
  font-weight: 500;
  font-family: var(--font-body);
  cursor: pointer;
  border: none;
  transition:
    background var(--transition-smooth),
    color var(--transition-smooth),
    box-shadow var(--transition-smooth);
  min-width: 72px;
}

.cancel-btn {
  background: transparent;
  color: var(--color-text-secondary);
}

.cancel-btn:hover {
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.confirm-action-btn {
  background: var(--color-primary);
  color: #ffffff;
}

.confirm-action-btn:hover {
  background: var(--color-primary-hover, var(--color-primary));
  box-shadow: var(--shadow-sm);
}

.confirm-action-btn.danger {
  background: var(--color-danger, #ef4444);
}

.confirm-action-btn.danger:hover {
  background: var(--color-danger-hover, #dc2626);
  box-shadow: var(--shadow-sm);
}

.confirm-fade-enter-active,
.confirm-fade-leave-active {
  transition: opacity var(--duration-normal) var(--ease-out-quart);
}

.confirm-fade-enter-from,
.confirm-fade-leave-to {
  opacity: 0;
}

.confirm-pop-enter-active {
  transition:
    transform var(--duration-moderate) var(--ease-spring-soft),
    opacity var(--duration-normal) var(--ease-out-quart);
}

.confirm-pop-leave-active {
  transition:
    transform var(--duration-normal) var(--ease-out-quart),
    opacity var(--duration-fast) var(--ease-out-quart);
}

.confirm-pop-enter-from {
  transform: scale(0.92);
  opacity: 0;
}

.confirm-pop-leave-to {
  transform: scale(0.96);
  opacity: 0;
}

@media (max-width: 767px) {
  .confirm-dialog {
    width: calc(100vw - 32px);
    padding: 20px;
  }
}
</style>
