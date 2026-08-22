<template>
  <article
    class="task-card task-row"
    :class="[cardClass, { completed: task.completed, overdue: isOverdue }]"
    :data-task-id="task.id"
    :role="view === 'board' ? 'listitem' : undefined"
    :aria-label="taskAriaLabel"
  >
    <!-- 拖拽柄 -->
    <div
      v-if="!compact && view !== 'board'"
      class="tc-grip"
      draggable="true"
      @dragstart="onDragStart"
      @dragend="onDragEnd"
      role="button"
      :aria-label="'拖拽移动任务：' + task.title"
      tabindex="0"
      @mousedown.stop
      @keydown.enter.stop
    >
      <GripVertical :size="15" />
    </div>

    <!-- 完成勾选 -->
    <button
      type="button"
      class="tc-check"
      :class="checkClass"
      role="checkbox"
      :aria-checked="task.completed"
      :aria-label="checkAriaLabel"
      :disabled="task.completed ? false : isBlocked"
      @click.stop="toggleComplete"
      @keydown.enter.prevent.stop="toggleComplete"
      @keydown.space.prevent.stop="toggleComplete"
    >
      <svg class="tc-check-svg" viewBox="0 0 24 24" aria-hidden="true">
        <path
          v-if="task.completed"
          class="tc-check-stroke"
          d="M4.5 12.5l5 5 10-11"
          fill="none"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <!-- 主体区：标题 + 描述 chip -->
    <div
      class="tc-body"
      role="button"
      tabindex="0"
      @click="$emit('edit', task)"
      @keydown.enter.prevent="$emit('edit', task)"
      :aria-label="$t('task.editTaskAria', { title: task.title })"
    >
      <!-- 标题行 -->
      <div class="tc-title-row">
        <TransitionGroup name="tc-badges" tag="span" class="tc-badges">
          <span
            v-if="priority < 4"
            key="prio"
            class="tc-badge tc-prio"
            :class="`tc-prio-${priority}`"
            :aria-label="$t(`task.p${priority}`)"
            :title="$t(`task.p${priority}`)"
          >
            <Flag :size="11" />
            <em>{{ priorityLabel }}</em>
          </span>
          <span
            v-if="isBlocked"
            key="block"
            class="tc-badge tc-blocked"
            :aria-label="t('task.blockedByAria', { count: blockedByLength })"
            :title="t('task.blockedByTooltip', { count: blockedByLength })"
          >
            <Lock :size="11" />
            <em>{{ blockedByLength }}</em>
          </span>
        </TransitionGroup>

        <h3 class="tc-title task-title" :class="{ 'tc-title-done': task.completed }">
          {{ task.title }}
        </h3>

        <span class="tc-title-icons">
          <RotateCw v-if="task.repeat" class="tc-icon-repeat" :size="14" aria-hidden="true"/>
          <button
            type="button"
            class="tc-star meta-icon important"
            :class="{ active: task.important }"
            :aria-label="task.important ? t('task.unstar') : t('task.markStar')"
            @click.stop="toggleImportant"
            @keydown.stop.prevent.enter="toggleImportant"
          >
            <Star :size="16" :fill="task.important ? 'currentColor' : 'none'" />
          </button>
        </span>
      </div>

      <!-- chip 行：日期、提醒、分类、番茄、子任务进度 -->
      <div class="tc-chips">
        <span
          v-if="task.date"
          class="tc-chip tc-chip-date"
          :class="{ overdue: isOverdue, today: isToday }"
        >
          <CalendarDays :size="13" aria-hidden="true"/>
          <b>{{ formatDateChip }}</b>
          <template v-if="task.time">
            <i class="tc-chip-sep">·</i>
            <Clock :size="13" aria-hidden="true"/>
            <b>{{ task.time }}</b>
          </template>
          <template v-if="hasDueUntil">
            <i class="tc-chip-sep">·</i>
            <Hourglass :size="12" aria-hidden="true"/>
            <span>{{ formatDueUntil }}</span>
          </template>
        </span>

        <span v-if="task.reminder" class="tc-chip tc-chip-mini" title="已设置提醒">
          <Bell :size="13" aria-hidden="true"/>
        </span>

        <span v-if="listName" class="tc-chip tc-chip-list cat-pill">
          <ListTodo :size="13" aria-hidden="true"/>
          <span class="tc-chip-dot" :style="{ background: listColor || 'currentColor' }"/>
          <b>{{ listName }}</b>
        </span>

        <span v-if="hasPomodoro" class="tc-chip tc-chip-pomo">
          <Timer :size="13" aria-hidden="true"/>
          <span class="tc-pomo-bar" aria-hidden="true">
            <span class="tc-pomo-fill" :style="pomoFillStyle"/>
          </span>
          <b>{{ pomodoroSessions }}/{{ pomodoroTarget }}</b>
        </span>

        <Transition name="tc-counts">
          <span
            v-if="attachmentsCount || commentsCount || subTaskCount"
            key="counts"
            class="tc-chip tc-chip-counts"
          >
            <span v-if="subTaskCount" class="tc-count" title="子任务">
              <ChevronsRight :size="13" />
              <b>{{ completedSubCount }}/{{ subTaskCount }}</b>
            </span>
            <span v-if="commentsCount" class="tc-count" title="评论">
              <MessageSquareText :size="13" />
              <b>{{ commentsCount }}</b>
            </span>
            <span v-if="attachmentsCount" class="tc-count" title="附件">
              <Paperclip :size="13" />
              <b>{{ attachmentsCount }}</b>
            </span>
          </span>
        </Transition>
      </div>

      <!-- 子任务进度条（仅当有子任务且视图为 list/board 时显示） -->
      <div
        v-if="!compact && subTaskCount > 0"
        class="tc-sub-progress"
        :aria-label="t('task.subProgressAria', { done: completedSubCount, total: subTaskCount })"
        role="progressbar"
        :aria-valuemin="0"
        :aria-valuemax="subTaskCount"
        :aria-valuenow="completedSubCount"
      >
        <div class="tc-sub-bar">
          <div class="tc-sub-fill" :style="subFillStyle"/>
        </div>
        <button
          type="button"
          class="tc-sub-toggle"
          @click.stop="subExpanded = !subExpanded"
          :aria-expanded="subExpanded"
          :aria-controls="`subs-${task.id}`"
        >
          <ChevronDown :size="14" :class="{ 'tc-rot': subExpanded }" />
        </button>
      </div>

      <!-- 标签 pill -->
      <div v-if="!compact && displayTags.length" class="tc-tags">
        <span
          v-for="tg in displayTags"
          :key="tg.id"
          class="tc-tag"
          :style="tagStyle(tg)"
        >
          {{ tg.label }}
        </span>
        <span
          v-if="(task.tags?.length || 0) > 3"
          class="tc-tag tc-tag-more"
          aria-label="更多标签"
        >
          +{{ (task.tags?.length || 0) - 3 }}
        </span>
      </div>
    </div>

    <!-- 子任务嵌套（列表模式） -->
    <Transition name="tc-expand">
      <div
        v-if="!compact && !boardLike && subExpanded && subTaskCount > 0"
        :id="`subs-${task.id}`"
        class="tc-subs"
        role="group"
        :aria-label="t('task.subTasks')"
      >
        <div
          v-for="(st, idx) in sortedSubTasks"
          :key="st.id"
          class="tc-sub-row"
          :class="{ done: st.completed }"
        >
          <button
            type="button"
            class="tc-sub-check"
            :class="{ checked: st.completed }"
            role="checkbox"
            :aria-checked="st.completed"
            @click.stop="toggleSub(st.id)"
            @keydown.enter.prevent.stop="toggleSub(st.id)"
            @keydown.space.prevent.stop="toggleSub(st.id)"
            :aria-label="`子任务${st.title}，${st.completed ? '已完成' : '未完成'}`"
          >
            <Check v-if="st.completed" :size="12" />
          </button>
          <span class="tc-sub-title">{{ st.title }}</span>
          <span v-if="idx > 0" class="tc-sub-reorder" role="group" aria-label="子任务升降级">
            <button
              type="button"
              class="tc-sub-btn"
              @click.stop="reorderSub(st.id, -1)"
              :disabled="idx === 0"
              aria-label="上移子任务"
            ><ChevronUp :size="13"/></button>
            <button
              type="button"
              class="tc-sub-btn"
              @click.stop="reorderSub(st.id, +1)"
              :disabled="idx === subTaskCount - 1"
              aria-label="下移子任务"
            ><ChevronDown :size="13"/></button>
          </span>
          <button
            type="button"
            class="tc-sub-del"
            @click.stop="removeSub(st.id)"
            aria-label="删除子任务"
          >
            <Trash2 :size="13" />
          </button>
        </div>
      </div>
    </Transition>
  </article>
