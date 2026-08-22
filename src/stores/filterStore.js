import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getTodayStr, formatDateStr, parseDateStr } from '../utils/date'

const STORAGE_KEY = 'todo_filters_v3'

const VALID_FIELDS = new Set([
  'title', 'date', 'time', 'completed', 'important', 'priority',
  'overdue', 'tags', 'categoryId', 'listId', 'areaId', 'assignee',
  'parentId', 'headingId', 'createdBy', 'keywords'
])

const VALID_OPS = new Set([
  'eq', 'ne', 'in', 'notIn', 'gt', 'gte', 'lt', 'lte',
  'between', 'contains', 'regex', 'isNull', 'exists'
])

const VALID_SORT_FIELDS = new Set([
  'title', 'date', 'time', 'priority', 'important', 'completed',
  'createdAt', 'completedAt', 'order', 'overdue'
])

const VALID_DIRS = new Set(['asc', 'desc'])

const VALID_UNITS = new Set(['day', 'week', 'month', 'year'])

export const generateFilterId = (prefix = 'flt_') => {
  return `${prefix}${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`
}

// ========== Field value extractors ==========
const extractFieldValue = (task, field, ctx = {}) => {
  switch (field) {
    case 'title':
      return task?.title ?? null
    case 'date':
      return task?.date ?? null
    case 'time':
      return task?.time ?? null
    case 'completed':
      return !!task?.completed
    case 'important':
      return !!task?.important
    case 'priority': {
      const p = task?.priority
      return typeof p === 'number' ? p : null
    }
    case 'overdue': {
      if (!task || task.completed) return false
      const now = ctx.now ?? new Date()
      const todayStr = formatDateStr(now)
      if (!task.date) return false
      if (task.date < todayStr) return true
      if (task.date === todayStr && task.time) {
        const currentHM =
          String(now.getHours()).padStart(2, '0') +
          ':' +
          String(now.getMinutes()).padStart(2, '0')
        if (task.time < currentHM) return true
      }
      return false
    }
    case 'tags':
      return Array.isArray(task?.tags) ? task.tags : []
    case 'categoryId':
      return task?.category ?? task?.categoryId ?? null
    case 'listId':
      return task?.listId ?? null
    case 'areaId':
      return task?.areaId ?? null
    case 'assignee':
      return task?.assignee ?? null
    case 'parentId':
      return task?.parentId ?? task?.parentTaskId ?? null
    case 'headingId':
      return task?.headingId ?? null
    case 'createdBy':
      return task?.createdBy ?? null
    case 'keywords': {
      const title = (task?.title || '').toString().toLowerCase()
      const notes = (task?.notes || '').toString().toLowerCase()
      return `${title} ${notes}`
    }
    default:
      return undefined
  }
}

// ========== Operator evaluators ==========
const evaluateCondition = (fieldValue, op, condValue, unit) => {
  switch (op) {
    case 'eq':
      return fieldValue === condValue
    case 'ne':
      return fieldValue !== condValue
    case 'in': {
      if (!Array.isArray(condValue)) return false
      return condValue.includes(fieldValue)
    }
    case 'notIn': {
      if (!Array.isArray(condValue)) return true
      return !condValue.includes(fieldValue)
    }
    case 'gt':
      if (fieldValue === null || fieldValue === undefined) return false
      if (condValue === null || condValue === undefined) return false
      return fieldValue > condValue
    case 'gte':
      if (fieldValue === null || fieldValue === undefined) return false
      if (condValue === null || condValue === undefined) return false
      return fieldValue >= condValue
    case 'lt':
      if (fieldValue === null || fieldValue === undefined) return false
      if (condValue === null || condValue === undefined) return false
      return fieldValue < condValue
    case 'lte':
      if (fieldValue === null || fieldValue === undefined) return false
      if (condValue === null || condValue === undefined) return false
      return fieldValue <= condValue
    case 'between': {
      if (!Array.isArray(condValue) || condValue.length < 2) return false
      if (fieldValue === null || fieldValue === undefined) return false
      const [low, high] = condValue
      if (low === null || low === undefined || high === null || high === undefined) return false
      return fieldValue >= low && fieldValue <= high
    }
    case 'contains': {
      if (Array.isArray(fieldValue)) {
        if (Array.isArray(condValue)) {
          return condValue.every((v) => fieldValue.includes(v))
        }
        return fieldValue.includes(condValue)
      }
      if (typeof fieldValue === 'string' && fieldValue && condValue !== null && condValue !== undefined) {
        return fieldValue.toString().toLowerCase().includes(String(condValue).toLowerCase())
      }
      return false
    }
    case 'regex': {
      if (typeof fieldValue !== 'string') return false
      try {
        const pattern = typeof condValue === 'string' ? new RegExp(condValue) : condValue
        if (!(pattern instanceof RegExp)) return false
        return pattern.test(fieldValue)
      } catch {
        return false
      }
    }
    case 'isNull':
      return fieldValue === null || fieldValue === undefined
    case 'exists':
      return fieldValue !== null && fieldValue !== undefined
    default:
      return false
  }
}

