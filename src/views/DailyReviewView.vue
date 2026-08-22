<template>
  <div class="daily-review-view">
    <div class="review-header">
      <div class="header-content">
        <h1>{{ $t('dailyReview.title') }}</h1>
        <p class="header-subtitle">{{ formattedDate }}</p>
      </div>
      <button class="close-btn" :aria-label="$t('common.close')" @click="goBack">
        <X :size="24" />
      </button>
    </div>

    <div class="review-stats">
      <div class="stat-card">
        <div class="stat-icon completed">
          <CheckCircle :size="24" />
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ completedCount }}</div>
          <div class="stat-label">{{ $t('dailyReview.completed') }}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon pending">
          <Clock :size="24" />
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ pendingCount }}</div>
          <div class="stat-label">{{ $t('dailyReview.pending') }}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon overdue">
          <AlertCircle :size="24" />
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ overdueCount }}</div>
          <div class="stat-label">{{ $t('dailyReview.overdue') }}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon rate">
          <TrendingUp :size="24" />
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ completionRate }}%</div>
          <div class="stat-label">{{ $t('dailyReview.completionRate') }}</div>
        </div>
      </div>
    </div>

    <div class="review-sections">
      <div class="review-section">
        <h2 class="section-title">
          <CheckCircle :size="20" />
          {{ $t('dailyReview.completedTasks') }}
        </h2>
        <div v-if="completedTasks.length === 0" class="empty-state">
          <p>{{ $t('dailyReview.noCompletedTasks') }}</p>
        </div>
        <div v-else class="task-list">
          <div v-for="task in completedTasks" :key="task.id" class="task-item completed">
            <div class="task-content">
              <div class="task-title">{{ task.title }}</div>
              <div class="task-meta">
                <span v-if="task.category" class="category-badge">
                  {{ getCategoryName(task.category) }}
                </span>
                <span v-if="task.completedAt" class="time-badge">
                  {{ formatTime(task.completedAt) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="review-section">
        <h2 class="section-title">
          <Clock :size="20" />
          {{ $t('dailyReview.pendingTasks') }}
        </h2>
        <div v-if="pendingTasks.length === 0" class="empty-state">
          <p>{{ $t('dailyReview.noPendingTasks') }}</p>
        </div>
        <div v-else class="task-list">
          <div v-for="task in pendingTasks" :key="task.id" class="task-item pending">
            <div class="task-content">
              <div class="task-title">{{ task.title }}</div>
              <div class="task-meta">
                <span v-if="task.category" class="category-badge">
                  {{ getCategoryName(task.category) }}
                </span>
                <span v-if="task.date" class="date-badge">
                  {{ formatDate(task.date) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="overdueTasks.length > 0" class="review-section">
        <h2 class="section-title">
          <AlertCircle :size="20" />
          {{ $t('dailyReview.overdueTasks') }}
        </h2>
        <div class="task-list">
          <div v-for="task in overdueTasks" :key="task.id" class="task-item overdue">
            <div class="task-content">
              <div class="task-title">{{ task.title }}</div>
              <div class="task-meta">
                <span v-if="task.category" class="category-badge">
                  {{ getCategoryName(task.category) }}
                </span>
                <span class="date-badge overdue">
                  {{ formatDate(task.date) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="review-actions">
      <button
        class="btn primary"
        :aria-label="$t('dailyReview.continueWorking')"
        @click="goBack"
      >
        {{ $t('dailyReview.continueWorking') }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useTaskStore } from '../stores/taskStore'
import { getTodayStr } from '../utils/date'
import { CheckCircle, Clock, AlertCircle, TrendingUp, X } from '@lucide/vue'

const router = useRouter()
const { t } = useI18n()
const taskStore = useTaskStore()

const today = getTodayStr()

const formattedDate = computed(() => {
  const date = new Date()
  const weekdays = t('date.weekdays')
  const months = t('date.months')
  return `${months[date.getMonth()]} ${date.getDate()}日 ${weekdays[date.getDay()]}`
})

const todayTasks = computed(() => {
  return taskStore.tasks.filter((task) => {
    if (!task.date) return false
    return task.date === today
  })
})

const completedTasks = computed(() => {
  return todayTasks.value.filter((task) => task.completed)
})

const pendingTasks = computed(() => {
  return todayTasks.value.filter((task) => !task.completed)
})

const overdueTasks = computed(() => {
  const now = new Date()
  const currentHM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  return taskStore.tasks.filter((task) => {
    if (task.completed) return false
    if (!task.date) return false
    if (task.date < today) return true
    if (task.date === today && task.time && task.time < currentHM) return true
    return false
  })
})

const completedCount = computed(() => completedTasks.value.length)
const pendingCount = computed(() => pendingTasks.value.length)
const overdueCount = computed(() => overdueTasks.value.length)

const completionRate = computed(() => {
  const total = todayTasks.value.length
  if (total === 0) return 0
  return Math.round((completedCount.value / total) * 100)
})

const getCategoryName = (categoryId) => {
  const category = taskStore.categories.find((c) => c.id === categoryId)
  return category ? category.name : ''
}

const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const months = t('date.months')
  return `${months[date.getMonth()]} ${date.getDate()}日`
}

const goBack = () => {
  router.push('/')
}
</script>

<style scoped>
.daily-review-view {
  min-height: 100vh;
  background: var(--color-bg-primary);
  padding: 24px;
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
}

.header-content h1 {
  font-size: 32px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: var(--color-text-primary);
}

.header-subtitle {
  font-size: 16px;
  color: var(--color-text-secondary);
  margin: 0;
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
}

.review-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 40px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  transition: all 0.2s;
}

.stat-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon.completed {
  background: rgba(34, 197, 94, 0.1);
  color: var(--color-success);
}

.stat-icon.pending {
  background: rgba(59, 130, 246, 0.1);
  color: var(--color-info);
}

.stat-icon.overdue {
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-danger);
}

.stat-icon.rate {
  background: rgba(168, 85, 247, 0.1);
  color: var(--color-purple);
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: var(--color-text-primary);
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.review-sections {
  display: flex;
  flex-direction: column;
  gap: 32px;
  margin-bottom: 32px;
}

.review-section {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 24px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 16px 0;
}

.empty-state {
  padding: 24px;
  text-align: center;
  color: var(--color-text-tertiary);
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
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
  opacity: 0.7;
}

.task-item.overdue {
  border-left: 3px solid var(--color-danger);
}

.task-content {
  flex: 1;
}

.task-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--color-text-primary);
  margin-bottom: 6px;
}

.task-item.completed .task-title {
  text-decoration: line-through;
  color: var(--color-text-tertiary);
}

.task-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.category-badge,
.time-badge,
.date-badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--color-bg-primary);
  color: var(--color-text-secondary);
}

.date-badge.overdue {
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-danger);
}

.review-actions {
  display: flex;
  justify-content: center;
}

.btn {
  padding: 12px 32px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn.primary {
  background: var(--color-primary);
  color: white;
}

.btn.primary:hover {
  background: var(--color-primary-dark);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

@media (max-width: 768px) {
  .daily-review-view {
    padding: 16px;
  }

  .review-stats {
    grid-template-columns: 1fr;
  }

  .header-content h1 {
    font-size: 24px;
  }
}
</style>