</template>

<script setup>
import { ref, computed, inject, watch, onMounted, defineProps, defineEmits } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  GripVertical,
  Star,
  Flag,
  Lock,
  RotateCw,
  CalendarDays,
  Clock,
  Hourglass,
  ListTodo,
  Timer,
  ChevronsRight,
  MessageSquareText,
  Paperclip,
  ChevronDown,
  ChevronUp,
  Trash2,
  Check
} from '@lucide/vue'
import { buildDropIndex, validateDrop, applyDrop } from '../utils/dragDropTasks'

const props = defineProps({
  task: {
    type: Object,
    required: true
  },
  /** 显示模式：'list' | 'compact' | 'board' */
  view: {
    type: String,
    default: 'list',
    validator: (v) => ['list', 'compact', 'board'].includes(v)
  },
  /** 对应 filteredTasks 快照，用于拖拽锚点计算 */
  currentList: {
    type: Array,
    default: () => []
  },
  isOverdueExt: { type: Boolean, default: false },
  isFocused: { type: Boolean, default: false },
  isDragging: { type: Boolean, default: false },
  isDragOver: { type: Boolean, default: false },
  /** 是否为新创建的项（触发 fade-in） */
  isNew: { type: Boolean, default: false },
  /** density */
  density: {
    type: String,
    default: 'comfortable',
    validator: (v) => ['compact', 'comfortable', 'spacious'].includes(v)
  }
})

