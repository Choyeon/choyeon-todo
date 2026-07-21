<template>
  <div class="stats-view">
    <div class="content-inner">
      <div class="content-header">
        <h1>{{ $t('stats.dataTitle') }}</h1>
        <p class="header-subtitle">{{ $t('stats.subtitle') }}</p>
      </div>

      <div class="overview-cards">
        <div class="stat-card primary-card">
          <div class="stat-info">
            <span class="stat-label">{{ $t('stats.completedTasks') }}</span>
            <span class="stat-value"><AnimatedNumber :value="stats.completedInRange" /></span>
            <span class="stat-sub">{{ $t('stats.lastNDays', { days: rangeDays }) }}</span>
          </div>
          <div class="ring-chart">
            <svg viewBox="0 0 80 80" class="ring-svg">
              <circle cx="40" cy="40" r="32" class="ring-bg" />
              <circle
                cx="40"
                cy="40"
                r="32"
                class="ring-progress"
                :style="{ strokeDasharray: ringDasharray, strokeDashoffset: ringDashoffset }"
              />
            </svg>
            <span class="ring-text"><AnimatedNumber :value="stats.completionRate" />%</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrap icon-blue">
            <PlusCircle :size="24" />
          </div>
          <div class="stat-info">
            <span class="stat-label">{{ $t('stats.createdTasks') }}</span>
            <span class="stat-value"><AnimatedNumber :value="stats.totalCreatedInRange" /></span>
            <span class="stat-sub">{{
              $t('stats.dailyAverageCreated', { count: stats.avgDailyCreated })
            }}</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrap icon-green">
            <Clock :size="24" />
          </div>
          <div class="stat-info">
            <span class="stat-label">{{ $t('stats.focusDuration') }}</span>
            <div class="focus-time-display">
              <span class="focus-value"><AnimatedNumber :value="focusHours" /></span>
              <span class="focus-unit">h</span>
              <span class="focus-value" v-if="focusMinutes > 0"
                ><AnimatedNumber :value="focusMinutes"
              /></span>
              <span class="focus-unit" v-if="focusMinutes > 0">m</span>
            </div>
            <span class="stat-sub">{{ $t('stats.totalFocus') }}</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrap icon-orange">
            <Timer :size="24" />
          </div>
          <div class="stat-info">
            <span class="stat-label">{{ $t('stats.pomodoro') }}</span>
            <span class="stat-value"
              ><AnimatedNumber :value="stats.totalPomodoro" /><span class="stat-value-unit">{{
                $t('stats.timesUnit')
              }}</span></span
            >
            <span class="stat-sub">{{ $t('stats.completedSessions') }}</span>
          </div>
        </div>
      </div>

      <div class="secondary-cards">
        <div class="stat-card mini-card">
          <div class="stat-icon-wrap icon-purple">
            <Flame :size="20" />
          </div>
          <div class="stat-info">
            <span class="stat-label">{{ $t('stats.streakDays') }}</span>
            <span class="stat-value mini"
              ><AnimatedNumber :value="stats.streakDays" /><span class="stat-value-unit">{{
                $t('stats.dayUnit')
              }}</span></span
            >
            <span class="stat-sub">{{ $t('stats.longestStreak', { days: stats.maxStreak }) }}</span>
          </div>
        </div>

        <div class="stat-card mini-card">
          <div class="stat-icon-wrap icon-teal">
            <CalendarCheck :size="20" />
          </div>
          <div class="stat-info">
            <span class="stat-label">{{ $t('stats.onTimeRate') }}</span>
            <span class="stat-value mini"><AnimatedNumber :value="stats.onTimeRate" />%</span>
            <span class="stat-sub"
              >{{ stats.onTimeCompleted }} /
              {{ stats.onTimeCompleted + stats.overdueCompleted }}</span
            >
          </div>
        </div>

        <div class="stat-card mini-card">
          <div class="stat-icon-wrap icon-pink">
            <TrendingUp :size="20" />
          </div>
          <div class="stat-info">
            <span class="stat-label">{{ $t('stats.dailyCompleted') }}</span>
            <span class="stat-value mini"
              ><AnimatedNumber :value="stats.avgDailyCompleted" /><span class="stat-value-unit">{{
                $t('stats.countUnit')
              }}</span></span
            >
            <span class="stat-sub">{{ $t('stats.lastNDays', { days: rangeDays }) }}</span>
          </div>
        </div>

        <div class="stat-card mini-card">
          <div class="stat-icon-wrap icon-yellow">
            <Hourglass :size="20" />
          </div>
          <div class="stat-info">
            <span class="stat-label">{{ $t('stats.avgCompletionTime') }}</span>
            <span class="stat-value mini"
              ><AnimatedNumber :value="stats.avgCompletionTimeHours" :decimals="1" /><span
                class="stat-value-unit"
                >h</span
              ></span
            >
            <span class="stat-sub">{{ $t('stats.fromCreationToCompletion') }}</span>
          </div>
        </div>

        <div class="stat-card mini-card">
          <div class="stat-icon-wrap icon-red">
            <AlertTriangle :size="20" />
          </div>
          <div class="stat-info">
            <span class="stat-label">{{ $t('stats.overdueTasks') }}</span>
            <span class="stat-value mini"
              ><AnimatedNumber :value="stats.overdueActive" /><span class="stat-value-unit">{{
                $t('stats.countUnit')
              }}</span></span
            >
            <span class="stat-sub">{{ $t('stats.pending') }}</span>
          </div>
        </div>

        <div class="stat-card mini-card">
          <div class="stat-icon-wrap icon-indigo">
            <Target :size="20" />
          </div>
          <div class="stat-info">
            <span class="stat-label">{{ $t('stats.totalCompletionRate') }}</span>
            <span class="stat-value mini"
              ><AnimatedNumber :value="totalCompletionRate" /><span class="stat-value-unit"
                >%</span
              ></span
            >
            <span class="stat-sub"
              >{{ stats.completedTasksEver }} / {{ stats.totalTasksEver }}</span
            >
          </div>
        </div>

        <div class="stat-card mini-card">
          <div class="stat-icon-wrap icon-cyan">
            <Award :size="20" />
          </div>
          <div class="stat-info">
            <span class="stat-label">{{ $t('stats.mostProductiveDay') }}</span>
            <span class="stat-value mini">{{ bestDayLabel }}</span>
            <span class="stat-sub">{{
              $t('stats.taskCount', { count: stats.bestDay.count })
            }}</span>
          </div>
        </div>

        <div class="stat-card mini-card">
          <div class="stat-icon-wrap icon-lime">
            <ListTodo :size="20" />
          </div>
          <div class="stat-info">
            <span class="stat-label">{{ $t('stats.pendingTasks') }}</span>
            <span class="stat-value mini"
              ><AnimatedNumber :value="stats.totalTasksEver - stats.completedTasksEver" /><span
                class="stat-value-unit"
                >{{ $t('stats.countUnit') }}</span
              ></span
            >
            <span class="stat-sub">{{ $t('stats.inProgress') }}</span>
          </div>
        </div>
      </div>

      <div class="chart-card">
        <div class="chart-header">
          <h3 class="chart-title">{{ $t('stats.completionTrend') }}</h3>
          <div class="range-tabs">
            <button
              v-for="day in [7, 14, 30]"
              :key="day"
              class="range-tab"
              :class="{ active: rangeDays === day }"
              @click="rangeDays = day"
            >
              {{ $t('stats.daysFormat', { days: day }) }}
            </button>
          </div>
        </div>
        <div class="chart-body">
          <svg :viewBox="`0 0 ${chartWidth} ${chartHeight}`" class="trend-chart">
            <defs>
              <linearGradient id="createdGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop
                  offset="0%"
                  :style="{ stopColor: 'var(--color-primary)', stopOpacity: 0.3 }"
                />
                <stop
                  offset="100%"
                  :style="{ stopColor: 'var(--color-primary)', stopOpacity: 0 }"
                />
              </linearGradient>
              <linearGradient id="completedGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" :style="{ stopColor: '#22c55e', stopOpacity: 0.3 }" />
                <stop offset="100%" :style="{ stopColor: '#22c55e', stopOpacity: 0 }" />
              </linearGradient>
            </defs>

            <g class="grid-lines">
              <line
                v-for="i in 5"
                :key="'grid-' + i"
                :x1="padding.left"
                :x2="chartWidth - padding.right"
                :y1="padding.top + ((chartHeight - padding.top - padding.bottom) * (i - 1)) / 4"
                :y2="padding.top + ((chartHeight - padding.top - padding.bottom) * (i - 1)) / 4"
                class="grid-line"
              />
            </g>

            <g class="y-labels">
              <text
                v-for="i in 5"
                :key="'y-label-' + i"
                :x="padding.left - 8"
                :y="padding.top + ((chartHeight - padding.top - padding.bottom) * (i - 1)) / 4 + 4"
                class="y-label"
              >
                {{ Math.round(maxYValue - (maxYValue * (i - 1)) / 4) }}
              </text>
            </g>

            <path v-if="createdAreaPath" :d="createdAreaPath" class="area created-area" />
            <path v-if="completedAreaPath" :d="completedAreaPath" class="area completed-area" />

            <polyline
              v-if="createdLinePath"
              :points="createdLinePath"
              class="line created-line"
              fill="none"
            />
            <polyline
              v-if="completedLinePath"
              :points="completedLinePath"
              class="line completed-line"
              fill="none"
            />

            <g class="data-points">
              <circle
                v-for="(point, i) in createdPoints"
                :key="'created-point-' + i"
                :cx="point.x"
                :cy="point.y"
                r="4"
                class="point created-point"
              />
              <circle
                v-for="(point, i) in completedPoints"
                :key="'completed-point-' + i"
                :cx="point.x"
                :cy="point.y"
                r="4"
                class="point completed-point"
              />
            </g>

            <g class="x-labels">
              <text
                v-for="(label, i) in xLabels"
                :key="'x-label-' + i"
                :x="label.x"
                :y="chartHeight - padding.bottom + 18"
                class="x-label"
              >
                {{ label.text }}
              </text>
            </g>
          </svg>

          <div class="chart-legend">
            <div class="legend-item">
              <span class="legend-dot created-dot"></span>
              <span class="legend-text">{{ $t('stats.createdCount') }}</span>
            </div>
            <div class="legend-item">
              <span class="legend-dot completed-dot"></span>
              <span class="legend-text">{{ $t('stats.completedCount') }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="charts-row">
        <div class="chart-card half-card">
          <div class="chart-header">
            <h3 class="chart-title">{{ $t('stats.categoryDistribution') }}</h3>
            <div class="chart-tabs">
              <button
                class="chart-tab"
                :class="{ active: categoryStatType === 'active' }"
                @click="categoryStatType = 'active'"
              >
                {{ $t('stats.pendingTasks') }}
              </button>
              <button
                class="chart-tab"
                :class="{ active: categoryStatType === 'completed' }"
                @click="categoryStatType = 'completed'"
              >
                {{ $t('stats.completedTasks') }}
              </button>
            </div>
          </div>
          <div class="chart-body">
            <svg viewBox="0 0 200 200" class="pie-chart">
              <g transform="translate(100, 100)">
                <path
                  v-for="(slice, i) in pieSlices"
                  :key="'pie-' + i"
                  :d="slice.path"
                  :style="{ fill: slice.color }"
                  class="pie-slice"
                />
                <circle cx="0" cy="0" r="55" class="pie-inner" />
              </g>
            </svg>
            <div class="pie-legend">
              <div v-for="item in categoryList" :key="item.id" class="pie-legend-item">
                <span class="legend-dot" :style="{ background: item.color }"></span>
                <span class="legend-name">{{ item.name }}</span>
                <span class="legend-count">{{ item.count }}</span>
                <span class="legend-percent">{{ item.percent }}%</span>
              </div>
            </div>
          </div>
        </div>

        <div class="chart-card half-card">
          <div class="chart-header">
            <h3 class="chart-title">{{ $t('stats.weeklyHeatmap') }}</h3>
          </div>
          <div class="chart-body heatmap-body">
            <div class="heatmap-grid">
              <div
                v-for="(day, i) in weekHeatmap"
                :key="'heatmap-' + i"
                class="heatmap-cell"
                :class="'level-' + day.level"
                :title="$t('stats.completedTasksOnDate', { date: day.date, count: day.count })"
              >
                <span class="heatmap-count">{{ day.count }}</span>
                <span class="heatmap-day">{{ day.dayLabel }}</span>
              </div>
            </div>
            <div class="heatmap-legend">
              <span class="heatmap-legend-label">{{ $t('stats.less') }}</span>
              <div class="heatmap-legend-cells">
                <span class="heatmap-legend-cell level-0"></span>
                <span class="heatmap-legend-cell level-1"></span>
                <span class="heatmap-legend-cell level-2"></span>
                <span class="heatmap-legend-cell level-3"></span>
                <span class="heatmap-legend-cell level-4"></span>
              </div>
              <span class="heatmap-legend-label">{{ $t('stats.more') }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="chart-card">
        <div class="chart-header">
          <h3 class="chart-title">{{ $t('stats.weekdayDistribution') }}</h3>
        </div>
        <div class="chart-body">
          <div class="weekday-chart">
            <div v-for="(day, i) in weekdayStats" :key="'weekday-' + i" class="weekday-bar-wrapper">
              <div class="weekday-bar-container">
                <div class="weekday-bar" :style="{ height: day.heightPercent + '%' }"></div>
              </div>
              <span class="weekday-label">{{ day.label }}</span>
              <span class="weekday-count">{{ day.count }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, h, watchEffect, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTaskStore } from '../stores/taskStore'
import {
  PlusCircle,
  Clock,
  Timer,
  Flame,
  CalendarCheck,
  TrendingUp,
  Hourglass,
  AlertTriangle,
  Target,
  Award,
  ListTodo
} from '@lucide/vue'
import { formatDateStr } from '../utils/date'

const { t, tm } = useI18n()
const taskStore = useTaskStore()
const rangeDays = ref(30)
const categoryStatType = ref('active')

// 计数器动画组件：使用 ease-out-expo 曲线在数字变化时平滑过渡
const AnimatedNumber = {
  props: {
    value: { type: [Number, String], default: 0 },
    duration: { type: Number, default: 900 },
    decimals: { type: Number, default: 0 }
  },
  setup(props) {
    const display = ref(0)
    let raf = null
    let startTime = null
    let startVal = 0

    const easeOutExpo = (x) => (x === 1 ? 1 : 1 - Math.pow(2, -10 * x))

    const formatVal = (v) => {
      if (props.decimals > 0) {
        return v.toFixed(props.decimals)
      }
      return String(Math.round(v))
    }

    watchEffect(() => {
      const endVal = Number(props.value) || 0
      cancelAnimationFrame(raf)
      startTime = null
      startVal = display.value
      const animate = (t) => {
        if (startTime === null) startTime = t
        const progress = Math.min(1, (t - startTime) / props.duration)
        const eased = easeOutExpo(progress)
        display.value = startVal + (endVal - startVal) * eased
        if (progress < 1) {
          raf = requestAnimationFrame(animate)
        } else {
          display.value = endVal
        }
      }
      raf = requestAnimationFrame(animate)
    })

    onUnmounted(() => cancelAnimationFrame(raf))
    return () => h('span', { class: 'animated-number' }, formatVal(display.value))
  }
}

const stats = computed(() => taskStore.getStats(rangeDays.value))

const focusHours = computed(() => Math.floor(stats.value.totalFocusSeconds / 3600))
const focusMinutes = computed(() => Math.floor((stats.value.totalFocusSeconds % 3600) / 60))

const totalCompletionRate = computed(() => {
  if (stats.value.totalTasksEver === 0) return 0
  return Math.round((stats.value.completedTasksEver / stats.value.totalTasksEver) * 100)
})

const bestDayLabel = computed(() => {
  const weekdays = tm('date.weekdays')
  return weekdays[stats.value.bestDay.day] || weekdays[1]
})

const ringDasharray = 2 * Math.PI * 32
const ringDashoffset = computed(() => {
  const rate = Math.min(100, Math.max(0, stats.value.completionRate))
  return ringDasharray * (1 - rate / 100)
})

const chartWidth = 700
const chartHeight = 280
const padding = { top: 20, right: 20, bottom: 40, left: 40 }

const maxYValue = computed(() => {
  const dailyStats = stats.value.dailyStats
  let max = 0
  for (const d of dailyStats) {
    max = Math.max(max, d.created, d.completed)
  }
  if (max === 0) return 5
  return Math.ceil(max * 1.2)
})

const chartInnerWidth = chartWidth - padding.left - padding.right
const chartInnerHeight = chartHeight - padding.top - padding.bottom

const createdPoints = computed(() => {
  const dailyStats = stats.value.dailyStats
  if (dailyStats.length === 0) return []
  const stepX = chartInnerWidth / (dailyStats.length - 1 || 1)
  return dailyStats.map((d, i) => ({
    x: padding.left + i * stepX,
    y: padding.top + chartInnerHeight - (d.created / maxYValue.value) * chartInnerHeight
  }))
})

const completedPoints = computed(() => {
  const dailyStats = stats.value.dailyStats
  if (dailyStats.length === 0) return []
  const stepX = chartInnerWidth / (dailyStats.length - 1 || 1)
  return dailyStats.map((d, i) => ({
    x: padding.left + i * stepX,
    y: padding.top + chartInnerHeight - (d.completed / maxYValue.value) * chartInnerHeight
  }))
})

const createdLinePath = computed(() => {
  return createdPoints.value.map((p) => `${p.x},${p.y}`).join(' ')
})

const completedLinePath = computed(() => {
  return completedPoints.value.map((p) => `${p.x},${p.y}`).join(' ')
})

const createdAreaPath = computed(() => {
  if (createdPoints.value.length === 0) return ''
  const first = createdPoints.value[0]
  const last = createdPoints.value[createdPoints.value.length - 1]
  const bottomY = padding.top + chartInnerHeight
  let path = `M ${first.x} ${bottomY} L ${first.x} ${first.y}`
  for (let i = 1; i < createdPoints.value.length; i++) {
    path += ` L ${createdPoints.value[i].x} ${createdPoints.value[i].y}`
  }
  path += ` L ${last.x} ${bottomY} Z`
  return path
})

const completedAreaPath = computed(() => {
  if (completedPoints.value.length === 0) return ''
  const first = completedPoints.value[0]
  const last = completedPoints.value[completedPoints.value.length - 1]
  const bottomY = padding.top + chartInnerHeight
  let path = `M ${first.x} ${bottomY} L ${first.x} ${first.y}`
  for (let i = 1; i < completedPoints.value.length; i++) {
    path += ` L ${completedPoints.value[i].x} ${completedPoints.value[i].y}`
  }
  path += ` L ${last.x} ${bottomY} Z`
  return path
})

const xLabels = computed(() => {
  const dailyStats = stats.value.dailyStats
  if (dailyStats.length === 0) return []
  const count = Math.min(7, dailyStats.length)
  const step = Math.floor(dailyStats.length / count)
  const labels = []
  for (let i = 0; i < dailyStats.length; i += step) {
    const d = dailyStats[i]
    const date = new Date(d.date)
    labels.push({
      x: padding.left + i * (chartInnerWidth / (dailyStats.length - 1 || 1)),
      text: `${date.getMonth() + 1}/${date.getDate()}`
    })
  }
  return labels
})

const categoryList = computed(() => {
  const catStats =
    categoryStatType.value === 'completed'
      ? stats.value.completedCategoryStats
      : stats.value.categoryStats
  const total = Object.values(catStats).reduce((sum, c) => sum + c, 0) || 1
  return taskStore.categories
    .filter((cat) => catStats[cat.id] > 0)
    .map((cat) => ({
      id: cat.id,
      name: cat.name,
      color: cat.color,
      count: catStats[cat.id] || 0,
      percent: Math.round(((catStats[cat.id] || 0) / total) * 100)
    }))
    .sort((a, b) => b.count - a.count)
})

const pieSlices = computed(() => {
  const list = categoryList.value
  if (list.length === 0) return []
  const total = list.reduce((sum, item) => sum + item.count, 0) || 1
  let startAngle = -Math.PI / 2
  const slices = []
  const outerRadius = 80
  const innerRadius = 55

  for (const item of list) {
    const angle = (item.count / total) * Math.PI * 2
    const endAngle = startAngle + angle

    const x1 = Math.cos(startAngle) * outerRadius
    const y1 = Math.sin(startAngle) * outerRadius
    const x2 = Math.cos(endAngle) * outerRadius
    const y2 = Math.sin(endAngle) * outerRadius

    const x3 = Math.cos(endAngle) * innerRadius
    const y3 = Math.sin(endAngle) * innerRadius
    const x4 = Math.cos(startAngle) * innerRadius
    const y4 = Math.sin(startAngle) * innerRadius

    const largeArc = angle > Math.PI ? 1 : 0

    const path = `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`

    slices.push({ path, color: item.color })
    startAngle = endAngle
  }

  return slices
})

const weekHeatmap = computed(() => {
  const today = new Date()
  const day = today.getDay()
  const diff = day === 0 ? 6 : day - 1
  const monday = new Date(today)
  monday.setDate(today.getDate() - diff)

  const days = []
  const dayLabels = [
    t('task.monday'),
    t('task.tuesday'),
    t('task.wednesday'),
    t('task.thursday'),
    t('task.friday'),
    t('task.saturday'),
    t('task.sunday')
  ]
  const dailyStats = stats.value.dailyStats

  let maxCount = 0
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    const dateStr = formatDateStr(date)
    const stat = dailyStats.find((d) => d.date === dateStr)
    const count = stat ? stat.completed : 0
    if (count > maxCount) maxCount = count
    days.push({
      date: dateStr,
      count,
      dayLabel: dayLabels[i],
      level: 0
    })
  }

  for (const d of days) {
    if (maxCount === 0) {
      d.level = 0
    } else if (d.count === 0) {
      d.level = 0
    } else if (d.count <= maxCount * 0.25) {
      d.level = 1
    } else if (d.count <= maxCount * 0.5) {
      d.level = 2
    } else if (d.count <= maxCount * 0.75) {
      d.level = 3
    } else {
      d.level = 4
    }
  }

  return days
})

const weekdayStats = computed(() => {
  const weekDayStats = stats.value.weekDayStats || {}
  const labels = tm('date.weekdays')
  const order = [1, 2, 3, 4, 5, 6, 0]

  let maxCount = 0
  const days = order.map((dayIdx) => {
    const data = weekDayStats[dayIdx] || { completed: 0, created: 0 }
    maxCount = Math.max(maxCount, data.completed)
    return {
      day: dayIdx,
      label: labels[dayIdx],
      count: data.completed
    }
  })

  const maxHeight = maxCount > 0 ? maxCount : 1
  return days.map((d) => ({
    ...d,
    heightPercent: Math.round((d.count / maxHeight) * 100)
  }))
})
</script>

<style scoped>
.stats-view {
  min-height: 100%;
  background: transparent;
  -webkit-overflow-scrolling: touch;
  overflow-x: hidden;
}

.content-inner {
  max-width: 960px;
  padding: 0 48px 48px 48px;
  margin: 0 auto;
  box-sizing: border-box;
}

.content-header {
  margin-bottom: 16px;
  padding: 48px 0 24px 0;
}

.content-header h1 {
  font-size: var(--font-size-4xl);
  font-weight: 400;
  margin: 0 0 4px 0;
  color: var(--color-text-primary);
  letter-spacing: -0.5px;
  line-height: 1.2;
  font-family: var(--font-title);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-subtitle {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: var(--font-size-body);
  color: var(--color-text-secondary);
  margin: 0;
  font-weight: 400;
  letter-spacing: 0.2px;
}

.overview-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.secondary-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  background: var(--card-bg);
  backdrop-filter: blur(var(--sidebar-search-blur)) saturate(var(--sidebar-search-saturate));
  -webkit-backdrop-filter: blur(var(--sidebar-search-blur)) saturate(var(--sidebar-search-saturate));
  border-radius: var(--radius-lg);
  border: 1px solid var(--card-border);
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: var(--card-shadow);
  transition:
    transform var(--transition-smooth),
    box-shadow var(--duration-moderate) var(--ease-out-expo),
    border-color var(--transition-smooth);
  min-width: 0;
  box-sizing: border-box;
  will-change: transform;
}

.stat-card:hover {
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-3px);
  border-color: var(--color-border-focus);
}

