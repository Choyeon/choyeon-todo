<template>
  <div class="task-list-wrapper">
    <div class="task-list-container">
      <TransitionGroup name="task-list" tag="div" class="task-list" v-if="tasks.length > 0">
        <div
          v-for="task in tasks"
          :key="task.id"
          :data-task-id="task.id"
          class="task-row"
          :class="[
            {
              completed: task.completed,
              overdue: isOverdue(task),
              highlighted: isHighlighted(task.id),
              dragging: draggedTaskId === task.id,
              'drag-over': dragOverTaskId === task.id && draggedTaskId !== task.id,
              focused: taskStore.focusedTaskId === task.id
            }
          ]"
          draggable="false"
          @dragover.prevent="onDragOver($event, task.id)"
          @dragleave="onDragLeave"
          @drop="onDrop($event, task.id)"
        >
          <div
            class="drag-handle"
            draggable="true"
            @dragstart="onDragStart($event, task.id)"
            @dragend="onDragEnd"
            @mousedown.stop
          >
            <GripVertical :size="16" />
          </div>

          <div
            class="task-checkbox"
            :class="{ checked: task.completed, overdue: isOverdue(task) && !task.completed }"
            role="checkbox"
            :aria-checked="task.completed"
            :aria-label="task.completed ? $t('task.markIncomplete') : $t('task.markComplete')"
            tabindex="0"
            @click="toggleComplete(task.id)"
            @keydown.enter="toggleComplete(task.id)"
            @keydown.space.prevent="toggleComplete(task.id)"
          >
            <Check v-if="task.completed" :size="14" />
          </div>

          <div
            class="task-body"
            role="button"
            tabindex="0"
            :aria-label="$t('task.editTaskAria', { title: task.title })"
            @click="onEditTask(task)"
            @keydown.enter="onEditTask(task)"
          >
            <div class="task-title-row">
              <span
                v-if="task.priority !== undefined && task.priority < 4"
                class="priority-badge"
                :class="`priority-${task.priority}`"
              >
                P{{ task.priority }}
              </span>
              <p class="task-title" :class="{ completing: completingTaskId === task.id }">
                {{ task.title }}
              </p>
              <div class="title-icons">
                <RotateCw v-if="task.repeat" class="meta-icon repeat-icon" :size="14" />
              </div>
            </div>

            <div class="task-meta">
              <Star v-if="task.important" class="meta-icon important" :size="14" />
              <Bell v-if="task.reminder" class="meta-icon" :size="14" />
              <span class="cat-pill" :style="getCategoryStyle(task.category)">
                {{ getCategoryName(task.category) }}
              </span>
              <span class="task-date" :class="{ overdue: isOverdue(task) && !task.completed }">
                {{ formatDate(task) }}
              </span>
              <button
                v-if="task.subTasks && task.subTasks.length > 0"
                class="subtask-toggle"
                @click.stop="toggleSubTasks(task.id)"
              >
                <span>{{ getCompletedSubTasks(task) }}/{{ task.subTasks.length }}</span>
                <ChevronDown :size="14" :class="{ expanded: expandedTaskIds.has(task.id) }" />
              </button>
            </div>

            <div v-if="task.tags && task.tags.length > 0" class="task-tags">
              <span
                v-for="(tagId, _) in getDisplayTags(task.tags)"
                :key="tagId"
                class="tag-pill"
                :style="getTagStyle(tagId)"
              >
                {{ getTagName(tagId) }}
              </span>
              <span v-if="task.tags.length > 3" class="tag-pill tag-more">
                +{{ task.tags.length - 3 }}
              </span>
            </div>

            <div
              v-if="expandedTaskIds.has(task.id) && task.subTasks && task.subTasks.length > 0"
              class="subtasks-container"
            >
              <div
                v-for="subTask in sortSubTasks(task.subTasks)"
                :key="subTask.id"
                class="subtask-row"
              >
                <div
                  class="subtask-checkbox"
                  :class="{ checked: subTask.completed }"
                  role="checkbox"
                  :aria-checked="subTask.completed"
                  tabindex="0"
                  @click.stop="toggleSubTask(task.id, subTask.id)"
                  @keydown.enter.stop="toggleSubTask(task.id, subTask.id)"
                  @keydown.space.prevent.stop="toggleSubTask(task.id, subTask.id)"
                >
                  <Check v-if="subTask.completed" :size="12" />
                </div>
                <span class="subtask-title" :class="{ completed: subTask.completed }">
                  {{ subTask.title }}
                </span>
              </div>
            </div>
          </div>

          <button
            v-if="!task.completed"
            class="task-myday"
            :class="{ active: taskStore.isInMyDay(task.id) }"
            :aria-label="
              taskStore.isInMyDay(task.id) ? $t('task.removeFromMyDay') : $t('task.addToMyDay')
            "
            :title="
              taskStore.isInMyDay(task.id) ? $t('task.removeFromMyDay') : $t('task.addToMyDay')
            "
            @click.stop="onToggleMyDay(task.id)"
          >
            <Sun :size="16" />
          </button>

          <button
            v-if="!task.completed"
            class="task-focus"
            :class="{ active: taskStore.focusedTaskId === task.id }"
            :aria-label="$t('task.startFocus')"
            :title="$t('task.startFocus')"
            @click.stop="onFocusTask(task.id)"
          >
            <Timer :size="16" />
          </button>

          <button
            class="task-delete"
            :aria-label="$t('task.deleteTask')"
            :title="$t('task.deleteTask')"
            @click.stop="deleteTask(task.id, task.title)"
          >
            <Trash2 :size="16" />
          </button>

          <div v-if="confettiTaskId === task.id" class="confetti-container">
            <div v-for="n in 20" :key="n" class="confetti-piece" :style="getConfettiStyle(n)"></div>
          </div>
        </div>
      </TransitionGroup>

      <Transition name="list-fade" mode="out-in">
        <EmptyState
          v-if="tasks.length === 0"
          :key="'empty'"
          :type="emptyTypeComputed"
          :title="emptyTitle"
          :description="emptyDesc"
          :action-label="emptyActionLabel"
          @action="$emit('add-task')"
        />
      </Transition>
    </div>
  </div>
