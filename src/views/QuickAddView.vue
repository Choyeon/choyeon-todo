<template>
  <div class="quick-add-view">
    <div class="quick-add-card">
      <div class="input-wrapper">
        <input
          ref="taskInput"
          v-model="taskTitle"
          type="text"
          :placeholder="$t('quickAdd.placeholder')"
          class="task-input"
          @keydown.enter="addTask"
          @keydown.esc="closeWindow"
        />
      </div>
      <div class="actions">
        <button class="cancel-btn" @click="closeWindow">
          {{ $t('common.cancel') }}
        </button>
        <button class="add-btn" @click="addTask" :disabled="!taskTitle.trim()">
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
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

:root[theme='dark'] .quick-add-card {
  background: rgba(32, 33, 36, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.input-wrapper {
  margin-bottom: 12px;
}

.task-input {
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.6);
  color: var(--text-primary, #202124);
  outline: none;
  transition: all 0.2s;
}

.task-input:focus {
  border-color: var(--primary-color, #1a73e8);
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.1);
}

:root[theme='dark'] .task-input {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
  color: var(--text-primary, #e8eaed);
}

:root[theme='dark'] .task-input:focus {
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--primary-color, #8ab4f8);
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
  color: var(--text-secondary, #5f6368);
}

.cancel-btn:hover {
  background: rgba(0, 0, 0, 0.05);
}

:root[theme='dark'] .cancel-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}

.add-btn {
  background: var(--primary-color, #1a73e8);
  color: white;
}

.add-btn:hover:not(:disabled) {
  background: var(--primary-hover, #1557b0);
  transform: translateY(-1px);
}

.add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
