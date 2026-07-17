<template>
  <div class="completed-view">
    <div class="content-inner">
      <div class="content-header">
        <h1>已完成</h1>
        <p class="header-subtitle">{{ taskStore.getCount('completed') }} 个已完成任务</p>
      </div>

      <div v-if="completedTasks.length > 0" class="action-bar">
        <button class="clear-btn" @click="showClearModal = true">
          <Trash2 :size="16" />
          清除已完成任务
        </button>
      </div>

      <TaskList :tasks="completedTasks" empty-type="completed" />
    </div>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showClearModal" class="modal-backdrop" @click.self="showClearModal = false">
          <Transition name="slide-up">
            <div v-if="showClearModal" class="confirm-modal" @keydown.esc="showClearModal = false">
              <div class="confirm-icon">
                <AlertTriangle :size="32" />
              </div>
              <h3 class="confirm-title">确认清除</h3>
              <p class="confirm-desc">
                确定要清除所有已完成的任务吗？此操作不可撤销。
              </p>
              <div class="confirm-actions">
                <button class="confirm-btn danger" @click="confirmClear">
                  <Trash2 :size="16" />
                  确认清除
                </button>
                <button class="confirm-btn cancel" @click="showClearModal = false">取消</button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useTaskStore } from '../stores/taskStore'
import { useSnackbar } from '../composables/useSnackbar'
import TaskList from '../components/TaskList.vue'
import { Trash2, AlertTriangle } from '@lucide/vue'

const taskStore = useTaskStore()
const { show: showSnackbar } = useSnackbar()
const showClearModal = ref(false)

const completedTasks = computed(() => {
  return [...taskStore.tasks]
    .filter(t => t.completed)
    .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
})

const confirmClear = () => {
  const count = taskStore.getCount('completed')
  showClearModal.value = false
  taskStore.clearCompleted()
  showSnackbar(`已清除 ${count} 个已完成任务`)
}
</script>

<style scoped>
.completed-view {
  min-height: 100%;
  background: var(--color-bg);
}

.content-inner {
  max-width: 760px;
  padding: 0 48px 48px 48px;
  margin: 0 auto;
}

.content-header {
  margin-bottom: 24px;
  padding: 48px 0 28px 0;
}

.content-header h1 {
  font-size: 32px;
  font-weight: 300;
  margin: 0 0 4px 0;
  color: var(--color-text-primary);
  letter-spacing: -0.5px;
  line-height: 1.2;
  font-family: var(--font-title);
}

.header-subtitle {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0;
  font-weight: 400;
  letter-spacing: 0.2px;
}

.action-bar {
  margin-bottom: 16px;
  display: flex;
  justify-content: flex-end;
}

.clear-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--state-error);
  border: none;
  font-size: 13px;
  font-weight: 500;
  font-family: var(--font-body);
  cursor: pointer;
  transition: background 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.clear-btn:hover {
  background: var(--color-error-surface);
}

.clear-btn:focus-visible {
  box-shadow: 0 0 0 2px var(--color-primary-ring);
  outline: none;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: rgba(60, 64, 67, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.confirm-modal {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: 24px;
  width: 90%;
  max-width: 400px;
  box-shadow: var(--shadow-float);
  text-align: center;
  animation: scaleIn 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes scaleIn {
  from {
    transform: scale(0.95);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.confirm-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 16px auto;
  border-radius: 50%;
  background: var(--color-error-surface);
  color: var(--state-error);
  display: flex;
  align-items: center;
  justify-content: center;
}

.confirm-title {
  font-family: var(--font-title);
  font-size: 20px;
  font-weight: 400;
  color: var(--color-text-primary);
  margin: 0 0 12px 0;
  letter-spacing: -0.3px;
}

.confirm-desc {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0 0 20px 0;
  line-height: 1.5;
}

.confirm-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.confirm-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: var(--radius-full);
  font-size: 14px;
  font-weight: 500;
  font-family: var(--font-body);
  cursor: pointer;
  border: none;
  transition: background 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.confirm-btn.danger {
  background: var(--color-error-surface);
  color: var(--state-error);
}

.confirm-btn.danger:hover {
  background: var(--color-error-surface-hover);
}

.confirm-btn.cancel {
  background: transparent;
  color: var(--color-primary);
}

.confirm-btn.cancel:hover {
  background: var(--color-primary-surface);
}

@media (min-width: 768px) and (max-width: 1023px) {
  .content-inner {
    padding: 0 32px 40px 32px;
  }

  .content-header {
    padding: 36px 0 20px 0;
  }

  .content-header h1 {
    font-size: 24px;
  }
}

@media (max-width: 767px) {
  .content-inner {
    padding: 0 16px 120px 16px;
  }

  .content-header {
    padding: 24px 0 16px 0;
  }

  .content-header h1 {
    font-size: 22px;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(20px);
  opacity: 0;
}
</style>