</template>

<script setup>
import { inject, computed, ref, TransitionGroup, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTaskStore } from '../stores/taskStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useSnackbar } from '../composables/useSnackbar'
import { getTodayStr, getTomorrowStr, parseDateStr, isTaskOverdue } from '../utils/date'
import {
  Check,
  Star,
  Bell,
  Trash2,
  GripVertical,
  ChevronDown,
  RotateCw,
  Timer,
  Sun
} from '@lucide/vue'
import EmptyState from './EmptyState.vue'

const pendingTimers = []
onUnmounted(() => {
  pendingTimers.forEach(clearTimeout)
  pendingTimers.length = 0
  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close().catch(() => {})
    audioContext = null
  }
})

const props = defineProps({
  tasks: {
    type: Array,
    required: true
  },
  emptyType: {
    type: String,
    default: 'default'
  }
})

defineEmits(['add-task'])

const taskStore = useTaskStore()
const settingsStore = useSettingsStore()
const { show: showSnackbar } = useSnackbar()
const { t, tm } = useI18n()
const openEditTask = inject('openEditTask')

let audioContext = null

const playCompletionSound = () => {
  if (!settingsStore.soundsEnabled) return
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)()
    }
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    oscillator.frequency.value = 523
    oscillator.type = 'sine'
    gainNode.gain.setValueAtTime(0.25, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15)
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.15)

    pendingTimers.push(
      setTimeout(() => {
        const osc2 = audioContext.createOscillator()
        const gain2 = audioContext.createGain()
        osc2.connect(gain2)
        gain2.connect(audioContext.destination)
        osc2.frequency.value = 659
        osc2.type = 'sine'
        gain2.gain.setValueAtTime(0.25, audioContext.currentTime)
        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)
        osc2.start(audioContext.currentTime)
        osc2.stop(audioContext.currentTime + 0.2)

        pendingTimers.push(
          setTimeout(() => {
            const osc3 = audioContext.createOscillator()
            const gain3 = audioContext.createGain()
            osc3.connect(gain3)
            gain3.connect(audioContext.destination)
            osc3.frequency.value = 784
            osc3.type = 'sine'
            gain3.gain.setValueAtTime(0.3, audioContext.currentTime)
            gain3.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
            osc3.start(audioContext.currentTime)
            osc3.stop(audioContext.currentTime + 0.3)
          }, 150)
        )
      }, 150)
    )
  } catch (e) {
    console.warn('[TaskList] Audio not available:', e)
  }
}
const highlightedTaskId = inject(
  'highlightedTaskId',
  computed(() => null)
)

