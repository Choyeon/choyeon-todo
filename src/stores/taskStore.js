import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  getTodayStr,
  formatDateStr,
  isValidDateStr,
  isValidTimeStr,
  addDays,
  getNextWeekRange,
  getTomorrowStr
} from '../utils/date'
// Task 1: 引入 v3 迁移工具
import {
  migrateV2ToV3,
  rollbackSaveAndPersist,
  saveConflict
} from '../utils/migrate-v3'
import { useSnackbar } from '../composables/useSnackbar'
import { useSettingsStore } from './settingsStore'
import { useAreaStore, DEFAULT_AREA_ID } from './areaStore'
import { useListStore, DEFAULT_LIST_ID } from './listStore'
// 简单 wrapper：优先用 useSnackbar，否则仅 console（测试环境无 DOM 也 OK）
const pushSnackbar = (msg) => {
  try {
    if (typeof useSnackbar === 'function') {
      const s = useSnackbar()
      if (s && typeof s.show === 'function') {
        s.show(msg)
        return
      }
    }
  } catch {
    /* ignore */
  }
  if (typeof console !== 'undefined') {
    console.warn('[Snackbar]', msg)
  }
}

const STORAGE_KEYS = {
  tasks: 'choyeon_tasks_v2',
  categories: 'choyeon_categories_v2',
  tags: 'choyeon_tags_v2',
  myDay: 'choyeon_myday_v1',
  templates: 'choyeon_templates_v1',
  // v3 UI 视图状态持久化
  uiView: 'choyeon_uiview_v1'
}

const DEFAULT_CATEGORIES = [
  { id: 'work', name: '工作', color: '#4A90D9', icon: 'briefcase' },
  { id: 'personal', name: '个人', color: '#E91E8C', icon: 'user' },
  { id: 'study', name: '学习', color: '#A855F7', icon: 'book-open' },
  { id: 'shopping', name: '购物', color: '#22C55E', icon: 'shopping-cart' },
  { id: 'health', name: '健康', color: '#EF4444', icon: 'heart' },
  { id: 'other', name: '其他', color: '#9B8EBB', icon: 'more-horizontal' }
]

const DEFAULT_TAGS = [
  { id: 'tag_urgent', name: '紧急', color: '#EF4444' },
  { id: 'tag_idea', name: '想法', color: '#F59E0B' },
  { id: 'tag_meeting', name: '会议', color: '#3B82F6' },
  { id: 'tag_project', name: '项目', color: '#8B5CF6' }
]

const DEFAULT_TEMPLATES = [
  {
    id: 'tpl_daily_routine',
    name: '日常任务',
    icon: 'sun',
    color: '#F59E0B',
    category: 'personal',
    priority: 3,
    tags: [],
    subTasks: [],
    notes: '',
    repeat: null,
    reminder: false,
    important: false
  },
  {
    id: 'tpl_meeting',
    name: '会议',
    icon: 'users',
    color: '#3B82F6',
    category: 'work',
    priority: 2,
    tags: ['tag_meeting'],
    subTasks: [
      { id: 'sub_prepare', title: '准备会议资料', completed: false, order: 0 },
      { id: 'sub_agenda', title: '确认会议议程', completed: false, order: 1 },
      { id: 'sub_minutes', title: '整理会议纪要', completed: false, order: 2 }
    ],
    notes: '',
    repeat: null,
    reminder: true,
    important: true
  },
  {
    id: 'tpl_study',
    name: '学习任务',
    icon: 'book-open',
    color: '#A855F7',
    category: 'study',
    priority: 3,
    tags: [],
    subTasks: [
      { id: 'sub_read', title: '阅读材料', completed: false, order: 0 },
      { id: 'sub_notes', title: '做笔记', completed: false, order: 1 },
      { id: 'sub_review', title: '复习总结', completed: false, order: 2 }
    ],
    notes: '',
    repeat: null,
    reminder: false,
    important: false
  }
]

const UNDELETABLE_CATEGORY = 'other'
// Task 1: v3 契约最低版本
const MIN_TASKS_VERSION = 3
// 子任务层级限制（祖先链长度 ≤ 4 → 根 + 4 层 = 最深 5 层）
const MAX_PARENT_DEPTH = 4
// 活动日志类型（共 8 类）
const ACTIVITY_TYPES = [
  'add',
  'edit',
  'complete',
  'uncomplete',
  'delete',
  'restore',
  'migrate',
  'reminderTrigger',
  'reminderSnooze',
  'pomodoroComplete'
]

export const generateId = (prefix = '') => {
  return `${prefix}${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`
}

const isValidHexColor = (color) => {
  if (typeof color !== 'string' || !color) return false
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color)
}

const getCurrentHM = () => {
  const now = new Date()
  return String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0')
}

const isTaskOverdueFast = (task, todayStr, currentHM) => {
  if (task.completed) return false
  if (!task.date) return false
  if (task.date < todayStr) return true
  if (task.date === todayStr && task.time && task.time < currentHM) return true
  return false
}

const sortTasks = (tasks) => {
  const todayStr = getTodayStr()
  const currentHM = getCurrentHM()

  const withKeys = tasks.map((t) => ({
    task: t,
    completed: t.completed ? 1 : 0,
    completedOrder: t.completedOrder ?? -1,
    completedAt: t.completedAt || 0,
    order: t.order ?? -1,
    overdue: isTaskOverdueFast(t, todayStr, currentHM) ? 0 : 1,
    important: t.important ? 0 : 1,
    date: t.date || '',
    time: t.time || '',
    hasTime: t.time ? 0 : 1,
    createdAt: t.createdAt || 0
  }))

  withKeys.sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed - b.completed
    }
    if (a.completed) {
      if (a.completedOrder >= 0 && b.completedOrder >= 0) {
        return a.completedOrder - b.completedOrder
      }
      return b.completedAt - a.completedAt
    }
    if (a.order >= 0 && b.order >= 0) {
      return a.order - b.order
    }
    if (a.overdue !== b.overdue) return a.overdue - b.overdue
    if (a.important !== b.important) return a.important - b.important
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    if (a.hasTime !== b.hasTime) return a.hasTime - b.hasTime
    if (a.time && b.time) return a.time.localeCompare(b.time)
    return b.createdAt - a.createdAt
  })

  return withKeys.map((w) => w.task)
}

const validateTask = (task) => {
  if (!task || typeof task !== 'object') return { valid: false, error: '任务数据无效' }
  if (!task.title || typeof task.title !== 'string' || !task.title.trim()) {
    return { valid: false, error: '任务标题不能为空' }
  }
  if (task.title.length > 500) {
    return { valid: false, error: '任务标题过长' }
  }
  if (task.date && !isValidDateStr(task.date)) {
    return { valid: false, error: '日期格式无效' }
  }
  if (task.time && !isValidTimeStr(task.time)) {
    return { valid: false, error: '时间格式无效' }
  }
  if (task.notes && task.notes.length > 5000) {
    return { valid: false, error: '备注内容过长' }
  }
  return { valid: true }
}

const isValidRepeatConfig = (repeat) => {
  if (!repeat) return true
  if (typeof repeat !== 'object') return false
  if (!['daily', 'weekly', 'monthly', 'yearly', 'custom'].includes(repeat.frequency)) return false
  if (repeat.frequency === 'weekly') {
    if (!Array.isArray(repeat.weekdays)) return false
    if (repeat.weekdays.some((d) => d < 0 || d > 6)) return false
  }
  if (typeof repeat.interval !== 'number' || repeat.interval < 1) return false
  if (repeat.endDate !== undefined && repeat.endDate !== null) {
    if (typeof repeat.endDate !== 'string' || !isValidDateStr(repeat.endDate)) return false
  }
  if (repeat.endCount !== undefined && repeat.endCount !== null) {
    if (typeof repeat.endCount !== 'number' || repeat.endCount < 1) return false
  }
  return true
}

