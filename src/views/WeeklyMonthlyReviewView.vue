<template>
  <div class="review-view">
    <div class="view-header">
      <div class="header-content">
        <h1>{{ $t('review.title') }}</h1>
        <p class="header-subtitle">{{ $t('review.subtitle') }}</p>
      </div>
      <button class="close-btn" @click="goBack">
        <X :size="24" />
      </button>
    </div>

    <!-- 时间范围选择 -->
    <div class="period-selector">
      <button class="period-btn" :class="{ active: period === 'week' }" @click="period = 'week'">
        {{ $t('review.thisWeek') }}
      </button>
      <button class="period-btn" :class="{ active: period === 'month' }" @click="period = 'month'">
        {{ $t('review.thisMonth') }}
      </button>
      <button
        class="period-btn"
        :class="{ active: period === 'lastWeek' }"
        @click="period = 'lastWeek'"
      >
        {{ $t('review.lastWeek') }}
      </button>
      <button
        class="period-btn"
        :class="{ active: period === 'lastMonth' }"
        @click="period = 'lastMonth'"
      >
        {{ $t('review.lastMonth') }}
      </button>
    </div>

    <!-- 统计概览 -->
    <div class="stats-overview">
      <div class="stat-card">
        <div class="stat-icon icon-blue">
          <CheckCircle :size="24" />
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ completedCount }}</div>
          <div class="stat-label">{{ $t('review.completedTasks') }}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon icon-amber">
          <Clock :size="24" />
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ pendingCount }}</div>
          <div class="stat-label">{{ $t('review.pendingTasks') }}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon icon-green">
          <TrendingUp :size="24" />
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ completionRate }}%</div>
          <div class="stat-label">{{ $t('review.completionRate') }}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon icon-purple">
          <Target :size="24" />
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ totalTasks }}</div>
          <div class="stat-label">{{ $t('review.totalTasks') }}</div>
        </div>
      </div>
    </div>

    <!-- 分类统计 -->
    <div class="category-stats">
      <h2 class="section-title">
        <BarChart3 :size="20" />
        {{ $t('review.categoryBreakdown') }}
      </h2>
      <div class="category-list">
        <div v-for="stat in categoryStats" :key="stat.id" class="category-item">
          <div class="category-info">
            <div class="category-dot" :style="{ background: stat.color }"></div>
            <span class="category-name">{{ stat.name }}</span>
          </div>
          <div class="category-stats">
            <span class="stat-completed">{{ stat.completed }}</span>
            <span class="stat-separator">/</span>
            <span class="stat-total">{{ stat.total }}</span>
          </div>
          <div class="category-progress">
            <div
              class="progress-fill"
              :style="{ width: `${stat.percentage}%`, background: stat.color }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 每日完成情况 -->
    <div class="daily-completion">
      <h2 class="section-title">
        <Calendar :size="20" />
        {{ $t('review.dailyCompletion') }}
      </h2>
      <div class="completion-chart">
        <div v-for="day in dailyStats" :key="day.date" class="day-bar">
          <div class="day-label">{{ day.label }}</div>
          <div class="bar-container">
            <div
              class="bar-fill"
              :style="{ height: `${day.percentage}%` }"
              :class="{ completed: day.percentage === 100 }"
            ></div>
          </div>
          <div class="day-count">{{ day.completed }}</div>
        </div>
      </div>
    </div>

    <!-- 重要任务完成情况 -->
    <div class="important-tasks">
      <h2 class="section-title">
        <Star :size="20" />
        {{ $t('review.importantTasks') }}
      </h2>
      <div class="task-list">
        <div v-for="task in importantTasks" :key="task.id" class="task-item">
          <div class="task-checkbox">
            <input type="checkbox" :checked="task.completed" @change="toggleTaskComplete(task)" />
          </div>
          <div class="task-content">
            <div class="task-title" :class="{ completed: task.completed }">{{ task.title }}</div>
            <div class="task-meta">
              <span class="meta-item">
                <Calendar :size="14" />
                {{ formatDate(task.date) }}
              </span>
              <span class="meta-item" v-if="task.category">
                <div
                  class="category-dot-small"
                  :style="{ background: getCategoryColor(task.category) }"
                ></div>
                {{ getCategoryName(task.category) }}
              </span>
            </div>
          </div>
        </div>
        <div v-if="importantTasks.length === 0" class="empty-state">
          <p>{{ $t('review.noImportantTasks') }}</p>
        </div>
      </div>
    </div>

    <!-- 逾期任务 -->
    <div class="overdue-tasks" v-if="overdueTasks.length > 0">
      <h2 class="section-title">
        <AlertCircle :size="20" />
        {{ $t('review.overdueTasks') }}
      </h2>
      <div class="task-list">
        <div v-for="task in overdueTasks" :key="task.id" class="task-item overdue">
          <div class="task-checkbox">
            <input type="checkbox" :checked="task.completed" @change="toggleTaskComplete(task)" />
          </div>
          <div class="task-content">
            <div class="task-title" :class="{ completed: task.completed }">{{ task.title }}</div>
            <div class="task-meta">
              <span class="meta-item overdue-date">
                <Calendar :size="14" />
                {{ formatDate(task.date) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 导出报告 -->
    <div class="export-section">
      <button class="export-btn" @click="exportReport">
        <Download :size="20" />
        {{ $t('review.exportReport') }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useTaskStore } from '../stores/taskStore'
import { getTodayStr } from '../utils/date'
import {
  CheckCircle,
  Clock,
  TrendingUp,
  Target,
  BarChart3,
  Calendar,
  Star,
  AlertCircle,
  Download,
  X
} from '@lucide/vue'

const router = useRouter()
const { t } = useI18n()
const taskStore = useTaskStore()

const period = ref('week')

/**
 * 根据当前周期返回日期范围
 * - week: 本周（周日到周六）
 * - month: 本月（1号到月末）
 * - lastWeek: 上周
 * - lastMonth: 上月
 */
const getDateRange = () => {
  const today = new Date()
  const todayStr = getTodayStr()

  if (period.value === 'week') {
    const start = new Date(today)
    start.setDate(start.getDate() - start.getDay())
    return { start: start.toISOString().split('T')[0], end: todayStr }
  } else if (period.value === 'month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1)
    return { start: start.toISOString().split('T')[0], end: todayStr }
  } else if (period.value === 'lastWeek') {
    const end = new Date(today)
    end.setDate(end.getDate() - end.getDay() - 1)
    const start = new Date(end)
    start.setDate(start.getDate() - 6)
    return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] }
  } else if (period.value === 'lastMonth') {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const end = new Date(today.getFullYear(), today.getMonth(), 0)
    return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] }
  }
  return { start: todayStr, end: todayStr }
}

