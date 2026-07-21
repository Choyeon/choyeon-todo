<template>
  <Teleport to="body">
    <Transition name="reminder-fade">
      <div v-if="visible" class="reminder-overlay" @click.self="handleSnooze">
        <Transition name="reminder-pop">
          <div
            v-if="visible"
            class="reminder-modal"
            role="dialog"
            aria-modal="true"
            :aria-label="$t('task.reminder')"
          >
            <div class="reminder-icon">
              <Bell :size="32" />
            </div>
            <h3 class="reminder-title">{{ currentTask?.title || $t('task.reminder') }}</h3>
            <p class="reminder-desc">
              {{ isOverdue ? $t('task.overdue') : reminderTimeText }}
            </p>
            <div class="reminder-time">
              <Clock :size="14" />
              <span>{{ formatTime }}</span>
            </div>
            <div class="reminder-actions">
              <button class="reminder-btn snooze-btn" @click="handleSnooze">
                {{ $t('task.snooze') }}
              </button>
              <button class="reminder-btn primary-btn" @click="handleView">
                {{ $t('task.viewTask') }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTaskStore } from '../stores/taskStore'
import { useReminderModal } from '../composables/useReminderModal'
import { Bell, Clock } from '@lucide/vue'

const { t } = useI18n()
const taskStore = useTaskStore()
const reminderModal = useReminderModal()

const visible = computed(() => reminderModal.visible.value)
const taskId = computed(() => reminderModal.currentTaskId.value)
const isOverdue = computed(() => reminderModal.isOverdue.value)

const currentTask = computed(() => {
  if (!taskId.value) return null
  return taskStore.getTaskById(taskId.value)
})

const formatTime = computed(() => {
  if (!currentTask.value?.time) return t('task.noTime')
  return currentTask.value.time
})

const reminderTimeText = computed(() => {
  if (isOverdue.value) return t('task.overdue')
  return t('task.taskDueReminder')
})

const handleView = () => {
  reminderModal.handleView(taskId.value)
}

const handleSnooze = () => {
  reminderModal.handleSnooze()
}

watch(
  () => visible.value,
  (val) => {
    if (val) {
      playReminderSound()
    }
  }
)

const playReminderSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return

    const audioCtx = new AudioContext()
    const playBeep = (freq, startTime, duration) => {
      const oscillator = audioCtx.createOscillator()
      const gainNode = audioCtx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioCtx.destination)

      oscillator.frequency.value = freq
      oscillator.type = 'sine'

      gainNode.gain.setValueAtTime(0, startTime)
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01)
      gainNode.gain.linearRampToValueAtTime(0, startTime + duration)

      oscillator.start(startTime)
      oscillator.stop(startTime + duration)
    }

    const now = audioCtx.currentTime
    playBeep(880, now, 0.15)
    playBeep(880, now + 0.2, 0.15)
    playBeep(1100, now + 0.4, 0.2)

    setTimeout(() => {
      audioCtx.close()
    }, 1000)
  } catch (e) {
    console.warn('[ReminderModal] Failed to play sound:', e)
  }
}
</script>

<style scoped>
.reminder-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.reminder-modal {
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  padding: 32px;
  width: 360px;
  max-width: 90vw;
  text-align: center;
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.25),
    0 0 0 1px var(--color-border);
  animation: reminderPulse 2s ease-in-out infinite;
}

@keyframes reminderPulse {
  0%,
  100% {
    box-shadow:
      0 25px 50px -12px rgba(0, 0, 0, 0.25),
      0 0 0 1px var(--color-border),
      0 0 0 0 var(--color-primary-ring);
  }
  50% {
    box-shadow:
      0 25px 50px -12px rgba(0, 0, 0, 0.25),
      0 0 0 1px var(--color-border),
      0 0 0 12px transparent;
  }
}

.reminder-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--color-primary-surface);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  animation: bellRing 0.5s ease-in-out infinite alternate;
}

@keyframes bellRing {
  0% {
    transform: rotate(-10deg);
  }
  100% {
    transform: rotate(10deg);
  }
}

.reminder-title {
  font-size: var(--font-size-h3);
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 8px 0;
  font-family: var(--font-title);
  line-height: 1.4;
  word-break: break-word;
}

.reminder-desc {
  font-size: var(--font-size-body);
  color: var(--color-text-secondary);
  margin: 0 0 12px 0;
  line-height: 1.5;
}

.reminder-time {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin-bottom: 24px;
}

.reminder-actions {
  display: flex;
  gap: 12px;
}

.reminder-btn {
  flex: 1;
  padding: 12px 20px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-body);
  font-weight: 500;
  font-family: var(--font-body);
  cursor: pointer;
  border: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.snooze-btn {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
}

.snooze-btn:hover {
  background: var(--color-border-light);
}

.primary-btn {
  background: var(--color-primary);
  color: var(--color-text-on-primary);
}

.primary-btn:hover {
  background: var(--color-primary-dark);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.reminder-fade-enter-active,
.reminder-fade-leave-active {
  transition: opacity 0.3s ease;
}

.reminder-fade-enter-from,
.reminder-fade-leave-to {
  opacity: 0;
}

.reminder-pop-enter-active {
  transition:
    transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 0.3s ease;
}

.reminder-pop-leave-active {
  transition:
    transform 0.25s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.2s ease;
}

.reminder-pop-enter-from,
.reminder-pop-leave-to {
  transform: scale(0.8) translateY(20px);
  opacity: 0;
}
</style>
