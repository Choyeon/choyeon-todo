<template>
  <div class="tl-wrapper task-list">
    <!-- 顶部工具栏：视图切换 + Group By + 统计 -->
    <header v-if="!hideHeader" class="tl-toolbar" role="toolbar" :aria-label="t('task.listToolbar')">
      <div class="tl-toolbar-left">
        <strong class="tl-count" :aria-label="t('task.taskCount', { count: tasks.length })">
          <ListTodo :size="16"/>
          <span>{{ tasks.length }}</span>
        </strong>
        <span v-if="completedCount" class="tl-count-sub">· {{ completedCount }} {{ t('task.completed').toLowerCase() }}</span>
      </div>

      <div class="tl-toolbar-right">
        <div class="tl-seg" role="tablist" :aria-label="t('task.viewMode')">
          <button
            v-for="v in viewOptions"
            :key="v.id"
            type="button"
            class="tl-seg-btn"
            :class="{ active: viewMode === v.id }"
            role="tab"
            :aria-selected="viewMode === v.id"
            :aria-label="v.label"
            :title="v.label"
            @click="viewMode = v.id"
          >
            <component :is="v.icon" :size="15"/>
            <span class="tl-seg-label">{{ v.label }}</span>
          </button>
        </div>

        <div class="tl-divider"/>

        <button
          type="button"
          class="tl-btn"
          :class="{ active: !!groupBy }"
          :aria-label="t('task.groupBy')"
          :title="t('task.groupBy')"
          @click="cycleGroup"
        >
          <Group :size="15"/>
          <span>{{ groupByLabel }}</span>
        </button>

        <button
          type="button"
          class="tl-btn tl-btn-ghost"
          :aria-label="t('task.clearCompleted')"
          :title="t('task.clearCompleted')"
          @click="onClearCompleted"
        >
          <Eraser :size="15"/>
        </button>
      </div>
    </header>

    <!-- 主体区 -->
    <div
      ref="scrollRef"
      class="tl-scroll"
      role="list"
      :aria-label="t('task.tasks')"
      @dragover.prevent="onScrollDragOver"
      @dragleave="onScrollDragLeave"
      @drop.prevent="onScrollDrop"
      @scroll.passive="onScrollView"
      @paste="onPaste"
    >
      <!-- 空状态 -->
      <Transition name="tl-fade" mode="out-in">
        <EmptyState
          v-if="!isLoading && groupBuckets.length === 0"
          key="'empty'"
          :kind="emptyKind"
          :title="emptyTitle"
          :description="emptyDesc"
          :primary-label="emptyActionLabel"
          @primary="$emit('add-task')"
        />
      </Transition>

      <!-- 分组 / 列表渲染 -->
      <TransitionGroup
        v-if="groupBuckets.length"
        name="tl-group"
        tag="div"
        class="tl-groups"
      >
        <section
          v-for="bucket in groupBuckets"
          :key="bucket.key"
          class="tl-group"
          role="group"
          :aria-label="bucket.label"
        >
          <!-- 分组标题 -->
          <header
            class="tl-group-hd"
            @click="() => toggleGroupCollapse(bucket.key)"
            role="button"
            tabindex="0"
            :aria-expanded="!collapsedGroups.has(bucket.key)"
            :aria-label="bucket.label"
            @keydown.enter.prevent="() => toggleGroupCollapse(bucket.key)"
          >
            <button
              class="tl-group-caret"
              type="button"
              :aria-label="collapsedGroups.has(bucket.key) ? t('common.expand') : t('common.collapse')"
              tabindex="-1"
            >
              <ChevronRight :size="14" :class="{ 'tl-rot90': !collapsedGroups.has(bucket.key) }"/>
            </button>
            <span class="tl-group-title">{{ bucket.label }}</span>
            <span class="tl-group-count">{{ bucket.items.length }}</span>
            <div v-if="bucket.hint" class="tl-group-hint">{{ bucket.hint }}</div>
          </header>

          <!-- Board 视图：横向 card 流 -->
          <div
            v-if="viewMode === 'board'"
            v-show="!collapsedGroups.has(bucket.key)"
            class="tl-board"
            role="list"
          >
            <TaskCard
              v-for="t in bucket.items"
              :key="t.id"
              :ref="(el) => setCardRef(t.id, el)"
              :task="t"
              view="board"
              :density="density"
              :current-list="bucket.items"
              :is-focused="taskStore.focusedTaskId === t.id"
              :is-dragging="draggedTaskId === t.id"
              :is-drag-over="dragOverTaskId === t.id"
              :is-new="newTaskIds.has(t.id)"
              :is-overdue-ext="isTaskOverdue(t)"
              @edit="onEditTask"
              @toggle-complete="toggleComplete"
              @toggle-important="toggleImportant"
              @reorder="onCardReorder"
              @dragstart="onCardDragStart"
              @dragend="onCardDragEnd"
              @contextmenu.prevent.stop="(e) => onContextMenu(e, t)"
              @sub-toggle="onSubToggle"
              @sub-reorder="onSubReorder"
              @sub-remove="onSubRemove"
            />
          </div>

          <!-- List / Compact：虚拟滚动 (rowHeight x 数目) -->
          <div
            v-else
            v-show="!collapsedGroups.has(bucket.key)"
            class="tl-list"
            role="list"
            ref="groupListRefs"
            :data-group-key="bucket.key"
          >
            <!-- 虚拟滚动占位：如果超过 VIRTUAL_THRESHOLD 才启用 -->
            <template v-if="bucket.items.length > VIRTUAL_THRESHOLD">
              <div
                class="tl-virtual-spacer"
                :style="{ height: virtualTotalHeight(bucket) + 'px' }"
              >
                <div
                  class="tl-virtual-window"
                  :style="virtualWindowStyle(bucket)"
                >
                  <TaskCard
                    v-for="t in virtualItems(bucket)"
                    :key="t.id"
                    :ref="(el) => setCardRef(t.id, el)"
                    :task="t"
                    :view="viewMode"
                    :density="density"
                    :current-list="bucket.items"
                    :is-focused="taskStore.focusedTaskId === t.id"
                    :is-dragging="draggedTaskId === t.id"
                    :is-drag-over="dragOverTaskId === t.id"
                    :is-new="newTaskIds.has(t.id)"
                    :is-overdue-ext="isTaskOverdue(t)"
                    @edit="onEditTask"
                    @toggle-complete="toggleComplete"
                    @toggle-important="toggleImportant"
                    @reorder="onCardReorder"
                    @dragstart="onCardDragStart"
                    @dragend="onCardDragEnd"
                    @contextmenu.prevent.stop="(e) => onContextMenu(e, t)"
                    @sub-toggle="onSubToggle"
                    @sub-reorder="onSubReorder"
                    @sub-remove="onSubRemove"
                  />
                </div>
              </div>
            </template>

            <template v-else>
              <TaskCard
                v-for="(t, idx) in bucket.items"
                :key="t.id"
                :ref="(el) => setCardRef(t.id, el)"
                :task="t"
                :view="viewMode"
                :density="density"
                :current-list="bucket.items"
                :is-focused="taskStore.focusedTaskId === t.id"
                :is-dragging="draggedTaskId === t.id"
                :is-drag-over="dragOverTaskId === t.id && dragOverGroupKey === bucket.key"
                :is-new="newTaskIds.has(t.id)"
                :is-overdue-ext="isTaskOverdue(t)"
                @edit="onEditTask"
                @toggle-complete="toggleComplete"
                @toggle-important="toggleImportant"
                @reorder="onCardReorder"
                @dragstart="(e) => onCardDragStart(e, t, idx, bucket.key)"
                @dragend="(e) => onCardDragEnd(e, t, bucket.key)"
                @contextmenu.prevent.stop="(e) => onContextMenu(e, t)"
                @sub-toggle="onSubToggle"
                @sub-reorder="onSubReorder"
                @sub-remove="onSubRemove"
              />
            </template>
          </div>
        </section>
      </TransitionGroup>
    </div>

    <!-- 上下文菜单（右键 / 长按） -->
    <Teleport to="body">
      <Transition name="tl-cm-fade">
        <ul
          v-if="contextMenu.visible"
          class="tl-ctx-menu"
          role="menu"
          :style="cmStyle"
          @click.stop
        >
          <li
            v-for="(item, idx) in contextMenu.items"
            :key="idx"
            class="tl-ctx-item"
            :class="{ danger: item.danger, sepBefore: item.sepBefore, disabled: item.disabled }"
            role="menuitem"
            tabindex="0"
            @click="runCtxAction(item.action); closeCtxMenu()"
            @keydown.enter="runCtxAction(item.action); closeCtxMenu()"
          >
            <component
              v-if="item.icon"
              :is="item.icon"
              :size="15"
              class="tl-ctx-icon"
              :aria-hidden="true"
            />
            <span class="tl-ctx-label">{{ item.label }}</span>
            <kbd v-if="item.shortcut" class="tl-kbd">{{ item.shortcut }}</kbd>
          </li>
        </ul>
      </Transition>
      <div
        v-if="contextMenu.visible"
        class="tl-cm-backdrop"
        aria-hidden="true"
        @mousedown="closeCtxMenu"
      />
    </Teleport>
  </div>
