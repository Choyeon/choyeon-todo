<template>
  <div class="heatmap-grid-wrap" :class="{ compact }">
    <div class="heatmap-header">
      <div class="month-labels">
        <span
          v-for="(label, i) in monthLabels"
          :key="i"
          class="month-label"
          :style="{ left: label.offset + 'px' }"
          :title="label.month"
        >
          {{ label.month }}
        </span>
      </div>
    </div>

    <div class="heatmap-body">
      <div class="weekday-labels" aria-hidden="true">
        <span class="wd-label" v-if="startOfWeek === 1">Mon</span>
        <span class="wd-label"></span>
        <span class="wd-label" v-if="startOfWeek === 1">Wed</span>
        <span class="wd-label"></span>
        <span class="wd-label" v-if="startOfWeek === 1">Fri</span>
        <span class="wd-label"></span>
        <span class="wd-label" v-if="startOfWeek === 1">Sun</span>
        <template v-else>
          <span class="wd-label">Sun</span>
          <span class="wd-label"></span>
          <span class="wd-label">Tue</span>
          <span class="wd-label"></span>
          <span class="wd-label">Thu</span>
          <span class="wd-label"></span>
          <span class="wd-label">Sat</span>
        </template>
      </div>

      <div
        class="grid-scroll"
        ref="scrollRef"
        :style="{ maxHeight: compact ? '180px' : '140px' }"
      >
        <div
          class="grid-table"
          :style="{ gridTemplateColumns: `repeat(${weeks.length}, var(--cell-size))` }"
        >
          <div
            v-for="(week, wi) in weeks"
            :key="'wk-' + wi"
            class="week-col"
            :data-week-start="week.weekStart"
          >
            <div
              v-for="(cell, di) in week.cells"
              :key="cell.date"
              class="heat-cell"
              :class="[
                'score-' + cell.score,
                { future: !cell.inRange, active: selectedDate === cell.date }
              ]"
              :title="tooltipFor(cell)"
              @click="onCellClick(cell)"
              tabindex="0"
              @keydown.enter="onCellClick(cell)"
              role="button"
              :aria-label="tooltipFor(cell)"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <div class="heatmap-footer">
      <div class="legend">
        <span class="legend-label">{{ tLeg('less') }}</span>
        <span class="legend-cell score-0"></span>
        <span class="legend-cell score-1"></span>
        <span class="legend-cell score-2"></span>
        <span class="legend-cell score-3"></span>
        <span class="legend-cell score-4"></span>
        <span class="legend-label">{{ tLeg('more') }}</span>
      </div>
      <div class="stats-inline" v-if="showInlineStats">
        <span class="stats-item"
          ><b>{{ totals.tasksCompleted }}</b> {{ tLeg('tasksCompleted') }}</span
        >
        <span class="stats-item"
          ><b>{{ totals.pomodoroMinutes }}</b> {{ tLeg('minutes') }}</span
        >
        <span class="stats-item"
          ><b>{{ daysWithActivity }}</b> {{ tLeg('daysWithActivity') }}</span
        >
        <span class="stats-item"
          ><b>{{ currentStreakDays }}</b> {{ tLeg('currentStreak') }}</span
        >
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { buildHeatmapGrid } from '../../utils/heatmap'

const props = defineProps({
  tasks: { type: Array, default: () => [] },
  sessionHistory: { type: Array, default: () => [] },
  range: { type: String, default: 'ytd' }, // 'ytd'|'180d'|'90d'|'30d'
  cellStart: { type: String, default: null },
  weeks: { type: Number, default: 53 },
  startOfWeek: { type: Number, default: 1 }, // 1=Mon, 0=Sun
  compact: { type: Boolean, default: false },
  showInlineStats: { type: Boolean, default: true }
})

const emit = defineEmits(['select-date'])
const { t } = useI18n()

const scrollRef = ref(null)
const selectedDate = ref(null)

// 懒构建：props 变化时会重新计算
const grid = computed(() =>
  buildHeatmapGrid({
    tasks: props.tasks,
    sessionHistory: props.sessionHistory,
    range: props.range,
    cellStart: props.cellStart,
    weeks: props.weeks,
    startOfWeek: props.startOfWeek
  })
)
const weeks = computed(() => grid.value.weeks)
const totals = computed(() => grid.value.totals)
const daysWithActivity = computed(() => grid.value.daysWithActivity)
const currentStreakDays = computed(() => grid.value.currentStreakDays)

