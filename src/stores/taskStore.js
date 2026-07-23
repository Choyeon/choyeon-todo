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

const STORAGE_KEYS = {
  tasks: 'choyeon_tasks_v2',
  categories: 'choyeon_categories_v2',
  tags: 'choyeon_tags_v2',
  myDay: 'choyeon_myday_v1'
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

const UNDELETABLE_CATEGORY = 'other'

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
  const searchQuery = ref('')
  const currentView = ref('myday')
  const currentCategory = ref(null)
  const currentTag = ref(null)
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
    const addDaysFn = (d, n) => {
      const nd = new Date(d)
      nd.setDate(nd.getDate() + n)
      return formatDateStr(nd)
    }

    const now = Date.now()
    const todayStr = formatDateStr(today)
    const tomorrowStr = addDaysFn(today, 1)
    const dayAfterStr = addDaysFn(today, 2)

    tasks.value = [
      {
        id: generateId('task_'),
        title: '欢迎使用 Choyeon To Do',
        category: 'personal',
        date: todayStr,
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
        date: tomorrowStr,
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
        date: dayAfterStr,
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
              date: t.date && isValidDateStr(t.date) ? t.date : getTodayStr(),
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
    } catch (e) {
      console.error('[TaskStore] Failed to load from storage:', e)
      tasks.value = []
      categories.value = [...DEFAULT_CATEGORIES]
      tags.value = [...DEFAULT_TAGS]
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
      localStorage.setItem(
        STORAGE_KEYS.myDay,
        JSON.stringify({
          date: myDayDate.value,
          taskIds: myDayTaskIds.value
        })
      )
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
    initSampleData()
    if (saveTimeout) clearTimeout(saveTimeout)
    saveToStorage()
  }

  const setupStorageWatch = (watchFn) => {
    watchFn(tasks, debouncedSave, { deep: true })
    watchFn(categories, debouncedSave, { deep: true })
    watchFn(tags, debouncedSave, { deep: true })
    watchFn(myDayDate, debouncedSave)
    watchFn(myDayTaskIds, debouncedSave, { deep: true })
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
    const newTask = {
      id: generateId('task_'),
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
            id: generateId('sub_'),
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
      completedAt: null
    }
    tasks.value.unshift(newTask)
    return newTask
  }

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
    'pomodoroSessions',
    'totalFocusTime'
  ]

  const updateTask = (id, updates) => {
    if (!id || !updates) return false
    const index = getTaskIndexById(id)
    if (index === -1) return false

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
    if (safeUpdates.completed !== undefined) {
      safeUpdates.completed = !!safeUpdates.completed
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
    if (safeUpdates.completed !== undefined) {
      safeUpdates.completedAt = safeUpdates.completed ? Date.now() : null
    }

    tasks.value[index] = { ...tasks.value[index], ...safeUpdates }
    return true
  }

  const deleteTask = (id) => {
    if (!id) return false
    const index = getTaskIndexById(id)
    if (index === -1) return false
    tasks.value.splice(index, 1)
    removeFromMyDay(id)
    // 如果删除的是当前聚焦的任务，清除聚焦状态
    if (focusedTaskId.value === id) {
      focusedTaskId.value = null
    }
    return true
  }

  const toggleComplete = (id) => {
    const task = getTaskById(id)
    if (!task) return
    task.completed = !task.completed
    task.completedAt = task.completed ? Date.now() : null

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
    } else {
      delete task.completedOrder
      if (task.repeat) {
        removeNextRepeatTask(id)
      }
    }
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

  const reorderTasks = (fromId, toId) => {
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
    const newTask = {
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
    }

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
    let todayCount = 0,
      tomorrowCount = 0,
      weekCount = 0,
      importantCount = 0,
      plannedCount = 0,
      allCount = 0,
      completedCount = 0,
      overdueCount = 0
    const catCounts = {}
    const tagCounts = {}

    for (const t of tasks.value) {
      if (!t.completed) {
        allCount++
        if (t.date === today) todayCount++
        if (t.date === tomorrow) tomorrowCount++
        if (t.date >= nextWeek.start && t.date <= nextWeek.end) weekCount++
        if (t.important) importantCount++
        if (t.date >= today) plannedCount++
        if (t.date < today) overdueCount++
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
        if (task.date && task.date < todayStr) {
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
    myDayDate.value = getTodayStr()
    myDayTaskIds.value = []
    searchQuery.value = ''
    currentView.value = 'myday'
    currentCategory.value = null
    currentTag.value = null
    focusedTaskId.value = null
    // 清理定时器并立即保存
    if (saveTimeout) clearTimeout(saveTimeout)
    saveToStorage()
  }

  const cleanup = () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout)
      saveTimeout = null
    }
  }

  const exportData = () => {
    return JSON.stringify(
      {
        version: 2,
        exportedAt: new Date().toISOString(),
        tasks: tasks.value,
        categories: categories.value,
        tags: tags.value
      },
      null,
      2
    )
  }

  const importData = (jsonStr) => {
    try {
      const data = JSON.parse(jsonStr)

      if (!data || typeof data !== 'object') {
        return { success: false, error: '无效的数据格式' }
      }

      let importedCount = 0

      if (data.tasks && Array.isArray(data.tasks)) {
        const validTasks = data.tasks.filter((t) => {
          const v = validateTask(t)
          return v.valid
        })
        if (validTasks.length > 0) {
          tasks.value = validTasks.map((t) => ({
            id: t.id || generateId('task_'),
            title: String(t.title).trim().slice(0, 500),
            category: t.category || UNDELETABLE_CATEGORY,
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
            createdAt: t.createdAt || Date.now(),
            completedAt: t.completedAt || null
          }))
          importedCount = validTasks.length
        }
      } else {
        return { success: false, error: '无效的任务数据格式' }
      }

      if (data.categories && Array.isArray(data.categories) && data.categories.length > 0) {
        const validCats = data.categories.filter((c) => c && c.id && c.name)
        if (validCats.length > 0) {
          const hasOther = validCats.some((c) => c.id === UNDELETABLE_CATEGORY)
          if (!hasOther) {
            const otherCat = DEFAULT_CATEGORIES.find((c) => c.id === UNDELETABLE_CATEGORY)
            validCats.push(otherCat)
          }
          categories.value = validCats
        }
      }

      if (data.tags && Array.isArray(data.tags)) {
        const validTags = data.tags.filter((t) => t && t.id && t.name)
        if (validTags.length > 0) {
          tags.value = validTags
        }
      }

      // 导入后清理可能失效的聚焦状态
      if (focusedTaskId.value && !tasks.value.some((t) => t.id === focusedTaskId.value)) {
        focusedTaskId.value = null
      }

      return { success: true, imported: importedCount, settings: data.settings || null }
    } catch (e) {
      console.error('[TaskStore] Import failed:', e)
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
    tasks.value.forEach((t) => {
      if (!t.completed) {
        t.completed = true
        t.completedAt = now
        t.completedOrder = ++maxCompletedOrder
      }
    })
    debouncedSave()
  }

  const restoreTask = (taskSnapshot, insertIndex) => {
    if (!taskSnapshot || typeof insertIndex !== 'number') return false
    const safeIndex = Math.max(0, Math.min(insertIndex, tasks.value.length))
    tasks.value.splice(safeIndex, 0, taskSnapshot)
    debouncedSave()
    return true
  }

  return {
    tasks,
    categories,
    tags,
    searchQuery,
    currentView,
    currentCategory,
    currentTag,
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
    getCategoryById,
    getTagById,
    getTasksByDate,
    getCount,
    getCategoryCount,
    getTagCount,
    getStats,
    clearCompleted,
    resetAll,
    exportData,
    importData,
    focusTask,
    unfocusTask,
    addPomodoroSession,
    markAllComplete,
    restoreTask,
    cleanup
  }
})