// ========== Unit-based date offset (for value translation) ==========
const applyUnitToValue = (fieldValue, baseValue, unit) => {
  // If both sides are date strings and unit is provided, treat value as offset
  // This is a helper used externally — we just compare strings directly.
  // The `unit` is kept in the cond metadata for UI display.
  return baseValue
}

// ========== Predicate compiler ==========
export const compileFilterToPredicate = (filter) => {
  if (!filter || !Array.isArray(filter.groups)) return () => true

  // Pre-validate conditions at compile time
  const compiledGroups = filter.groups
    .filter((g) => g && Array.isArray(g.conds))
    .map((group) => {
      const logic = group.logic === 'OR' ? 'OR' : 'AND'
      const conds = group.conds
        .filter((c) => c && VALID_FIELDS.has(c.field) && VALID_OPS.has(c.op))
        .map((c) => ({
          field: c.field,
          op: c.op,
          value: c.value,
          unit: VALID_UNITS.has(c.unit) ? c.unit : undefined
        }))
      return { logic, conds }
    })

  return (task, ctx = {}) => {
    if (!task) return false
    if (compiledGroups.length === 0) return true

    // All groups combined with AND (group-level logic is internal)
    for (const group of compiledGroups) {
      const { logic, conds } = group

      if (conds.length === 0) continue

      let groupResult = logic === 'OR' ? false : true

      for (const cond of conds) {
        const fieldValue = extractFieldValue(task, cond.field, ctx)
        const match = evaluateCondition(fieldValue, cond.op, cond.value, cond.unit)
        if (logic === 'OR') {
          groupResult = groupResult || match
          if (groupResult) break
        } else {
          groupResult = groupResult && match
          if (!groupResult) break
        }
      }

      if (!groupResult) return false
    }

    return true
  }
}

// ========== Sort helper ==========
const applySort = (tasks, sort) => {
  if (!sort || !sort.field || !VALID_SORT_FIELDS.has(sort.field)) return tasks
  const dir = VALID_DIRS.has(sort.dir) ? sort.dir : 'asc'
  const sorted = [...tasks]
  sorted.sort((a, b) => {
    let va = extractFieldValue(a, sort.field)
    let vb = extractFieldValue(b, sort.field)
    if (sort.field === 'overdue') {
      // overdue is bool, also need ctx, fallback to simple
      va = va ? 1 : 0
      vb = vb ? 1 : 0
    }
    if (va === null || va === undefined) va = ''
    if (vb === null || vb === undefined) vb = ''
    let cmp = 0
    if (typeof va === 'number' && typeof vb === 'number') {
      cmp = va - vb
    } else if (typeof va === 'boolean' && typeof vb === 'boolean') {
      cmp = (va ? 1 : 0) - (vb ? 1 : 0)
    } else {
      cmp = String(va).localeCompare(String(vb))
    }
    return dir === 'desc' ? -cmp : cmp
  })
  return sorted
}

// ========== My Day smart recommendations ==========
const PRIORITY_WEIGHTS = { 1: 50, 2: 35, 3: 20, 4: 10 }