const emit = defineEmits([
  'edit',
  'toggle-complete',
  'toggle-important',
  'reorder',
  'dragstart',
  'dragend',
  'contextmenu',
  'sub-toggle',
  'sub-reorder',
  'sub-remove'
])

const { t } = useI18n()

const useTaskStore = inject('useTaskStore', null) || (() => null)
const useListStore = inject('useListStore', null) || (() => null)
const useSettingsStore = inject('useSettingsStore', null) || (() => null)

let taskStore = null
let listStore = null
let settingsStore = null
try { taskStore = typeof useTaskStore === 'function' ? useTaskStore() : useTaskStore } catch {}
try { listStore = typeof useListStore === 'function' ? useListStore() : useListStore } catch {}
try { settingsStore = typeof useSettingsStore === 'function' ? useSettingsStore() : useSettingsStore } catch {}

const compact = computed(() => props.view === 'compact')
const boardLike = computed(() => props.view === 'board')

// ---- 计算衍生状态 ----
const priority = computed(() =>
  typeof props.task.priority === 'number' ? Math.min(4, Math.max(1, props.task.priority)) : 4
)
const priorityLabel = computed(() => {
  switch (priority.value) {
    case 1: return 'P1'
    case 2: return 'P2'
    case 3: return 'P3'
    default: return ''
  }
})

const blockedByLength = computed(() => (Array.isArray(props.task.blockedBy) ? props.task.blockedBy.length : 0))
const isBlocked = computed(() => {
  if (taskStore && typeof taskStore.isTaskBlocked === 'function') {
    return taskStore.isTaskBlocked(props.task)
  }
  if (blockedByLength.value === 0) return false
  return blockedByLength.value > 0 // fall back: any deps → assume blocked if any defined
})

const commentsCount = computed(() => (Array.isArray(props.task.comments) ? props.task.comments.length : 0))
const attachmentsCount = computed(() => (Array.isArray(props.task.attachments) ? props.task.attachments.length : 0))