/** 筛选当前周期内的任务 */
const periodTasks = computed(() => {
  const { start, end } = getDateRange()
  return taskStore.tasks.filter((task) => {
    if (!task.date) return false
    return task.date >= start && task.date <= end
  })
})

/** 已完成任务数 */
const completedCount = computed(() => periodTasks.value.filter((t) => t.completed).length)
const pendingCount = computed(() => periodTasks.value.filter((t) => !t.completed).length)
const totalTasks = computed(() => periodTasks.value.length)
const completionRate = computed(() => {
  if (totalTasks.value === 0) return 0
  return Math.round((completedCount.value / totalTasks.value) * 100)
})

// 分类统计
const categoryStats = computed(() => {
  const stats = {}
  periodTasks.value.forEach((task) => {
    const categoryId = task.category || 'other'
    if (!stats[categoryId]) {
      const category = taskStore.categories.find((c) => c.id === categoryId)
      stats[categoryId] = {
        id: categoryId,
        name: category?.name || t('categories.other'),
        color: category?.color || '#9B8EBB',
        completed: 0,
        total: 0
      }
    }
    stats[categoryId].total++
    if (task.completed) {
      stats[categoryId].completed++
    }
  })

  return Object.values(stats).map((stat) => ({
    ...stat,
    percentage: stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0
  }))
})

// 每日统计
const dailyStats = computed(() => {
  const { start, end } = getDateRange()
  const days = []
  const startDate = new Date(start)
  const endDate = new Date(end)

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    const dayTasks = periodTasks.value.filter((t) => t.date === dateStr)
    const completed = dayTasks.filter((t) => t.completed).length
    const total = dayTasks.length

    days.push({
      date: dateStr,
      label: d.getDate(),
      completed,
      total,
      percentage: total > 0 ? (completed / total) * 100 : 0
    })
  }

  return days
})

// 重要任务
const importantTasks = computed(() => {
  return periodTasks.value.filter((t) => t.important)
})

// 逾期任务
const overdueTasks = computed(() => {
  const today = getTodayStr()
  return periodTasks.value.filter((t) => !t.completed && t.date < today)
})

// 辅助方法
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