const expandedTaskIds = ref(new Set())
const draggedTaskId = ref(null)
const dragOverTaskId = ref(null)
const completingTaskId = ref(null)
const confettiTaskId = ref(null)

const isHighlighted = (taskId) => {
  return highlightedTaskId.value === taskId
}

const emptyTypeComputed = computed(() => {
  if (taskStore.searchQuery) return 'search'
  return props.emptyType
})

const emptyTitle = computed(() => {
  if (taskStore.searchQuery) return t('empty.search')
  switch (props.emptyType) {
    case 'today':
      return t('empty.todayTitle')
    case 'important':
      return t('empty.importantTitle')
    case 'planned':
      return t('empty.plannedTitle')
    case 'completed':
      return t('empty.completed')
    case 'category':
      return t('empty.categoryTitle')
    default:
      return t('empty.defaultTitle')
  }
})

const emptyDesc = computed(() => {
  if (taskStore.searchQuery) return t('empty.searchSubtitle')
  switch (props.emptyType) {
    case 'today':
      return t('empty.todaySubtitle')
    case 'important':
      return t('empty.importantSubtitle')
    case 'planned':
      return t('empty.plannedSubtitle')
    case 'completed':
      return t('empty.completedSubtitle')
    case 'category':
      return t('empty.categorySubtitle')
    default:
      return t('empty.defaultSubtitle')
  }
})

const emptyActionLabel = computed(() => {
  if (taskStore.searchQuery) return ''
  return t('empty.action')
})

const toggleComplete = (id) => {
  const task = taskStore.tasks.find((t) => t.id === id)
  if (!task) return

  if (!task.completed) {
    completingTaskId.value = id
    confettiTaskId.value = id
    playCompletionSound()
    pendingTimers.push(
      setTimeout(() => {
        taskStore.toggleComplete(id)
        completingTaskId.value = null
      }, 300)
    )
    pendingTimers.push(
      setTimeout(() => {
        confettiTaskId.value = null
      }, 1000)
    )
  } else {
    taskStore.toggleComplete(id)
  }
}

const deleteTask = (id, title) => {
  const taskIndex = taskStore.tasks.findIndex((t) => t.id === id)
  if (taskIndex === -1) return
  const taskSnapshot = structuredClone(taskStore.tasks[taskIndex])
  expandedTaskIds.value.delete(id)
  taskStore.deleteTask(id)
  showSnackbar(t('task.deletedMessage', { title }), {
    actionLabel: t('task.undo'),
    duration: 5000,
    onAction: () => {
      const insertIndex = Math.min(taskIndex, taskStore.tasks.length)
      taskStore.restoreTask(taskSnapshot, insertIndex)
    }
  })
}