export const getMyDayRecommendations = ({
  tasks,
  pomodoroHistory = {},
  completedHistory = {},
  settings = {},
  now = new Date()
}) => {
  const enabled = settings.myDaySmartEnabled !== false
  const maxCount =
    typeof settings.myDaySmartCount === 'number' ? settings.myDaySmartCount : 15
  const finalCount = Math.max(1, Math.min(100, Math.round(maxCount)))

  if (!enabled) return []
  if (!Array.isArray(tasks) || tasks.length === 0) return []

  const todayStr = formatDateStr(now)
  const currentHM =
    String(now.getHours()).padStart(2, '0') +
    ':' +
    String(now.getMinutes()).padStart(2, '0')

  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const scored = []

  for (const task of tasks) {
    if (!task || task.completed) continue

    let score = 0

    // 1. Priority weight
    const priority = typeof task.priority === 'number' ? task.priority : 4
    score += PRIORITY_WEIGHTS[priority] || 10

    // 2. Overdue penalty (turned into score bonus for attention)
    let isOverdue = false
    if (task.date) {
      if (task.date < todayStr) isOverdue = true
      else if (task.date === todayStr && task.time && task.time < currentHM) isOverdue = true
    }
    if (isOverdue) score += 40

    // 3. Important bonus
    if (task.important) score += 25

    // 4. Today due bonus
    if (task.date === todayStr) score += 30

    // 5. Tomorrow due small bonus
    const tomorrow = formatDateStr(new Date(now.getTime() + 24 * 60 * 60 * 1000))
    if (task.date === tomorrow) score += 10

    // 6. Pomodoro history — recent 7 days usage (promotes habit consistency)
    let pomodoroCount7d = 0
    if (typeof task.pomodoroSessions === 'number') {
      // Prefer external pomodoroHistory map of taskId->array of session timestamps
      const history = pomodoroHistory[task.id]
      if (Array.isArray(history)) {
        for (const ts of history) {
          const d = new Date(ts)
          if (d >= sevenDaysAgo && d <= now) pomodoroCount7d++
        }
      } else {
        // Fallback: use pomodoroSessions as a rough proxy, scaled down
        pomodoroCount7d = Math.min(3, task.pomodoroSessions)
      }
    }
    score += Math.min(20, pomodoroCount7d * 5)

    // 7. Repeat completion rate (if repeat task with history)
    if (task.repeat) {
      const compHistory = completedHistory[task.repeatRootId || task.id]
      if (Array.isArray(compHistory) && compHistory.length > 0) {
        const recent = compHistory.slice(-10)
        const completionRate = recent.filter(Boolean).length / recent.length
        // If has high completion rate, keep promoting (habit consistency)
        // If low completion rate, also boost to help break the cycle
        if (completionRate >= 0.8) score += 15
        else if (completionRate <= 0.3 && recent.length >= 3) score += 10
      }
    }

    // 8. Un-reminded important tasks
    if (task.important && !task.reminder) score += 8

    scored.push({ id: task.id, score, task })
  }

  // Stable sort: descending by score, tie-break by priority, then createdAt
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    const pa = typeof a.task.priority === 'number' ? a.task.priority : 5
    const pb = typeof b.task.priority === 'number' ? b.task.priority : 5
    if (pa !== pb) return pa - pb
    const ca = a.task.createdAt || 0
    const cb = b.task.createdAt || 0
    return cb - ca
  })

  return scored.slice(0, finalCount).map((s) => s.id)
}

// ========== Filter validation ==========
const validateFilterStructure = (data) => {
  if (!data || typeof data !== 'object') return { valid: false, error: '过滤器数据无效' }
  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
    return { valid: false, error: '过滤器名称不能为空' }
  }
  // Note: length trimming is applied in addFilter/updateFilter before validation.
  if (data.groups !== undefined && !Array.isArray(data.groups)) {
    return { valid: false, error: '条件组格式无效' }
  }
  return { valid: true }
}