const getCategoryName = (categoryId) => {
  const category = taskStore.categories.find((c) => c.id === categoryId)
  return category?.name || t('categories.other')
}

const getCategoryColor = (categoryId) => {
  const category = taskStore.categories.find((c) => c.id === categoryId)
  return category?.color || '#9B8EBB'
}

const toggleTaskComplete = (task) => {
  taskStore.updateTask(task.id, {
    completed: !task.completed,
    completedAt: !task.completed ? new Date().toISOString() : null
  })
}

const exportReport = () => {
  const report = {
    period: period.value,
    dateRange: getDateRange(),
    stats: {
      completed: completedCount.value,
      pending: pendingCount.value,
      total: totalTasks.value,
      completionRate: completionRate.value
    },
    categoryStats: categoryStats.value,
    dailyStats: dailyStats.value,
    importantTasks: importantTasks.value,
    overdueTasks: overdueTasks.value
  }

  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `choyeon-todo-review-${period.value}-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const goBack = () => {
  router.push('/')
}
</script>

<style scoped>
.review-view {
  min-height: 100%;
  padding: 32px;
  background: var(--color-bg);
}

.view-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 32px;
}

.header-content h1 {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 8px 0;
}

.header-subtitle {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0;
}

.close-btn {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: none;
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--color-border);
  color: var(--color-text-primary);
}

.period-selector {
  display: flex;
  gap: 8px;
  margin-bottom: 32px;
  background: var(--color-surface);
  padding: 8px;
  border-radius: 12px;
  border: 1px solid var(--color-border-light);
}

.period-btn {
  flex: 1;
  padding: 10px 16px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
}

.period-btn:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
}

.period-btn.active {
  background: var(--color-primary);
  color: white;
}

.stats-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card {
  background: var(--color-surface);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid var(--color-border-light);
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

.stat-icon.icon-blue {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.stat-icon.icon-amber {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.stat-icon.icon-green {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.stat-icon.icon-purple {
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.category-stats,
.daily-completion,
.important-tasks,
.overdue-tasks {
  background: var(--color-surface);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  border: 1px solid var(--color-border-light);
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 20px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.category-item {
  display: grid;
  grid-template-columns: auto auto 1fr;
  gap: 12px;
  align-items: center;
}

.category-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.category-name {
  font-size: 14px;
  color: var(--color-text-primary);
  font-weight: 500;
}

.category-stats {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.stat-completed {
  color: var(--color-primary);
  font-weight: 600;
}

.stat-separator {
  margin: 0 2px;
}

.category-progress {
  height: 6px;
  background: var(--color-bg-secondary);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
}

.completion-chart {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  height: 200px;
  padding: 20px 0;
}

.day-bar {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  height: 100%;
}

.day-label {
  font-size: 12px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.bar-container {
  flex: 1;
  width: 100%;
  background: var(--color-bg-secondary);
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  align-items: flex-end;
}

.bar-fill {
  width: 100%;
  background: var(--color-primary);
  border-radius: 6px;
  transition: height 0.3s;
}

.bar-fill.completed {
  background: #22c55e;
}

.day-count {
  font-size: 12px;
  color: var(--color-text-secondary);
  font-weight: 600;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--color-bg-secondary);
  border-radius: 10px;
  transition: all 0.2s;
}

.task-item:hover {
  background: var(--color-bg);
}

.task-item.overdue {
  border-left: 3px solid #ef4444;
}

.task-checkbox {
  flex-shrink: 0;
}

.task-checkbox input[type='checkbox'] {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: var(--color-primary);
}

.task-content {
  flex: 1;
  min-width: 0;
}

.task-title {
  font-size: 14px;
  color: var(--color-text-primary);
  font-weight: 500;
  margin-bottom: 4px;
}

.task-title.completed {
  text-decoration: line-through;
  color: var(--color-text-tertiary);
}

.task-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.overdue-date {
  color: #ef4444;
}

.category-dot-small {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--color-text-tertiary);
}

.export-section {
  margin-top: 32px;
  text-align: center;
}

.export-btn {
  padding: 12px 24px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}

.export-btn:hover {
  background: var(--color-primary-dark);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

@media (max-width: 768px) {
  .review-view {
    padding: 16px;
  }

  .stats-overview {
    grid-template-columns: repeat(2, 1fr);
  }

  .period-selector {
    flex-wrap: wrap;
  }

  .period-btn {
    flex: 1 1 calc(50% - 4px);
  }
}
</style>