</template>

<script setup>
import {
  computed,
  inject,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  shallowRef,
  watch
} from 'vue'
import { useI18n } from 'vue-i18n'
import { useTaskStore } from '../stores/taskStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useSnackbar } from '../composables/useSnackbar'
import { isTaskOverdue, getTodayStr } from '../utils/date'
import { buildDropIndex, validateDrop, applyDrop } from '../utils/dragDropTasks'
import {
  ListTodo,
  List,
  Rows3,
  LayoutGrid,
  Group,
  Eraser,
  ChevronRight,
  Edit3,
  Star,
  Sun,
  Timer,
  CalendarDays,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Share
} from '@lucide/vue'
import EmptyState from './EmptyState.vue'
import TaskCard from './TaskCard.vue'

// ------ Constants ------
const VIRTUAL_THRESHOLD = 60
const GROUP_CYCLE = ['none', 'status', 'priority', 'date', 'list']

// ------ Props / Emits ------
const props = defineProps({
  tasks: { type: Array, required: true },
  emptyType: { type: String, default: 'default' },
  /** 'list' | 'compact' | 'board' */
  initialView: {
    type: String,
    default: 'list',
    validator: (v) => ['list', 'compact', 'board'].includes(v)
  },
  initialGroupBy: {
    type: String,
    default: 'none',
    validator: (v) => ['none', 'status', 'priority', 'date', 'list'].includes(v)
  },
  hideHeader: { type: Boolean, default: false },
  isLoading: { type: Boolean, default: false }
})
const emit = defineEmits(['add-task', 'view-change', 'group-change'])

