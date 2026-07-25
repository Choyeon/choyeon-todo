<template>
  <div class="quadrant-view">
    <div class="view-header">
      <h1>{{ $t('quadrant.title') }}</h1>
      <p class="view-subtitle">{{ $t('quadrant.subtitle') }}</p>
    </div>

    <div class="quadrant-grid">
      <!-- 第一象限：重要且紧急 -->
      <div class="quadrant-card urgent-important">
        <div class="quadrant-header">
          <div class="quadrant-icon">
            <AlertCircle :size="20" />
          </div>
          <div class="quadrant-info">
            <h3>{{ $t('quadrant.urgentImportant') }}</h3>
            <p>{{ $t('quadrant.doFirst') }}</p>
          </div>
          <div class="task-count">{{ urgentImportantTasks.length }}</div>
        </div>
        <div class="task-list">
          <div v-if="urgentImportantTasks.length === 0" class="empty-quadrant">
            {{ $t('quadrant.noTasks') }}
          </div>
          <div
            v-for="task in urgentImportantTasks"
            :key="task.id"
            class="task-item"
            :class="{ completed: task.completed }"
          >
            <div class="task-checkbox">
              <input type="checkbox" :checked="task.completed" @change="toggleTaskComplete(task)" />
            </div>
            <div class="task-content">
              <div class="task-title">{{ task.title }}</div>
              <div class="task-meta">
                <span v-if="task.date" class="task-date">
                  <Calendar :size="12" />
                  {{ formatDate(task.date) }}
                </span>
                <span v-if="task.category" class="task-category">
                  {{ getCategoryName(task.category) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 第二象限：重要不紧急 -->
      <div class="quadrant-card not-urgent-important">
        <div class="quadrant-header">
          <div class="quadrant-icon">
            <Target :size="20" />
          </div>
          <div class="quadrant-info">
            <h3>{{ $t('quadrant.notUrgentImportant') }}</h3>
            <p>{{ $t('quadrant.schedule') }}</p>
          </div>
          <div class="task-count">{{ notUrgentImportantTasks.length }}</div>
        </div>
        <div class="task-list">
          <div v-if="notUrgentImportantTasks.length === 0" class="empty-quadrant">
            {{ $t('quadrant.noTasks') }}
          </div>
          <div
            v-for="task in notUrgentImportantTasks"
            :key="task.id"
            class="task-item"
            :class="{ completed: task.completed }"
          >
            <div class="task-checkbox">
              <input type="checkbox" :checked="task.completed" @change="toggleTaskComplete(task)" />
            </div>
            <div class="task-content">
              <div class="task-title">{{ task.title }}</div>
              <div class="task-meta">
                <span v-if="task.date" class="task-date">
                  <Calendar :size="12" />
                  {{ formatDate(task.date) }}
                </span>
                <span v-if="task.category" class="task-category">
                  {{ getCategoryName(task.category) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 第三象限：紧急不重要 -->
      <div class="quadrant-card urgent-not-important">
        <div class="quadrant-header">
          <div class="quadrant-icon">
            <Clock :size="20" />
          </div>
          <div class="quadrant-info">
            <h3>{{ $t('quadrant.urgentNotImportant') }}</h3>
            <p>{{ $t('quadrant.delegate') }}</p>
          </div>
          <div class="task-count">{{ urgentNotImportantTasks.length }}</div>
        </div>
        <div class="task-list">
          <div v-if="urgentNotImportantTasks.length === 0" class="empty-quadrant">
            {{ $t('quadrant.noTasks') }}
          </div>
          <div
            v-for="task in urgentNotImportantTasks"
            :key="task.id"
            class="task-item"
            :class="{ completed: task.completed }"
          >
            <div class="task-checkbox">
              <input type="checkbox" :checked="task.completed" @change="toggleTaskComplete(task)" />
            </div>
            <div class="task-content">
              <div class="task-title">{{ task.title }}</div>
              <div class="task-meta">
                <span v-if="task.date" class="task-date">
                  <Calendar :size="12" />
                  {{ formatDate(task.date) }}
                </span>
                <span v-if="task.category" class="task-category">
                  {{ getCategoryName(task.category) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 第四象限：不重要不紧急 -->
      <div class="quadrant-card not-urgent-not-important">
        <div class="quadrant-header">
          <div class="quadrant-icon">
            <Archive :size="20" />
          </div>
          <div class="quadrant-info">
            <h3>{{ $t('quadrant.notUrgentNotImportant') }}</h3>
            <p>{{ $t('quadrant.eliminate') }}</p>
          </div>
          <div class="task-count">{{ notUrgentNotImportantTasks.length }}</div>
        </div>
        <div class="task-list">
          <div v-if="notUrgentNotImportantTasks.length === 0" class="empty-quadrant">
            {{ $t('quadrant.noTasks') }}
          </div>
          <div
            v-for="task in notUrgentNotImportantTasks"
            :key="task.id"
            class="task-item"
            :class="{ completed: task.completed }"
          >
            <div class="task-checkbox">
              <input type="checkbox" :checked="task.completed" @change="toggleTaskComplete(task)" />
            </div>
            <div class="task-content">
              <div class="task-title">{{ task.title }}</div>
              <div class="task-meta">
                <span v-if="task.date" class="task-date">
                  <Calendar :size="12" />
                  {{ formatDate(task.date) }}
                </span>
                <span v-if="task.category" class="task-category">
                  {{ getCategoryName(task.category) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="quadrant-legend">
      <div class="legend-item">
        <div class="legend-color urgent-important"></div>
        <span>{{ $t('quadrant.urgentImportant') }}</span>
      </div>
      <div class="legend-item">
        <div class="legend-color not-urgent-important"></div>
        <span>{{ $t('quadrant.notUrgentImportant') }}</span>
      </div>
      <div class="legend-item">
        <div class="legend-color urgent-not-important"></div>
        <span>{{ $t('quadrant.urgentNotImportant') }}</span>
      </div>
      <div class="legend-item">
        <div class="legend-color not-urgent-not-important"></div>
        <span>{{ $t('quadrant.notUrgentNotImportant') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useTaskStore } from '../stores/taskStore'
import { AlertCircle, Target, Clock, Archive, Calendar } from '@lucide/vue'

const taskStore = useTaskStore()

const isTaskOverdue = (task) => {
  if (task.completed || !task.date) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const taskDate = new Date(task.date)
  taskDate.setHours(0, 0, 0, 0)
  return taskDate < today
}

const isTaskDueToday = (task) => {
  if (!task.date) return false
  const today = new Date().toISOString().split('T')[0]
  return task.date === today
}

// 第一象限：重要且紧急（重要标记 + 今天或已过期）
const urgentImportantTasks = computed(() => {
  return taskStore.tasks.filter(
    (task) => task.important && (isTaskOverdue(task) || isTaskDueToday(task))
  )
})

// 第二象限：重要不紧急（重要标记 + 未到期或无日期）
const notUrgentImportantTasks = computed(() => {
  return taskStore.tasks.filter(
    (task) => task.important && !isTaskOverdue(task) && !isTaskDueToday(task)
  )
})

// 第三象限：紧急不重要（不重要 + 今天或已过期）
const urgentNotImportantTasks = computed(() => {
  return taskStore.tasks.filter(
    (task) => !task.important && (isTaskOverdue(task) || isTaskDueToday(task))
  )
})

// 第四象限：不重要不紧急（不重要 + 未到期或无日期）
const notUrgentNotImportantTasks = computed(() => {
  return taskStore.tasks.filter(
    (task) => !task.important && !isTaskOverdue(task) && !isTaskDueToday(task)
  )
})

const toggleTaskComplete = (task) => {
  taskStore.toggleTask(task.id)
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const taskDate = new Date(dateStr)
  taskDate.setHours(0, 0, 0, 0)
  const diffDays = Math.ceil((taskDate - today) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '明天'
  if (diffDays === -1) return '昨天'
  if (diffDays < 0) return `已过期${Math.abs(diffDays)}天`
  if (diffDays <= 7) return `${diffDays}天后`

  return `${date.getMonth() + 1}月${date.getDate()}日`
}

const getCategoryName = (categoryId) => {
  const category = taskStore.categories.find((c) => c.id === categoryId)
  return category ? category.name : ''
}
</script>

<style scoped>
.quadrant-view {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.view-header {
  margin-bottom: 32px;
}

.view-header h1 {
  font-size: 28px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: var(--color-text-primary);
}

.view-subtitle {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0;
}

.quadrant-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.quadrant-card {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 20px;
  transition: all 0.2s;
}

.quadrant-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.quadrant-card.urgent-important {
  border-left: 4px solid #ef4444;
}

.quadrant-card.not-urgent-important {
  border-left: 4px solid #3b82f6;
}

.quadrant-card.urgent-not-important {
  border-left: 4px solid #f59e0b;
}

.quadrant-card.not-urgent-not-important {
  border-left: 4px solid #6b7280;
}

.quadrant-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.quadrant-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.urgent-important .quadrant-icon {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.not-urgent-important .quadrant-icon {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.urgent-not-important .quadrant-icon {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.not-urgent-not-important .quadrant-icon {
  background: rgba(107, 114, 128, 0.1);
  color: #6b7280;
}

.quadrant-info {
  flex: 1;
}

.quadrant-info h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 4px 0;
  color: var(--color-text-primary);
}

.quadrant-info p {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 0;
}

.task-count {
  font-size: 24px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.empty-quadrant {
  padding: 24px;
  text-align: center;
  color: var(--color-text-tertiary);
  font-size: 13px;
}

.task-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--color-bg-secondary);
  border-radius: 8px;
  transition: all 0.2s;
}

.task-item:hover {
  background: var(--color-bg-tertiary);
}

.task-item.completed {
  opacity: 0.6;
}

.task-checkbox {
  flex-shrink: 0;
}

.task-checkbox input[type='checkbox'] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--color-primary);
}

.task-content {
  flex: 1;
  min-width: 0;
}

.task-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-item.completed .task-title {
  text-decoration: line-through;
  color: var(--color-text-tertiary);
}

.task-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.task-date,
.task-category {
  display: flex;
  align-items: center;
  gap: 4px;
}

.quadrant-legend {
  display: flex;
  justify-content: center;
  gap: 24px;
  padding: 16px;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 4px;
}

.legend-color.urgent-important {
  background: #ef4444;
}

.legend-color.not-urgent-important {
  background: #3b82f6;
}

.legend-color.urgent-not-important {
  background: #f59e0b;
}

.legend-color.not-urgent-not-important {
  background: #6b7280;
}

@media (max-width: 1024px) {
  .quadrant-grid {
    grid-template-columns: 1fr;
  }

  .quadrant-legend {
    flex-wrap: wrap;
  }
}

@media (max-width: 768px) {
  .quadrant-view {
    padding: 16px;
  }

  .view-header h1 {
    font-size: 24px;
  }
}
</style>