// ========== Pinia Store ==========
export const useFilterStore = defineStore('filter', () => {
  const filters = ref([])
  const pinnedFilterIds = ref([])

  const filtersMap = computed(() => {
    const map = new Map()
    filters.value.forEach((f) => map.set(f.id, f))
    return map
  })

  const pinnedFilters = computed(() => {
    const ordered = []
    const seen = new Set()
    for (const id of pinnedFilterIds.value) {
      const f = filtersMap.value.get(id)
      if (f && f.pinned) {
        ordered.push(f)
        seen.add(id)
      }
    }
    for (const f of filters.value) {
      if (f.pinned && !seen.has(f.id)) {
        ordered.push(f)
      }
    }
    return ordered
  })

  const unpinnedFilters = computed(() => {
    return filters.value.filter((f) => !f.pinned)
  })

  // ----- Storage -----
  const loadFromStorage = () => {
    try {
      if (typeof localStorage === 'undefined') return
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed.filters)) {
        filters.value = parsed.filters.filter(
          (f) =>
            f &&
            f.id &&
            f.name &&
            typeof f.name === 'string' &&
            (!f.groups || Array.isArray(f.groups))
        )
      }
      if (Array.isArray(parsed.pinnedFilterIds)) {
        pinnedFilterIds.value = parsed.pinnedFilterIds.filter((id) => typeof id === 'string')
      }
    } catch (e) {
      console.error('[FilterStore] Failed to load from storage:', e)
      filters.value = []
      pinnedFilterIds.value = []
    }
  }

  const saveToStorage = () => {
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          filters: filters.value,
          pinnedFilterIds: pinnedFilterIds.value
        })
      )
    } catch (e) {
      console.error('[FilterStore] Failed to save to storage:', e)
    }
  }

  let saveTimeout = null
  const debouncedSave = () => {
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => {
      saveToStorage()
    }, 300)
  }

  const setupStorageWatch = (watchFn) => {
    watchFn(filters, debouncedSave, { deep: true })
    watchFn(pinnedFilterIds, debouncedSave, { deep: true })
  }

  // ----- CRUD -----
  const addFilter = (data) => {
    const validation = validateFilterStructure(data)
    if (!validation.valid) {
      console.warn('[FilterStore] Cannot add filter:', validation.error)
      return null
    }
    const now = Date.now()
    const newFilter = {
      id: generateFilterId(),
      name: data.name.trim().slice(0, 100),
      pinned: !!data.pinned,
      sectionId: typeof data.sectionId === 'string' ? data.sectionId : null,
      sort:
        data.sort && VALID_SORT_FIELDS.has(data.sort.field)
          ? {
              field: data.sort.field,
              dir: VALID_DIRS.has(data.sort.dir) ? data.sort.dir : 'asc'
            }
          : null,
      createdAt: now,
      updatedAt: now,
      groups: Array.isArray(data.groups)
        ? data.groups
            .filter((g) => g && Array.isArray(g.conds))
            .map((g) => ({
              logic: g.logic === 'OR' ? 'OR' : 'AND',
              conds: g.conds
                .filter(
                  (c) =>
                    c &&
                    VALID_FIELDS.has(c.field) &&
                    VALID_OPS.has(c.op)
                )
                .map((c) => ({
                  field: c.field,
                  op: c.op,
                  value: c.value,
                  unit: VALID_UNITS.has(c.unit) ? c.unit : undefined
                }))
            }))
        : []
    }
    filters.value.push(newFilter)
    if (newFilter.pinned && !pinnedFilterIds.value.includes(newFilter.id)) {
      pinnedFilterIds.value.push(newFilter.id)
    }
    debouncedSave()
    return newFilter
  }

  const updateFilter = (id, patch) => {
    if (!id || !patch || typeof patch !== 'object') return false
    const index = filters.value.findIndex((f) => f.id === id)
    if (index === -1) return false

    const existing = filters.value[index]
    const merged = { ...existing, ...patch }

    if (patch.name !== undefined) {
      const name = String(patch.name || '').trim().slice(0, 100)
      if (!name) return false
      merged.name = name
    }
    if (patch.pinned !== undefined) merged.pinned = !!patch.pinned
    if (patch.sectionId !== undefined) {
      merged.sectionId = typeof patch.sectionId === 'string' ? patch.sectionId : null
    }
    if (patch.sort !== undefined) {
      if (
        patch.sort &&
        VALID_SORT_FIELDS.has(patch.sort.field)
      ) {
        merged.sort = {
          field: patch.sort.field,
          dir: VALID_DIRS.has(patch.sort.dir) ? patch.sort.dir : 'asc'
        }
      } else {
        merged.sort = null
      }
    }
    if (patch.groups !== undefined) {
      if (Array.isArray(patch.groups)) {
        merged.groups = patch.groups
          .filter((g) => g && Array.isArray(g.conds))
          .map((g) => ({
            logic: g.logic === 'OR' ? 'OR' : 'AND',
            conds: g.conds
              .filter(
                (c) =>
                  c &&
                  VALID_FIELDS.has(c.field) &&
                  VALID_OPS.has(c.op)
              )
              .map((c) => ({
                field: c.field,
                op: c.op,
                value: c.value,
                unit: VALID_UNITS.has(c.unit) ? c.unit : undefined
              }))
          }))
      } else {
        merged.groups = []
      }
    }
    merged.updatedAt = Date.now()

    filters.value[index] = merged

    // Keep pinnedFilterIds in sync
    if (merged.pinned) {
      if (!pinnedFilterIds.value.includes(merged.id)) {
        pinnedFilterIds.value.push(merged.id)
      }
    } else {
      const idx = pinnedFilterIds.value.indexOf(merged.id)
      if (idx >= 0) pinnedFilterIds.value.splice(idx, 1)
    }

    debouncedSave()
    return true
  }

  const removeFilter = (id) => {
    if (!id) return false
    const index = filters.value.findIndex((f) => f.id === id)
    if (index === -1) return false
    filters.value.splice(index, 1)
    const pinIdx = pinnedFilterIds.value.indexOf(id)
    if (pinIdx >= 0) pinnedFilterIds.value.splice(pinIdx, 1)
    debouncedSave()
    return true
  }

  const duplicateFilter = (id) => {
    if (!id) return null
    const source = filtersMap.value.get(id)
    if (!source) return null
    const now = Date.now()
    const copy = {
      id: generateFilterId(),
      name: `${source.name} (副本)`.slice(0, 100),
      pinned: false,
      sectionId: source.sectionId,
      sort: source.sort ? { ...source.sort } : null,
      createdAt: now,
      updatedAt: now,
      groups: source.groups
        ? source.groups.map((g) => ({
            logic: g.logic,
            conds: g.conds.map((c) => ({ ...c }))
          }))
        : []
    }
    filters.value.push(copy)
    debouncedSave()
    return copy
  }

  const reorder = (pinnedIds) => {
    if (!Array.isArray(pinnedIds)) return false
    // Only accept IDs that exist in filters and are pinned
    const validIds = []
    for (const id of pinnedIds) {
      if (typeof id !== 'string') continue
      const f = filtersMap.value.get(id)
      if (f && f.pinned && !validIds.includes(id)) {
        validIds.push(id)
      }
    }
    // Add any pinned filters not mentioned at the end
    for (const f of filters.value) {
      if (f.pinned && !validIds.includes(f.id)) {
        validIds.push(f.id)
      }
    }
    pinnedFilterIds.value = validIds
    debouncedSave()
    return true
  }

  // ----- Runtime filter execution -----
  const runFilter = (id, { tasks, areas = [], lists = [], now }) => {
    if (!id) return []
    const filter = filtersMap.value.get(id)
    if (!filter) return []
    const ctx = {
      now: now instanceof Date ? now : new Date(),
      areas: Array.isArray(areas) ? areas : [],
      lists: Array.isArray(lists) ? lists : []
    }
    const predicate = compileFilterToPredicate(filter)
    const matched = (tasks || []).filter((t) => predicate(t, ctx))
    return applySort(matched, filter.sort)
  }

  const getFilterById = (id) => {
    if (!id) return null
    return filtersMap.value.get(id) || null
  }

  const cleanup = () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout)
      saveTimeout = null
    }
  }

  const reset = () => {
    filters.value = []
    pinnedFilterIds.value = []
    if (saveTimeout) clearTimeout(saveTimeout)
    saveToStorage()
  }

  return {
    filters,
    pinnedFilterIds,
    pinnedFilters,
    unpinnedFilters,
    filtersMap,
    loadFromStorage,
    saveToStorage,
    setupStorageWatch,
    addFilter,
    updateFilter,
    removeFilter,
    duplicateFilter,
    reorder,
    runFilter,
    getFilterById,
    compileFilterToPredicate,
    getMyDayRecommendations,
    cleanup,
    reset
  }
})