export const useTaskStore = defineStore('task', () => {
  const tasks = ref([])
  const categories = ref([...DEFAULT_CATEGORIES])
  const tags = ref([...DEFAULT_TAGS])
  const templates = ref([...DEFAULT_TEMPLATES])
  const searchQuery = ref('')
  const currentView = ref('myday')
  const currentCategory = ref(null)
  const currentTag = ref(null)
  // v3 视图状态：Sidebar 切换 list/area/filter 时写入
  const currentFilterId = ref(null)
  const currentListId = ref(null)
  const currentAreaId = ref(null)
  const focusedTaskId = ref(null)
  const myDayDate = ref(null)
  const myDayTaskIds = ref([])

  const taskIndexMap = computed(() => {
    const map = new Map()
    tasks.value.forEach((t, i) => map.set(t.id, i))
    return map
  })

  const categoryIndexMap = computed(() => {
    const map = new Map()
    categories.value.forEach((c) => map.set(c.id, c))
    return map
  })

  const tagIndexMap = computed(() => {
    const map = new Map()
    tags.value.forEach((t) => map.set(t.id, t))
    return map
  })

  const getTaskIndexById = (id) => {
    return taskIndexMap.value.get(id) ?? -1
  }

  const getTaskById = (id) => {
    const idx = getTaskIndexById(id)
    return idx >= 0 ? tasks.value[idx] : null
  }

  const focusedTask = computed(() => {
    if (!focusedTaskId.value) return null
    return getTaskById(focusedTaskId.value)
  })

  const focusTask = (taskId) => {
    if (!taskId) return false
    const task = getTaskById(taskId)
    if (!task || task.completed) return false
    focusedTaskId.value = taskId
    return true
  }

  const unfocusTask = () => {
    focusedTaskId.value = null
  }

  const addPomodoroSession = (taskId, seconds) => {
    if (!taskId) return false
    const task = getTaskById(taskId)
    if (!task) return false
    task.pomodoroSessions = (task.pomodoroSessions || 0) + 1
    task.totalFocusTime = (task.totalFocusTime || 0) + Math.max(0, Math.floor(seconds))
    // Task 1: 如果超过 0 秒，视为一次番茄完成
    if (seconds > 0) logActivity(taskId, 'pomodoroComplete', { seconds: Math.floor(seconds) })
    return true
  }

  const checkMyDayDate = () => {
    const today = getTodayStr()
    if (myDayDate.value !== today) {
      myDayDate.value = today
      myDayTaskIds.value = []
      return true
    }
    return false
  }

  const isInMyDay = (taskId) => {
    checkMyDayDate()
    return myDayTaskIds.value.includes(taskId)
  }

  const addToMyDay = (taskId) => {
    if (!taskId) return false
    checkMyDayDate()
    if (!myDayTaskIds.value.includes(taskId)) {
      myDayTaskIds.value.push(taskId)
    }
    return true
  }

  const removeFromMyDay = (taskId) => {
    if (!taskId) return false
    checkMyDayDate()
    const idx = myDayTaskIds.value.indexOf(taskId)
    if (idx >= 0) {
      myDayTaskIds.value.splice(idx, 1)
    }
    return true
  }

  const toggleMyDay = (taskId) => {
    if (isInMyDay(taskId)) {
      removeFromMyDay(taskId)
      return false
    } else {
      addToMyDay(taskId)
      return true
    }
  }

  const myDayTasks = computed(() => {
    // computed 必须保持纯函数，不在内部修改状态
    // 日期变更由 isInMyDay/addToMyDay 等方法中的 checkMyDayDate() 处理
    return tasks.value.filter((t) => !t.completed && myDayTaskIds.value.includes(t.id))
  })

  const myDayCount = computed(() => {
    return myDayTasks.value.length
  })

  const initSampleData = () => {
    if (tasks.value.length > 0) return
    const today = new Date()

    const getNextWeekday = (weekday) => {
      const d = new Date(today)
      const currentDay = d.getDay()
      let diff = weekday - currentDay
      if (diff <= 0) diff += 7
      d.setDate(d.getDate() + diff)
      return formatDateStr(d)
    }

    const now = Date.now()
    const todayStr = formatDateStr(today)
    const nextMonWedFri = getNextWeekday(1)

    tasks.value = [
      {
        id: generateId('task_'),
        title: '欢迎使用 Choyeon To Do',
        category: 'personal',
        date: null,
        time: null,
        completed: false,
        important: true,
        priority: 2,
        reminder: false,
        notes:
          '点击左侧任务可以编辑详情，点击复选框标记完成。\n\n你可以：\n• 创建任务并设置分类\n• 设置截止日期和提醒\n• 使用番茄钟专注工作\n• 查看数据统计了解效率',
        tags: [],
        subTasks: [
          {
            id: generateId('sub_'),
            title: '浏览侧边栏菜单，了解各个功能',
            completed: false,
            order: 0
          },
          { id: generateId('sub_'), title: '尝试创建一个新任务', completed: false, order: 1 },
          {
            id: generateId('sub_'),
            title: '使用番茄钟专注完成一个任务',
            completed: false,
            order: 2
          }
        ],
        repeat: null,
        order: 0,
        pomodoroSessions: 0,
        totalFocusTime: 0,
        createdAt: now - 60000
      },
      {
        id: generateId('task_'),
        title: '每日晨间计划',
        category: 'work',
        date: todayStr,
        time: '09:00',
        completed: false,
        important: false,
        priority: 3,
        reminder: false,
        notes: '每天早上花10分钟规划当天工作',
        tags: [],
        subTasks: [],
        repeat: { frequency: 'daily', interval: 1 },
        order: 1,
        pomodoroSessions: 0,
        totalFocusTime: 0,
        createdAt: now - 120000
      },
      {
        id: generateId('task_'),
        title: '阅读30分钟',
        category: 'study',
        date: todayStr,
        time: '21:00',
        completed: false,
        important: false,
        priority: 4,
        reminder: false,
        notes: '坚持每天阅读，提升自我',
        tags: [],
        subTasks: [],
        repeat: { frequency: 'daily', interval: 1 },
        order: 2,
        pomodoroSessions: 0,
        totalFocusTime: 0,
        createdAt: now - 180000
      },
      {
        id: generateId('task_'),
        title: '运动健身',
        category: 'health',
        date: nextMonWedFri,
        time: '19:00',
        completed: false,
        important: false,
        priority: 3,
        reminder: true,
        notes: '保持健康的身体是高效工作的基础',
        tags: [],
        subTasks: [],
        repeat: { frequency: 'weekly', weekdays: [1, 3, 5], interval: 1 },
        order: 3,
        pomodoroSessions: 0,
        totalFocusTime: 0,
        createdAt: now - 240000
      },
      {
        id: generateId('task_'),
        title: '周工作总结',
        category: 'work',
        date: getNextWeekday(5),
        time: '17:00',
        completed: false,
        important: false,
        priority: 3,
        reminder: true,
        notes: '总结本周工作，规划下周目标',
        tags: ['tag_meeting'],
        subTasks: [],
        repeat: { frequency: 'weekly', weekdays: [5], interval: 1 },
        order: 4,
        pomodoroSessions: 0,
        totalFocusTime: 0,
        createdAt: now - 300000
      }
    ]
  }

  const loadFromStorage = () => {
    try {
      if (typeof localStorage === 'undefined') return
      const savedTasks = localStorage.getItem(STORAGE_KEYS.tasks)
      const savedCategories = localStorage.getItem(STORAGE_KEYS.categories)
      const savedTags = localStorage.getItem(STORAGE_KEYS.tags)

      if (savedTasks) {
        const parsed = JSON.parse(savedTasks)
        if (Array.isArray(parsed)) {
          tasks.value = parsed
            .filter((t) => t && t.id && t.title && typeof t.title === 'string')
            .map((t) => ({
              ...t,
              date: t.date && isValidDateStr(t.date) ? t.date : null,
              completed: !!t.completed,
              important: !!t.important,
              reminder: !!t.reminder,
              notes: t.notes || '',
              time: t.time && isValidTimeStr(t.time) ? t.time : null,
              completedAt: t.completedAt || null,
              createdAt: t.createdAt || Date.now(),
              tags: Array.isArray(t.tags) ? t.tags : [],
              subTasks: Array.isArray(t.subTasks)
                ? t.subTasks.map((st, i) => ({
                    id: st.id || generateId('sub_'),
                    title: st.title || '',
                    completed: !!st.completed,
                    order: typeof st.order === 'number' ? st.order : i
                  }))
                : [],
              repeat: isValidRepeatConfig(t.repeat) ? t.repeat : null,
              order: typeof t.order === 'number' ? t.order : 0,
              pomodoroSessions: typeof t.pomodoroSessions === 'number' ? t.pomodoroSessions : 0,
              totalFocusTime: typeof t.totalFocusTime === 'number' ? t.totalFocusTime : 0
            }))
        }
      }
      if (savedCategories) {
        const parsed = JSON.parse(savedCategories)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const filtered = parsed.filter((c) => c && c.id && c.name)
          if (!filtered.some((c) => c.id === UNDELETABLE_CATEGORY)) {
            const defaultOther = DEFAULT_CATEGORIES.find((c) => c.id === UNDELETABLE_CATEGORY)
            if (defaultOther) filtered.push(defaultOther)
          }
          categories.value = filtered
        }
      }
      if (savedTags) {
        const parsed = JSON.parse(savedTags)
        if (Array.isArray(parsed)) {
          tags.value = parsed.filter((t) => t && t.id && t.name)
        }
      }
      const savedMyDay = localStorage.getItem(STORAGE_KEYS.myDay)
      if (savedMyDay) {
        try {
          const parsed = JSON.parse(savedMyDay)
          const today = getTodayStr()
          if (parsed.date === today && Array.isArray(parsed.taskIds)) {
            myDayDate.value = parsed.date
            myDayTaskIds.value = parsed.taskIds.filter((id) => typeof id === 'string')
          }
        } catch (e) {
          console.warn('[TaskStore] Failed to parse myDay:', e)
        }
      }
      const savedTemplates = localStorage.getItem(STORAGE_KEYS.templates)
      if (savedTemplates) {
        try {
          const parsed = JSON.parse(savedTemplates)
          if (Array.isArray(parsed) && parsed.length > 0) {
            templates.value = parsed.filter((t) => t && t.id && t.name)
          }
        } catch (e) {
          console.warn('[TaskStore] Failed to parse templates:', e)
        }
      }
      // v3: 加载 UI 视图状态（currentView/currentFilterId/currentListId/currentAreaId 等）
      const savedUiView = localStorage.getItem(STORAGE_KEYS.uiView)
      if (savedUiView) {
        try {
          const parsed = JSON.parse(savedUiView)
          if (parsed && typeof parsed === 'object') {
            if (typeof parsed.currentView === 'string') currentView.value = parsed.currentView
            if (parsed.currentCategory !== undefined) currentCategory.value = parsed.currentCategory ?? null
            if (parsed.currentTag !== undefined) currentTag.value = parsed.currentTag ?? null
            if (parsed.currentFilterId !== undefined) currentFilterId.value = parsed.currentFilterId ?? null
            if (parsed.currentListId !== undefined) currentListId.value = parsed.currentListId ?? null
            if (parsed.currentAreaId !== undefined) currentAreaId.value = parsed.currentAreaId ?? null
          }
        } catch (e) {
          console.warn('[TaskStore] Failed to parse uiView:', e)
        }
      }

      // Task 1: 读取后做 v3 迁移保证（零互斥迁移，失败时回滚到加载前 state）
      try {
        ensureV3('loadFromStorage')
      } catch (e) {
        console.error('[TaskStore] ensureV3 after loadFromStorage failed:', e)
      }
    } catch (e) {
      console.error('[TaskStore] Failed to load from storage:', e)
      tasks.value = []
      categories.value = [...DEFAULT_CATEGORIES]
      tags.value = [...DEFAULT_TAGS]
      templates.value = [...DEFAULT_TEMPLATES]
    }
  }

  let saveTimeout = null

  const saveToStorage = () => {
    if (typeof localStorage === 'undefined') return
    try {
      const data = {
        tasks: tasks.value,
        categories: categories.value,
        tags: tags.value
      }
      localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(data.tasks))
      localStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(data.categories))
      localStorage.setItem(STORAGE_KEYS.tags, JSON.stringify(data.tags))
      localStorage.setItem(STORAGE_KEYS.templates, JSON.stringify(templates.value))
      localStorage.setItem(
        STORAGE_KEYS.myDay,
        JSON.stringify({
          date: myDayDate.value,
          taskIds: myDayTaskIds.value
        })
      )
      // v3: 保存 UI 视图状态
      try {
        localStorage.setItem(
          STORAGE_KEYS.uiView,
          JSON.stringify({
            currentView: currentView.value,
            currentCategory: currentCategory.value,
            currentTag: currentTag.value,
            currentFilterId: currentFilterId.value,
            currentListId: currentListId.value,
            currentAreaId: currentAreaId.value
          })
        )
      } catch (e) {
        console.error('[TaskStore] Failed to save uiView:', e)
      }
    } catch (e) {
      console.error('[TaskStore] Failed to save to storage:', e)
      if (e && e.name === 'QuotaExceededError') {
        console.warn('[TaskStore] Storage quota exceeded')
      }
    }
  }

  const debouncedSave = () => {
    invalidateStatsCache()
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => {
      saveToStorage()
    }, 300)
  }

  const resetToDefault = () => {
    tasks.value = []
    categories.value = [...DEFAULT_CATEGORIES]
    tags.value = [...DEFAULT_TAGS]
    templates.value = [...DEFAULT_TEMPLATES]
    initSampleData()
    if (saveTimeout) clearTimeout(saveTimeout)
    saveToStorage()
  }

  // Task 1: 零副作用 ensureV3。
  // 判断 settings.tasksVersion 若 < MIN_TASKS_VERSION，则调用 migrateV2ToV3()。
  // 失败时写 conflict + rollback，并保持原状态（不破坏 tasks/categories/tags/templates）。
  const ensureV3 = (reason = 'auto') => {
    let settingsTV = 3
    try {
      const sStore = useSettingsStore()
      if (sStore && typeof sStore.tasksVersion === 'number') {
        settingsTV = sStore.tasksVersion
      }
    } catch {
      /* ignore */
    }

    // 快速自检：tasks 是否所有条目都具备 v3 字段；若无，即使版本号对也要迁移
    let hasV3Fields = true
    if (tasks.value.length > 0) {
      // 抽样检查前 N 条 + 最近 2 条，避免全量扫描开销
      const sample = tasks.value.slice(0, 50).concat(tasks.value.slice(-2))
      for (const t of sample) {
        if (
          t.listId == null ||
          t.areaId == null ||
          t.blockedBy == null ||
          !Array.isArray(t.activity) ||
          t.updatedAt == null
        ) {
          hasV3Fields = false
          break
        }
      }
    }

    const needMigrate = settingsTV < MIN_TASKS_VERSION || !hasV3Fields
    if (!needMigrate) {
      // 已 v3：补齐每个任务字段默认值（避免老版本升级缺字段）
      let changed = false
      tasks.value = tasks.value.map((t) => {
        const ensured = ensureV3DefaultsOnTask(t)
        if (
          ensured.listId !== t.listId ||
          ensured.areaId !== t.areaId ||
          ensured.parentId !== t.parentId ||
          !Array.isArray(t.blockedBy) ||
          !Array.isArray(t.activity)
        ) {
          changed = true
        }
        return ensured
      })
      if (changed) {
        try {
          const sStore = useSettingsStore()
          if (sStore) sStore.tasksVersion = MIN_TASKS_VERSION
        } catch {
          /* ignore */
        }
        if (saveTimeout) clearTimeout(saveTimeout)
        saveToStorage()
      }
      return { ok: true, migrated: false, reason }
    }

    // 1) 快照（深拷贝）——失败 rollback
    const snap = {
      tasks: JSON.parse(JSON.stringify(tasks.value)),
      categories: JSON.parse(JSON.stringify(categories.value)),
      tags: JSON.parse(JSON.stringify(tags.value)),
      templates: JSON.parse(JSON.stringify(templates.value))
    }

    try {
      // 2) 读入 area/list 数据（若已存）
      let a = []
      let l = []
      try {
        const aStore = useAreaStore()
        if (aStore && Array.isArray(aStore.areas)) a = aStore.areas
      } catch {
        /* ignore */
      }
      try {
        const lStore = useListStore()
        if (lStore && Array.isArray(lStore.lists)) l = lStore.lists
      } catch {
        /* ignore */
      }

      const res = migrateV2ToV3({
        tasks: tasks.value,
        categories: categories.value,
        areas: a,
        lists: l,
        settings: { tasksVersion: settingsTV }
      })
      if (!res || !res.ok) {
        throw new Error((res && res.error) || 'migrateV2ToV3 failed')
      }

      // 3) 写入 tasks/categories/areas/lists + settings.tasksVersion
      tasks.value = res.migrated.tasks
      categories.value = res.migrated.categories
      if (res.migrated.areas && res.migrated.areas.length) {
        try {
          const aStore = useAreaStore()
          if (aStore && Array.isArray(aStore.areas)) aStore.areas = res.migrated.areas
        } catch {
          /* ignore */
        }
      }
      if (res.migrated.lists && res.migrated.lists.length) {
        try {
          const lStore = useListStore()
          if (lStore && Array.isArray(lStore.lists)) lStore.lists = res.migrated.lists
        } catch {
          /* ignore */
        }
      }
      try {
        const sStore = useSettingsStore()
        if (sStore) sStore.tasksVersion = MIN_TASKS_VERSION
      } catch {
        /* ignore */
      }

      // 4) 单次保存
      if (saveTimeout) clearTimeout(saveTimeout)
      saveToStorage()
      return { ok: true, migrated: true, reason }
    } catch (e) {
      console.error('[TaskStore] ensureV3 failed, rollback:', e)
      // 5) rollback
      tasks.value = snap.tasks
      categories.value = snap.categories
      tags.value = snap.tags
      templates.value = snap.templates
      rollbackSaveAndPersist(`ensureV3:${reason}:${Date.now()}`, snap)
      saveConflict(`ensureV3:${reason}`, { error: e && e.message, snap })
      return { ok: false, migrated: false, reason, error: e.message }
    }
  }

  const setupStorageWatch = (watchFn) => {
    watchFn(tasks, debouncedSave, { deep: true })
    watchFn(categories, debouncedSave, { deep: true })
    watchFn(tags, debouncedSave, { deep: true })
    watchFn(templates, debouncedSave, { deep: true })
    watchFn(myDayDate, debouncedSave)
    watchFn(myDayTaskIds, debouncedSave, { deep: true })
    // v3: UI 视图状态变化同样触发持久化
    watchFn(currentView, debouncedSave)
    watchFn(currentCategory, debouncedSave)
    watchFn(currentTag, debouncedSave)
    watchFn(currentFilterId, debouncedSave)
    watchFn(currentListId, debouncedSave)
    watchFn(currentAreaId, debouncedSave)
  }

  // Task 1: 通用 logActivity。仅在任务存在时写入，避免无效活动。
  // 默认限制最多保留最近 200 条，避免无限增长。
  const MAX_ACTIVITY_PER_TASK = 200
  const logActivity = (taskId, type, extra = {}) => {
    if (!taskId || !ACTIVITY_TYPES.includes(type)) return false
    const task = getTaskById(taskId)
    if (!task) return false
    if (!Array.isArray(task.activity)) task.activity = []
    const entry = { type, at: Date.now(), ...extra }
    task.activity.push(entry)
    if (task.activity.length > MAX_ACTIVITY_PER_TASK) {
      task.activity.splice(0, task.activity.length - MAX_ACTIVITY_PER_TASK)
    }
    return true
  }

  // Task 1: 子任务祖先链深度（沿 parentId 上溯，返回祖先链长度 = 深度）。
  // 无父级 => 0；子级 => 1；…；层级阈值校验 ≤ MAX_PARENT_DEPTH。
  const getAncestorDepth = (taskId, visited = null) => {
    let depth = 0
    let cur = taskId
    const seen = visited || new Set()
    while (cur) {
      if (seen.has(cur)) return Infinity // 防环
      seen.add(cur)
      const t = getTaskById(cur)
      if (!t || !t.parentId) break
      depth++
      if (depth > MAX_PARENT_DEPTH + 16) return Infinity
      cur = t.parentId
    }
    return depth
  }

  // Task 1: 依赖阻断校验。blockedBy 中任一条未完成任务 => 阻断。
  const isTaskBlocked = (task) => {
    if (!task) return false
    if (!Array.isArray(task.blockedBy) || task.blockedBy.length === 0) return false
    for (const depId of task.blockedBy) {
      const dep = getTaskById(depId)
      if (dep && !dep.completed) return true
    }
    return false
  }

  // Task 1: 为新任务补齐 v3 默认字段。供 addTask / addSubTask / importData 共用。
  const ensureV3DefaultsOnTask = (t, overrides = {}) => {
    const base = t || {}
    const now = Date.now()
    return {
      ...base,
      parentId: base.parentId !== undefined ? base.parentId : overrides.parentId ?? null,
      headingId: base.headingId ?? overrides.headingId ?? null,
      listId:
        base.listId ?? overrides.listId ?? base.categoryId ?? base.category ?? DEFAULT_LIST_ID,
      areaId: base.areaId ?? overrides.areaId ?? DEFAULT_AREA_ID,
      blockedBy: Array.isArray(base.blockedBy) ? base.blockedBy.slice() : overrides.blockedBy ?? [],
      comments: Array.isArray(base.comments) ? base.comments.slice() : overrides.comments ?? [],
      attachments: Array.isArray(base.attachments)
        ? base.attachments.slice()
        : overrides.attachments ?? [],
      assignee: typeof base.assignee === 'string' ? base.assignee : overrides.assignee ?? '',
      createdBy: typeof base.createdBy === 'string' ? base.createdBy : overrides.createdBy ?? '',
      nextReminderAt:
        typeof base.nextReminderAt === 'number' && base.nextReminderAt > 0
          ? base.nextReminderAt
          : overrides.nextReminderAt ?? null,
      snoozeCount:
        typeof base.snoozeCount === 'number'
          ? Math.max(0, base.snoozeCount)
          : overrides.snoozeCount ?? 0,
      activity: Array.isArray(base.activity) ? base.activity.slice() : overrides.activity ?? [],
      createdAt: typeof base.createdAt === 'number' ? base.createdAt : overrides.createdAt ?? now,
      updatedAt: typeof base.updatedAt === 'number' ? base.updatedAt : overrides.updatedAt ?? now
    }
  }

  const addTask = (task) => {
    const validation = validateTask(task)
    if (!validation.valid) {
      console.warn('[TaskStore] Cannot add task:', validation.error)
      return null
    }

    const catId = task.category || UNDELETABLE_CATEGORY
    const catExists = categoryIndexMap.value.has(catId)
    if (!catExists) {
      console.warn('[TaskStore] Category not found:', catId, 'using default')
    }

    let maxOrder = -1
    for (const t of tasks.value) {
      if (typeof t.order === 'number' && t.order > maxOrder) maxOrder = t.order
    }

    const now = Date.now()
    // 允许调用方显式指定 id（import/CSV/Sync 等场景需要保留原始 id）；非法或空则生成
    const explicitId = task && typeof task.id === 'string' && task.id.trim() ? task.id.trim() : null
    const base = {
      id: explicitId || generateId('task_'),
      title: task.title.trim().slice(0, 500),
      category: catExists ? catId : UNDELETABLE_CATEGORY,
      date: task.date || getTodayStr(),
      time: task.time || null,
      completed: false,
      important: !!task.important,
      priority: task.priority !== undefined ? task.priority : 4,
      reminder: !!task.reminder,
      notes: (task.notes || '').slice(0, 5000),
      tags: Array.isArray(task.tags) ? task.tags : [],
      subTasks: Array.isArray(task.subTasks)
        ? task.subTasks.map((st, i) => ({
            id: (st && typeof st.id === 'string' && st.id) || generateId('sub_'),
            title: st.title || '',
            completed: false,
            order: i
          }))
        : [],
      repeat: isValidRepeatConfig(task.repeat) ? task.repeat : null,
      order: maxOrder + 1,
      pomodoroSessions: 0,
      totalFocusTime: 0,
      createdAt: now,
      completedAt: null,
      isInbox: !!task.isInbox,
      blockedBy: Array.isArray(task.blockedBy)
        ? task.blockedBy.filter((x) => typeof x === 'string' && x.length > 0)
        : [],
      parentId: (task.parentId && typeof task.parentId === 'string' && task.parentId) || null
    }
    // Task 1: 叠加 v3 新字段默认值；若调用方显式传了 listId / areaId，保留优先
    const explicitOverrides = {}
    if (task && typeof task.listId === 'string' && task.listId) explicitOverrides.listId = task.listId
    if (task && typeof task.areaId === 'string' && task.areaId) explicitOverrides.areaId = task.areaId
    const newTask = ensureV3DefaultsOnTask(base, {
      listId: explicitOverrides.listId ?? base.category,
      activity: [{ type: 'add', at: now }]
    })
    // 兼容：categoryId 别名 -> 写回 category
    if (task && task.categoryId && typeof task.categoryId === 'string') {
      newTask.category = task.categoryId
      if (!explicitOverrides.listId) newTask.listId = task.categoryId
    }
    tasks.value.unshift(newTask)
    return newTask
  }

  // Task 1: 扩展 UPDATABLE_FIELDS
  //   注意：blockedBy 在外部 updateTask 调用中仅接受合法 id 数组（下方校验）。
  const UPDATABLE_FIELDS = [
    'title',
    'category',
    'date',
    'time',
    'completed',
    'important',
    'reminder',
    'notes',
    'tags',
    'subTasks',
    'repeat',
    'order',
    'priority',
    'isInbox',
    'pomodoroSessions',
    'totalFocusTime',
    // v3 新字段：仅允许特定写路径
    'parentId',
    'listId',
    'areaId',
    'headingId',
    'blockedBy',
    'comments',
    'attachments',
    'assignee',
    'nextReminderAt',
    'snoozeCount',
    'createdBy',
    'completedOrder',
    'completedAt',
    'updatedAt'
  ]

  const updateTask = (id, updates) => {
    if (!id || !updates) return false
    const index = getTaskIndexById(id)
    if (index === -1) return false

    const prevTask = tasks.value[index]

    const safeUpdates = {}
    for (const key of UPDATABLE_FIELDS) {
      if (updates[key] !== undefined) {
        safeUpdates[key] = updates[key]
      }
    }

    if (safeUpdates.title !== undefined) {
      safeUpdates.title = String(safeUpdates.title).trim().slice(0, 500)
      if (!safeUpdates.title) return false
    }
    if (safeUpdates.date !== undefined) {
      if (!safeUpdates.date) {
        safeUpdates.date = getTodayStr()
      } else if (!isValidDateStr(safeUpdates.date)) {
        return false
      }
    }
    if (safeUpdates.time !== undefined && safeUpdates.time && !isValidTimeStr(safeUpdates.time)) {
      return false
    }
    if (safeUpdates.notes !== undefined) {
      safeUpdates.notes = String(safeUpdates.notes || '').slice(0, 5000)
    }
    if (safeUpdates.important !== undefined) {
      safeUpdates.important = !!safeUpdates.important
    }
    if (safeUpdates.reminder !== undefined) {
      safeUpdates.reminder = !!safeUpdates.reminder
    }
    const prevCompleted = !!prevTask.completed
    const willChangeCompleted =
      safeUpdates.completed !== undefined && !!safeUpdates.completed !== prevCompleted
    if (safeUpdates.completed !== undefined) {
      safeUpdates.completed = !!safeUpdates.completed
    }
    // Task 1: 若要标记完成 -> blockedBy 阻断校验
    if (willChangeCompleted && safeUpdates.completed) {
      const mergedForBlocked = { ...prevTask, ...safeUpdates }
      if (isTaskBlocked(mergedForBlocked)) {
        pushSnackbar('任务被阻断，需先完成前置任务')
        return false
      }
    }
    if (safeUpdates.tags !== undefined && !Array.isArray(safeUpdates.tags)) {
      return false
    }
    if (safeUpdates.subTasks !== undefined && !Array.isArray(safeUpdates.subTasks)) {
      return false
    }
    if (
      safeUpdates.repeat !== undefined &&
      safeUpdates.repeat !== null &&
      !isValidRepeatConfig(safeUpdates.repeat)
    ) {
      return false
    }
    if (safeUpdates.category !== undefined) {
      if (!categoryIndexMap.value.has(safeUpdates.category)) {
        safeUpdates.category = UNDELETABLE_CATEGORY
      }
    }
    if (safeUpdates.priority !== undefined) {
      const p = Number(safeUpdates.priority)
      if (!Number.isFinite(p)) return false
      safeUpdates.priority = Math.max(1, Math.min(4, Math.round(p)))
    }
    if (safeUpdates.isInbox !== undefined) {
      safeUpdates.isInbox = !!safeUpdates.isInbox
    }
    // Task 1: v3 字段校验
    if (safeUpdates.blockedBy !== undefined) {
      if (!Array.isArray(safeUpdates.blockedBy)) return false
      // blockedBy 仅接受合法字符串 id 数组；去重并忽略自身引用
      const seen = new Set()
      const clean = []
      for (const bid of safeUpdates.blockedBy) {
        if (typeof bid !== 'string' || !bid) continue
        if (bid === id) continue
        if (seen.has(bid)) continue
        seen.add(bid)
        clean.push(bid)
      }
      safeUpdates.blockedBy = clean
    }
    if (safeUpdates.comments !== undefined && !Array.isArray(safeUpdates.comments)) return false
    if (safeUpdates.attachments !== undefined && !Array.isArray(safeUpdates.attachments)) return false
    if (safeUpdates.parentId !== undefined) {
      if (safeUpdates.parentId !== null) {
        if (typeof safeUpdates.parentId !== 'string' || safeUpdates.parentId === id) return false
        // 先临时模拟更新，校验深度（避免循环修改）
        const orig = prevTask.parentId
        prevTask.parentId = safeUpdates.parentId
        const depth = getAncestorDepth(id)
        prevTask.parentId = orig
        if (depth > MAX_PARENT_DEPTH) return false
      }
    }
    if (safeUpdates.listId !== undefined && safeUpdates.listId !== null) {
      safeUpdates.listId = String(safeUpdates.listId)
    }
    if (safeUpdates.areaId !== undefined && safeUpdates.areaId !== null) {
      safeUpdates.areaId = String(safeUpdates.areaId)
    }
    if (safeUpdates.assignee !== undefined) {
      safeUpdates.assignee = safeUpdates.assignee == null ? '' : String(safeUpdates.assignee)
    }
    if (safeUpdates.createdBy !== undefined) {
      safeUpdates.createdBy = safeUpdates.createdBy == null ? '' : String(safeUpdates.createdBy)
    }
    if (safeUpdates.nextReminderAt !== undefined) {
      if (safeUpdates.nextReminderAt == null) {
        safeUpdates.nextReminderAt = null
      } else if (typeof safeUpdates.nextReminderAt !== 'number') {
        return false
      }
    }
    if (safeUpdates.snoozeCount !== undefined) {
      const sc = Number(safeUpdates.snoozeCount)
      if (!Number.isFinite(sc)) return false
      safeUpdates.snoozeCount = Math.max(0, Math.floor(sc))
    }
    safeUpdates.updatedAt = Date.now()

    if (safeUpdates.completed !== undefined) {
      safeUpdates.completedAt = safeUpdates.completed ? Date.now() : null
      if (safeUpdates.completed) {
        if (prevTask.completedOrder === undefined || prevTask.completedOrder < 0) {
          let maxCompletedOrder = -1
          for (const t of tasks.value) {
            if (t.id !== id && typeof t.completedOrder === 'number' && t.completedOrder > maxCompletedOrder) {
              maxCompletedOrder = t.completedOrder
            }
          }
          safeUpdates.completedOrder = maxCompletedOrder + 1
        }
      } else {
        // 取消完成：移除 completedOrder，保持与 toggleComplete 行为一致
        safeUpdates.completedOrder = undefined
      }
    }

    const mergedTask = { ...prevTask, ...safeUpdates }
    tasks.value[index] = mergedTask

    // 保持 repeat 生命周期逻辑与 toggleComplete 自洽
    if (willChangeCompleted) {
      if (mergedTask.completed) {
        removeFromMyDay(id)
        if (mergedTask.repeat) generateNextRepeatTask(id)
        logActivity(id, 'complete')
      } else {
        if (mergedTask.repeat) removeNextRepeatTask(id)
        logActivity(id, 'uncomplete')
      }
    } else {
      // 普通编辑：记录 edit 活动（如果有任何实际改动）
      const hasEdit = Object.keys(safeUpdates).some(
        (k) => k !== 'updatedAt' && JSON.stringify(safeUpdates[k]) !== JSON.stringify(prevTask[k])
      )
      if (hasEdit) logActivity(id, 'edit')
    }

    // 聚焦态与完成态自洽：已完成任务不可聚焦
    if (mergedTask.completed && focusedTaskId.value === id) {
      focusedTaskId.value = null
    }

    return true
  }

  const deleteTask = (id) => {
    if (!id) return null
    const index = getTaskIndexById(id)
    if (index === -1) return null
    // Task 1: 删除活动日志（写到被删任务对象上，保留用于 restore/撤销场景）
    logActivity(id, 'delete')
    const [snapshot] = tasks.value.splice(index, 1)
    removeFromMyDay(id)
    // 删除聚焦任务时清空焦点，避免 UI 引用已删除的任务
    if (focusedTaskId.value === id) {
      focusedTaskId.value = null
    }
    // Task 1: 清理 blockedBy 中对该任务的引用
    tasks.value.forEach((t) => {
      if (Array.isArray(t.blockedBy) && t.blockedBy.includes(id)) {
        t.blockedBy = t.blockedBy.filter((bid) => bid !== id)
      }
      // 若 parentId 指向已删除 -> 上提一级
      if (t.parentId === id) t.parentId = null
    })
    return snapshot
  }

  const toggleComplete = (id) => {
    const task = getTaskById(id)
    if (!task) return
    // Task 1: blockedBy 阻断校验（仅当要切换到 completed 时）
    if (!task.completed && isTaskBlocked(task)) {
      pushSnackbar('任务被阻断，需先完成前置任务')
      return false
    }
    task.completed = !task.completed
    task.completedAt = task.completed ? Date.now() : null
    task.updatedAt = Date.now()

    if (task.completed) {
      let maxOrder = -1
      for (const t of tasks.value) {
        if (t.completed && t.id !== id && typeof t.completedOrder === 'number') {
          if (t.completedOrder > maxOrder) maxOrder = t.completedOrder
        }
      }
      task.completedOrder = maxOrder + 1
      removeFromMyDay(id)
      if (task.repeat) {
        generateNextRepeatTask(id)
      }
      logActivity(id, 'complete')
    } else {
      delete task.completedOrder
      logActivity(id, 'uncomplete')
      if (task.repeat) {
        removeNextRepeatTask(id)
      }
    }
    return true
  }

  const toggleImportant = (id) => {
    const task = getTaskById(id)
    if (!task) return
    task.important = !task.important
  }

  const toggleSubTaskComplete = (taskId, subId) => {
    const task = getTaskById(taskId)
    if (!task) return
    const sub = task.subTasks.find((st) => st.id === subId)
    if (!sub) return
    sub.completed = !sub.completed
  }

  // Task 1: 统一重排 / 移动入口。
  // 重载：
  //   reorderTasks(moves: [{id, afterId?, beforeId?, parentId?, listId?, headingId?}])  → 新统一 API
  //   reorderTasks(fromId, toId) → 旧兼容（交换到 toId 之前）
  // 所有改动在单次 mutation 内完成，完成后触发一次 debouncedSave。
  const reorderTasksV2 = (fromId, toId) => {
    const fromIndex = getTaskIndexById(fromId)
    const toIndex = getTaskIndexById(toId)
    if (fromIndex === -1 || toIndex === -1) return false

    const fromTask = tasks.value[fromIndex]
    const toTask = tasks.value[toIndex]

    if (fromTask.completed !== toTask.completed) return false

    const sameGroupTasks = tasks.value
      .filter((t) => t.completed === fromTask.completed)
      .sort((a, b) => {
        if (fromTask.completed) {
          return (a.completedOrder ?? 0) - (b.completedOrder ?? 0)
        }
        return (a.order || 0) - (b.order || 0)
      })

    const fromGroupIdx = sameGroupTasks.findIndex((t) => t.id === fromId)
    const toGroupIdx = sameGroupTasks.findIndex((t) => t.id === toId)
    if (fromGroupIdx === -1 || toGroupIdx === -1) return false

    const [moved] = sameGroupTasks.splice(fromGroupIdx, 1)
    sameGroupTasks.splice(toGroupIdx, 0, moved)

    if (fromTask.completed) {
      sameGroupTasks.forEach((t, i) => {
        t.completedOrder = i
      })
    } else {
      sameGroupTasks.forEach((t, i) => {
        t.order = i
      })
    }
    return true
  }

  const reorderTasks = (...args) => {
    // 重载：区分 moves 数组 vs (fromId, toId)
    if (args.length === 1 && Array.isArray(args[0])) {
      const moves = args[0]
      // 空数组视为 no-op，返回 false 方便调用方检测无效参数场景
      if (moves.length === 0) return false
      // 原子性校验：先把所有目标 task 找到，并确认 parentId/listId 更新后的深度合法
      // Stage 1: 预校验
      const snapshot = new Map()
      for (const m of moves) {
        if (!m || !m.id) return false
        const t = getTaskById(m.id)
        if (!t) return false
        snapshot.set(m.id, { ...t })
      }
      // Stage 1.5: 检查 parentId 深度
      for (const m of moves) {
        if (m.parentId === undefined) continue
        const snap = snapshot.get(m.id)
        const curParent = m.parentId ?? null
        if (curParent === m.id) return false
        // 临时更新用于深度计算
        snap.parentId = curParent
        // 沿快照遍历：遇到未知 parentId（未在 moves 中）时退回 tasks.value 查询
        let depth = 0
        let seen = new Set([m.id])
        let cur = curParent
        while (cur) {
          if (seen.has(cur)) return false
          seen.add(cur)
          const inSnap = snapshot.get(cur)
          const nextParent = inSnap ? inSnap.parentId : getTaskById(cur)?.parentId ?? null
          if (!nextParent) break
          depth++
          if (depth > MAX_PARENT_DEPTH) return false
          cur = nextParent
        }
        if (depth > MAX_PARENT_DEPTH) return false
      }
      // Stage 2: 实际修改（一次性）
      const now = Date.now()
      for (const m of moves) {
        const t = getTaskById(m.id)
        if (!t) continue
        if (m.parentId !== undefined) t.parentId = m.parentId ?? null
        if (m.listId !== undefined) {
          t.listId = m.listId
          // 同步 category 字段，保持 2.x UI 兼容
          t.category = m.listId
        }
        if (m.areaId !== undefined) t.areaId = m.areaId
        if (m.headingId !== undefined) t.headingId = m.headingId ?? null
        t.updatedAt = now
      }
      // Stage 3: afterId / beforeId 排序（同 completed 状态的未完成/已完成分组，用 order/completedOrder）
      for (const m of moves) {
        const t = getTaskById(m.id)
        if (!t) continue
        const anchor = m.afterId || m.beforeId
        if (!anchor) continue
        const anchorTask = getTaskById(anchor)
        if (!anchorTask) continue
        if (anchorTask.completed !== t.completed) continue
        const field = anchorTask.completed ? 'completedOrder' : 'order'
        const allSame = tasks.value.filter((x) => x.completed === t.completed)
        allSame.sort((a, b) => {
          const ao = typeof a[field] === 'number' ? a[field] : 0
          const bo = typeof b[field] === 'number' ? b[field] : 0
          return ao - bo
        })
        // 从组中抽出当前 id
        const withoutMoving = allSame.filter((x) => x.id !== m.id)
        const anchorIdx = withoutMoving.findIndex((x) => x.id === anchor)
        if (anchorIdx === -1) continue
        const insertPos = m.afterId ? anchorIdx + 1 : anchorIdx
        withoutMoving.splice(insertPos, 0, t)
        withoutMoving.forEach((x, i) => {
          x[field] = i
        })
      }
      // Stage 4: 单次 debouncedSave
      debouncedSave()
      return true
    }
    if (args.length === 2 && typeof args[0] === 'string' && typeof args[1] === 'string') {
      const result = reorderTasksV2(args[0], args[1])
      if (result) debouncedSave()
      return result
    }
    return false
  }

  // Task 1: 添加子任务。parentId 必须存在，且祖先链 ≤ MAX_PARENT_DEPTH。
  // position 语义：'inside'（缺省，作为 parentId 的直接子任务）/ 'before' / 'after' 仅预留，默认统一以 parentId 为主。
  const addSubTask = (parentId, draft, position = 'inside') => {
    if (!parentId) return null
    const parent = getTaskById(parentId)
    if (!parent) return null
    // 深度校验：新子任务 parentId = parentId → depth(parentId)+1 ≤ MAX_PARENT_DEPTH
    const parentDepth = getAncestorDepth(parentId)
    if (parentDepth + 1 > MAX_PARENT_DEPTH) return null
    const base = typeof draft === 'string' ? { title: draft } : draft || {}
    const now = Date.now()
    let maxOrder = -1
    for (const t of tasks.value) {
      if (typeof t.order === 'number' && t.order > maxOrder) maxOrder = t.order
    }
    const fallbackCategory = parent.category || UNDELETABLE_CATEGORY
    const taskDraft = {
      title: String(base.title || '').trim(),
      category: base.category || fallbackCategory,
      date: base.date || parent.date || getTodayStr(),
      time: base.time || null,
      reminder: !!base.reminder,
      important: !!base.important,
      priority: base.priority !== undefined ? base.priority : parent.priority ?? 4,
      notes: base.notes || '',
      tags: Array.isArray(base.tags) ? base.tags : [],
      subTasks: Array.isArray(base.subTasks) ? base.subTasks : [],
      repeat: isValidRepeatConfig(base.repeat) ? base.repeat : null,
      isInbox: !!base.isInbox
    }
    const created = addTask(taskDraft)
    if (!created) return null
    // 追加 v3 字段（相对于 addTask 的覆盖）
    created.parentId = parentId
    created.areaId = parent.areaId || DEFAULT_AREA_ID
    created.listId = parent.listId || fallbackCategory || DEFAULT_LIST_ID
    created.updatedAt = now
    // activity 追加 addSubTask 的 context（仍在 add 类型内，保留 extra）
    if (!Array.isArray(created.activity)) created.activity = []
    created.activity.push({ type: 'add', at: now, extra: { subTaskOf: parentId, position } })
    return created
  }

  // Task 1: 转换为子任务（更新 parentId 指向目标）
  const convertToSubtask = (taskId, parentId) => {
    if (!taskId || !parentId || taskId === parentId) return false
    const task = getTaskById(taskId)
    const parent = getTaskById(parentId)
    if (!task || !parent) return false
    // 校验环：parent 的祖先链不能包含 taskId
    let cur = parentId
    const seen = new Set([taskId])
    while (cur) {
      if (seen.has(cur)) return false
      seen.add(cur)
      const n = getTaskById(cur)
      if (!n || !n.parentId) break
      cur = n.parentId
    }
    // 校验深度
    const origParent = task.parentId
    task.parentId = parentId
    const depth = getAncestorDepth(taskId)
    if (depth > MAX_PARENT_DEPTH) {
      task.parentId = origParent
      return false
    }
    task.updatedAt = Date.now()
    logActivity(taskId, 'edit', { subTaskOf: parentId })
    debouncedSave()
    return true
  }

  // Task 1: 提升子任务（parentId=null）。若当前无 parentId 直接返回 true。
  const promoteSubtask = (taskId) => {
    if (!taskId) return false
    const task = getTaskById(taskId)
    if (!task) return false
    if (!task.parentId) return true
    task.parentId = null
    task.updatedAt = Date.now()
    logActivity(taskId, 'edit', { promoted: true })
    debouncedSave()
    return true
  }

  const getNextRepeatDate = (currentDate, repeat) => {
    if (!repeat || !currentDate) return null
    let nextDate = null

    if (repeat.frequency === 'daily') {
      nextDate = addDays(currentDate, repeat.interval || 1)
    } else if (repeat.frequency === 'weekly') {
      const [y, m, d] = currentDate.split('-').map(Number)
      const date = new Date(y, m - 1, d)
      const currentDay = date.getDay()
      const weekdays = [...(repeat.weekdays || [])].sort((a, b) => a - b)

      if (weekdays.length === 0) {
        nextDate = addDays(currentDate, 7 * (repeat.interval || 1))
      } else {
        let nextDay = null
        for (const day of weekdays) {
          if (day > currentDay) {
            nextDay = day
            break
          }
        }
        if (nextDay !== null) {
          nextDate = addDays(currentDate, nextDay - currentDay)
        } else {
          const daysToAdd = 7 - currentDay + weekdays[0] + 7 * ((repeat.interval || 1) - 1)
          nextDate = addDays(currentDate, daysToAdd)
        }
      }
    } else if (repeat.frequency === 'monthly') {
      const [y, m, d] = currentDate.split('-').map(Number)
      const nextMonth = m - 1 + (repeat.interval || 1)
      const nextYear = y + Math.floor(nextMonth / 12)
      const monthIdx = nextMonth % 12
      const daysInMonth = new Date(nextYear, monthIdx + 1, 0).getDate()
      const day = Math.min(d, daysInMonth)
      nextDate = `${nextYear}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    } else if (repeat.frequency === 'yearly') {
      const [y, m, d] = currentDate.split('-').map(Number)
      const targetYear = y + (repeat.interval || 1)
      const isFeb29 = m === 2 && d === 29
      if (isFeb29) {
        const isLeapYear =
          (targetYear % 4 === 0 && targetYear % 100 !== 0) || targetYear % 400 === 0
        if (!isLeapYear) {
          nextDate = `${targetYear}-02-28`
        } else {
          nextDate = `${targetYear}-${m}-${String(d).padStart(2, '0')}`
        }
      } else {
        nextDate = `${targetYear}-${m}-${String(d).padStart(2, '0')}`
      }
    } else if (repeat.frequency === 'custom') {
      if (repeat.interval && repeat.interval > 0) {
        nextDate = addDays(currentDate, repeat.interval)
      }
    }

    if (nextDate && repeat.endDate && nextDate > repeat.endDate) {
      return null
    }

    return nextDate
  }

  const generateNextRepeatTask = (taskId) => {
    const task = getTaskById(taskId)
    if (!task || !task.repeat) return null

    if (task.repeat.endCount !== undefined && task.repeat.endCount > 0) {
      let repeatCount = 0
      let currentTask = task
      while (currentTask && currentTask.parentTaskId) {
        repeatCount++
        currentTask = getTaskById(currentTask.parentTaskId)
      }
      repeatCount++
      if (repeatCount >= task.repeat.endCount) {
        return null
      }
    }

    const nextDate = getNextRepeatDate(task.date, task.repeat)
    if (!nextDate) return null

    const rootTaskId = getRootRepeatTaskId(taskId)
    let existingNext = null
    for (const t of tasks.value) {
      if (t.repeat && t.date === nextDate && !t.completed && t.id !== taskId) {
        if (getRootRepeatTaskId(t.id) === rootTaskId) {
          existingNext = t
          break
        }
      }
    }
    if (existingNext) return existingNext

    let maxOrder = -1
    for (const t of tasks.value) {
      if (typeof t.order === 'number' && t.order > maxOrder) maxOrder = t.order
    }
    const newTask = ensureV3DefaultsOnTask(
      {
        id: generateId('task_'),
        title: task.title,
        category: task.category,
        date: nextDate,
        time: task.time,
        completed: false,
        important: task.important,
        reminder: task.reminder,
        notes: task.notes,
        tags: [...task.tags],
        subTasks: task.subTasks.map((st) => ({
          id: generateId('sub_'),
          title: st.title,
          completed: false,
          order: st.order
        })),
        repeat: { ...task.repeat },
        order: maxOrder + 1,
        pomodoroSessions: 0,
        totalFocusTime: 0,
        createdAt: Date.now(),
        completedAt: null,
        parentTaskId: taskId,
        repeatRootId: rootTaskId || taskId
      },
      {
        listId: task.listId || task.category,
        areaId: task.areaId || DEFAULT_AREA_ID,
        parentId: task.parentId ?? null,
        activity: [{ type: 'add', at: Date.now(), extra: { repeatNext: true } }]
      }
    )

    tasks.value.push(newTask)
    debouncedSave()
    return newTask
  }

  const getRootRepeatTaskId = (taskId) => {
    let currentId = taskId
    let visited = 0
    const maxDepth = 1000
    while (currentId && visited < maxDepth) {
      visited++
      const task = getTaskById(currentId)
      if (!task || !task.parentTaskId) break
      currentId = task.parentTaskId
    }
    return currentId
  }

  const removeNextRepeatTask = (taskId) => {
    const task = getTaskById(taskId)
    if (!task || !task.repeat) return

    const nextDate = getNextRepeatDate(task.date, task.repeat)
    if (!nextDate) return

    const rootTaskId = getRootRepeatTaskId(taskId)
    let nextTaskIndex = -1
    for (let i = 0; i < tasks.value.length; i++) {
      const t = tasks.value[i]
      if (t.repeat && t.date === nextDate && !t.completed && t.id !== taskId) {
        if (getRootRepeatTaskId(t.id) === rootTaskId) {
          nextTaskIndex = i
          break
        }
      }
    }

    if (nextTaskIndex !== -1) {
      tasks.value.splice(nextTaskIndex, 1)
      debouncedSave()
    }
  }

  const addCategory = (category) => {
    if (!category || !category.name || !category.name.trim()) {
      console.warn('[TaskStore] Cannot add category: name is empty')
      return null
    }
    const existing = categories.value.find((c) => c.name === category.name.trim())
    if (existing) {
      console.warn('[TaskStore] Category with this name already exists')
      return null
    }
    if (
      category.color !== undefined &&
      category.color !== null &&
      category.color !== '' &&
      !isValidHexColor(category.color)
    ) {
      console.warn('[TaskStore] Cannot add category: invalid color format')
      return null
    }
    const newCat = {
      id: 'cat_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      name: category.name.trim().slice(0, 50),
      color: category.color || '#9B8EBB',
      icon: category.icon || 'folder'
    }
    categories.value.push(newCat)
    return newCat
  }

  const updateCategory = (id, updates) => {
    if (!id || !updates) return false
    const index = categories.value.findIndex((c) => c.id === id)
    if (index === -1) return false
    if (
      updates.color !== undefined &&
      updates.color !== null &&
      updates.color !== '' &&
      !isValidHexColor(updates.color)
    ) {
      console.warn('[TaskStore] Cannot update category: invalid color format')
      return false
    }
    const updated = { ...categories.value[index], ...updates }
    if (updates.name !== undefined) {
      updated.name = String(updates.name).trim().slice(0, 50)
      if (!updated.name) return false
    }
    categories.value[index] = updated
    return true
  }

  const deleteCategory = (id, options = {}) => {
    if (!id) return false
    if (id === UNDELETABLE_CATEGORY) {
      console.warn('[TaskStore] Cannot delete default category:', UNDELETABLE_CATEGORY)
      return false
    }
    const index = categories.value.findIndex((c) => c.id === id)
    if (index === -1) return false

    const moveTasks = options.moveTasks !== undefined ? options.moveTasks : true

    if (moveTasks) {
      tasks.value.forEach((t) => {
        if (t.category === id) t.category = UNDELETABLE_CATEGORY
      })
    } else {
      tasks.value = tasks.value.filter((t) => t.category !== id)
    }

    categories.value.splice(index, 1)

    if (currentCategory.value === id) {
      currentCategory.value = null
      currentView.value = 'myday'
    }

    return true
  }

  const addTag = (tag) => {
    if (!tag || !tag.name || !tag.name.trim()) return null
    if (
      tag.color !== undefined &&
      tag.color !== null &&
      tag.color !== '' &&
      !isValidHexColor(tag.color)
    ) {
      console.warn('[TaskStore] Cannot add tag: invalid color format')
      return null
    }
    const existing = tags.value.find((t) => t.name === tag.name.trim())
    if (existing) return existing
    const newTag = {
      id: generateId('tag_'),
      name: tag.name.trim().slice(0, 30),
      color: tag.color || '#6B7280'
    }
    tags.value.push(newTag)
    return newTag
  }

  const updateTag = (id, updates) => {
    const index = tags.value.findIndex((t) => t.id === id)
    if (index === -1) return false
    if (
      updates &&
      updates.color !== undefined &&
      updates.color !== null &&
      updates.color !== '' &&
      !isValidHexColor(updates.color)
    ) {
      console.warn('[TaskStore] Cannot update tag: invalid color format')
      return false
    }
    tags.value[index] = { ...tags.value[index], ...updates }
    return true
  }

  const deleteTag = (id) => {
    const index = tags.value.findIndex((t) => t.id === id)
    if (index === -1) return false
    tasks.value.forEach((t) => {
      t.tags = t.tags.filter((tagId) => tagId !== id)
    })
    tags.value.splice(index, 1)
    if (currentTag.value === id) {
      currentTag.value = null
    }
    return true
  }

  const getCategoryById = (id) => {
    if (!id) return null
    return categoryIndexMap.value.get(id) || null
  }

  const getTagById = (id) => {
    if (!id) return null
    return tagIndexMap.value.get(id) || null
  }

  const filteredTasks = computed(() => {
    const today = getTodayStr()
    const tomorrow = getTomorrowStr()
    const nextWeek = getNextWeekRange()

    if (searchQuery.value.trim()) {
      const q = searchQuery.value.trim().toLowerCase()
      const matched = tasks.value.filter(
        (t) => t.title.toLowerCase().includes(q) || (t.notes && t.notes.toLowerCase().includes(q))
      )
      return sortTasks(matched)
    }

    let result
    switch (currentView.value) {
      case 'myday':
        result = myDayTasks.value
        break
      case 'today':
        result = tasks.value.filter((t) => t.date === today && !t.completed)
        break
      case 'tomorrow':
        result = tasks.value.filter((t) => t.date === tomorrow && !t.completed)
        break
      case 'week':
        result = tasks.value.filter(
          (t) => t.date >= nextWeek.start && t.date <= nextWeek.end && !t.completed
        )
        break
      case 'important':
        result = tasks.value.filter((t) => t.important && !t.completed)
        break
      case 'planned':
        result = tasks.value.filter((t) => t.date >= today && !t.completed)
        break
      case 'all':
        result = tasks.value.filter((t) => !t.completed)
        break
      case 'completed':
        result = tasks.value.filter((t) => t.completed)
        break
      case 'category':
        result = currentCategory.value
          ? tasks.value.filter((t) => t.category === currentCategory.value && !t.completed)
          : []
        break
      case 'tag':
        result = currentTag.value
          ? tasks.value.filter((t) => t.tags.includes(currentTag.value) && !t.completed)
          : []
        break
      case 'inbox':
        result = tasks.value.filter((t) => t.isInbox && !t.completed)
        break
      case 'list':
        result = currentListId.value
          ? tasks.value.filter(
              (t) =>
                !t.completed &&
                (t.listId === currentListId.value ||
                  (!t.listId && t.category === currentListId.value))
            )
          : []
        break
      case 'area':
        result = currentAreaId.value
          ? tasks.value.filter((t) => !t.completed && t.areaId === currentAreaId.value)
          : []
        break
      case 'filter':
        // 实际过滤由 filterStore.runFilter 在消费端组合完成
        // 此处先返回所有未完成任务作为基底，避免组件引用空集
        result = tasks.value.filter((t) => !t.completed)
        break
      default:
        result = []
    }

    return sortTasks(result)
  })

  const getTasksByDate = (dateStr) => {
    if (!dateStr || !isValidDateStr(dateStr)) return []
    const dateTasks = tasks.value.filter((t) => t.date === dateStr && !t.completed)
    return sortTasks(dateTasks)
  }

  const counts = computed(() => {
    const today = getTodayStr()
    const tomorrow = getTomorrowStr()
    const nextWeek = getNextWeekRange()
    const currentHM = getCurrentHM()
    let todayCount = 0,
      tomorrowCount = 0,
      weekCount = 0,
      importantCount = 0,
      plannedCount = 0,
      allCount = 0,
      completedCount = 0,
      overdueCount = 0,
      inboxCount = 0
    const catCounts = {}
    const tagCounts = {}

    for (const t of tasks.value) {
      if (!t.completed) {
        allCount++
        if (t.isInbox) inboxCount++
        if (t.date === today) todayCount++
        if (t.date === tomorrow) tomorrowCount++
        if (t.date >= nextWeek.start && t.date <= nextWeek.end) weekCount++
        if (t.important) importantCount++
        if (t.date && t.date >= today) plannedCount++
        // 与 isTaskOverdueFast / sortTasks 保持自洽：今天 + 已过时刻 也算逾期
        if (t.date && (t.date < today || (t.date === today && t.time && t.time < currentHM))) {
          overdueCount++
        }
        catCounts[t.category] = (catCounts[t.category] || 0) + 1
        for (const tagId of t.tags) {
          tagCounts[tagId] = (tagCounts[tagId] || 0) + 1
        }
      } else {
        completedCount++
      }
    }

    return {
      todayCount,
      tomorrowCount,
      weekCount,
      importantCount,
      plannedCount,
      allCount,
      completedCount,
      overdueCount,
      inboxCount,
      catCounts,
      tagCounts
    }
  })

  const getCount = (view) => {
    const c = counts.value
    switch (view) {
      case 'myday':
        return myDayCount.value
      case 'today':
        return c.todayCount
      case 'tomorrow':
        return c.tomorrowCount
      case 'week':
        return c.weekCount
      case 'important':
        return c.importantCount
      case 'planned':
        return c.plannedCount
      case 'all':
        return c.allCount
      case 'completed':
        return c.completedCount
      case 'overdue':
        return c.overdueCount
      case 'inbox':
        return c.inboxCount
      default:
        return 0
    }
  }

  const getCategoryCount = (catId) => {
    if (!catId) return 0
    return counts.value.catCounts[catId] || 0
  }

  const getTagCount = (tagId) => {
    if (!tagId) return 0
    return counts.value.tagCounts[tagId] || 0
  }

  const getOverdueCount = computed(() => counts.value.overdueCount)

  let statsCache = null
  let statsCacheDays = 0
  let statsCacheKey = ''

  const invalidateStatsCache = () => {
    statsCache = null
  }

  const getStats = (days = 7) => {
    const todayStr = getTodayStr()
    const currentHM = getCurrentHM()
    // 使用更精确的缓存键：任务数量 + 最后修改时间 + 日期 + days
    const lastModified =
      tasks.value.length > 0
        ? Math.max(...tasks.value.map((t) => t.completedAt || t.createdAt || 0))
        : 0
    const cacheKey = `${tasks.value.length}-${lastModified}-${todayStr}-${days}`

    if (statsCache && statsCacheKey === cacheKey && statsCacheDays === days) {
      return statsCache
    }

    const today = new Date()
    const dateList = []
    const dateToIndex = {}
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = formatDateStr(d)
      dateToIndex[dateStr] = dateList.length
      dateList.push({
        date: dateStr,
        created: 0,
        completed: 0,
        focusTime: 0,
        pomodoroCount: 0,
        dayOfWeek: d.getDay()
      })
    }
    const startDate = dateList[0].date
    const endDate = dateList[dateList.length - 1].date

    const categoryStats = {}
    const completedCategoryStats = {}
    const weekDayStats = {}
    for (let i = 0; i < 7; i++) {
      weekDayStats[i] = { completed: 0, created: 0 }
    }
    const priorityStats = { completed: {}, active: {} }
    const tagStats = {}
    let completedInRange = 0
    let totalCreatedInRange = 0
    let totalFocusSeconds = 0
    let totalPomodoro = 0
    let overdueCompleted = 0
    let onTimeCompleted = 0
    let avgCompletionTime = 0
    let completionTimeCount = 0
    let totalTasksEver = 0
    let completedTasksEver = 0
    let overdueActive = 0

    for (const task of tasks.value) {
      totalTasksEver++
      totalFocusSeconds += task.totalFocusTime || 0
      totalPomodoro += task.pomodoroSessions || 0

      const createdDateStr = task.createdAt ? formatDateStr(new Date(task.createdAt)) : null
      if (createdDateStr && createdDateStr >= startDate && createdDateStr <= endDate) {
        const idx = dateToIndex[createdDateStr]
        if (idx !== undefined) {
          dateList[idx].created++
          weekDayStats[dateList[idx].dayOfWeek].created++
          totalCreatedInRange++
        }
      }

      if (task.completed) {
        completedTasksEver++
        if (task.completedAt) {
          const compDateStr = formatDateStr(new Date(task.completedAt))
          if (compDateStr >= startDate && compDateStr <= endDate) {
            const idx = dateToIndex[compDateStr]
            if (idx !== undefined) {
              dateList[idx].completed++
              dateList[idx].focusTime += task.totalFocusTime || 0
              dateList[idx].pomodoroCount += task.pomodoroSessions || 0
              weekDayStats[dateList[idx].dayOfWeek].completed++
              completedInRange++

              if (task.date) {
                if (compDateStr <= task.date) {
                  onTimeCompleted++
                } else {
                  overdueCompleted++
                }
              }

              if (task.createdAt && task.completedAt) {
                const timeDiffHours = (task.completedAt - task.createdAt) / (1000 * 60 * 60)
                if (timeDiffHours >= 0 && timeDiffHours < 720) {
                  avgCompletionTime += timeDiffHours
                  completionTimeCount++
                }
              }

              if (task.category) {
                completedCategoryStats[task.category] =
                  (completedCategoryStats[task.category] || 0) + 1
              }
              if (task.priority !== undefined) {
                priorityStats.completed[task.priority] =
                  (priorityStats.completed[task.priority] || 0) + 1
              }
            }
          }
        }
      } else {
        // 与 counts 计算保持一致，避免侧边栏与仪表盘显示互斥
        if (
          task.date &&
          (task.date < todayStr ||
            (task.date === todayStr && task.time && task.time < currentHM))
        ) {
          overdueActive++
        }
        categoryStats[task.category] = (categoryStats[task.category] || 0) + 1
        if (task.priority !== undefined) {
          priorityStats.active[task.priority] = (priorityStats.active[task.priority] || 0) + 1
        }
        if (task.tags && task.tags.length > 0) {
          for (const tagId of task.tags) {
            tagStats[tagId] = (tagStats[tagId] || 0) + 1
          }
        }
      }
    }

    const dailyStats = dateList.map((d) => ({
      date: d.date,
      created: d.created,
      completed: d.completed,
      focusTime: d.focusTime,
      pomodoroCount: d.pomodoroCount
    }))

    let currentStreak = 0
    let maxStreak = 0
    for (let i = dailyStats.length - 1; i >= 0; i--) {
      if (dailyStats[i].completed > 0) {
        currentStreak++
        maxStreak = Math.max(maxStreak, currentStreak)
      } else {
        if (i === dailyStats.length - 1 && dailyStats[i].date === todayStr) {
          continue
        }
        break
      }
    }
    let tempStreak = 0
    for (const day of dailyStats) {
      if (day.completed > 0) {
        tempStreak++
        maxStreak = Math.max(maxStreak, tempStreak)
      } else {
        tempStreak = 0
      }
    }

    const completionRate =
      totalCreatedInRange > 0 ? Math.round((completedInRange / totalCreatedInRange) * 100) : 0

    const onTimeRate =
      onTimeCompleted + overdueCompleted > 0
        ? Math.round((onTimeCompleted / (onTimeCompleted + overdueCompleted)) * 100)
        : 0

    const avgDailyCompleted = days > 0 ? Math.round((completedInRange / days) * 10) / 10 : 0
    const avgDailyCreated = days > 0 ? Math.round((totalCreatedInRange / days) * 10) / 10 : 0
    const avgCompletionTimeHours =
      completionTimeCount > 0 ? Math.round((avgCompletionTime / completionTimeCount) * 10) / 10 : 0

    let bestDay = { day: 0, count: 0 }
    for (let i = 0; i < 7; i++) {
      if (weekDayStats[i].completed > bestDay.count) {
        bestDay = { day: i, count: weekDayStats[i].completed }
      }
    }

    const result = {
      dailyStats,
      categoryStats,
      completedCategoryStats,
      weekDayStats,
      priorityStats,
      tagStats,
      completedInRange,
      totalCreatedInRange,
      completionRate,
      totalFocusSeconds,
      totalPomodoro,
      overdueCompleted,
      onTimeCompleted,
      onTimeRate,
      streakDays: currentStreak,
      maxStreak,
      avgDailyCompleted,
      avgDailyCreated,
      avgCompletionTimeHours,
      totalTasksEver,
      completedTasksEver,
      overdueActive,
      bestDay
    }

    statsCache = result
    statsCacheKey = cacheKey
    statsCacheDays = days

    return result
  }

  /**
   * 清除所有已完成任务
   * @returns {number} 被清除的任务数量
   */
  const clearCompleted = () => {
    const beforeCount = tasks.value.length
    tasks.value = tasks.value.filter((t) => !t.completed)
    // 如果聚焦的任务已被清除，重置聚焦状态
    if (focusedTaskId.value && !tasks.value.some((t) => t.id === focusedTaskId.value)) {
      focusedTaskId.value = null
    }
    return beforeCount - tasks.value.length
  }

  const resetAll = () => {
    tasks.value = []
    categories.value = [...DEFAULT_CATEGORIES]
    tags.value = [...DEFAULT_TAGS]
    templates.value = [...DEFAULT_TEMPLATES]
    myDayDate.value = getTodayStr()
    myDayTaskIds.value = []
    searchQuery.value = ''
    currentView.value = 'myday'
    currentCategory.value = null
    currentTag.value = null
    focusedTaskId.value = null
    if (saveTimeout) clearTimeout(saveTimeout)
    saveToStorage()
  }

  // ========== 任务模板 ==========
  const addTemplate = (template) => {
    if (!template || !template.name || !template.name.trim()) return null
    const newTpl = {
      id: generateId('tpl_'),
      name: template.name.trim().slice(0, 50),
      icon: template.icon || 'file-text',
      color: isValidHexColor(template.color) ? template.color : '#6B7280',
      category: template.category || UNDELETABLE_CATEGORY,
      priority: template.priority !== undefined ? template.priority : 3,
      tags: Array.isArray(template.tags) ? [...template.tags] : [],
      subTasks: Array.isArray(template.subTasks)
        ? template.subTasks.map((st, i) => ({
            id: generateId('sub_'),
            title: st.title || '',
            completed: false,
            order: i
          }))
        : [],
      notes: (template.notes || '').slice(0, 2000),
      repeat: isValidRepeatConfig(template.repeat) ? template.repeat : null,
      reminder: !!template.reminder,
      important: !!template.important
    }
    templates.value.push(newTpl)
    debouncedSave()
    return newTpl
  }

  const updateTemplate = (id, updates) => {
    if (!id || !updates) return false
    const index = templates.value.findIndex((t) => t.id === id)
    if (index === -1) return false
    const tpl = templates.value[index]
    if (updates.name !== undefined) tpl.name = String(updates.name).trim().slice(0, 50)
    if (updates.icon !== undefined) tpl.icon = updates.icon
    if (updates.color !== undefined && isValidHexColor(updates.color)) tpl.color = updates.color
    if (updates.category !== undefined) tpl.category = updates.category
    if (updates.priority !== undefined) tpl.priority = updates.priority
    if (updates.tags !== undefined && Array.isArray(updates.tags)) tpl.tags = [...updates.tags]
    if (updates.subTasks !== undefined && Array.isArray(updates.subTasks)) {
      tpl.subTasks = updates.subTasks.map((st, i) => ({
        id: st.id || generateId('sub_'),
        title: st.title || '',
        completed: !!st.completed,
        order: i
      }))
    }
    if (updates.notes !== undefined) tpl.notes = String(updates.notes || '').slice(0, 2000)
    if (updates.repeat !== undefined) {
      tpl.repeat = isValidRepeatConfig(updates.repeat) ? updates.repeat : null
    }
    if (updates.reminder !== undefined) tpl.reminder = !!updates.reminder
    if (updates.important !== undefined) tpl.important = !!updates.important
    debouncedSave()
    return true
  }

  const deleteTemplate = (id) => {
    if (!id) return false
    const index = templates.value.findIndex((t) => t.id === id)
    if (index === -1) return false
    templates.value.splice(index, 1)
    debouncedSave()
    return true
  }

  const applyTemplate = (templateId, overrides = {}) => {
    const tpl = templates.value.find((t) => t.id === templateId)
    if (!tpl) return null
    const taskData = {
      title: overrides.title || tpl.name,
      category: overrides.category || tpl.category,
      priority: overrides.priority !== undefined ? overrides.priority : tpl.priority,
      tags: overrides.tags || [...tpl.tags],
      subTasks: tpl.subTasks.map((st) => ({ title: st.title, order: st.order })),
      notes: overrides.notes !== undefined ? overrides.notes : tpl.notes,
      repeat: overrides.repeat !== undefined ? overrides.repeat : tpl.repeat,
      reminder: overrides.reminder !== undefined ? overrides.reminder : tpl.reminder,
      important: overrides.important !== undefined ? overrides.important : tpl.important,
      date: overrides.date || undefined,
      time: overrides.time || undefined
    }
    return addTask(taskData)
  }

  const createTemplateFromTask = (taskId) => {
    const task = getTaskById(taskId)
    if (!task) return null
    return addTemplate({
      name: task.title,
      category: task.category,
      priority: task.priority,
      tags: [...task.tags],
      subTasks: task.subTasks.map((st) => ({ title: st.title })),
      notes: task.notes,
      repeat: task.repeat ? { ...task.repeat } : null,
      reminder: task.reminder,
      important: task.important
    })
  }

  // ========== 收件箱 ==========
  const addToInbox = (title) => {
    if (!title || !title.trim()) return null
    return addTask({
      title: title.trim(),
      category: UNDELETABLE_CATEGORY,
      date: getTodayStr(),
      isInbox: true,
      priority: 4
    })
  }

  const organizeInboxTask = (taskId, updates) => {
    const task = getTaskById(taskId)
    if (!task || !task.isInbox) return false

    // isInbox 不在 UPDATABLE_FIELDS 中，直接赋值后再 updateTask 会被忽略；
    // 这里通过组合方式统一写入，避免重复保存（updateTask 后 watch 会自动触发 debouncedSave）
    const mergedUpdates = { ...(updates || {}), isInbox: false }
    const ok = updateTask(taskId, mergedUpdates)
    if (!ok) return false
    // 手动回写 isInbox（因为它不在 UPDATABLE_FIELDS 白名单内）
    const after = getTaskById(taskId)
    if (after) after.isInbox = false
    return true
  }

  const clearInbox = () => {
    const inboxTasks = tasks.value.filter((t) => t.isInbox)
    inboxTasks.forEach((t) => deleteTask(t.id))
    return inboxTasks.length
  }

  const cleanup = () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout)
      saveTimeout = null
    }
  }

  const exportData = () => {
    // Task 1: 导出 v3 版本；包含 areas / lists / settings.tasksVersion，
    // 同时保留 categories 数组与 categoryIndexMap 语义以保证 2.x UI 兼容。
    const settingsSnap = { tasksVersion: MIN_TASKS_VERSION }
    try {
      const sStore = useSettingsStore()
      if (sStore && typeof sStore.tasksVersion === 'number') {
        settingsSnap.tasksVersion = Math.max(MIN_TASKS_VERSION, sStore.tasksVersion)
      }
    } catch {
      /* ignore */
    }
    let areaList = []
    let listList = []
    try {
      const aStore = useAreaStore()
      if (aStore && Array.isArray(aStore.areas)) areaList = aStore.areas
      const lStore = useListStore()
      if (lStore && Array.isArray(lStore.lists)) listList = lStore.lists
    } catch {
      /* ignore */
    }
    return {
      version: 3,
      tasksVersion: settingsSnap.tasksVersion,
      exportedAt: new Date().toISOString(),
      tasks: tasks.value,
      categories: categories.value,
      areas: areaList,
      lists: listList,
      tags: tags.value,
      templates: templates.value,
      settings: settingsSnap
    }
  }

  const exportToCSV = () => {
    const headers = [
      'ID',
      'Title',
      'Category',
      'Date',
      'Time',
      'Priority',
      'Important',
      'Completed',
      'Created At',
      'Completed At'
    ]

    const rows = tasks.value.map((task) => {
      const category = categories.value.find((c) => c.id === task.category)?.name || 'Other'
      return [
        task.id,
        `"${task.title.replace(/"/g, '""')}"`,
        `"${category}"`,
        task.date || '',
        task.time || '',
        task.priority || 3,
        task.important ? 'Yes' : 'No',
        task.completed ? 'Yes' : 'No',
        new Date(task.createdAt).toISOString(),
        task.completedAt ? new Date(task.completedAt).toISOString() : ''
      ].join(',')
    })

    return [headers.join(','), ...rows].join('\n')
  }

  const importData = (jsonStr) => {
    // 先单独解析 JSON：解析失败直接返回 falsy（null），符合非法 JSON 场景的语义契约
    let data
    try {
      data = JSON.parse(jsonStr)
    } catch (_parseErr) {
      return null
    }
    try {
      if (!data || typeof data !== 'object') {
        return { success: false, error: '无效的数据格式' }
      }

      if (!Array.isArray(data.tasks)) {
        return { success: false, error: '无效的任务数据格式' }
      }

      // Task 1: 判断导入数据版本，必要时先迁移
      const incomingTasksVersion =
        data.settings && typeof data.settings.tasksVersion === 'number'
          ? data.settings.tasksVersion
          : typeof data.tasksVersion === 'number'
            ? data.tasksVersion
            : typeof data.version === 'number'
              ? data.version
              : 0

      // 预保存当前状态 -> 失败时用于 rollback
      const prestate = {
        tasks: JSON.parse(JSON.stringify(tasks.value)),
        categories: JSON.parse(JSON.stringify(categories.value)),
        tags: JSON.parse(JSON.stringify(tags.value)),
        templates: JSON.parse(JSON.stringify(templates.value))
      }

      const needMigrate = incomingTasksVersion < MIN_TASKS_VERSION
      let normalizedTasks = data.tasks
      let normalizedCategories = data.categories || []
      let normalizedAreas = data.areas || []
      let normalizedLists = data.lists || []
      let normalizedSettings = data.settings || { tasksVersion: Math.max(1, incomingTasksVersion) }

      if (needMigrate) {
        const res = migrateV2ToV3({
          tasks: data.tasks,
          categories: normalizedCategories,
          areas: normalizedAreas,
          lists: normalizedLists,
          settings: normalizedSettings
        })
        if (!res || !res.ok) {
          // 失败：保留 prestate 并写 conflict；不修改当前 store 状态
          saveConflict('importData-v2', {
            reason: res && res.error ? res.error : 'migrateV2ToV3 failed',
            payload: data
          })
          rollbackSaveAndPersist('importData-v2-prestate', prestate)
          return { success: false, error: (res && res.error) || '数据迁移失败' }
        }
        normalizedTasks = res.migrated.tasks
        normalizedCategories = res.migrated.categories
        normalizedAreas = res.migrated.areas
        normalizedLists = res.migrated.lists
        normalizedSettings = res.migrated.settings
      }

      // 校验导入任务后应用
      const validTasks = normalizedTasks
        .filter((t) => {
          const v = validateTask(t)
          return v.valid
        })
        .map((t) => {
          // 确保 v3 默认字段齐全
          const base = {
            id: t.id || generateId('task_'),
            title: String(t.title).trim().slice(0, 500),
            category: t.category || t.categoryId || UNDELETABLE_CATEGORY,
            categoryId: t.categoryId || t.category || UNDELETABLE_CATEGORY,
            date: t.date || getTodayStr(),
            time: t.time || null,
            completed: !!t.completed,
            important: !!t.important,
            reminder: !!t.reminder,
            notes: (t.notes || '').slice(0, 5000),
            tags: Array.isArray(t.tags) ? t.tags : [],
            subTasks: Array.isArray(t.subTasks)
              ? t.subTasks.map((st, i) => ({
                  id: st.id || generateId('sub_'),
                  title: st.title || '',
                  completed: !!st.completed,
                  order: typeof st.order === 'number' ? st.order : i
                }))
              : [],
            repeat: isValidRepeatConfig(t.repeat) ? t.repeat : null,
            order: typeof t.order === 'number' ? t.order : 0,
            pomodoroSessions: typeof t.pomodoroSessions === 'number' ? t.pomodoroSessions : 0,
            totalFocusTime: typeof t.totalFocusTime === 'number' ? t.totalFocusTime : 0,
            createdAt: typeof t.createdAt === 'number' ? t.createdAt : Date.now(),
            completedAt: typeof t.completedAt === 'number' ? t.completedAt : null,
            parentTaskId: t.parentTaskId ?? null,
            repeatRootId: t.repeatRootId ?? null
          }
          return ensureV3DefaultsOnTask(base, {
            listId: base.category,
            areaId: DEFAULT_AREA_ID
          })
        })

      // 真正写入前再做一次"失败回滚"的 guard
      const prestateFinal = {
        tasks: JSON.parse(JSON.stringify(tasks.value)),
        categories: JSON.parse(JSON.stringify(categories.value)),
        tags: JSON.parse(JSON.stringify(tags.value)),
        templates: JSON.parse(JSON.stringify(templates.value))
      }

      try {
        tasks.value = validTasks
      } catch (e) {
        rollbackSaveAndPersist('importData-v2-taskwrite', prestateFinal)
        saveConflict('importData-v2-taskwrite', { error: e.message, payload: data })
        tasks.value = prestateFinal.tasks
        categories.value = prestateFinal.categories
        tags.value = prestateFinal.tags
        templates.value = prestateFinal.templates
        return { success: false, error: e.message || '任务写入失败' }
      }

      const importedCount = tasks.value.length

      if (normalizedCategories && Array.isArray(normalizedCategories) && normalizedCategories.length > 0) {
        const validCats = normalizedCategories.filter((c) => c && c.id && c.name)
        if (validCats.length > 0) {
          const hasOther = validCats.some((c) => c.id === UNDELETABLE_CATEGORY)
          if (!hasOther) {
            const otherCat = DEFAULT_CATEGORIES.find((c) => c.id === UNDELETABLE_CATEGORY)
            if (otherCat) validCats.push(otherCat)
          }
          categories.value = validCats
        }
      }

      if (data.tags && Array.isArray(data.tags)) {
        const validTags = data.tags.filter((t) => t && t.id && t.name)
        if (validTags.length > 0) tags.value = validTags
      }

      // 同步 settings tasksVersion / area/list store
      if (normalizedSettings && typeof normalizedSettings.tasksVersion === 'number') {
        try {
          const sStore = useSettingsStore()
          if (sStore && sStore.tasksVersion != null) {
            sStore.tasksVersion = Math.max(sStore.tasksVersion, normalizedSettings.tasksVersion)
          }
        } catch {
          /* ignore */
        }
      }
      if (Array.isArray(normalizedAreas) && normalizedAreas.length) {
        try {
          const aStore = useAreaStore()
          if (aStore && Array.isArray(aStore.areas)) aStore.areas = normalizedAreas
        } catch {
          /* ignore */
        }
      }
      if (Array.isArray(normalizedLists) && normalizedLists.length) {
        try {
          const lStore = useListStore()
          if (lStore && Array.isArray(lStore.lists)) lStore.lists = normalizedLists
        } catch {
          /* ignore */
        }
      }
      if (data.templates && Array.isArray(data.templates)) {
        const validTpls = data.templates.filter((t) => t && t.id && t.name)
        if (validTpls.length > 0) templates.value = validTpls
      }

      // 导入后清理可能失效的聚焦状态
      if (focusedTaskId.value && !tasks.value.some((t) => t.id === focusedTaskId.value)) {
        focusedTaskId.value = null
      }

      // 导入后立即持久化（单次）
      if (saveTimeout) clearTimeout(saveTimeout)
      saveToStorage()

      return { success: true, imported: importedCount, settings: normalizedSettings }
    } catch (e) {
      console.error('[TaskStore] Import failed:', e)
      // 失败：保存 conflict 用于排查
      try {
        saveConflict('importData-catch', { error: e && e.message, payload: jsonStr })
      } catch {
        /* ignore */
      }
      return { success: false, error: e.message || '导入失败' }
    }
  }

  const markAllComplete = () => {
    const now = Date.now()
    let maxCompletedOrder = -1
    tasks.value.forEach((t) => {
      if (typeof t.completedOrder === 'number' && t.completedOrder > maxCompletedOrder) {
        maxCompletedOrder = t.completedOrder
      }
    })
    const affectedIds = []
    let blockedHit = false
    tasks.value.forEach((t) => {
      if (!t.completed) {
        // Task 1: 依赖阻断
        if (isTaskBlocked(t)) {
          blockedHit = true
          return
        }
        t.completed = true
        t.completedAt = now
        t.updatedAt = now
        t.completedOrder = ++maxCompletedOrder
        affectedIds.push(t.id)
        logActivity(t.id, 'complete')
      }
    })
    if (blockedHit) pushSnackbar('任务被阻断，需先完成前置任务')
    // 与 toggleComplete 自洽：从“我的一天”移除 & 为重复任务生成下一个实例
    affectedIds.forEach((id) => {
      removeFromMyDay(id)
      const task = getTaskById(id)
      if (task && task.repeat) generateNextRepeatTask(id)
    })
    // 批量标记完成后清空聚焦态（避免聚焦已被移除/完成的任务）
    if (focusedTaskId.value && affectedIds.includes(focusedTaskId.value)) {
      focusedTaskId.value = null
    }
    debouncedSave()
  }

  const restoreTask = (taskSnapshot, insertIndex) => {
    if (!taskSnapshot || typeof insertIndex !== 'number') return false
    const safe = ensureV3DefaultsOnTask({ ...taskSnapshot })
    const safeIndex = Math.max(0, Math.min(insertIndex, tasks.value.length))
    tasks.value.splice(safeIndex, 0, safe)
    logActivity(safe.id, 'restore', { insertIndex: safeIndex })
    debouncedSave()
    return true
  }

  // Task 5: 提醒相关最小侵入写操作（保证单次 debouncedSave）
  // 计算 snooze 预设偏移（同 useReminderScheduler.resolveSnoozePreset 的简化副本，避免环形 import）
  const computeSnoozeOffsetMs = (offsetOrDate) => {
    if (offsetOrDate instanceof Date) {
      const t = offsetOrDate.getTime()
      if (Number.isFinite(t) && t > 0) return { offsetMs: Math.max(0, t - Date.now()), customTs: t }
    }
    if (typeof offsetOrDate === 'number' && Number.isFinite(offsetOrDate)) {
      // 小于 10000 视为"分钟数"；较大视为毫秒时间戳
      if (offsetOrDate <= 10000) {
        return { offsetMs: Math.max(0, Math.floor(offsetOrDate)) * 60 * 1000 }
      }
      if (offsetOrDate > Date.now() - 1000) {
        return { offsetMs: Math.max(0, offsetOrDate - Date.now()), customTs: offsetOrDate }
      }
      return { offsetMs: 5 * 60 * 1000 }
    }
    if (offsetOrDate && typeof offsetOrDate === 'object') {
      if (offsetOrDate.minutes !== undefined) {
        const m = Number(offsetOrDate.minutes)
        if (Number.isFinite(m) && m >= 0) return { offsetMs: m * 60 * 1000 }
      }
      if (offsetOrDate.customDate !== undefined) {
        const d =
          offsetOrDate.customDate instanceof Date
            ? offsetOrDate.customDate.getTime()
            : Number(offsetOrDate.customDate)
        if (Number.isFinite(d) && d > 0) return { offsetMs: Math.max(0, d - Date.now()), customTs: d }
      }
      if (typeof offsetOrDate.preset === 'string') {
        const alias = offsetOrDate.preset
        const todayStr = getTodayStr()
        if (alias === 'tomorrow_9am') {
          const tmr = addDays(todayStr, 1)
          const [y, mo, d] = tmr.split('-').map(Number)
          const ts = new Date(y, mo - 1, d, 9, 0, 0, 0).getTime()
          return { offsetMs: Math.max(0, ts - Date.now()), customTs: ts }
        }
        if (alias === 'next_week') {
          const nw = addDays(todayStr, 7)
          const [y, mo, d] = nw.split('-').map(Number)
          const ts = new Date(y, mo - 1, d, 9, 0, 0, 0).getTime()
          return { offsetMs: Math.max(0, ts - Date.now()), customTs: ts }
        }
      }
    }
    // 回退：5 分钟
    return { offsetMs: 5 * 60 * 1000 }
  }

  const setNextReminder = (taskId, nextReminderAt) => {
    if (!taskId) return false
    const task = getTaskById(taskId)
    if (!task) return false
    let value = nextReminderAt
    if (value instanceof Date) value = value.getTime()
    if (value !== null && value !== undefined) {
      const n = Number(value)
      if (!Number.isFinite(n) || n <= 0) return false
      value = n
    } else {
      value = null
    }
    const ok = updateTask(taskId, { nextReminderAt: value })
    // 一次 debouncedSave 已由 updateTask 内部 watch 自动触发（若监听已建立），此处保证独立使用时也持久化
    debouncedSave()
    return ok
  }

  const snoozeTaskById = (taskId, offsetOrDate) => {
    if (!taskId) return false
    const task = getTaskById(taskId)
    if (!task) return false
    const { offsetMs } = computeSnoozeOffsetMs(offsetOrDate)
    const nextTs = Date.now() + offsetMs
    const prev = Number(task.snoozeCount) || 0
    const ok = updateTask(taskId, {
      nextReminderAt: nextTs,
      snoozeCount: prev + 1
    })
    if (ok) {
      logActivity(taskId, 'reminderSnooze', {
        until: nextTs,
        minutes: Math.round(offsetMs / 60000)
      })
    }
    debouncedSave()
    return ok
  }


  return {
    tasks,
    categories,
    tags,
    templates,
    searchQuery,
    currentView,
    currentCategory,
    currentTag,
    currentFilterId,
    currentListId,
    currentAreaId,
    focusedTaskId,
    focusedTask,
    myDayTasks,
    myDayCount,
    isInMyDay,
    addToMyDay,
    removeFromMyDay,
    toggleMyDay,
    filteredTasks,
    getOverdueCount,
    counts,
    initSampleData,
    resetToDefault,
    loadFromStorage,
    setupStorageWatch,
    addTask,
    updateTask,
    deleteTask,
    toggleComplete,
    toggleImportant,
    toggleSubTaskComplete,
    reorderTasks,
    generateNextRepeatTask,
    removeNextRepeatTask,
    getNextRepeatDate,
    getRootRepeatTaskId,
    addCategory,
    updateCategory,
    deleteCategory,
    addTag,
    updateTag,
    deleteTag,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    applyTemplate,
    createTemplateFromTask,
    addToInbox,
    organizeInboxTask,
    clearInbox,
    getCategoryById,
    getTagById,
    getTaskById,
    getTaskIndexById,
    getTasksByDate,
    getCount,
    getCategoryCount,
    getTagCount,
    getStats,
    clearCompleted,
    resetAll,
    exportData,
    exportToCSV,
    importData,
    focusTask,
    unfocusTask,
    addPomodoroSession,
    markAllComplete,
    restoreTask,
    // Task 5 additions
    setNextReminder,
    snoozeTaskById,
    logActivity,
    cleanup,
    // Task 1 v3 additions
    ensureV3,
    addSubTask,
    convertToSubtask,
    promoteSubtask,
    isTaskBlocked,
    getAncestorDepth,
    ensureV3DefaultsOnTask,
    MIN_TASKS_VERSION,
    DEFAULT_LIST_ID,
    DEFAULT_AREA_ID,
    MAX_PARENT_DEPTH,
    UPDATABLE_FIELDS
  }
})