.stat-card:active {
  transform: translateY(-1px);
  transition-duration: var(--duration-fast);
}

.stat-card.primary-card {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  border: none;
  color: var(--color-text-on-primary);
}

.stat-card.primary-card .stat-label,
.stat-card.primary-card .stat-sub {
  color: rgba(255, 255, 255, 0.8);
}

.stat-card.primary-card .stat-value {
  color: var(--color-text-on-primary);
}

/* 暗色模式下 primary 背景为浅色，文字需改为深色保证对比度 */
[data-theme='dark'] .stat-card.primary-card .stat-label,
[data-theme='dark'] .stat-card.primary-card .stat-sub {
  color: rgba(0, 0, 0, 0.65);
}

.stat-card.mini-card {
  padding: 16px;
  gap: 12px;
}

.stat-icon-wrap {
  width: 48px;
  height: 48px;
  min-width: 48px;
  flex-shrink: 0;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform var(--transition-smooth);
}

.stat-card:hover .stat-icon-wrap {
  transform: scale(1.06);
}

.stat-card.mini-card .stat-icon-wrap {
  width: 42px;
  height: 42px;
  min-width: 42px;
  border-radius: var(--radius-md);
}

.icon-blue {
  background: rgba(59, 130, 246, 0.12);
  color: #3b82f6;
}

