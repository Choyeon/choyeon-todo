<template>
  <div class="calendar-view">
    <div class="content-inner">
      <div class="content-header">
        <div class="header-row">
          <h1>{{ $t('calendar.viewTitle') }}</h1>
          <div class="view-toggle">
            <button
              class="toggle-btn"
              :class="{ active: viewMode === 'month' }"
              @click="viewMode = 'month'"
              :aria-label="$t('calendar.monthView')"
            >
              <Calendar :size="18" />
              <span>{{ $t('calendar.monthView') }}</span>
            </button>
            <button
              class="toggle-btn"
              :class="{ active: viewMode === 'timeline' }"
              @click="viewMode = 'timeline'"
              :aria-label="$t('calendar.timelineView')"
            >
              <Clock :size="18" />
              <span>{{ $t('calendar.timelineView') }}</span>
            </button>
          </div>
        </div>
        <p class="header-subtitle">
          {{
            viewMode === 'month' ? currentYearMonthFormatted : selectedDateFormatted
          }}
        </p>
      </div>

      <template v-if="viewMode === 'month'">
        <div class="calendar-card">
          <div class="cal-nav">
            <button class="cal-nav-btn" @click="prevMonth" :aria-label="$t('calendar.prevMonth')">
              <ChevronLeft :size="20" />
            </button>
            <span class="cal-nav-title">{{ currentYearMonthFormatted }}</span>
            <div class="cal-nav-right">
              <button
                v-if="!isCurrentMonth"
                class="today-btn"
                @click="goToToday"
                :aria-label="$t('calendar.backToToday')"
              >
                {{ $t('calendar.today') }}
              </button>
              <button class="cal-nav-btn" @click="nextMonth" :aria-label="$t('calendar.nextMonth')">
                <ChevronRight :size="20" />
              </button>
            </div>
          </div>

          <div class="cal-weekdays">
            <div v-for="(weekday, index) in weekdayLabels" :key="index" class="cal-weekday">{{ weekday }}</div>
          </div>

          <div class="cal-grid" :key="`${currentYear}-${currentMonth}`">
            <div
              v-for="(day, index) in calendarDays"
              :key="index"
              class="cal-day"
              :class="{
                'other-month': !day.isCurrentMonth,
                today: day.isToday,
                selected: day.dateStr === selectedDate
              }"
              role="button"
              tabindex="0"
              :aria-label="getDayAriaLabel(day)"
              :aria-current="day.isToday ? 'date' : undefined"
              :style="{ animationDelay: `${index * 8}ms` }"
              @click="selectDate(day)"
              @keydown.enter="selectDate(day)"
              @keydown.space.prevent="selectDate(day)"
            >
              {{ day.day }}
              <span v-if="hasTasks(day.dateStr)" class="cal-dot"></span>
            </div>
          </div>
        </div>

        <h2 class="section-title">{{ $t('calendar.tasksForDate', { date: selectedDateFormatted }) }}</h2>
        <TaskList :tasks="selectedTasks" empty-type="planned" />
      </template>

      <template v-else>
        <div class="timeline-container">
          <div class="timeline-header">
            <button class="timeline-nav-btn" @click="prevDay" :aria-label="$t('calendar.prevDay')">
              <ChevronLeft :size="20" />
            </button>
            <div class="timeline-date-info">
              <h2 class="timeline-date">{{ selectedDateFormatted }}</h2>
              <span class="timeline-weekday">{{ selectedWeekday }}</span>
            </div>
            <div class="timeline-nav-right">
              <button v-if="!isToday" class="today-btn" @click="goToToday" :aria-label="$t('calendar.backToToday')">
                {{ $t('calendar.today') }}
              </button>
              <button class="timeline-nav-btn" @click="nextDay" :aria-label="$t('calendar.nextDay')">
                <ChevronRight :size="20" />
              </button>
            </div>
          </div>

          <div class="timeline-content">
            <div v-if="allDayTasks.length > 0" class="all-day-section">
              <div class="all-day-label">{{ $t('calendar.allDay') }}</div>
              <div class="all-day-tasks">
                <div
                  v-for="task in allDayTasks"
                  :key="task.id"
                  class="timeline-task-card all-day"
                  :class="[`cat-${task.category}`, { completed: task.completed }]"
                  @click="onEditTask(task)"
                >
                  <div class="task-color-bar" :style="getCategoryColor(task.category)"></div>
                  <div class="task-content">
                    <span class="task-title">{{ task.title }}</span>
                    <div class="task-meta-row">
                      <Star v-if="task.important" class="meta-icon important" :size="12" />
                      <Bell v-if="task.reminder" class="meta-icon" :size="12" />
                      <span class="cat-pill" :style="getCategoryStyle(task.category)">
                        {{ getCategoryName(task.category) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="timeline-scroll">
              <div class="timeline-grid">
                <div class="timeline-hours">
                  <div v-for="hour in 24" :key="hour - 1" class="hour-marker">
                    {{ formatHour(hour - 1) }}
                  </div>
                </div>

                <div class="timeline-tasks" @dragover.prevent="onDragOver" @drop="onDrop">
                  <div v-for="hour in 24" :key="`line-${hour - 1}`" class="hour-line"></div>

                  <div
                    v-for="task in timedTasks"
                    :key="task.id"
                    class="timeline-task-card"
                    :class="[`cat-${task.category}`, { completed: task.completed }]"
                    :style="getTaskPosition(task)"
                    draggable="true"
                    @dragstart="onDragStart($event, task)"
                    @dragend="onDragEnd"
                    @click="onEditTask(task)"
                  >
                    <div class="task-connector"></div>
                    <div class="task-dot"></div>
                    <div class="task-color-bar" :style="getCategoryColor(task.category)"></div>
                    <div class="task-content">
                      <div class="task-time">{{ task.time }}</div>
                      <span class="task-title">{{ task.title }}</span>
                      <div class="task-meta-row">
                        <Star v-if="task.important" class="meta-icon important" :size="12" />
                        <Bell v-if="task.reminder" class="meta-icon" :size="12" />
                        <span class="cat-pill" :style="getCategoryStyle(task.category)">
                          {{ getCategoryName(task.category) }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <EmptyState
              v-if="selectedTasks.length === 0"
              type="planned"
              :title="$t('empty.todayTitle')"
              :description="$t('empty.todaySubtitle')"
              :action-label="$t('calendar.addTask')"
              @action="openAddTask && openAddTask()"
            />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTaskStore } from '../stores/taskStore'
import { getTodayStr, formatDateStr, parseDateStr } from '../utils/date'
import TaskList from '../components/TaskList.vue'
import EmptyState from '../components/EmptyState.vue'
import { ChevronLeft, ChevronRight, Calendar, Clock, Star, Bell } from '@lucide/vue'

const { t, tm } = useI18n()

const taskStore = useTaskStore()
const openEditTask = inject('openEditTask')
const openAddTask = inject('openAddTask')

const viewMode = ref('month')

const todayStr = computed(() => getTodayStr())
const todayDate = computed(() => parseDateStr(todayStr.value))

const initDate = new Date()
const currentYear = ref(initDate.getFullYear())
const currentMonth = ref(initDate.getMonth())
const selectedDate = ref(formatDateStr(initDate))

const isCurrentMonth = computed(() => {
  return (
    currentYear.value === todayDate.value.getFullYear() &&
    currentMonth.value === todayDate.value.getMonth()
  )
})

const isToday = computed(() => {
  return selectedDate.value === todayStr.value
})

const selectedDateFormatted = computed(() => {
  const date = parseDateStr(selectedDate.value)
  return t('date.monthDayFormat', { month: date.getMonth() + 1, day: date.getDate() })
})

const selectedWeekday = computed(() => {
  const date = parseDateStr(selectedDate.value)
  const weekdays = tm('date.weekdays')
  return weekdays[date.getDay()]
})

const currentYearMonthFormatted = computed(() => {
  return t('date.yearMonthFormat', { year: currentYear.value, month: currentMonth.value + 1 })
})

const weekdayLabels = computed(() => {
  const weekdays = tm('date.weekdays')
  return [weekdays[1], weekdays[2], weekdays[3], weekdays[4], weekdays[5], weekdays[6], weekdays[0]]
})

const calendarDays = computed(() => {
  const days = []
  const firstDay = new Date(currentYear.value, currentMonth.value, 1)
  const lastDay = new Date(currentYear.value, currentMonth.value + 1, 0)

  let firstWeekday = firstDay.getDay() - 1
  if (firstWeekday < 0) firstWeekday = 6

  const prevMonthLastDay = new Date(currentYear.value, currentMonth.value, 0).getDate()
  for (let i = firstWeekday - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i
    const date = new Date(currentYear.value, currentMonth.value - 1, day)
    days.push({
      day,
      dateStr: formatDateStr(date),
      isCurrentMonth: false,
      isToday: false
    })
  }

  const today = todayStr.value
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const date = new Date(currentYear.value, currentMonth.value, i)
    const dateStr = formatDateStr(date)
    days.push({
      day: i,
      dateStr,
      isCurrentMonth: true,
      isToday: dateStr === today
    })
  }

  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    const date = new Date(currentYear.value, currentMonth.value + 1, i)
    days.push({
      day: i,
      dateStr: formatDateStr(date),
      isCurrentMonth: false,
      isToday: false
    })
  }

  return days
})