const subTaskCount = computed(() => (Array.isArray(props.task.subTasks) ? props.task.subTasks.length : 0))
const completedSubCount = computed(() =>
  Array.isArray(props.task.subTasks) ? props.task.subTasks.filter((s) => s.completed).length : 0
)
const subFillStyle = computed(() => {
  if (subTaskCount.value === 0) return { width: '0%' }
  const ratio = Math.max(0, Math.min(1, completedSubCount.value / subTaskCount.value))
  return { width: `${Math.round(ratio * 100)}%` }
})
const sortedSubTasks = computed(() =>
  [...(props.task.subTasks || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
)

const pomodoroSessions = computed(() => Number(props.task.pomodoroSessions || 0))
const pomodoroTarget = computed(() => {
  const target = Number(props.task.pomodoroTarget || settingsStore?.pomodoroTarget || 4)
  return target > 0 ? target : 4
})
const hasPomodoro = computed(() => pomodoroSessions.value > 0 || settingsStore?.pomodoroEnabled)
const pomoFillStyle = computed(() => {
  const ratio = Math.max(0, Math.min(1, pomodoroSessions.value / pomodoroTarget.value))
  return { width: `${Math.round(ratio * 100)}%` }
})

const hasDueUntil = computed(() => props.task.dueUntil && typeof props.task.dueUntil === 'string')
const formatDueUntil = computed(() => props.task.dueUntil || '')

const isOverdue = computed(() => {
  if (props.task.completed) return false
  if (props.isOverdueExt) return true
  if (!props.task.date) return false
  const today = new Date()
  const [y, m, d] = String(props.task.date).split('-').map((x) => parseInt(x, 10))
  if (!y || !m || !d) return false
  const due = new Date(y, m - 1, d, 23, 59, 59)
  return due.getTime() < today.getTime()
})
const isToday = computed(() => {
  if (!props.task.date) return false
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return props.task.date === today
})

const formatDateChip = computed(() => {
  const date = props.task.date
  if (!date) return ''
  const todayD = new Date()
  const todayStr = `${todayD.getFullYear()}-${String(todayD.getMonth() + 1).padStart(2, '0')}-${String(todayD.getDate()).padStart(2, '0')}`
  const tomorrow = new Date(todayD.getTime() + 86400000)
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`
  const yesterday = new Date(todayD.getTime() - 86400000)
  const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
  if (date === todayStr) return t('task.today')
  if (date === tomorrowStr) return t('task.tomorrowLabel')
  if (date === yStr) return t('task.yesterday')
  const [, mm, dd] = date.split('-')
  return `${Number(mm)}月${Number(dd)}日`
})

const listName = computed(() => {
  const id = props.task.listId || props.task.category
  if (!id) return ''
  if (listStore) {
    if (typeof listStore.getById === 'function') {
      const byId = listStore.getById(id)?.name
      if (byId) return byId
    }
    const list = (listStore.lists || []).find((l) => l.id === id)
    if (list?.name) return list.name
  }
  // 当没有 store 或查找失败时，回退到显示 category 名称（兼容老数据 / 单测场景）
  if (props.task.category) {
    const map = { work: 'Work', personal: 'Personal', study: 'Study', health: 'Health' }
    return map[props.task.category] || props.task.category
  }
  return ''
})
const listColor = computed(() => {
  const id = props.task.listId || props.task.category
  if (!id) return ''
  if (listStore) {
    const list = (listStore.lists || []).find((l) => l.id === id)
    if (list?.color) return list.color
  }
  const defaults = { work: '#3b82f6', personal: '#8b5cf6', study: '#10b981', health: '#f59e0b' }
  return defaults[id] || ''
})

const displayTags = computed(() => {
  const tagIndex = taskStore?.tagIndexMap?.value || taskStore?.tags || null
  const tags = props.task.tags || []
  const res = []
  for (const tid of tags) {
    if (!tid) continue
    const obj = tagIndex && typeof tagIndex.get === 'function' ? tagIndex.get(tid) : null
    if (obj) {
      res.push({ id: obj.id, label: obj.name, color: obj.color })
    } else if (typeof tid === 'string') {
      res.push({ id: tid, label: tid, color: '' })
    }
    if (res.length >= 3) break
  }
  return res
})
const tagStyle = (tg) => {
  const bg = tg.color || '#e0e7ff'
  const isDark = settingsStore?.theme === 'dark' || (typeof document !== 'undefined' && document.documentElement?.getAttribute('data-theme') === 'dark')
  return {
    background: isDark ? blend(bg, 0.25) : blend(bg, 0.18),
    color: pickTextColor(bg),
    border: `1px solid ${blend(bg, 0.4)}`
  }
}
const blend = (hex, alpha) => {
  if (!hex) return 'rgba(59,130,246,0.15)'
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!m) return hex
  return `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}, ${alpha})`
}
const pickTextColor = (hex) => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '')
  if (!m) return 'inherit'
  const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? '#0f172a' : '#ffffff'
}

// ---- 子任务展开状态 ----
const subExpanded = ref(!!props.isNew)

// ---- 行为：actions ----
const toggleComplete = () => emit('toggle-complete', props.task.id)
const toggleImportant = () => emit('toggle-important', props.task.id)
const toggleSub = (subId) => emit('sub-toggle', { taskId: props.task.id, subId })
const reorderSub = (subId, dir) => emit('sub-reorder', { taskId: props.task.id, subId, dir })
const removeSub = (subId) => emit('sub-remove', { taskId: props.task.id, subId })

// ---- 拖拽 ----
const onDragStart = (event) => {
  try {
    if (event?.dataTransfer) {
      event.dataTransfer.setData('text/plain', props.task.id)
      event.dataTransfer.effectAllowed = 'move'
    }
  } catch (_e) { /* ignore */ }
  emit('dragstart', { taskId: props.task.id, event })
}
const onDragEnd = (event) => {
  emit('dragend', { taskId: props.task.id, event })
}

// 对外暴露 drop 支持（父组件可通过 ref 调用）
defineExpose({
  computeDrop: (mouseY, viewOpts = {}) => {
    const list = props.currentList?.length ? props.currentList : [props.task]
    return buildDropIndex({ y: mouseY }, list, viewOpts)
  },
  buildDrop: ({ draggedIds, target = {} }) => {
    const payload = {
      draggedTaskIds: draggedIds || [props.task.id],
      target,
      tasks: taskStore?.tasks?.value || props.currentList || [props.task]
    }
    const validation = validateDrop(payload)
    if (!validation.ok) return { ok: false, reason: validation.reason }
    const list = props.currentList?.length ? props.currentList : [props.task]
    const pos = buildDropIndex(list.length - 1, list, {})
    const moves = applyDrop({ ...payload, ...pos })
    // 适配 reorderTasks: applyDrop 返回 {taskId,...} 但 API 需要 {id,...}
    const adapted = moves.map((m) => ({ id: m.taskId, ...m }))
    return { ok: true, moves: adapted, target: validation.normalizedTarget }
  }
})

// ---- class 计算 ----
const cardClass = computed(() => ({
  [`tc-${props.view}`]: true,
  [`tc-density-${props.density}`]: true,
  'tc-done': props.task.completed,
  'tc-overdue': isOverdue.value,
  'tc-blocked': isBlocked.value && !props.task.completed,
  'tc-focused': props.isFocused,
  'tc-dragging': props.isDragging,
  'tc-drag-over': props.isDragOver,
  'tc-new': props.isNew
}))

const checkClass = computed(() => ({
  checked: props.task.completed,
  overdue: isOverdue.value && !props.task.completed,
  blocked: isBlocked.value && !props.task.completed,
  [`check-p${priority.value}`]: priority.value < 4
}))

const checkAriaLabel = computed(() =>
  props.task.completed ? t('task.markIncomplete') : t('task.markComplete')
)
const taskAriaLabel = computed(() => {
  const parts = [props.task.title]
  if (props.task.completed) parts.push('已完成')
  if (isOverdue.value) parts.push('已逾期')
  if (isBlocked.value) parts.push('被阻断')
  if (formatDateChip.value) parts.push(`截止${formatDateChip.value}`)
  return parts.join('；')
})
</script>

<style scoped>
.task-card {
  position: relative;
  display: grid;
  grid-template-columns: auto auto 1fr;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 14px;
  background: var(--tc-bg, rgba(255, 255, 255, 0.7));
  border: 1px solid var(--tc-border, rgba(15, 23, 42, 0.06));
  transition:
    background 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.12s ease,
    opacity 0.35s ease;
  color: var(--tc-text, #0f172a);
  font-family: var(--font-body, system-ui, -apple-system, sans-serif);
}
html[data-theme='dark'] .task-card {
  --tc-bg: rgba(24, 28, 36, 0.78);
  --tc-border: rgba(255, 255, 255, 0.06);
  --tc-text: #e5e7eb;
  --tc-muted: #94a3b8;
  --tc-accent: #60a5fa;
  --tc-overdue: #f87171;
}
:not(html[data-theme='dark']) .task-card {
  --tc-muted: #64748b;
  --tc-accent: #3b82f6;
  --tc-overdue: #dc2626;
}

.task-card:hover {
  border-color: rgba(59, 130, 246, 0.3);
  box-shadow:
    0 8px 24px -18px rgba(15, 23, 42, 0.35),
    0 2px 6px -4px rgba(15, 23, 42, 0.15);
}

.task-card.tc-focused {
  border-color: rgba(59, 130, 246, 0.6);
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.18);
}

.task-card.tc-density-compact { padding: 6px 10px; }
.task-card.tc-density-spacious { padding: 14px 16px; }

/* 新卡片 fade-in */
.task-card.tc-new {
  animation: tc-fadein 480ms cubic-bezier(0.22, 1, 0.36, 1);
}
@keyframes tc-fadein {
  from { opacity: 0; transform: translateY(8px) scale(0.985); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* 拖拽中 */
.task-card.tc-dragging {
  opacity: 0.5;
  transform: scale(0.98) rotate(-0.5deg);
}
.task-card.tc-drag-over {
  border-color: rgba(16, 185, 129, 0.7);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
}

/* 完成 / 阻断 / 逾期 */
.task-card.tc-done {
  opacity: 0.78;
}
.task-card.tc-blocked {
  opacity: 0.92;
  background:
    linear-gradient(180deg, rgba(251, 191, 36, 0.06), transparent),
    var(--tc-bg);
}
.task-card.tc-overdue {
  background:
    linear-gradient(180deg, rgba(239, 68, 68, 0.08), transparent),
    var(--tc-bg);
}

/* ---------- Grip ---------- */
.tc-grip {
  width: 22px;
  height: 36px;
  margin-top: 2px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: var(--tc-muted);
  cursor: grab;
  opacity: 0;
  transition: opacity 0.18s ease, background 0.15s ease, color 0.15s ease;
}
.task-card:hover .tc-grip,
.tc-grip:focus-visible {
  opacity: 1;
}
.tc-grip:hover {
  background: rgba(59, 130, 246, 0.08);
  color: var(--tc-accent);
}
.tc-grip:active { cursor: grabbing; }
.tc-grip:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
}

/* ---------- Checkbox ---------- */
.tc-check {
  width: 22px;
  height: 22px;
  margin-top: 3px;
  border-radius: 50%;
  border: 1.5px solid rgba(127, 127, 127, 0.35);
  background: transparent;
  cursor: pointer;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    border-color 0.18s ease,
    background 0.22s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.15s ease;
  flex-shrink: 0;
}
.tc-check:hover:not(:disabled) {
  border-color: var(--tc-accent);
  transform: scale(1.05);
}
.tc-check:disabled {
  cursor: not-allowed;
  opacity: 0.6;
  border-style: dashed;
  border-color: #f59e0b;
}
.tc-check-svg {
  width: 14px;
  height: 14px;
}
.tc-check-stroke {
  stroke: #ffffff;
  stroke-dasharray: 40;
  stroke-dashoffset: 40;
  animation: tc-check 320ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
@keyframes tc-check {
  to { stroke-dashoffset: 0; }
}
.tc-check.checked {
  background: linear-gradient(135deg, #22c55e, #16a34a);
  border-color: transparent;
  animation: tc-pop 220ms ease;
}
.tc-check.overdue:not(.checked) {
  border-color: var(--tc-overdue);
}
.tc-check.blocked:not(.checked) {
  border-color: #f59e0b;
  border-style: dashed;
}
.tc-check.check-p1 { box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.22); }
.tc-check.check-p2 { box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.22); }
.tc-check.check-p3 { box-shadow: 0 0 0 2px rgba(234, 179, 8, 0.22); }

@keyframes tc-pop {
  0% { transform: scale(0.8); }
  60% { transform: scale(1.1); }
  100% { transform: scale(1); }
}
.tc-check:focus-visible {
  outline: none;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.25);
}

/* ---------- Body ---------- */
.tc-body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  cursor: pointer;
  padding: 2px 2px 4px 2px;
  border-radius: 10px;
  outline: none;
}
.tc-body:hover {
  background: rgba(127, 127, 127, 0.04);
}
.tc-body:focus-visible {
  box-shadow: inset 0 0 0 2px rgba(59, 130, 246, 0.35);
}

.tc-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.tc-badges {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.tc-badges-enter-active, .tc-badges-leave-active { transition: all 240ms ease; }
.tc-badges-enter-from, .tc-badges-leave-to {
  opacity: 0;
  transform: translateX(-6px);
}

.tc-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px 2px 6px;
  font-size: 10.5px;
  font-weight: 600;
  border-radius: 999px;
  line-height: 1;
  border: 1px solid transparent;
}
.tc-badge em {
  font-style: normal;
  letter-spacing: 0.02em;
}
.tc-prio-1 { background: rgba(239, 68, 68, 0.12); color: #dc2626; border-color: rgba(239, 68, 68, 0.3); }
.tc-prio-2 { background: rgba(249, 115, 22, 0.12); color: #c2410c; border-color: rgba(249, 115, 22, 0.3); }
.tc-prio-3 { background: rgba(234, 179, 8, 0.14); color: #a16207; border-color: rgba(234, 179, 8, 0.35); }

.tc-blocked {
  background: rgba(251, 191, 36, 0.14);
  color: #92400e;
  border-color: rgba(251, 191, 36, 0.4);
}

.tc-title {
  margin: 0;
  flex: 1;
  min-width: 0;
  font-size: 14.5px;
  font-weight: 600;
  color: var(--tc-text);
  line-height: 1.35;
  letter-spacing: -0.005em;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-word;
}
.tc-title-done {
  text-decoration: line-through;
  text-decoration-thickness: 1.5px;
  text-decoration-color: currentColor;
  -webkit-text-decoration-line: line-through;
  color: var(--tc-muted);
  font-weight: 500;
}

.tc-title-icons {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  color: var(--tc-muted);
}
.tc-icon-repeat { color: #8b5cf6; }

.tc-star {
  background: transparent;
  border: none;
  padding: 4px;
  border-radius: 8px;
  color: var(--tc-muted);
  cursor: pointer;
  display: inline-flex;
  transition: color 0.15s ease, background 0.15s ease, transform 0.12s ease;
}
.tc-star:hover { color: #f59e0b; background: rgba(245, 158, 11, 0.08); }
.tc-star.active {
  color: #f59e0b;
  animation: tc-pop 260ms ease;
}
.tc-star:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.3);
}

/* ---------- Chips ---------- */
.tc-chips {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.tc-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11.5px;
  background: rgba(127, 127, 127, 0.08);
  color: var(--tc-muted);
  border: 1px solid transparent;
  white-space: nowrap;
}
.tc-chip b { font-weight: 600; color: var(--tc-text); font-size: 11.5px; }
.tc-chip-sep { opacity: 0.5; font-style: normal; font-weight: 700; }

.tc-chip-date.overdue {
  background: rgba(239, 68, 68, 0.12);
  color: var(--tc-overdue);
  border-color: rgba(239, 68, 68, 0.25);
}
.tc-chip-date.overdue b { color: var(--tc-overdue); }
.tc-chip-date.today {
  background: rgba(59, 130, 246, 0.12);
  color: #1d4ed8;
  border-color: rgba(59, 130, 246, 0.25);
}
html[data-theme='dark'] .tc-chip-date.today { color: #93c5fd; }
html[data-theme='dark'] .tc-chip-date.today b { color: #bfdbfe; }

.tc-chip-mini { padding: 3px 6px; }

.tc-chip-list .tc-chip-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.tc-chip-pomo {
  gap: 6px;
}
.tc-pomo-bar {
  display: inline-block;
  width: 42px;
  height: 6px;
  background: rgba(127, 127, 127, 0.18);
  border-radius: 999px;
  overflow: hidden;
}
.tc-pomo-fill {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #ef4444, #f97316);
  border-radius: inherit;
  transition: width 0.3s ease;
}

.tc-chip-counts {
  gap: 8px;
}
.tc-count {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.tc-counts-enter-active, .tc-counts-leave-active { transition: all 240ms ease; }
.tc-counts-enter-from, .tc-counts-leave-to { opacity: 0; transform: translateY(-4px); }

/* ---------- 子任务进度条 ---------- */
.tc-sub-progress {
  display: flex;
  align-items: center;
  gap: 8px;
}
.tc-sub-bar {
  flex: 1;
  height: 6px;
  border-radius: 999px;
  background: rgba(127, 127, 127, 0.16);
  overflow: hidden;
}
.tc-sub-fill {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #22c55e);
  border-radius: inherit;
  transition: width 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
.tc-sub-toggle {
  border: none;
  background: rgba(127, 127, 127, 0.08);
  color: var(--tc-muted);
  border-radius: 8px;
  width: 24px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.18s ease, background 0.15s ease, color 0.15s ease;
  flex-shrink: 0;
}
.tc-sub-toggle:hover { color: var(--tc-accent); background: rgba(59, 130, 246, 0.12); }
.tc-rot { transform: rotate(180deg); }

/* ---------- 子任务展开列表 ---------- */
.tc-subs {
  grid-column: 2 / -1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-left: 4px;
  padding-left: 14px;
  border-left: 2px solid rgba(59, 130, 246, 0.2);
}
.tc-sub-row {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  border-radius: 8px;
  background: rgba(127, 127, 127, 0.04);
}
.tc-sub-row:hover { background: rgba(127, 127, 127, 0.08); }
.tc-sub-row.done .tc-sub-title {
  color: var(--tc-muted);
  text-decoration: line-through;
}
.tc-sub-check {
  width: 15px;
  height: 15px;
  padding: 0;
  border-radius: 50%;
  border: 1.3px solid rgba(127, 127, 127, 0.35);
  background: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #16a34a;
  cursor: pointer;
  transition: background 0.18s ease, border-color 0.15s ease;
}
.tc-sub-check:hover { border-color: var(--tc-accent); }
.tc-sub-check.checked {
  background: #22c55e;
  border-color: transparent;
  color: white;
}
.tc-sub-title {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--tc-text);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tc-sub-reorder {
  display: inline-flex;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(127, 127, 127, 0.08);
}
.tc-sub-btn, .tc-sub-del {
  border: none;
  background: transparent;
  color: var(--tc-muted);
  width: 20px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease;
  padding: 0;
}
.tc-sub-btn:hover:not(:disabled) { color: var(--tc-accent); background: rgba(59, 130, 246, 0.12); }
.tc-sub-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.tc-sub-del:hover { color: #ef4444; background: rgba(239, 68, 68, 0.1); }

.tc-expand-enter-active,
.tc-expand-leave-active {
  transition: all 320ms cubic-bezier(0.22, 1, 0.36, 1);
  overflow: hidden;
}
.tc-expand-enter-from,
.tc-expand-leave-to {
  opacity: 0;
  transform: translateY(-4px);
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}
.tc-expand-enter-to,
.tc-expand-leave-from {
  max-height: 800px;
}

/* ---------- 标签 pills ---------- */
.tc-tags {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
}
.tc-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.01em;
}
.tc-tag-more {
  background: rgba(127, 127, 127, 0.1) !important;
  color: var(--tc-muted) !important;
  border: none !important;
}

/* ---------- Compact 视图 ---------- */
.task-card.tc-compact {
  grid-template-columns: auto 1fr auto;
  padding: 6px 10px;
  gap: 8px;
}
.task-card.tc-compact .tc-grip { display: none; }
.task-card.tc-compact .tc-check { width: 18px; height: 18px; margin-top: 2px; }
.task-card.tc-compact .tc-title {
  font-size: 13.5px;
  -webkit-line-clamp: 1;
}
.task-card.tc-compact .tc-sub-progress,
.task-card.tc-compact .tc-tags { display: none; }

/* ---------- Board 视图 ---------- */
.task-card.tc-board {
  grid-template-columns: 1fr;
  padding: 12px 12px 14px 12px;
}
.task-card.tc-board .tc-grip { display: none; }
.task-card.tc-board .tc-body { order: 1; }
.task-card.tc-board .tc-check {
  position: absolute;
  top: 12px;
  right: 12px;
  margin-top: 0;
}

/* ---------- 响应式 ---------- */
@media (max-width: 560px) {
  .task-card { padding: 9px 10px; gap: 8px; }
  .tc-grip { display: none; }
  .tc-chip { font-size: 10.5px; padding: 2px 6px; }
}
</style>