const monthLabels = computed(() => {
  const ws = weeks.value
  if (!ws.length) return []
  const labels = []
  let curMonth = ''
  for (let i = 0; i < ws.length; i++) {
    const [y, m] = ws[i].weekStart.split('-')
    const mk = `${y}-${m}`
    if (mk !== curMonth) {
      curMonth = mk
      labels.push({
        month: `${parseInt(m)}/${parseInt(y) % 100}`,
        offset: i * 14 // 每个 cell 约 12 + gap 2 ≈ 14px
      })
    }
  }
  return labels
})

const tooltipFor = (cell) => {
  return `${cell.date}\n${tLeg('tasksCompleted')}: ${cell.tasksCompleted}\n${tLeg(
    'pomodoroMinutes'
  )}: ${cell.pomodoroMinutes}m`
}

const tLeg = (key) => {
  const map = {
    less: t('stats.less') || 'Less',
    more: t('stats.more') || 'More',
    tasksCompleted: t('stats.completedTasks') || 'Tasks completed',
    minutes: t('stats.minutesUnit') || 'min',
    daysWithActivity: t('stats.daysWithActivity') || 'active days',
    currentStreak: t('stats.streakDays') || 'day streak',
    pomodoroMinutes: t('stats.focusDuration') || 'Focus'
  }
  return map[key] || key
}

const onCellClick = (cell) => {
  if (!cell.inRange) return
  selectedDate.value = cell.date
  emit('select-date', cell.date)
}

// auto-scroll right (latest week visible)
if (typeof window !== 'undefined') {
  setTimeout(() => {
    if (scrollRef.value) scrollRef.value.scrollLeft = scrollRef.value.scrollWidth
  }, 50)
}
</script>

<style scoped>
.heatmap-grid-wrap {
  width: 100%;
  box-sizing: border-box;
}

.heatmap-header {
  position: relative;
  height: 18px;
  margin-left: 28px;
}

.month-labels {
  position: relative;
  width: 100%;
  height: 18px;
  font-size: var(--font-size-2xs);
  color: var(--color-text-tertiary);
  pointer-events: none;
}

.month-label {
  position: absolute;
  top: 2px;
  white-space: nowrap;
  transform: translateX(2px);
}

.heatmap-body {
  display: flex;
  gap: 4px;
}

.weekday-labels {
  display: grid;
  grid-template-rows: repeat(7, var(--cell-size));
  gap: 2px;
  width: 26px;
  flex-shrink: 0;
  padding-top: 0;
}

.wd-label {
  font-size: 9px;
  color: var(--color-text-tertiary);
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 2px;
}

.grid-scroll {
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 4px 2px 12px 2px;
  min-width: 0;
}

.grid-table {
  display: grid;
  gap: 2px;
  grid-auto-rows: var(--cell-size);
  --cell-size: 12px;
  width: max-content;
}

.week-col {
  display: grid;
  grid-template-rows: repeat(7, var(--cell-size));
  gap: 2px;
}

.heat-cell {
  width: var(--cell-size);
  height: var(--cell-size);
  border-radius: 2px;
  outline: 1px solid transparent;
  cursor: pointer;
  transition:
    transform var(--transition-micro),
    outline-color var(--transition-smooth);
}

.heat-cell:hover {
  transform: scale(1.3);
  z-index: 2;
}

.heat-cell.future {
  background: transparent;
  cursor: default;
  outline: none;
}

.heat-cell.future:hover {
  transform: none;
}

.heat-cell.active {
  outline-color: var(--color-primary);
  outline-width: 2px;
}

.heat-cell.score-0 {
  background: var(--color-bg-secondary);
}
.heat-cell.score-1 {
  background: rgba(34, 197, 94, 0.22);
}
.heat-cell.score-2 {
  background: rgba(34, 197, 94, 0.4);
}
.heat-cell.score-3 {
  background: rgba(34, 197, 94, 0.65);
}
.heat-cell.score-4 {
  background: #16a34a;
}

.heatmap-footer {
  margin-top: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.legend {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.legend-label {
  font-size: var(--font-size-2xs);
  color: var(--color-text-tertiary);
}

.legend-cell {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}
.legend-cell.score-0 {
  background: var(--color-bg-secondary);
}
.legend-cell.score-1 {
  background: rgba(34, 197, 94, 0.22);
}
.legend-cell.score-2 {
  background: rgba(34, 197, 94, 0.4);
}
.legend-cell.score-3 {
  background: rgba(34, 197, 94, 0.65);
}
.legend-cell.score-4 {
  background: #16a34a;
}

.stats-inline {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}
.stats-item {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
.stats-item b {
  font-weight: 600;
  color: var(--color-text-primary);
  margin-right: 2px;
}
</style>
