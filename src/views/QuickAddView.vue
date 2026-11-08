<template>
  <div class="quick-add-view">
    <div class="quick-add-card">
      <div class="input-wrapper">
        <input
          ref="taskInput"
          v-model="taskTitle"
          type="text"
          name="quickAddTitle"
          :aria-label="$t('quickAdd.placeholder')"
          :placeholder="$t('quickAdd.placeholder')"
          class="task-input"
          @keydown.enter="addTask"
          @keydown.esc="closeWindow"
        />
      </div>
      <div class="actions">
        <button
          class="cancel-btn"
          type="button"
          :aria-label="$t('common.cancel')"
          @click="closeWindow"
        >
          {{ $t('common.cancel') }}
        </button>
        <button
          class="add-btn"
          type="button"
          :aria-label="$t('common.add')"
          @click="addTask"
          :disabled="!taskTitle.trim()"
        >
          {{ $t('common.add') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, nextTick } from 'vue'
import { useTaskStore } from '../stores/taskStore'

export default {
  name: 'QuickAddView',
  setup() {
    const taskStore = useTaskStore()
    const taskInput = ref(null)
    const taskTitle = ref('')

    onMounted(async () => {
      await nextTick()
      if (taskInput.value) {
        taskInput.value.focus()
      }
    })

    /**
     * 添加任务到收件箱
     * 快速添加模式：无日期、收件箱分类、默认优先级
     */
    const addTask = async () => {
      if (!taskTitle.value.trim()) return

      await taskStore.addTask({
        title: taskTitle.value.trim(),
        date: '',
        category: 'inbox',
        priority: 3,
        completed: false
      })

      closeWindow()
    }

    const closeWindow = () => {
      if (window.electronAPI?.closeQuickAdd) {
        window.electronAPI.closeQuickAdd()
      } else {
        window.close()
      }
    }

    return {
      taskInput,
      taskTitle,
      addTask,
      closeWindow
    }
  }
}
</script>

<style scoped>
.quick-add-view {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 16px;
  background: transparent;
}

.quick-add-card {
  width: 100%;
  max-width: 368px;
  background: var(--color-surface-elevated, #ffffff);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  border: 1px solid var(--color-border, #e5e7eb);
}

:root[data-theme='dark'] .quick-add-card {
  background: rgba(32, 33, 36, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.input-wrapper {
  margin-bottom: 12px;
}

.task-input {
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 8px;
  background: var(--color-bg-secondary, #f8f9fa);
  color: var(--color-text-primary, #202124);
  outline: none;
  transition: all 0.2s;
}

.task-input::placeholder {
  color: var(--color-text-tertiary, #80868b);
}

.task-input:focus {
  border-color: var(--color-primary, #4a90d9);
  background: var(--color-surface-elevated, #ffffff);
  box-shadow: 0 0 0 2px var(--color-primary-ring, rgba(74, 144, 217, 0.2));
}

:root[data-theme='dark'] .task-input {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
  color: var(--color-text-primary, #e8eaed);
}

:root[data-theme='dark'] .task-input:focus {
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--color-primary, #8ab4f8);
}

.actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.cancel-btn,
.add-btn {
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn {
  background: transparent;
  color: var(--color-text-secondary, #5f6368);
}

.cancel-btn:hover {
  background: rgba(0, 0, 0, 0.05);
}

:root[data-theme='dark'] .cancel-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}

.add-btn {
  background: var(--color-primary, #4a90d9);
  color: var(--color-text-on-primary, #ffffff);
}

.add-btn:hover:not(:disabled) {
  background: var(--color-primary-dark, #3a7bc1);
  transform: translateY(-1px);
}

.add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