const taskDateMap = computed(() => {
  const map = new Map()
  for (const task of taskStore.tasks) {
    if (task.completed) continue
    map.set(task.date, (map.get(task.date) || 0) + 1)
  }
  return map
})

const selectedTasks = computed(() => {
  return taskStore.getTasksByDate(selectedDate.value)
})

const allDayTasks = computed(() => {
  return selectedTasks.value.filter((t) => !t.time)
})

const timedTasks = computed(() => {
  return selectedTasks.value.filter((t) => t.time).sort((a, b) => a.time.localeCompare(b.time))
})

const hasTasks = (dateStr) => {
  return (taskDateMap.value.get(dateStr) || 0) > 0
}

const getDayAriaLabel = (day) => {
  let label = ''
  if (day.isToday) {
    label += t('calendar.todayAriaLabel') + '，'
  }
  label += day.dateStr
  if (hasTasks(day.dateStr)) {
    label += '，' + t('calendar.hasTasks')
  }
  return label
}

const prevMonth = () => {
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

const nextMonth = () => {
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value++
  } else {
    currentMonth.value++
  }
}

const prevDay = () => {
  const date = parseDateStr(selectedDate.value)
  date.setDate(date.getDate() - 1)
  selectedDate.value = formatDateStr(date)
  if (date.getMonth() !== currentMonth.value) {
    currentYear.value = date.getFullYear()
    currentMonth.value = date.getMonth()
  }
}

