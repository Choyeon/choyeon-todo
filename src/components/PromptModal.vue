<template>
  <Teleport to="body">
    <Transition name="prompt-fade">
      <div v-if="visible" class="prompt-backdrop" @click.self="handleCancel">
        <Transition name="prompt-pop">
          <div
            v-if="visible"
            class="prompt-dialog"
            role="alertdialog"
            aria-modal="true"
            :aria-label="title || message"
            @keydown.esc="handleCancel"
            @keydown.enter.prevent="handleConfirm"
            tabindex="-1"
            ref="dialogRef"
          >
            <h3 v-if="title" class="prompt-title">{{ title }}</h3>
            <p class="prompt-message">{{ message }}</p>
            <div class="prompt-input-wrap">
              <input
                ref="inputRef"
                type="text"
                class="prompt-input"
                :value="inputValue"
                :placeholder="placeholder"
                :maxlength="maxLength > 0 ? maxLength : undefined"
                @input="handleInput"
                autocomplete="off"
                spellcheck="false"
              />
              <span
                v-if="maxLength > 0 && inputValue.length > 0"
                class="prompt-counter"
                :class="{ warn: inputValue.length >= maxLength }"
              >
                {{ inputValue.length }}/{{ maxLength }}
              </span>
            </div>
            <div class="prompt-actions">
              <button class="prompt-btn cancel-btn" type="button" @click="handleCancel">
                {{ cancelLabel }}
              </button>
              <button class="prompt-btn confirm-action-btn" type="button" @click="handleConfirm">
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
import { usePrompt } from '../composables/usePrompt'

const {
  visible,
  title,
  message,
  placeholder,
  confirmLabel,
  cancelLabel,
  maxLength,
  inputValue,
  handleConfirm,
  handleCancel,
  handleInput
} = usePrompt()

const dialogRef = ref(null)
const inputRef = ref(null)

watch(visible, (val) => {
  if (val) {
    nextTick(() => {
      if (inputRef.value) {
        inputRef.value.focus()
        if (inputValue.value) {
          inputRef.value.select()
        }
      }
    })
  }
})
</script>

<style scoped>
.prompt-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: rgba(60, 64, 67, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: promptFadeIn var(--duration-normal) var(--ease-out-quart);
}

@keyframes promptFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.prompt-dialog {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-float);
  padding: 24px;
  width: 400px;
  max-width: calc(100vw - 32px);
  display: flex;
  flex-direction: column;
  gap: 16px;
  outline: none;
}

.prompt-title {
  font-size: var(--font-size-xl);
  font-weight: 500;
  color: var(--color-text-primary);
  margin: 0;
  line-height: 1.3;
  font-family: var(--font-title);
  letter-spacing: -0.2px;
}

.prompt-message {
  font-size: var(--font-size-body);
  color: var(--color-text-secondary);
  margin: 0;
  line-height: 1.5;
  font-family: var(--font-body);
  word-break: break-word;
}

.prompt-input-wrap {
  position: relative;
}

.prompt-input {
  width: 100%;
  padding: 10px 12px;
  font-size: var(--font-size-body);
  font-family: var(--font-body);
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  outline: none;
  transition: border-color var(--transition-smooth), box-shadow var(--transition-smooth), background var(--transition-smooth);
  box-sizing: border-box;
}

.prompt-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  background: var(--color-surface);
}

.prompt-input::placeholder {
  color: var(--color-text-tertiary, #9ca3af);
}

.prompt-counter {
  position: absolute;
  right: 10px;
  bottom: -18px;
  font-size: 11px;
  color: var(--color-text-tertiary, #9ca3af);
  font-family: var(--font-body);
}

.prompt-counter.warn {
  color: var(--color-warning, #f59e0b);
}

.prompt-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

.prompt-btn {
  padding: 8px 20px;
  border-radius: var(--radius-md);
  font-size: var(--font-size-body);
  font-weight: 500;
  font-family: var(--font-body);
  cursor: pointer;
  border: none;
  transition: background var(--transition-smooth), color var(--transition-smooth), box-shadow var(--transition-smooth);
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

.prompt-fade-enter-active,
.prompt-fade-leave-active {
  transition: opacity var(--duration-normal) var(--ease-out-quart);
}

.prompt-fade-enter-from,
.prompt-fade-leave-to {
  opacity: 0;
}

.prompt-pop-enter-active {
  transition: transform var(--duration-moderate) var(--ease-spring-soft), opacity var(--duration-normal) var(--ease-out-quart);
}

.prompt-pop-leave-active {
  transition: transform var(--duration-normal) var(--ease-out-quart), opacity var(--duration-fast) var(--ease-out-quart);
}

.prompt-pop-enter-from {
  transform: scale(0.92);
  opacity: 0;
}

.prompt-pop-leave-to {
  transform: scale(0.96);
  opacity: 0;
}

@media (max-width: 767px) {
  .prompt-dialog {
    width: calc(100vw - 32px);
    padding: 20px;
  }
}
</style>
