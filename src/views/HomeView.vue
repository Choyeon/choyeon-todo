<template>
  <div class="home-view">
    <div class="content-inner">
      <div class="content-header">
        <div class="header-top">
          <h1>{{ headerTitle }}</h1>
          <div class="header-actions">
            <button
              v-if="taskStore.filteredTasks.length > 0"
              class="action-btn"
              @click="markAllCompleted"
              :disabled="allCompleted"
              :class="{ disabled: allCompleted }"
            >
              <Check :size="14" />
              <span>{{ $t('task.markAllCompleted') }}</span>
            </button>
          </div>
        </div>
        <p class="header-subtitle">{{ headerSubtitle }}</p>
      </div>

      <div class="add-task-row" :class="{ focused: inputFocused }">
        <div class="add-input-row">
          <PlusCircle class="add-icon" :size="20" />
          <input
            type="text"
            :placeholder="$t('task.addTaskPlaceholder')"
            v-model="quickAddTitle"
            @keyup.enter="quickAdd"
            @focus="inputFocused = true"
            @blur="inputFocused = false"
          />
          <button
            class="add-task-btn"
            @click="quickAdd"
            :class="{ visible: inputFocused || quickAddTitle }"
          >
            <Plus :size="18" />
          </button>
        </div>
        <div class="smart-hints" v-if="smartHints.length > 0 && inputFocused">
          <Sparkles :size="14" class="hint-icon" />
          <span class="hint-text">{{ $t('task.smartDetected') }}</span>
          <span v-for="hint in smartHints" :key="hint" class="hint-tag">{{ hint }}</span>
        </div>
      </div>

      <div class="task-list-container">
        <TaskList
          :tasks="taskStore.filteredTasks"
          :empty-type="emptyType"
          @add-task="openAddTask && openAddTask()"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTaskStore } from '../stores/taskStore'
import TaskList from '../components/TaskList.vue'
import { PlusCircle, Plus, Check, Sparkles } from '@lucide/vue'
import { smartParseTask, getSmartHint } from '../utils/smartParse'

const { t } = useI18n()

const taskStore = useTaskStore()
const quickAddTitle = ref('')
const inputFocused = ref(false)
const openAddTask = inject('openAddTask')

const smartHints = computed(() => {
  if (!quickAddTitle.value.trim()) return []
  return getSmartHint(quickAddTitle.value)
})

const headerTitle = computed(() => {
  if (taskStore.searchQuery) {
    return t('nav.searchResults')
  }
  switch (taskStore.currentView) {
    case 'today':
      return t('nav.myDay')
    case 'tomorrow':
      return t('nav.tomorrow')
    case 'week':
      return t('nav.nextWeek')
    case 'important':
      return t('nav.important')
    case 'planned':
      return t('nav.planned')
    case 'all':
      return t('nav.allTasks')
    case 'category':
      const cat = taskStore.getCategoryById(taskStore.currentCategory)
      return cat ? cat.name : t('nav.categoryTasks')
    default:
      return t('nav.tasks')
  }
})

const headerSubtitle = computed(() => {
  if (taskStore.searchQuery) {
    return t('task.searchResultCount', { count: taskStore.filteredTasks.length })
  }
  const now = new Date()
  const weekdays = t('date.weekdays')

  if (taskStore.currentView === 'today') {
    return `${now.getMonth() + 1}月${now.getDate()}日 ${weekdays[now.getDay()]}`
  }

  if (taskStore.currentView === 'category') {
    const count = taskStore.getCategoryCount(taskStore.currentCategory)
    return t('task.taskCount', { count })
  }

  const count = taskStore.getCount(taskStore.currentView)
  return t('task.taskCount', { count })
})

const emptyType = computed(() => {
  if (taskStore.searchQuery) return 'search'
  switch (taskStore.currentView) {
    case 'today':
      return 'today'
    case 'tomorrow':
      return 'tomorrow'
    case 'week':
      return 'week'
    case 'important':
      return 'important'
    case 'planned':
      return 'planned'
    case 'category':
      return 'category'
    default:
      return 'default'
  }
})

const allCompleted = computed(() => {
  return taskStore.filteredTasks.length > 0 && taskStore.filteredTasks.every((t) => t.completed)
})

const markAllCompleted = () => {
  taskStore.markAllComplete()
}