const onEditTask = (task) => {
  if (openEditTask) {
    openEditTask(task)
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
  return {
    background: cat.color + '15',
    color: cat.color
  }
}

const isOverdue = (task) => {
  return isTaskOverdue(task)
}

const formatDate = (task) => {
  const today = getTodayStr()
  const tomorrow = getTomorrowStr()

  if (task.date === today) {
    return task.time || t('task.today')
  }
  if (task.date === tomorrow) {
    return t('task.tomorrowLabel')
  }
  if (task.date < today) {
    const date = parseDateStr(task.date)
    const monthDay = t('date.monthDayFormat', { month: date.getMonth() + 1, day: date.getDate() })
    return t('date.overdueFormat', { date: monthDay })
  }

  const date = parseDateStr(task.date)
  const weekdays = tm('date.weekdays')
  const dayName = weekdays[date.getDay()]

  const todayDate = parseDateStr(today)
  const diffDays = Math.round((date - todayDate) / (1000 * 60 * 60 * 24))

  if (diffDays < 7) {
    return task.time ? `${dayName} ${task.time}` : dayName
  }

  const monthDay = t('date.monthDayFormat', { month: date.getMonth() + 1, day: date.getDate() })
  return task.time ? `${monthDay} ${task.time}` : monthDay
}

const toggleSubTasks = (taskId) => {
  if (expandedTaskIds.value.has(taskId)) {
    expandedTaskIds.value.delete(taskId)
  } else {
    expandedTaskIds.value.add(taskId)
  }
}

const getCompletedSubTasks = (task) => {
  if (!task.subTasks || task.subTasks.length === 0) return 0
  return task.subTasks.filter((st) => st.completed).length
}

const sortSubTasks = (subTasks) => {
  return [...subTasks].sort((a, b) => a.order - b.order)
}

const toggleSubTask = (taskId, subTaskId) => {
  taskStore.toggleSubTaskComplete(taskId, subTaskId)
}

const getDisplayTags = (tags) => {
  return tags.slice(0, 3)
}

const getTagName = (tagId) => {
  const tag = taskStore.getTagById(tagId)
  return tag ? tag.name : ''
}

const getTagStyle = (tagId) => {
  const tag = taskStore.getTagById(tagId)
  if (!tag) {
    return {
      background: 'var(--color-bg-secondary)',
      color: 'var(--color-text-secondary)'
    }
  }
  return {
    background: tag.color + '20',
    color: tag.color
  }
}

const onDragStart = (event, taskId) => {
  draggedTaskId.value = taskId
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', taskId)
}

const onDragEnd = () => {
  draggedTaskId.value = null
  dragOverTaskId.value = null
}

const onDragOver = (event, taskId) => {
  if (draggedTaskId.value === taskId) return
  event.dataTransfer.dropEffect = 'move'
  dragOverTaskId.value = taskId
}

const onDragLeave = () => {
  dragOverTaskId.value = null
}

const onDrop = (event, targetTaskId) => {
  event.preventDefault()
  const sourceTaskId = draggedTaskId.value
  if (sourceTaskId && sourceTaskId !== targetTaskId) {
    taskStore.reorderTasks(sourceTaskId, targetTaskId)
  }
  draggedTaskId.value = null
  dragOverTaskId.value = null
}

const onFocusTask = (taskId) => {
  if (taskStore.focusedTaskId === taskId) {
    taskStore.unfocusTask()
  } else {
    taskStore.focusTask(taskId)
  }
}

const onToggleMyDay = (taskId) => {
  taskStore.toggleMyDay(taskId)
}

const getConfettiStyle = (n) => {
  const colors = ['#4A90D9', '#E91E8C', '#A855F7', '#22C55E', '#EF4444', '#F59E0B', '#3B82F6']
  const left = Math.random() * 100
  const delay = Math.random() * 0.3
  const duration = 0.6 + Math.random() * 0.4
  const color = colors[n % colors.length]
  const size = 4 + Math.random() * 6
  const rotation = Math.random() * 360

  return {
    left: `${left}%`,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
    backgroundColor: color,
    width: `${size}px`,
    height: `${size}px`,
    transform: `rotate(${rotation}deg)`
  }
}
</script>

<style scoped>
.task-list-container {
  position: relative;
  width: 100%;
}

.task-list {
  background: var(--card-bg);
  backdrop-filter: blur(var(--sidebar-search-blur)) saturate(var(--sidebar-search-saturate));
  -webkit-backdrop-filter: blur(var(--sidebar-search-blur)) saturate(var(--sidebar-search-saturate));
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--card-border);
  box-shadow: var(--card-shadow);
  opacity: 0;
  animation: list-appear var(--duration-fluid) var(--ease-out-expo) forwards;
}

