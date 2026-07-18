<template>
  <Teleport to="body">
    <Transition name="snackbar">
      <div v-if="visible" class="snackbar" role="alert" aria-live="assertive">
        <span class="snackbar-message">{{ message }}</span>
        <button v-if="actionLabel" class="snackbar-action" @click="handleAction">
          {{ actionLabel }}
        </button>
        <button class="snackbar-close" @click="hide" :aria-label="$t('common.close')">
          <X :size="16" />
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { X } from '@lucide/vue'
import { useSnackbar } from '../composables/useSnackbar'

const { visible, message, actionLabel, hide, handleAction } = useSnackbar()
</script>

<style scoped>
.snackbar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: #323232;
  color: #ffffff;
  padding: 12px 16px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: var(--z-toast);
  box-shadow: var(--shadow-lg);
  font-size: var(--font-size-body);
  font-family: var(--font-body);
  min-width: 280px;
  max-width: 90vw;
}

.snackbar-message {
  flex: 1;
  line-height: 1.4;
}

.snackbar-action {
  color: var(--color-primary-light);
  background: none;
  border: none;
  font-weight: 500;
  font-size: var(--font-size-body);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  font-family: var(--font-body);
  white-space: nowrap;
  transition: background 0.15s;
}

.snackbar-action:hover {
  background: rgba(255, 255, 255, 0.1);
}

.snackbar-close {
  color: rgba(255, 255, 255, 0.7);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    background 0.15s,
    color 0.15s;
}

.snackbar-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.snackbar-enter-active,
.snackbar-leave-active {
  transition:
    transform 0.25s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.snackbar-enter-from,
.snackbar-leave-to {
  transform: translate(-50%, 100%);
  opacity: 0;
}

@media (max-width: 767px) {
  .snackbar {
    bottom: 88px;
    left: 16px;
    right: 16px;
    transform: none;
    max-width: none;
  }

  .snackbar-enter-from,
  .snackbar-leave-to {
    transform: translateY(100%);
    opacity: 0;
  }
}
</style>