const nextDay = () => {
  const date = parseDateStr(selectedDate.value)
  date.setDate(date.getDate() + 1)
  selectedDate.value = formatDateStr(date)
  if (date.getMonth() !== currentMonth.value) {
    currentYear.value = date.getFullYear()
    currentMonth.value = date.getMonth()
  }
}

const goToToday = () => {
  const today = todayDate.value
  currentYear.value = today.getFullYear()
  currentMonth.value = today.getMonth()
  selectedDate.value = todayStr.value
}

const selectDate = (day) => {
  selectedDate.value = day.dateStr
  if (!day.isCurrentMonth) {
    const date = parseDateStr(day.dateStr)
    currentYear.value = date.getFullYear()
    currentMonth.value = date.getMonth()
  }
}

const formatHour = (hour) => {
  return `${hour.toString().padStart(2, '0')}:00`
}

const getTaskPosition = (task) => {
  if (!task.time) return {}
  const [hours, minutes] = task.time.split(':').map(Number)
  const totalMinutes = hours * 60 + minutes
  const top = (totalMinutes / 60) * 50
  return {
    top: `${top}px`
  }
}

const getCategoryName = (catId) => {
  const cat = taskStore.getCategoryById(catId)
  return cat ? cat.name : t('categories.other')
}

const getCategoryStyle = (catId) => {
  const cat = taskStore.getCategoryById(catId)
  if (!cat) {
    return {
      background: 'var(--color-bg-secondary)',
      color: 'var(--color-text-secondary)'
    }
  }
  const hex = cat.color
  return {
    background: hex + '15',
    color: hex
  }
}