@keyframes list-appear {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.99);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.task-list {
  display: flex;
  flex-direction: column;
  contain: layout paint;
}

.task-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--color-border-light);
  transition: background var(--transition-smooth);
  position: relative;
  min-height: 56px;
  box-sizing: border-box;
  contain: layout paint style;
}

.task-row:last-child {
  border-bottom: none;
}

.task-row:hover {
  background: var(--color-bg-secondary);
}

.task-row.focused {
  background: var(--color-primary-surface);
}

.task-row.highlighted {
  animation: task-highlight 2s var(--ease-out-quart);
}

@keyframes task-highlight {
  0%,
  50% {
    background: var(--color-primary-lightest);
    box-shadow: inset 0 0 0 2px var(--color-primary);
  }
  100% {
    background: transparent;
    box-shadow: inset 0 0 0 0 transparent;
  }
}

.task-row.dragging {
  opacity: 0.5;
  transform: scale(0.98) rotate(-1.2deg);
  background: var(--color-bg-secondary);
  box-shadow: var(--shadow-md);
  transition:
    opacity var(--transition-micro),
    transform var(--transition-smooth),
    box-shadow var(--transition-smooth),
    background var(--transition-smooth);
}

.task-row.drag-over::before {
  content: '';
  position: absolute;
  top: 0;
  left: 12px;
  right: 12px;
  height: 2px;
  background: var(--color-primary);
  border-radius: 2px;
  z-index: 10;
  box-shadow: 0 0 8px var(--color-primary);
}

.task-row.drag-over {
  background: var(--color-primary-surface);
}

.task-row.completed {
  background: transparent;
  transition:
    background var(--transition-fluid) var(--ease-out-expo),
    transform var(--transition-smooth);
  opacity: 0.92;
}

.task-row.completed:hover {
  background: var(--color-bg-secondary);
}

.task-row.completed .task-title {
  text-decoration: line-through;
  text-decoration-color: var(--color-text-tertiary);
  text-decoration-thickness: 1px;
  color: var(--color-text-tertiary);
  opacity: 0.7;
  font-weight: 300;
}

.task-row.completed .task-meta {
  opacity: 0.5;
}

.task-row.completed .cat-pill,
.task-row.completed .tag-pill {
  opacity: 0.5;
}

.task-row.completed .subtask-title {
  color: var(--color-text-tertiary);
}

.task-title.completing {
  animation: complete-scale var(--duration-moderate) var(--ease-spring-soft);
}

@keyframes complete-scale {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  min-width: 44px;
  margin: -10px 0 -10px -14px;
  color: var(--color-text-tertiary);
  cursor: grab;
  opacity: 0;
  transition:
    opacity var(--transition-micro),
    color var(--transition-micro),
    background var(--transition-micro);
  flex-shrink: 0;
  border-radius: var(--radius-full);
  -webkit-user-select: none;
  user-select: none;
}

.drag-handle:hover {
  opacity: 1;
  color: var(--color-text-secondary);
  background: var(--color-bg-tertiary);
}

.drag-handle:active {
  cursor: grabbing;
}

.task-row:hover .drag-handle {
  opacity: 0.6;
}

.task-checkbox {
  width: 44px;
  height: 44px;
  min-width: 44px;
  margin-top: -4px;
  margin-left: -6px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    background var(--transition-smooth),
    transform var(--transition-micro);
  flex-shrink: 0;
  color: var(--color-text-on-primary);
  position: relative;
}

.task-checkbox::before {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1.5px solid #dadce0;
  background: transparent;
  transition:
    border-color var(--transition-smooth),
    background var(--transition-smooth),
    transform var(--transition-spring-soft);
}