// ------ Stores / Inject ------
const taskStore = useTaskStore()
const settingsStore = useSettingsStore()
const { show: showSnackbar, error: snackbarError, success: snackbarSuccess } = useSnackbar()
const { t } = useI18n()
const openEditTask = inject('openEditTask')

// ------ State ------
const viewMode = ref(props.initialView)
const groupBy = ref(props.initialGroupBy)
const collapsedGroups = shallowRef(new Set())

const draggedTaskId = ref(null)
const dragOverTaskId = ref(null)
const dragOverGroupKey = ref(null)
const dragPayload = shallowRef(null) // { task, idx, groupKey }

const newTaskIds = shallowRef(new Set())
const completingTaskId = ref(null)
const confettiTaskId = ref(null)
const scrollRef = ref(null)
const groupListRefs = ref([])

const cardRefs = shallowRef(new Map())
const setCardRef = (id, el) => {
  if (el) cardRefs.value.set(id, el)
}

const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  items: [],
  task: null
})

const density = computed(() => settingsStore.density || 'comfortable')
const rowHeight = computed(() => {
  const base = viewMode.value === 'compact' ? 52 : viewMode.value === 'board' ? 180 : 80
  if (density.value === 'compact') return base - 10
  if (density.value === 'spacious') return base + 14
  return base
})

const pendingTimers = []

// ------ Toolbar view options ------
const viewOptions = computed(() => [
  { id: 'list',    icon: List,       label: t('task.viewList') },
  { id: 'compact', icon: Rows3,      label: t('task.viewCompact') },
  { id: 'board',   icon: LayoutGrid, label: t('task.viewBoard') }
])

watch(viewMode, (v) => {
  emit('view-change', v)
  // 切换视图时重新滚动对齐
})

// ------ Group By logic ------
const groupByLabel = computed(() => {
  switch (groupBy.value) {
    case 'status':   return t('task.groupStatus')
    case 'priority': return t('task.groupPriority')
    case 'date':     return t('task.groupDate')
    case 'list':     return t('task.groupList')
    default:         return t('task.groupNone')
  }
})
const cycleGroup = () => {
  const idx = GROUP_CYCLE.indexOf(groupBy.value)
  groupBy.value = GROUP_CYCLE[(idx + 1) % GROUP_CYCLE.length]
  emit('group-change', groupBy.value)
}
const toggleGroupCollapse = (key) => {
  const s = new Set(collapsedGroups.value)
  if (s.has(key)) s.delete(key); else s.add(key)
  collapsedGroups.value = s
}

const completedCount = computed(() => props.tasks.filter((t) => t.completed).length)

const compareDateRev = (a, b) => {
  if (a === b) return 0
  if (!a) return 1
  if (!b) return -1
  return a < b ? -1 : 1
}