const getCategoryColor = (catId) => {
  const cat = taskStore.getCategoryById(catId)
  return {
    background: cat ? cat.color : 'var(--color-text-tertiary)'
  }
}

const onEditTask = (task) => {
  if (openEditTask) {
    openEditTask(task)
  }
}

const draggedTask = ref(null)

const onDragStart = (e, task) => {
  draggedTask.value = task
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', task.id)
}

const onDragEnd = () => {
  draggedTask.value = null
}

const onDragOver = (e) => {
  e.preventDefault()
  const rect = e.currentTarget.getBoundingClientRect()
  const y = e.clientY - rect.top
  const hour = Math.floor(y / 50)
}

const onDrop = (e) => {
  e.preventDefault()
  if (!draggedTask.value) return

  const rect = e.currentTarget.getBoundingClientRect()
  const y = e.clientY - rect.top
  const hour = Math.max(0, Math.min(23, Math.floor(y / 50)))
  const minute = Math.max(0, Math.min(59, Math.floor((y % 50) / 10) * 10))
  const newTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`

  taskStore.updateTask(draggedTask.value.id, { time: newTime })

  draggedTask.value = null
}
</script>

<style scoped>
.calendar-view {
  min-height: 100%;
  background: transparent;
}

.content-inner {
  max-width: 760px;
  padding: 48px 48px 48px 48px;
  margin: 0 auto;
}

.content-header {
  margin-bottom: 24px;
  padding: 48px 0 28px 0;
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  gap: 12px;
  min-width: 0;
}

.header-row h1 {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.content-header h1 {
  font-size: var(--font-size-h1);
  font-weight: 300;
  margin: 0;
  color: var(--color-text-primary);
  letter-spacing: -0.5px;
  line-height: 1.2;
}

.view-toggle {
  display: flex;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-full);
  padding: 4px;
  gap: 2px;
}

.toggle-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: var(--radius-full);
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: 500;
  font-family: var(--font-body);
  cursor: pointer;
  transition:
    color var(--transition-smooth),
    background-color var(--transition-smooth),
    box-shadow var(--duration-moderate) var(--ease-out-expo),
    transform var(--transition-micro);
}

.toggle-btn:hover {
  color: var(--color-text-primary);
}

.toggle-btn:active {
  transform: scale(0.96);
}

.toggle-btn.active {
  background: var(--color-surface);
  color: var(--color-text-primary);
  box-shadow: var(--shadow-xs);
}

.toggle-btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.header-subtitle {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: var(--font-size-body);
  color: var(--color-text-secondary);
  margin: 0;
  font-weight: 500;
  letter-spacing: 0.2px;
}

.calendar-card {
  background: var(--card-bg);
  backdrop-filter: blur(var(--sidebar-search-blur)) saturate(var(--sidebar-search-saturate));
  -webkit-backdrop-filter: blur(var(--sidebar-search-blur)) saturate(var(--sidebar-search-saturate));
  border-radius: var(--radius-xl);
  padding: 20px;
  border: 1px solid var(--card-border);
  box-shadow: var(--card-shadow);
}

.cal-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding: 0 4px;
}

.cal-nav-btn {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    background var(--transition-smooth),
    color var(--transition-smooth),
    transform var(--transition-micro);
}

.cal-nav-btn:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
}

.cal-nav-btn:active {
  transform: scale(0.92);
}

.cal-nav-btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.cal-nav-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.today-btn {
  padding: 6px 14px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-primary);
  background: transparent;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  font-weight: 500;
  font-family: var(--font-body);
  cursor: pointer;
  transition:
    background var(--transition-smooth),
    color var(--transition-smooth),
    transform var(--transition-micro);
}

.today-btn:hover {
  background: var(--color-primary-surface);
}

.today-btn:active {
  transform: scale(0.96);
}

.cal-nav-title {
  font-family: var(--font-title);
  font-size: var(--font-size-h3);
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: -0.2px;
}

.cal-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 4px;
}

.cal-weekday {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-align: center;
  padding: 8px 0;
}

.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.cal-day {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: var(--font-size-body);
  font-weight: 500;
  color: var(--color-text-primary);
  position: relative;
  transition:
    background var(--transition-smooth),
    color var(--transition-smooth),
    transform var(--transition-micro) var(--ease-spring-soft);
  animation: calDayFadeIn var(--duration-normal) var(--ease-out-quart) backwards;
}

.cal-day:hover {
  background: var(--color-bg-secondary);
  transform: scale(1.06);
}

.cal-day:active {
  transform: scale(0.96);
}

.cal-day:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.cal-day.other-month {
  color: var(--color-text-tertiary);
  opacity: 0.4;
}

.cal-day.today {
  background: var(--color-primary);
  color: var(--color-text-on-primary);
  font-weight: 700;
}

.cal-day.today:hover {
  background: var(--color-primary-dark);
}

.cal-day.selected {
  background: var(--color-primary-lightest);
  color: var(--color-primary-dark);
}

.cal-day.selected.today {
  background: var(--color-primary);
  color: var(--color-text-on-primary);
}

@keyframes calDayFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.cal-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-primary);
  position: absolute;
  bottom: 6px;
}

.cal-day.today .cal-dot {
  background: var(--color-text-on-primary);
}

.section-title {
  font-family: var(--font-title);
  font-size: var(--font-size-h2);
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 28px 0 14px 0;
  letter-spacing: -0.3px;
}

.timeline-container {
  background: var(--card-bg);
  backdrop-filter: blur(var(--sidebar-search-blur)) saturate(var(--sidebar-search-saturate));
  -webkit-backdrop-filter: blur(var(--sidebar-search-blur)) saturate(var(--sidebar-search-saturate));
  border-radius: var(--radius-xl);
  border: 1px solid var(--card-border);
  overflow: hidden;
  box-shadow: var(--card-shadow);
}

.timeline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border-light);
}

.timeline-nav-btn {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    background var(--transition-smooth),
    color var(--transition-smooth),
    transform var(--transition-micro);
}

.timeline-nav-btn:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
}

.timeline-nav-btn:active {
  transform: scale(0.92);
}

.timeline-nav-btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.timeline-date-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.timeline-date {
  font-family: var(--font-title);
  font-size: var(--font-size-h3);
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
  letter-spacing: -0.2px;
}

.timeline-weekday {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-weight: 400;
}

.timeline-nav-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.timeline-content {
  position: relative;
}

.all-day-section {
  display: flex;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border-light);
  background: var(--color-bg-secondary);
}

.all-day-label {
  width: 60px;
  min-width: 60px;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-tertiary);
  padding-top: 4px;
}

.all-day-tasks {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.timeline-scroll {
  max-height: 600px;
  overflow-y: auto;
  overflow-x: hidden;
}

.timeline-grid {
  display: flex;
  position: relative;
  min-height: 1200px;
}

.timeline-hours {
  width: 60px;
  min-width: 60px;
  padding: 0 12px 0 20px;
  border-right: 1px solid var(--color-border-light);
  position: relative;
}

.hour-marker {
  height: 50px;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  font-size: var(--font-size-2xs);
  font-weight: 500;
  color: var(--color-text-tertiary);
  padding-top: 4px;
  line-height: 1;
}

.timeline-tasks {
  flex: 1;
  position: relative;
  padding: 0 16px;
}

.timeline-tasks.drag-over {
  background: rgba(74, 144, 217, 0.05);
}

.hour-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 50px;
  border-bottom: 1px solid var(--color-border-light);
}

.hour-line:nth-child(1) {
  top: 0;
}
.hour-line:nth-child(2) {
  top: 50px;
}
.hour-line:nth-child(3) {
  top: 100px;
}
.hour-line:nth-child(4) {
  top: 150px;
}
.hour-line:nth-child(5) {
  top: 200px;
}
.hour-line:nth-child(6) {
  top: 250px;
}
.hour-line:nth-child(7) {
  top: 300px;
}
.hour-line:nth-child(8) {
  top: 350px;
}
.hour-line:nth-child(9) {
  top: 400px;
}
.hour-line:nth-child(10) {
  top: 450px;
}
.hour-line:nth-child(11) {
  top: 500px;
}
.hour-line:nth-child(12) {
  top: 550px;
}
.hour-line:nth-child(13) {
  top: 600px;
}
.hour-line:nth-child(14) {
  top: 650px;
}
.hour-line:nth-child(15) {
  top: 700px;
}
.hour-line:nth-child(16) {
  top: 750px;
}
.hour-line:nth-child(17) {
  top: 800px;
}
.hour-line:nth-child(18) {
  top: 850px;
}
.hour-line:nth-child(19) {
  top: 900px;
}
.hour-line:nth-child(20) {
  top: 950px;
}
.hour-line:nth-child(21) {
  top: 1000px;
}
.hour-line:nth-child(22) {
  top: 1050px;
}
.hour-line:nth-child(23) {
  top: 1100px;
}
.hour-line:nth-child(24) {
  top: 1150px;
}

.timeline-task-card {
  position: absolute;
  left: 16px;
  right: 16px;
  display: flex;
  align-items: stretch;
  background: var(--color-surface);
  border: none;
  border-radius: var(--radius-lg);
  cursor: grab;
  transition:
    transform var(--duration-moderate) var(--ease-spring-soft),
    box-shadow var(--duration-moderate) var(--ease-out-expo);
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.06),
    0 1px 2px rgba(0, 0, 0, 0.04);
  z-index: 1;
}

.timeline-task-card:active {
  cursor: grabbing;
  transition-duration: var(--duration-instant);
}

.timeline-task-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateX(3px);
  z-index: 2;
}

.timeline-task-card:hover .task-color-bar {
  width: 5px;
}

.timeline-task-card.all-day {
  position: relative;
  left: 0;
  right: 0;
}

.timeline-task-card.all-day .task-connector,
.timeline-task-card.all-day .task-dot {
  display: none;
}

.task-connector {
  position: absolute;
  left: -16px;
  top: 14px;
  width: 16px;
  height: 2px;
  background: var(--color-primary);
}

.task-dot {
  position: absolute;
  left: -22px;
  top: 10px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color-primary);
  border: 2px solid var(--color-surface);
  box-shadow: 0 0 0 2px var(--color-primary);
  z-index: 2;
}

.task-color-bar {
  width: 4px;
  min-width: 4px;
  border-radius: var(--radius-md) 0 0 var(--radius-md);
  transition: width var(--transition-smooth);
}

.timeline-task-card.all-day .task-color-bar {
  border-radius: var(--radius-sm) 0 0 var(--radius-sm);
}

.task-content {
  flex: 1;
  padding: 10px 14px;
  min-width: 0;
}

.task-time {
  font-size: var(--font-size-2xs);
  font-weight: 600;
  color: var(--color-primary);
  margin-bottom: 4px;
  font-family: var(--font-body);
}

.task-title {
  font-size: var(--font-size-body);
  font-weight: 500;
  color: var(--color-text-primary);
  line-height: 1.4;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.timeline-task-card.completed .task-title {
  text-decoration: line-through;
  text-decoration-color: var(--color-text-tertiary);
  text-decoration-thickness: 1px;
  color: var(--color-text-tertiary);
}

.task-meta-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  flex-wrap: wrap;
}

.meta-icon {
  width: 12px;
  height: 12px;
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.meta-icon.important {
  color: var(--state-warning);
  fill: var(--state-warning);
}

.cat-pill {
  font-size: var(--font-size-3xs);
  padding: 1px 8px;
  border-radius: var(--radius-full);
  font-weight: 500;
  white-space: nowrap;
  letter-spacing: 0.2px;
  line-height: 1.4;
}

@media (min-width: 768px) and (max-width: 1023px) {
  .content-inner {
    padding: 36px 32px 40px 32px;
  }

  .content-header {
    padding: 32px 0 24px 0;
  }

  .content-header h1 {
    font-size: var(--font-size-h2);
  }
}

@media (max-width: 767px) {
  .content-inner {
    padding: 0 16px 120px 16px;
  }

  .content-header {
    padding: 24px 0 16px 0;
    margin-bottom: 16px;
  }

  .content-header h1 {
    font-size: var(--font-size-2xl);
  }

  .header-row {
    gap: 8px;
  }

  .view-toggle {
    flex-shrink: 0;
  }

  .calendar-card {
    padding: 12px;
  }

  .cal-nav {
    margin-bottom: 12px;
  }

  .cal-nav-btn {
    width: 44px;
    height: 44px;
    min-width: 44px;
  }

  .cal-nav-title {
    font-size: var(--font-size-h4);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
    min-width: 0;
    text-align: center;
  }

  .today-btn {
    min-height: 36px;
    padding: 6px 12px;
    font-size: var(--font-size-sm);
  }

  .cal-weekday {
    font-size: var(--font-size-2xs);
    padding: 6px 0;
  }

  .cal-day {
    min-height: 40px;
    font-size: var(--font-size-body);
  }

  .cal-dot {
    bottom: 4px;
    width: 5px;
    height: 5px;
  }

  .section-title {
    font-size: var(--font-size-xl);
    margin: 20px 0 12px 0;
  }

  .toggle-btn span {
    display: none;
  }

  .toggle-btn {
    padding: 8px;
    min-width: 44px;
    min-height: 44px;
    justify-content: center;
  }

  .toggle-btn :deep(svg) {
    width: 20px;
    height: 20px;
  }

  .timeline-container {
    border-radius: var(--radius-xl);
  }

  .timeline-header {
    padding: 12px 16px;
    min-height: 56px;
  }

  .timeline-nav-btn {
    width: 44px;
    height: 44px;
    min-width: 44px;
  }

  .timeline-date-info {
    flex: 1;
    min-width: 0;
    justify-content: center;
    text-align: center;
    gap: 8px;
  }

  .timeline-date {
    font-size: var(--font-size-xl);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .timeline-weekday {
    font-size: var(--font-size-xs);
    flex-shrink: 0;
  }

  .all-day-section {
    padding: 12px 16px;
  }

  .all-day-label {
    width: 48px;
    min-width: 48px;
    font-size: var(--font-size-2xs);
    flex-shrink: 0;
  }

  .all-day-tasks {
    min-width: 0;
  }

  .timeline-hours {
    width: 48px;
    min-width: 48px;
    padding: 0 8px 0 16px;
    flex-shrink: 0;
  }

  .hour-marker {
    font-size: var(--font-size-3xs);
  }

  .timeline-scroll {
    max-height: 70vh;
  }

  .timeline-tasks {
    padding: 0 12px;
    min-width: 0;
  }

  .timeline-task-card {
    left: 12px;
    right: 12px;
    min-width: 0;
  }

  .task-connector {
    left: -12px;
  }

  .task-dot {
    left: -18px;
  }

  .task-content {
    min-width: 0;
  }

  .task-title {
    font-size: var(--font-size-body);
  }

  .task-meta-row {
    gap: 4px;
  }

  .cat-pill {
    font-size: var(--font-size-3xs);
    padding: 1px 6px;
  }
}
</style>