.icon-green {
  background: rgba(34, 197, 94, 0.12);
  color: #22c55e;
}

.icon-orange {
  background: rgba(249, 115, 22, 0.12);
  color: #f97316;
}

.icon-purple {
  background: rgba(168, 85, 247, 0.12);
  color: #a855f7;
}

.icon-teal {
  background: rgba(6, 182, 212, 0.12);
  color: #06b6d4;
}

.icon-pink {
  background: rgba(236, 72, 153, 0.12);
  color: #ec4899;
}

.icon-yellow {
  background: rgba(245, 158, 11, 0.12);
  color: #f59e0b;
}

.icon-red {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
}

.icon-indigo {
  background: rgba(99, 102, 241, 0.12);
  color: #6366f1;
}

.icon-cyan {
  background: rgba(6, 182, 212, 0.12);
  color: #06b6d4;
}

.icon-lime {
  background: rgba(132, 204, 22, 0.12);
  color: #84cc16;
}

.stat-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.stat-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-weight: 500;
  letter-spacing: 0.1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
}

.stat-value {
  font-size: var(--font-size-4xl);
  font-weight: 600;
  color: var(--color-text-primary);
  font-family: var(--font-title);
  line-height: 1.2;
  letter-spacing: -0.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-value.mini {
  font-size: var(--font-size-2xl);
}

.stat-sub {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.focus-time-display {
  display: flex;
  align-items: baseline;
  gap: 2px;
  line-height: 1.2;
  white-space: nowrap;
  min-width: 0;
  overflow: hidden;
}

.focus-value {
  font-size: var(--font-size-3xl);
  font-weight: 600;
  color: var(--color-text-primary);
  font-family: var(--font-title);
  letter-spacing: -0.5px;
  flex-shrink: 0;
}

.focus-unit {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-right: 4px;
  flex-shrink: 0;
}

.stat-value-unit {
  font-size: var(--font-size-body);
  font-weight: 400;
  color: var(--color-text-secondary);
  margin-left: 2px;
  flex-shrink: 0;
}

.stat-value.mini .stat-value-unit {
  font-size: var(--font-size-xs);
}

.ring-chart {
  position: relative;
  width: 64px;
  height: 64px;
  min-width: 64px;
  flex-shrink: 0;
}

.ring-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ring-bg {
  fill: none;
  stroke: rgba(255, 255, 255, 0.25);
  stroke-width: 6;
}

.ring-progress {
  fill: none;
  stroke: white;
  stroke-width: 6;
  stroke-linecap: round;
  transition: stroke-dashoffset var(--duration-slow) var(--ease-out-expo);
}

.ring-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: var(--font-size-body);
  font-weight: 600;
  color: white;
  white-space: nowrap;
}

/* 暗色模式下 ring 图表颜色调整 */
[data-theme='dark'] .ring-bg {
  stroke: rgba(0, 0, 0, 0.15);
}

[data-theme='dark'] .ring-progress {
  stroke: var(--color-text-on-primary);
}

[data-theme='dark'] .ring-text {
  color: var(--color-text-on-primary);
}

.chart-card {
  background: var(--card-bg);
  backdrop-filter: blur(var(--sidebar-search-blur)) saturate(var(--sidebar-search-saturate));
  -webkit-backdrop-filter: blur(var(--sidebar-search-blur)) saturate(var(--sidebar-search-saturate));
  border-radius: var(--radius-lg);
  border: 1px solid var(--card-border);
  box-shadow: var(--card-shadow);
  margin-bottom: 20px;
  transition:
    box-shadow var(--duration-moderate) var(--ease-out-expo),
    border-color var(--transition-smooth);
  min-width: 0;
  overflow: hidden;
}

.chart-card:hover {
  box-shadow: var(--shadow-sm);
  border-color: var(--color-border-focus);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 12px 24px;
  border-bottom: 1px solid var(--color-border-light);
  gap: 12px;
  min-width: 0;
}

.chart-title {
  font-size: var(--font-size-h4);
  font-weight: 500;
  color: var(--color-text-primary);
  margin: 0;
  font-family: var(--font-title);
  letter-spacing: -0.2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
}

.range-tabs {
  display: flex;
  gap: 4px;
  background: var(--color-bg-secondary);
  padding: 3px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.range-tab {
  padding: 6px 14px;
  min-height: 36px;
  min-width: 44px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: 500;
  font-family: var(--font-body);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition:
    color var(--transition-smooth),
    background-color var(--transition-smooth),
    box-shadow var(--duration-moderate) var(--ease-out-expo),
    transform var(--transition-micro);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  -webkit-tap-highlight-color: transparent;
}

.range-tab:hover {
  color: var(--color-text-primary);
}

.range-tab:active {
  transform: scale(0.96);
}

.range-tab.active {
  background: var(--color-surface);
  color: var(--color-primary);
  box-shadow: var(--shadow-xs);
}

.chart-tabs {
  display: flex;
  gap: 4px;
  background: var(--color-bg-secondary);
  padding: 3px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.chart-tab {
  padding: 5px 12px;
  min-height: 32px;
  min-width: 44px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 500;
  font-family: var(--font-body);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition:
    color var(--transition-smooth),
    background-color var(--transition-smooth),
    box-shadow var(--duration-moderate) var(--ease-out-expo),
    transform var(--transition-micro);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  -webkit-tap-highlight-color: transparent;
}

.chart-tab:hover {
  color: var(--color-text-primary);
}

.chart-tab:active {
  transform: scale(0.96);
}

.chart-tab.active {
  background: var(--color-surface);
  color: var(--color-primary);
  box-shadow: var(--shadow-xs);
}

.chart-body {
  padding: 20px 24px;
  min-width: 0;
  box-sizing: border-box;
}

.trend-chart {
  width: 100%;
  height: 240px;
  display: block;
}

.grid-line {
  stroke: var(--color-border-light);
  stroke-width: 1;
  stroke-dasharray: 4 4;
}

.y-label {
  font-size: var(--font-size-2xs);
  fill: var(--color-text-tertiary);
  text-anchor: end;
  font-family: var(--font-body);
}

.x-label {
  font-size: var(--font-size-2xs);
  fill: var(--color-text-tertiary);
  text-anchor: middle;
  font-family: var(--font-body);
}

.line {
  stroke-width: 2;
  fill: none;
  transition: opacity var(--transition-fluid);
}

.created-line {
  stroke: var(--color-primary);
}

.completed-line {
  stroke: #22c55e;
}

.area {
  transition: opacity var(--transition-fluid);
}

.created-area {
  fill: url(#createdGradient);
}

.completed-area {
  fill: url(#completedGradient);
}

.point {
  transition:
    r var(--transition-smooth),
    stroke-width var(--transition-smooth),
    opacity var(--transition-smooth);
}

.point:hover {
  r: 6;
  stroke-width: 3;
}

.created-point {
  fill: var(--color-surface);
  stroke: var(--color-primary);
  stroke-width: 2;
}

.completed-point {
  fill: var(--color-surface);
  stroke: #22c55e;
  stroke-width: 2;
}

.chart-legend {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.created-dot {
  background: var(--color-primary);
}

.completed-dot {
  background: #22c55e;
}

.legend-text {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.charts-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.half-card .chart-body {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.pie-chart {
  width: 200px;
  height: 200px;
  max-width: 100%;
  margin-bottom: 16px;
}

.pie-slice {
  transition:
    opacity var(--transition-smooth),
    transform var(--duration-moderate) var(--ease-spring-soft);
  cursor: pointer;
  transform-origin: center;
}

.pie-slice:hover {
  opacity: 0.88;
  transform: scale(1.04);
}

.pie-inner {
  fill: var(--color-surface);
}

.pie-legend {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.pie-legend-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: var(--font-size-sm);
  min-width: 0;
}

.legend-name {
  flex: 1;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.legend-count {
  color: var(--color-text-secondary);
  min-width: 24px;
  text-align: right;
  flex-shrink: 0;
}

.legend-percent {
  color: var(--color-text-tertiary);
  min-width: 40px;
  text-align: right;
  font-weight: 500;
  flex-shrink: 0;
}

.heatmap-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  width: 100%;
}

.heatmap-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  width: 100%;
  max-width: 360px;
}

.heatmap-cell {
  aspect-ratio: 1;
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  transition:
    transform var(--transition-smooth),
    box-shadow var(--transition-smooth);
  cursor: default;
  min-width: 0;
  min-height: 44px;
  -webkit-tap-highlight-color: transparent;
}

.heatmap-cell:hover {
  transform: scale(1.1);
  box-shadow: var(--shadow-sm);
  z-index: 1;
}

.heatmap-count {
  font-size: var(--font-size-lg);
  font-weight: 600;
  font-family: var(--font-title);
  white-space: nowrap;
}

.heatmap-day {
  font-size: var(--font-size-2xs);
  opacity: 0.7;
  white-space: nowrap;
}

.heatmap-cell.level-0 {
  background: var(--color-bg-secondary);
  color: var(--color-text-tertiary);
}

.heatmap-cell.level-1 {
  background: rgba(34, 197, 94, 0.15);
  color: var(--color-text-primary);
}

.heatmap-cell.level-2 {
  background: rgba(34, 197, 94, 0.3);
  color: var(--color-text-primary);
}

.heatmap-cell.level-3 {
  background: rgba(34, 197, 94, 0.5);
  color: white;
}

.heatmap-cell.level-4 {
  background: #22c55e;
  color: white;
}

.heatmap-legend {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.heatmap-legend-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  white-space: nowrap;
}

.heatmap-legend-cells {
  display: flex;
  gap: 4px;
}

.heatmap-legend-cell {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  flex-shrink: 0;
}

.heatmap-legend-cell.level-0 {
  background: var(--color-bg-secondary);
}
.heatmap-legend-cell.level-1 {
  background: rgba(34, 197, 94, 0.15);
}
.heatmap-legend-cell.level-2 {
  background: rgba(34, 197, 94, 0.3);
}
.heatmap-legend-cell.level-3 {
  background: rgba(34, 197, 94, 0.5);
}
.heatmap-legend-cell.level-4 {
  background: #22c55e;
}

.weekday-chart {
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  height: 180px;
  padding: 0 20px;
  width: 100%;
  box-sizing: border-box;
  min-width: 0;
}

.weekday-bar-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.weekday-bar-container {
  width: 36px;
  max-width: 100%;
  height: 120px;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: flex-end;
  overflow: hidden;
}

.weekday-bar {
  width: 100%;
  background: linear-gradient(180deg, var(--color-primary), var(--color-primary-dark));
  border-radius: var(--radius-sm);
  transition: height var(--duration-slow) var(--ease-spring-soft);
  min-height: 4px;
}

.weekday-bar-wrapper {
  transition: transform var(--transition-micro);
}

.weekday-bar-wrapper:hover {
  transform: translateY(-2px);
}

.weekday-bar-wrapper:hover .weekday-bar {
  filter: brightness(1.08);
}

.weekday-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.weekday-count {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  font-family: var(--font-title);
  white-space: nowrap;
}

@media (min-width: 768px) and (max-width: 1023px) {
  .content-inner {
    padding: 0 32px 40px 32px;
  }

  .content-header {
    padding: 36px 0 20px 0;
  }

  .content-header h1 {
    font-size: var(--font-size-h2);
  }

  .overview-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .secondary-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .charts-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 767px) {
  .content-inner {
    padding: 0 16px 120px 16px;
  }

  .content-header {
    padding: 24px 0 16px 0;
    margin-bottom: 12px;
  }

  .content-header h1 {
    font-size: var(--font-size-2xl);
  }

  .header-subtitle {
    font-size: var(--font-size-sm);
  }

  .overview-cards {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-bottom: 12px;
  }

  .secondary-cards {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-bottom: 16px;
  }

  .stat-card {
    padding: 14px;
    gap: 12px;
  }

  .stat-card.mini-card {
    padding: 12px;
    gap: 10px;
  }

  .stat-icon-wrap {
    width: 40px;
    height: 40px;
    min-width: 40px;
  }

  .stat-card.mini-card .stat-icon-wrap {
    width: 36px;
    height: 36px;
    min-width: 36px;
  }

  .stat-label {
    font-size: var(--font-size-xs);
  }

  .stat-value {
    font-size: var(--font-size-2xl);
  }

  .stat-value.mini {
    font-size: var(--font-size-xl);
  }

  .stat-sub {
    font-size: var(--font-size-2xs);
  }

  .focus-value {
    font-size: var(--font-size-2xl);
  }

  .focus-unit {
    font-size: var(--font-size-xs);
  }

  .stat-value-unit {
    font-size: var(--font-size-xs);
  }

  .stat-value.mini .stat-value-unit {
    font-size: var(--font-size-2xs);
  }

  .ring-chart {
    width: 52px;
    height: 52px;
    min-width: 52px;
  }

  .ring-text {
    font-size: var(--font-size-xs);
  }

  .chart-card {
    margin-bottom: 16px;
  }

  .chart-header {
    padding: 14px 16px 10px 16px;
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }

  .chart-title {
    font-size: var(--font-size-base);
  }

  .range-tab {
    padding: 6px 12px;
    min-height: 36px;
    font-size: var(--font-size-sm);
  }

  .chart-tab {
    padding: 5px 10px;
    min-height: 34px;
    min-width: 44px;
    font-size: var(--font-size-xs);
  }

  .chart-body {
    padding: 14px 12px;
  }

  .charts-row {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .trend-chart {
    height: 200px;
  }

  .chart-legend {
    gap: 16px;
  }

  .pie-chart {
    width: 180px;
    height: 180px;
  }

  .pie-legend-item {
    font-size: var(--font-size-xs);
    gap: 8px;
  }

  .legend-count {
    min-width: 20px;
  }

  .legend-percent {
    min-width: 36px;
  }

  .heatmap-grid {
    gap: 6px;
  }

  .heatmap-cell {
    min-height: 40px;
  }

  .heatmap-count {
    font-size: var(--font-size-body);
  }

  .heatmap-day {
    font-size: var(--font-size-3xs);
  }

  .weekday-chart {
    padding: 0 8px;
    height: 160px;
  }

  .weekday-bar-container {
    width: 28px;
    height: 100px;
  }

  .weekday-label {
    font-size: var(--font-size-2xs);
  }

  .weekday-count {
    font-size: var(--font-size-xs);
  }

  .weekday-bar-wrapper {
    gap: 6px;
  }
}

@media (max-width: 480px) {
  .content-inner {
    padding: 0 12px 100px 12px;
  }

  .content-header {
    padding: 20px 0 14px 0;
  }

  .content-header h1 {
    font-size: var(--font-size-h3);
  }

  .header-subtitle {
    font-size: var(--font-size-xs);
  }

  .overview-cards {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 10px;
  }

  .secondary-cards {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 14px;
  }

  .stat-card {
    padding: 12px;
    gap: 10px;
  }

  .stat-card.mini-card {
    padding: 10px;
    gap: 8px;
  }

  .stat-icon-wrap {
    width: 36px;
    height: 36px;
    min-width: 36px;
  }

  .stat-card.mini-card .stat-icon-wrap {
    width: 32px;
    height: 32px;
    min-width: 32px;
  }

  .stat-label {
    font-size: var(--font-size-2xs);
  }

  .stat-value {
    font-size: var(--font-size-h3);
  }

  .stat-value.mini {
    font-size: var(--font-size-lg);
  }

  .stat-sub {
    font-size: var(--font-size-3xs);
  }

  .focus-value {
    font-size: var(--font-size-xl);
  }

  .focus-unit {
    font-size: var(--font-size-2xs);
    margin-right: 2px;
  }

  .stat-value-unit {
    font-size: var(--font-size-2xs);
  }

  .stat-value.mini .stat-value-unit {
    font-size: var(--font-size-3xs);
  }

  .ring-chart {
    width: 44px;
    height: 44px;
    min-width: 44px;
  }

  .ring-text {
    font-size: var(--font-size-2xs);
  }

  .chart-card {
    margin-bottom: 14px;
  }

  .chart-header {
    padding: 12px 12px 10px 12px;
    gap: 8px;
  }

  .chart-title {
    font-size: var(--font-size-body);
  }

  .range-tabs {
    width: 100%;
  }

  .range-tab {
    flex: 1;
    padding: 6px 8px;
    min-height: 40px;
    font-size: var(--font-size-xs);
  }

  .chart-tab {
    padding: 5px 8px;
    min-height: 36px;
    font-size: var(--font-size-2xs);
  }

  .chart-body {
    padding: 12px 10px;
  }

  .charts-row {
    gap: 14px;
  }

  .trend-chart {
    height: 180px;
  }

  .y-label,
  .x-label {
    font-size: var(--font-size-3xs);
  }

  .chart-legend {
    gap: 12px;
    margin-top: 10px;
  }

  .legend-text {
    font-size: var(--font-size-xs);
  }

  .pie-chart {
    width: 160px;
    height: 160px;
    margin-bottom: 12px;
  }

  .pie-legend {
    gap: 6px;
  }

  .pie-legend-item {
    font-size: var(--font-size-2xs);
    gap: 6px;
  }

  .legend-count {
    min-width: 18px;
  }

  .legend-percent {
    min-width: 32px;
  }

  .heatmap-grid {
    gap: 4px;
    max-width: 100%;
  }

  .heatmap-cell {
    min-height: 36px;
  }

  .heatmap-count {
    font-size: var(--font-size-sm);
  }

  .heatmap-day {
    font-size: var(--font-size-3xs);
  }

  .heatmap-body {
    gap: 16px;
  }

  .weekday-chart {
    padding: 0 4px;
    height: 150px;
  }

  .weekday-bar-container {
    width: 24px;
    height: 90px;
  }

  .weekday-label {
    font-size: var(--font-size-3xs);
  }

  .weekday-count {
    font-size: var(--font-size-2xs);
  }

  .weekday-bar-wrapper {
    gap: 4px;
  }
}
</style>