const groupBuckets = computed(() => {
  const tasks = props.tasks || []
  if (!tasks.length) return []
  const mode = groupBy.value

  const buckets = []
  const push = (key, label, items, hint = '') => {
    if (!items.length) return
    buckets.push({ key, label, items, hint })
  }

  if (mode === 'none') {
    push('all', t('task.tasksAll'), tasks)
  } else if (mode === 'status') {
    push('todo', t('task.statusTodo'), tasks.filter((t) => !t.completed))
    push('done', t('task.statusDone'), tasks.filter((t) => t.completed))
  } else if (mode === 'priority') {
    push('p1', t('task.p1'), tasks.filter((t) => t.priority === 1 && !t.completed))
    push('p2', t('task.p2'), tasks.filter((t) => t.priority === 2 && !t.completed))
    push('p3', t('task.p3'), tasks.filter((t) => t.priority === 3 && !t.completed))
    push('p4', t('task.p4'), tasks.filter((t) => (t.priority ?? 4) >= 4 && !t.completed))
    push('done', t('task.statusDone'), tasks.filter((t) => t.completed))
  } else if (mode === 'date') {
    const today = getTodayStr()
    push('overdue', t('task.overdue'), tasks.filter((t) => !t.completed && isTaskOverdue(t)))
    push('today', t('task.today'), tasks.filter((t) => !t.completed && t.date === today))
    const todayT = new Date(today).getTime()
    const tomorrow = new Date(todayT + 86400000)
    const next7 = new Date(todayT + 7 * 86400000)
    const fmt = (d) => {
      const [y, m, dd] = d.split('-').map((x) => parseInt(x, 10))
      return new Date(y, m - 1, dd).getTime()
    }
    const tmrStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`
    push('tomorrow', t('task.tomorrowLabel'), tasks.filter((t) => !t.completed && t.date === tmrStr))
    push('week', t('task.nextWeek'), tasks.filter((t) => {
      if (t.completed || !t.date) return false
      const ts = fmt(t.date); return ts > tomorrow.getTime() && ts <= next7.getTime()
    }).sort((a, b) => compareDateRev(a.date, b.date)))
    push('later', t('task.later'), tasks.filter((t) => {
      if (t.completed || !t.date) return false
      return fmt(t.date) > next7.getTime()
    }).sort((a, b) => compareDateRev(a.date, b.date)))
    push('noDate', t('task.noDate'), tasks.filter((t) => !t.completed && !t.date))
    push('done', t('task.statusDone'), tasks.filter((t) => t.completed))
  } else if (mode === 'list') {
    const ids = [...new Set(tasks.map((t) => t.listId || t.category).filter(Boolean))]
    for (const id of ids) {
      const list = (taskStore.lists || taskStore.categories || []).find((l) => l.id === id)
      const name = list?.name || (id === 'inbox' ? t('nav.inbox') : id)
      push(`list-${id}`, name, tasks.filter((t) => (t.listId || t.category) === id))
    }
  }
  return buckets
})

// ------ Empty state mapping ------
const emptyKind = computed(() => {
  if (taskStore.searchQuery) return 'search'
  return props.emptyType || 'default'
})
const emptyTitle = computed(() => {
  if (taskStore.searchQuery) return t('empty.search')
  switch (props.emptyType) {
    case 'today': return t('empty.todayTitle')
    case 'important': return t('empty.importantTitle')
    case 'planned': return t('empty.plannedTitle')
    case 'completed': return t('empty.completed')
    case 'category': return t('empty.categoryTitle')
    case 'myday': return t('empty.mydayTitle') || t('empty.todayTitle')
    default: return t('empty.defaultTitle')
  }
})
const emptyDesc = computed(() => {
  if (taskStore.searchQuery) return t('empty.searchSubtitle')
  switch (props.emptyType) {
    case 'today': return t('empty.todaySubtitle')
    case 'important': return t('empty.importantSubtitle')
    case 'planned': return t('empty.plannedSubtitle')
    case 'completed': return t('empty.completedSubtitle')
    case 'category': return t('empty.categorySubtitle')
    default: return t('empty.defaultSubtitle')
  }
})
const emptyActionLabel = computed(() => (taskStore.searchQuery ? '' : t('empty.action')))

// ------ Virtual scroll (manual, per bucket) ------
const BUFFER = 6
const scrollTop = ref(0)
const viewportHeight = ref(600)

const updateScrollMetrics = () => {
  const el = scrollRef.value
  if (!el) return
  scrollTop.value = el.scrollTop
  viewportHeight.value = el.clientHeight || 600
}
const onScrollView = () => {
  updateScrollMetrics()
}
let _ro = null
onMounted(() => {
  updateScrollMetrics()
  if (typeof ResizeObserver !== 'undefined') {
    _ro = new ResizeObserver(updateScrollMetrics)
    if (scrollRef.value) _ro.observe(scrollRef.value)
  }
})
onBeforeUnmount(() => { if (_ro) { _ro.disconnect(); _ro = null } })

const virtualTotalHeight = (bucket) => {
  const N = bucket.items.length
  return N * rowHeight.value + Math.max(0, N - 1) * 8 /* gap */
}
const virtualItems = (bucket) => {
  if (!scrollRef.value) return bucket.items
  // 计算 bucket 顶部的绝对偏移（大约基于其它组的高度，这里简化：按 items 起始 0，视口内裁剪）
  // 更精确：把整个 groups 的位置近似为相对 parent。这里用可见范围在当前 bucket 数组 index 上切片。
  const groupEl = scrollRef.value.querySelector?.(`[data-group-key="${bucket.key}"]`)
  if (!groupEl) return bucket.items
  const groupTop = groupEl.offsetTop - scrollTop.value
  // group 起始在 scrollRef 内 offsetTop 绝对位置
  const absStart = groupEl.offsetTop + 80 // 80 为组标题 padding 估计
  const start = Math.max(0, scrollTop.value - absStart)
  const step = rowHeight.value + 8
  const sIdx = Math.max(0, Math.floor(start / step) - BUFFER)
  const visibleCount = Math.ceil(viewportHeight.value / step) + BUFFER * 2
  const eIdx = Math.min(bucket.items.length, sIdx + visibleCount)
  return bucket.items.slice(sIdx, eIdx)
}
const virtualWindowStyle = (bucket) => {
  const step = rowHeight.value + 8
  const groupEl = scrollRef.value?.querySelector?.(`[data-group-key="${bucket.key}"]`)
  if (!groupEl) return { transform: 'translateY(0px)' }
  const absStart = groupEl.offsetTop + 80
  const start = Math.max(0, scrollTop.value - absStart)
  const sIdx = Math.max(0, Math.floor(start / step) - BUFFER)
  return { transform: `translateY(${sIdx * step}px)` }
}

// ------ Task actions ------
const onEditTask = (task) => {
  if (openEditTask) openEditTask(task)
}
const toggleImportant = (id) => taskStore.toggleImportant(id)

const toggleComplete = (id) => {
  const task = taskStore.getTaskById(id)
  if (!task) return
  if (!task.completed) {
    completingTaskId.value = id
    confettiTaskId.value = id
    playCompletionSound()
    pendingTimers.push(
      setTimeout(() => {
        taskStore.toggleComplete(id)
        completingTaskId.value = null
      }, 280)
    )
    pendingTimers.push(
      setTimeout(() => { confettiTaskId.value = null }, 1000)
    )
  } else {
    taskStore.toggleComplete(id)
  }
}

const deleteTaskWithUndo = (id) => {
  const taskIndex = taskStore.getTaskIndexById(id)
  if (taskIndex === -1) return
  const task = taskStore.getTaskById(id)
  if (!task) return
  const snapshot = structuredClone(task)
  taskStore.deleteTask(id)
  showSnackbar(t('task.deletedMessage', { title: task.title }), {
    type: 'info',
    actionLabel: t('task.undo'),
    duration: 5000,
    onAction: () => {
      const insertIndex = Math.min(taskIndex, taskStore.tasks.length)
      taskStore.restoreTask(snapshot, insertIndex)
    }
  })
}

// Sub task actions delegated to store
const onSubToggle = ({ taskId, subId }) => { try { taskStore.toggleSubTaskComplete(taskId, subId) } catch (_e) {} }
const onSubReorder = ({ taskId, subId, dir }) => {
  try {
    const task = taskStore.getTaskById(taskId)
    if (!task || !Array.isArray(task.subTasks)) return
    const sorted = [...task.subTasks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    const idx = sorted.findIndex((s) => s.id === subId)
    if (idx < 0) return
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const tmp = sorted[idx].order; sorted[idx].order = sorted[swapIdx].order; sorted[swapIdx].order = tmp
    taskStore.updateTask(taskId, { subTasks: [...task.subTasks] })
  } catch (_e) {}
}
const onSubRemove = ({ taskId, subId }) => {
  try { if (taskStore.removeSubTask) taskStore.removeSubTask(taskId, subId) } catch (_e) {}
}

// ------ Clear completed ------
const onClearCompleted = () => {
  const n = props.tasks.filter((t) => t.completed).length
  if (n === 0) return
  showSnackbar({
    message: t('task.clearCompletedConfirm'),
    type: 'warning',
    actionLabel: t('task.clearCompleted'),
    duration: 6000,
    onAction: () => {
      const count = taskStore.clearCompletedTasks ? taskStore.clearCompletedTasks() : -1
      snackbarSuccess(typeof count === 'number' ? t('task.clearedMessage', { count }) : t('task.clearedMessage', { count: n }))
    }
  })
}

// ------ Drag & Drop (Task 4 要求：grip 拖拽柄调用 dragDropTasks + reorderTasks) ------
const onCardDragStart = (evt, task, idx = 0, groupKey = 'all') => {
  draggedTaskId.value = task.id
  dragPayload.value = { task, idx, groupKey }
  const nativeEvt = (evt && evt.event) ? evt.event : (evt || {})
  try {
    if (nativeEvt?.dataTransfer) {
      nativeEvt.dataTransfer.setData('text/plain', task.id)
      nativeEvt.dataTransfer.effectAllowed = 'move'
    }
  } catch (_e) { /* ignore */ }
}
const onCardDragEnd = () => {
  draggedTaskId.value = null
  dragOverTaskId.value = null
  dragOverGroupKey.value = null
  dragPayload.value = null
}

const onScrollDragOver = (event) => {
  if (!draggedTaskId.value) return
  event.dataTransfer.dropEffect = 'move'
  const id = event.target?.closest?.('[data-task-id]')?.getAttribute('data-task-id')
  const g = event.target?.closest?.('[data-group-key]')?.getAttribute('data-group-key') || null
  dragOverTaskId.value = id || null
  dragOverGroupKey.value = g || dragOverGroupKey.value || null
}
const onScrollDragLeave = () => {
  dragOverTaskId.value = null
}
const onScrollDrop = (event) => {
  const source = draggedTaskId.value || (event.dataTransfer?.getData?.('text/plain'))
  if (!source) return
  const bucketItems = dragPayload.value
    ? (groupBuckets.value.find((b) => b.key === dragPayload.value.groupKey)?.items || props.tasks)
    : props.tasks
  try {
    const rect = scrollRef.value.getBoundingClientRect()
    const insertions = { y: event.clientY - rect.top }
    const pos = buildDropIndex(insertions, bucketItems, {
      rowHeight: rowHeight.value,
      viewportHeight: rect.height,
      vscrollOffset: scrollRef.value.scrollTop
    })
    const validation = validateDrop({
      draggedTaskIds: [source],
      target: {
        parentId: pos.parentId ?? null,
        listId: dragOverGroupKey.value && dragOverGroupKey.value.startsWith('list-')
          ? dragOverGroupKey.value.slice(5)
          : (dragPayload.value?.task?.listId ?? null)
      },
      tasks: taskStore.tasks,
      lists: taskStore.lists || taskStore.categories || []
    })
    if (!validation.ok) {
      snackbarError(validation.reason)
      return
    }
    const moves = applyDrop({
      draggedTaskIds: [source],
      target: validation.normalizedTarget,
      ...pos,
      tasks: taskStore.tasks
    })
    const adapted = moves.map((m) => ({ id: m.taskId, afterId: m.afterId, beforeId: m.beforeId, parentId: m.parentId, listId: m.listId }))
    if (!adapted.length) return
    const ok = taskStore.reorderTasks(adapted)
    if (ok === false) snackbarError(t('task.reorderFailed'))
  } catch (err) {
    snackbarError(err?.message || t('task.reorderFailed'))
  } finally {
    draggedTaskId.value = null
    dragOverTaskId.value = null
    dragPayload.value = null
  }
}
const onCardReorder = (moves) => {
  if (!Array.isArray(moves) || moves.length === 0) return
  taskStore.reorderTasks(moves)
}

// Paste: 快速粘贴多行文本创建任务
const onPaste = (e) => {
  const text = (e.clipboardData || window.clipboardData).getData('text')
  if (!text || !text.trim()) return
  const lines = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
  if (lines.length <= 1) return
  e.preventDefault()
  for (const l of lines) {
    try {
      if (taskStore.addQuick) taskStore.addQuick(l)
      else taskStore.addTask({ title: l })
    } catch (_e) {}
  }
  snackbarSuccess(t('task.pastedTasks', { count: lines.length }))
}

// ------ Context Menu ------
const cmStyle = computed(() => ({
  top: `${Math.min(window.innerHeight - 60, contextMenu.y)}px`,
  left: `${Math.min(window.innerWidth - 240, contextMenu.x)}px`
}))
const buildCtxItems = (task) => [
  {
    icon: Edit3, label: t('task.editTask'), shortcut: 'Enter',
    action: () => onEditTask(task)
  },
  {
    icon: Star, label: task.important ? t('task.unstar') : t('task.markStar'), shortcut: 'I',
    action: () => toggleImportant(task.id)
  },
  {
    icon: Sun, label: (taskStore.isInMyDay?.(task.id) ? t('task.removeFromMyDay') : t('task.addToMyDay')),
    action: () => { if (taskStore.toggleMyDay) taskStore.toggleMyDay(task.id) }
  },
  {
    icon: Timer, label: t('task.startFocus'), shortcut: 'D',
    action: () => { if (taskStore.focusTask) taskStore.focusTask(task.id) }
  },
  { sepBefore: true,
    icon: CheckCircle2, label: task.completed ? t('task.markIncomplete') : t('task.markComplete'), shortcut: 'Space',
    action: () => toggleComplete(task.id)
  },
  {
    icon: ArrowUp, label: t('task.moveUp'),
    disabled: !taskStore.reorderTasks,
    action: () => {
      const arr = props.tasks
      const i = arr.findIndex((t) => t.id === task.id)
      if (i <= 0) return
      const anchor = arr[i - 1]
      taskStore.reorderTasks([{ id: task.id, beforeId: anchor.id }])
    }
  },
  {
    icon: ArrowDown, label: t('task.moveDown'),
    disabled: !taskStore.reorderTasks,
    action: () => {
      const arr = props.tasks
      const i = arr.findIndex((t) => t.id === task.id)
      if (i < 0 || i >= arr.length - 1) return
      const anchor = arr[i + 1]
      taskStore.reorderTasks([{ id: task.id, afterId: anchor.id }])
    }
  },
  {
    icon: CalendarDays, label: t('task.setDate'),
    action: () => onEditTask(task)
  },
  {
    icon: Copy, label: t('task.duplicate'),
    disabled: !taskStore.duplicateTask,
    action: () => {
      const id = taskStore.duplicateTask(task.id)
      if (id) {
        newTaskIds.value = new Set([...newTaskIds.value, id])
        setTimeout(() => {
          const s = new Set(newTaskIds.value); s.delete(id); newTaskIds.value = s
        }, 600)
      }
    }
  },
  { sepBefore: true, icon: Share, label: t('task.share'),
    disabled: !navigator.share,
    action: async () => {
      try {
        await navigator.share({ title: task.title, text: task.notes || task.title })
      } catch (_e) {}
    }
  },
  { sepBefore: true, danger: true,
    icon: Trash2, label: t('task.deleteTask'), shortcut: 'Del',
    action: () => deleteTaskWithUndo(task.id)
  }
]

const onContextMenu = (event, task) => {
  contextMenu.task = task
  contextMenu.items = buildCtxItems(task)
  contextMenu.x = event.clientX + 1
  contextMenu.y = event.clientY + 1
  contextMenu.visible = true
}
const runCtxAction = (fn) => { try { if (typeof fn === 'function') fn() } catch (e) { snackbarError(e?.message || String(e)) } }
const closeCtxMenu = () => { contextMenu.visible = false; contextMenu.items = []; contextMenu.task = null }
const onGlobalDocClick = () => closeCtxMenu()

// ------ Completion sound (保留原行为) ------
let audioContext = null
const playCompletionSound = () => {
  if (!settingsStore.soundsEnabled) return
  try {
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const schedule = (freq, startDelay, dur) => {
      const osc = audioContext.createOscillator()
      const gain = audioContext.createGain()
      osc.connect(gain); gain.connect(audioContext.destination)
      osc.frequency.value = freq; osc.type = 'sine'
      const T0 = audioContext.currentTime + startDelay
      gain.gain.setValueAtTime(0.22, T0)
      gain.gain.exponentialRampToValueAtTime(0.01, T0 + dur)
      osc.start(T0); osc.stop(T0 + dur)
    }
    schedule(523, 0, 0.15)
    schedule(659, 0.15, 0.2)
    schedule(784, 0.3, 0.3)
  } catch (_e) { /* ignore */ }
}

// ------ Lifecycle ------
onMounted(() => {
  document.addEventListener('mousedown', onGlobalDocClick)
  // 监听新增任务 -> 标记 new 用于 fade-in
  const existingIds = new Set((taskStore.tasks || []).map((t) => t.id))
  const unwatch = watch(
    () => (taskStore.tasks || []).length,
    (newLen, oldLen) => {
      if (newLen <= oldLen) return
      const currIds = (taskStore.tasks || []).map((t) => t.id)
      for (const id of currIds) {
        if (!existingIds.has(id)) {
          const s = new Set(newTaskIds.value); s.add(id); newTaskIds.value = s
          existingIds.add(id)
          const captureId = id
          pendingTimers.push(setTimeout(() => {
            const s2 = new Set(newTaskIds.value); s2.delete(captureId); newTaskIds.value = s2
          }, 700))
        }
      }
    }
  )
  onBeforeUnmount(() => { try { unwatch() } catch (_e) {} })
})

onBeforeUnmount(() => {
  pendingTimers.forEach(clearTimeout)
  pendingTimers.length = 0
  document.removeEventListener('mousedown', onGlobalDocClick)
  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close().catch(() => {})
    audioContext = null
  }
})

defineExpose({
  scrollToTop: () => { scrollRef.value?.scrollTo?.({ top: 0, behavior: 'smooth' }) },
  getCardRef: (id) => cardRefs.value.get(id)
})
</script>

<style scoped>
.tl-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

/* Toolbar */
.tl-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 14px;
  background: var(--tl-toolbar-bg, rgba(255, 255, 255, 0.6));
  backdrop-filter: blur(14px) saturate(1.05);
  -webkit-backdrop-filter: blur(14px) saturate(1.05);
  border: 1px solid var(--tl-border, rgba(15, 23, 42, 0.06));
  border-radius: 14px;
  color: var(--tl-text, #0f172a);
}
html[data-theme='dark'] .tl-toolbar {
  --tl-toolbar-bg: rgba(24, 28, 36, 0.7);
  --tl-border: rgba(255, 255, 255, 0.06);
  --tl-text: #e5e7eb;
  --tl-muted: #94a3b8;
}
:not(html[data-theme='dark']) .tl-toolbar {
  --tl-muted: #64748b;
}

.tl-toolbar-left {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--tl-muted);
  font-size: 13px;
  font-weight: 600;
}
.tl-count {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--tl-text);
}
.tl-count span { font-variant-numeric: tabular-nums; }
.tl-count-sub { font-weight: 500; font-size: 12px; color: var(--tl-muted); }

.tl-toolbar-right {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.tl-divider {
  width: 1px;
  height: 20px;
  background: rgba(127, 127, 127, 0.2);
  margin: 0 2px;
}

.tl-seg {
  display: inline-flex;
  align-items: center;
  padding: 3px;
  border-radius: 10px;
  background: rgba(127, 127, 127, 0.08);
  gap: 2px;
}
.tl-seg-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--tl-muted);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.15s ease, background 0.18s ease, transform 0.1s ease;
  font-family: inherit;
}
.tl-seg-btn:hover { color: var(--tl-text); background: rgba(127, 127, 127, 0.08); }
.tl-seg-btn.active {
  background: linear-gradient(135deg, rgba(59,130,246,0.9), rgba(139,92,246,0.9));
  color: white;
  box-shadow: 0 6px 16px -8px rgba(59, 130, 246, 0.7);
}
.tl-seg-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}
@media (max-width: 560px) {
  .tl-seg-label { display: none; }
  .tl-seg-btn { padding: 6px 8px; }
}

.tl-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: 1px solid rgba(127, 127, 127, 0.2);
  background: transparent;
  border-radius: 10px;
  color: var(--tl-text);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease;
  font-family: inherit;
}
.tl-btn:hover { background: rgba(127, 127, 127, 0.08); }
.tl-btn.active {
  color: #1d4ed8;
  border-color: rgba(59, 130, 246, 0.4);
  background: rgba(59, 130, 246, 0.08);
}
html[data-theme='dark'] .tl-btn.active { color: #93c5fd; }
.tl-btn-ghost { border-color: transparent; color: var(--tl-muted); }
.tl-btn-ghost:hover { color: #ef4444; background: rgba(239, 68, 68, 0.1); }
.tl-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
}

/* Scroll area */
.tl-scroll {
  position: relative;
  padding: 4px 2px 8px 2px;
  max-height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  border-radius: 16px;
}
.tl-scroll::-webkit-scrollbar { width: 10px; }
.tl-scroll::-webkit-scrollbar-thumb {
  background: rgba(127, 127, 127, 0.22);
  border-radius: 999px;
  border: 2px solid transparent;
  background-clip: content-box;
}

/* Groups */
.tl-groups {
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: tl-appear 320ms cubic-bezier(0.22, 1, 0.36, 1);
}
@keyframes tl-appear {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.tl-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-radius: 16px;
  background: var(--tl-group-bg, rgba(255, 255, 255, 0.4));
  backdrop-filter: blur(10px) saturate(1.02);
  -webkit-backdrop-filter: blur(10px) saturate(1.02);
  padding: 6px 10px 12px 10px;
  border: 1px solid var(--tl-border, rgba(15, 23, 42, 0.05));
}
html[data-theme='dark'] .tl-group {
  --tl-group-bg: rgba(24, 28, 36, 0.35);
}

.tl-group-hd {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px 4px 8px;
  cursor: pointer;
  border-radius: 10px;
  user-select: none;
}
.tl-group-hd:hover { background: rgba(127, 127, 127, 0.06); }
.tl-group-hd:focus-visible {
  outline: none;
  box-shadow: inset 0 0 0 2px rgba(59, 130, 246, 0.35);
}
.tl-group-caret {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--tl-muted);
  padding: 2px;
  border-radius: 6px;
  transition: transform 0.2s ease;
}
.tl-rot90 { transform: rotate(90deg); }

.tl-group-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--tl-text);
  letter-spacing: 0.01em;
}
.tl-group-count {
  font-variant-numeric: tabular-nums;
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 999px;
  background: rgba(127, 127, 127, 0.14);
  color: var(--tl-muted);
  font-weight: 700;
}
.tl-group-hint {
  margin-left: auto;
  font-size: 11px;
  color: var(--tl-muted);
}

/* List view */
.tl-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 6px 6px 6px;
  min-height: 24px;
}

/* Virtual scroll helpers */
.tl-virtual-spacer {
  position: relative;
  width: 100%;
}
.tl-virtual-window {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Board view */
.tl-board {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 10px;
  padding: 6px 8px 12px 8px;
}

/* Context menu */
.tl-ctx-menu {
  position: fixed;
  z-index: 9997;
  min-width: 220px;
  list-style: none;
  margin: 0;
  padding: 8px;
  border-radius: 12px;
  background: var(--tl-cm-bg, #ffffff);
  color: var(--tl-cm-text, #0f172a);
  border: 1px solid var(--tl-cm-border, rgba(15, 23, 42, 0.08));
  box-shadow:
    0 20px 40px -16px rgba(15, 23, 42, 0.3),
    0 8px 16px -12px rgba(15, 23, 42, 0.2);
}
html[data-theme='dark'] .tl-ctx-menu {
  --tl-cm-bg: #1a1e27;
  --tl-cm-text: #e5e7eb;
  --tl-cm-border: rgba(255, 255, 255, 0.08);
  --tl-cm-muted: #94a3b8;
}
:not(html[data-theme='dark']) .tl-ctx-menu { --tl-cm-muted: #64748b; }

.tl-ctx-item {
  display: grid;
  grid-template-columns: 20px 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  color: var(--tl-cm-text);
  transition: background 0.13s ease, color 0.13s ease;
}
.tl-ctx-item.sepBefore { margin-top: 4px; border-top: 1px solid rgba(127,127,127,0.12); padding-top: 10px; }
.tl-ctx-item:hover {
  background: rgba(59, 130, 246, 0.12);
  color: var(--tl-cm-text);
}
.tl-ctx-item.danger { color: #dc2626; }
.tl-ctx-item.danger:hover { background: rgba(239, 68, 68, 0.12); color: #b91c1c; }
.tl-ctx-item.disabled {
  opacity: 0.45;
  cursor: not-allowed;
  pointer-events: none;
}
.tl-ctx-icon { color: inherit; opacity: 0.85; }
.tl-kbd {
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 10.5px;
  border-radius: 5px;
  border: 1px solid rgba(127, 127, 127, 0.2);
  color: var(--tl-cm-muted);
  background: rgba(127, 127, 127, 0.06);
}

.tl-cm-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9996;
}

.tl-cm-fade-enter-active, .tl-cm-fade-leave-active {
  transition: opacity 150ms ease, transform 150ms ease;
}
.tl-cm-fade-enter-from, .tl-cm-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}

/* Transitions */
.tl-fade-enter-active, .tl-fade-leave-active {
  transition: opacity 240ms ease, transform 240ms ease;
}
.tl-fade-enter-from, .tl-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.tl-group-enter-active, .tl-group-leave-active {
  transition: opacity 280ms ease, transform 280ms cubic-bezier(0.22, 1, 0.36, 1);
}
.tl-group-enter-from, .tl-group-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
.tl-group-move {
  transition: transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
}

/* Responsive */
@media (max-width: 560px) {
  .tl-toolbar { padding: 8px 10px; flex-wrap: wrap; }
  .tl-toolbar-left { flex: 1 1 auto; }
  .tl-board { grid-template-columns: 1fr; }
}
</style>