.task-checkbox:active::before {
  transform: scale(0.9);
}

.task-checkbox.checked::before {
  animation: check-pop var(--transition-spring);
}

@keyframes check-pop {
  0% {
    transform: scale(0.6);
  }
  50% {
    transform: scale(1.18);
  }
  100% {
    transform: scale(1);
  }
}

.task-checkbox.checked svg {
  animation: check-mark-pop var(--transition-spring);
}

@keyframes check-mark-pop {
  0% {
    transform: scale(0);
  }
  60% {
    transform: scale(1.25);
  }
  100% {
    transform: scale(1);
  }
}

.task-checkbox:hover::before {
  border-color: var(--color-primary);
  background: var(--color-primary-lighter);
}

.task-checkbox:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--color-primary-ring);
}

.task-checkbox.checked::before {
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.task-checkbox.checked:hover::before {
  background: var(--color-primary-dark);
  border-color: var(--color-primary-dark);
}

.task-checkbox.overdue::before {
  border-color: var(--state-warning);
}

.task-checkbox.overdue:hover::before {
  background: var(--state-warning);
  border-color: var(--state-warning);
}

.task-checkbox svg {
  position: relative;
  z-index: 1;
}

.task-body {
  flex: 1;
  min-width: 0;
  cursor: pointer;
  border-radius: var(--radius-sm);
  padding: 2px;
}

.task-body:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.task-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.priority-badge {
  font-size: var(--font-size-3xs);
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  line-height: 1;
  flex-shrink: 0;
}

.priority-0 {
  background: rgba(239, 68, 68, 0.12);
  color: #dc2626;
}

.priority-1 {
  background: rgba(249, 115, 22, 0.12);
  color: #ea580c;
}

.priority-2 {
  background: rgba(234, 179, 8, 0.12);
  color: #ca8a04;
}

.priority-3 {
  background: rgba(34, 197, 94, 0.12);
  color: #16a34a;
}

.task-title {
  font-size: var(--font-size-body);
  font-weight: 400;
  color: var(--color-text-primary);
  margin: 0;
  line-height: 1.4;
  letter-spacing: 0.1px;
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color var(--transition-smooth);
}

.title-icons {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.repeat-icon {
  color: var(--color-text-tertiary);
  width: 15px;
  height: 15px;
}

.task-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  flex-wrap: nowrap;
  overflow: hidden;
  min-width: 0;
}

.meta-icon {
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.meta-icon.important {
  color: var(--state-warning);
  fill: var(--state-warning);
  animation: star-pop var(--transition-spring-soft);
  transform-origin: center;
}

@keyframes star-pop {
  0% {
    transform: scale(0) rotate(-45deg);
  }
  60% {
    transform: scale(1.25) rotate(8deg);
  }
  100% {
    transform: scale(1) rotate(0deg);
  }
}

.cat-pill {
  font-size: var(--font-size-2xs);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-weight: 500;
  white-space: nowrap;
  letter-spacing: 0.2px;
  flex-shrink: 0;
  transition:
    transform var(--transition-micro),
    filter var(--transition-micro);
  cursor: default;
}

.cat-pill:hover {
  transform: translateY(-1px);
  filter: brightness(0.95);
}

.task-date {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  letter-spacing: 0.2px;
  font-weight: 400;
  white-space: nowrap;
  flex-shrink: 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-date.overdue {
  color: var(--state-error);
  font-weight: 500;
}

.subtask-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-2xs);
  color: var(--color-text-secondary);
  background: var(--color-bg-secondary);
  border: none;
  border-radius: var(--radius-full);
  padding: 2px 8px;
  cursor: pointer;
  transition:
    background var(--transition-micro),
    color var(--transition-micro),
    transform var(--transition-micro);
  flex-shrink: 0;
  white-space: nowrap;
  min-height: 24px;
}

.subtask-toggle:hover {
  background: var(--color-border-light);
  color: var(--color-text-primary);
  transform: translateY(-1px);
}

.subtask-toggle:active {
  transform: translateY(0) scale(0.97);
}

.subtask-toggle svg {
  transition: transform var(--transition-smooth);
}

.subtask-toggle svg.expanded {
  transform: rotate(180deg);
}

.task-tags {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  flex-wrap: nowrap;
  overflow: hidden;
  min-width: 0;
}

.tag-pill {
  font-size: var(--font-size-2xs);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-weight: 500;
  white-space: nowrap;
  letter-spacing: 0.2px;
  flex-shrink: 0;
  transition:
    transform var(--transition-micro),
    filter var(--transition-micro);
  cursor: default;
}

.tag-pill:hover {
  transform: translateY(-1px);
  filter: brightness(0.95);
}

.tag-pill.tag-more {
  background: var(--color-bg-secondary);
  color: var(--color-text-tertiary);
}

.subtasks-container {
  margin-top: 8px;
  padding-left: 8px;
  border-left: 2px solid var(--color-border-light);
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  transform-origin: top center;
  animation: subtask-expand var(--transition-fluid) var(--ease-out-expo);
}

@keyframes subtask-expand {
  0% {
    opacity: 0;
    max-height: 0;
    transform: translateY(-6px);
  }
  100% {
    opacity: 1;
    max-height: 600px;
    transform: translateY(0);
  }
}

.subtask-row {
  animation: subtask-item-in var(--transition-smooth) var(--ease-out-quart) backwards;
}

.subtask-row:nth-child(1) {
  animation-delay: 0.04s;
}
.subtask-row:nth-child(2) {
  animation-delay: 0.08s;
}
.subtask-row:nth-child(3) {
  animation-delay: 0.12s;
}
.subtask-row:nth-child(4) {
  animation-delay: 0.16s;
}
.subtask-row:nth-child(5) {
  animation-delay: 0.2s;
}

@keyframes subtask-item-in {
  from {
    opacity: 0;
    transform: translateX(-6px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.subtask-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  min-height: 36px;
  min-width: 0;
}

.subtask-checkbox {
  width: 36px;
  height: 36px;
  min-width: 36px;
  margin-left: -8px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--transition-smooth);
  flex-shrink: 0;
  color: var(--color-text-on-primary);
  position: relative;
}

.subtask-checkbox::before {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1.5px solid #dadce0;
  background: transparent;
  transition:
    border-color var(--transition-smooth),
    background var(--transition-smooth);
}

.subtask-checkbox.checked::before {
  animation: check-pop var(--transition-spring);
}

.subtask-checkbox.checked svg {
  animation: check-mark-pop var(--transition-spring);
}

.subtask-checkbox:hover::before {
  border-color: var(--color-primary);
  background: var(--color-primary-lighter);
}

.subtask-checkbox.checked::before {
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.subtask-checkbox svg {
  position: relative;
  z-index: 1;
}

.subtask-title {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: 1.4;
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.subtask-title.completed {
  text-decoration: line-through;
  text-decoration-color: var(--color-text-tertiary);
  text-decoration-thickness: 1px;
  color: var(--color-text-tertiary);
}

.task-myday,
.task-focus,
.task-delete {
  width: 44px;
  height: 44px;
  min-width: 44px;
  margin: -10px -10px -10px 0;
  border-radius: var(--radius-full);
  color: var(--color-text-tertiary);
  cursor: pointer;
  opacity: 0;
  background: transparent;
  border: none;
  transition:
    color var(--transition-micro),
    background var(--transition-micro),
    opacity var(--transition-micro),
    transform var(--transition-micro);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.task-myday:hover,
.task-focus:hover,
.task-delete:hover {
  transform: scale(1.08);
}

.task-myday:active,
.task-focus:active,
.task-delete:active {
  transform: scale(0.94);
}

.task-myday:hover {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.1);
}

.task-myday.active {
  color: #f59e0b;
  opacity: 1;
}

.task-myday:focus-visible {
  outline: 2px solid #f59e0b;
  outline-offset: 2px;
  opacity: 1;
}

.task-focus:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.task-focus.active {
  color: #ef4444;
  opacity: 1;
}

.task-focus:focus-visible {
  outline: 2px solid #ef4444;
  outline-offset: 2px;
  opacity: 1;
}

.task-delete:hover {
  color: var(--state-error);
  background: var(--color-error-surface);
}

.task-delete:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  opacity: 1;
}

.task-row:hover .task-myday,
.task-row:hover .task-focus,
.task-row:hover .task-delete {
  opacity: 1;
}

.confetti-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 20;
}

.confetti-piece {
  position: absolute;
  top: 50%;
  border-radius: 2px;
  opacity: 0;
  animation: confetti-fall var(--duration-slower) var(--ease-out-quart) forwards;
}

@keyframes confetti-fall {
  0% {
    opacity: 1;
    transform: translateY(0) translateX(0) rotate(0deg);
  }
  100% {
    opacity: 0;
    transform: translateY(60px) translateX(var(--confetti-x, 20px)) rotate(360deg);
  }
}

@media (max-width: 768px) {
  .task-row {
    padding: 12px 14px;
    gap: 8px;
    min-height: 60px;
  }

  .task-focus,
  .task-delete {
    opacity: 1;
  }

  .drag-handle {
    opacity: 1;
    width: 36px;
    height: 36px;
    min-width: 36px;
    margin: -6px 0 -6px -10px;
  }

  .task-checkbox {
    width: 40px;
    height: 40px;
    min-width: 40px;
    margin-top: -2px;
    margin-left: -4px;
  }

  .task-focus,
  .task-delete {
    width: 40px;
    height: 40px;
    min-width: 40px;
    margin: -8px -8px -8px 0;
  }

  .task-meta {
    gap: 4px;
  }

  .cat-pill {
    font-size: var(--font-size-3xs);
    padding: 1px 6px;
  }

  .task-date {
    font-size: var(--font-size-2xs);
  }

  .subtask-toggle {
    font-size: var(--font-size-3xs);
    padding: 1px 6px;
  }

  .task-tags {
    gap: 3px;
  }

  .tag-pill {
    font-size: var(--font-size-3xs);
    padding: 1px 6px;
  }

  .subtasks-container {
    padding-left: 6px;
  }

  .subtask-row {
    min-height: 40px;
  }

  .subtask-checkbox {
    width: 32px;
    height: 32px;
    min-width: 32px;
  }
}

.list-fade-enter-active,
.list-fade-leave-active {
  transition:
    opacity var(--duration-normal) var(--ease-out-quart),
    transform var(--duration-normal) var(--ease-out-expo);
  will-change: opacity, transform;
}

.list-fade-enter-from {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}

.list-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}

.task-list-enter-active {
  transition:
    opacity var(--duration-slow) var(--ease-out-expo),
    transform var(--duration-slow) var(--ease-out-expo);
  will-change: opacity, transform;
}

.task-list-leave-active {
  transition:
    opacity var(--duration-fast) var(--ease-out-quart),
    transform var(--duration-fast) var(--ease-out-quart);
  will-change: opacity, transform;
  position: absolute;
  width: 100%;
}

.task-list-enter-from {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}

.task-list-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}

.task-list-move {
  transition: transform var(--transition-fluid) var(--ease-out-expo);
  will-change: transform;
}

@media (max-width: 768px) {
  .task-list-enter-active,
  .task-list-leave-active {
    transition:
      opacity var(--duration-fast) var(--ease-out-quart),
      transform var(--duration-fast) var(--ease-out-expo);
  }

  .task-list-enter-from {
    transform: translateY(8px);
  }

  .task-list-leave-to {
    transform: translateY(-8px);
  }

  .task-list-move {
    transition: transform var(--duration-fast) var(--ease-out-expo);
  }
}

.task-list-wrapper {
  min-height: 200px;
}
</style>