const quickAdd = () => {
  if (!quickAddTitle.value.trim()) {
    openAddTask && openAddTask()
    return
  }

  const parsed = smartParseTask(quickAddTitle.value, {
    categories: taskStore.categories,
    tags: taskStore.tags
  })

  let category = 'other'
  if (parsed.categoryId) {
    category = parsed.categoryId
  } else if (taskStore.currentView === 'category') {
    category = taskStore.currentCategory
  }

  taskStore.addTask({
    title: parsed.title,
    category: category,
    date: parsed.date,
    time: parsed.time,
    important: parsed.important,
    reminder: parsed.reminder,
    tags: parsed.tags,
    priority: parsed.priority
  })

  quickAddTitle.value = ''
}
</script>

<style scoped>
.home-view {
  min-height: 100%;
  background: transparent;
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

.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.content-header h1 {
  font-size: 32px;
  font-weight: 300;
  margin: 0;
  color: var(--color-text-primary);
  letter-spacing: -0.8px;
  line-height: 1.15;
  font-family: var(--font-title);
}

.header-subtitle {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0;
  font-weight: 400;
  letter-spacing: 0.3px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: none;
  border-radius: var(--radius-full);
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  font-size: 12px;
  font-family: var(--font-body);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.action-btn:hover:not(.disabled) {
  background: var(--color-border-light);
  color: var(--color-text-primary);
}

.action-btn.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.add-task-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 16px;
  background: var(--card-bg);
  backdrop-filter: blur(var(--sidebar-search-blur)) saturate(var(--sidebar-search-saturate));
  -webkit-backdrop-filter: blur(var(--sidebar-search-blur)) saturate(var(--sidebar-search-saturate));
  border-radius: 16px;
  margin-bottom: 20px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 56px;
  box-shadow: var(--card-shadow);
  border: 1px solid var(--card-border);
}

.add-task-row:hover {
  border-color: var(--color-border);
  box-shadow:
    0 2px 6px rgba(0, 0, 0, 0.04),
    0 1px 2px rgba(0, 0, 0, 0.02);
}

.add-task-row:focus-within {
  border-color: var(--color-primary);
  box-shadow:
    0 0 0 3px var(--color-primary-ring),
    0 2px 8px rgba(0, 0, 0, 0.04);
}

.add-input-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.add-icon {
  min-width: 20px;
  color: var(--color-text-tertiary);
  transition: color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
}

.add-task-row:focus-within .add-icon {
  color: var(--color-primary);
}

.add-task-row input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  font-family: var(--font-body);
  color: var(--color-text-primary);
  letter-spacing: 0.2px;
  font-weight: 400;
}

.add-task-row input::placeholder {
  color: var(--color-text-tertiary);
}

.smart-hints {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 0 0 32px;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.hint-icon {
  color: var(--color-primary);
}

.hint-text {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.hint-tag {
  font-size: 11px;
  padding: 2px 8px;
  background: var(--color-primary-surface);
  color: var(--color-primary);
  border-radius: var(--radius-full);
  font-weight: 500;
}

.add-task-btn {
  width: 34px;
  height: 34px;
  min-width: 34px;
  border-radius: var(--radius-full);
  border: none;
  background: var(--color-primary);
  color: var(--color-text-on-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0;
  pointer-events: none;
  transform: scale(0.85);
  flex-shrink: 0;
}

.add-task-btn.visible {
  opacity: 1;
  pointer-events: auto;
  transform: scale(1);
}

.add-task-btn:hover {
  background: var(--color-primary-dark);
  box-shadow: var(--shadow-md);
  transform: scale(1.05);
}

.add-task-btn:active {
  background: var(--color-primary-darker);
  transform: scale(0.98);
}

.task-list-container {
  animation: fadeInUp 0.3s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (min-width: 768px) and (max-width: 1023px) {
  .content-inner {
    padding: 0 32px 40px 32px;
  }

  .content-header {
    padding: 36px 0 24px 0;
  }

  .content-header h1 {
    font-size: 26px;
  }
}

@media (max-width: 767px) {
  .content-inner {
    padding: 0 16px 120px 16px;
  }

  .content-header {
    padding: 24px 0 20px 0;
    margin-bottom: 16px;
  }

  .header-top {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .content-header h1 {
    font-size: 24px;
  }

  .add-task-row {
    padding: 12px 14px;
    min-height: 48px;
    margin-bottom: 16px;
  }

  .action-btn {
    padding: 5px 12px;
    font-size: 12px;
  }
}
</style>
