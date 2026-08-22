// listStore.js
// Task 1: v3 List Store - 工作区内的列表组织
// 保持与 category 双向映射（list.id = category.id 等价），不破坏 2.x UI。
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { DEFAULT_AREA_ID } from './areaStore'

const STORAGE_KEY = 'choyeon_lists_v3'
// 与 taskStore.UNDELETABLE_CATEGORY('other') 保持一致，保证 listId ↔ category 映射自洽
const DEFAULT_LIST_ID = 'other'

const generateListId = (prefix = 'list_') => {
  return `${prefix}${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`
}

const DEFAULT_LISTS = [
  {
    id: DEFAULT_LIST_ID,
    name: '其他',
    areaId: DEFAULT_AREA_ID,
    color: '#9B8EBB',
    icon: 'more-horizontal',
    order: 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
]

export const useListStore = defineStore('list', () => {
  const lists = ref([])

  const listIndexMap = computed(() => {
    const m = new Map()
    lists.value.forEach((l, i) => m.set(l.id, i))
    return m
  })

  const getListById = (id) => {
    const idx = listIndexMap.value.get(id) ?? -1
    return idx >= 0 ? lists.value[idx] : null
  }

  const getListsByArea = (areaId) => {
    return lists.value
      .filter((l) => l.areaId === areaId)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
  }

  const ensureDefaultList = () => {
    if (!lists.value.length) {
      lists.value = DEFAULT_LISTS.map((l) => ({
        ...l,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }))
      return
    }
    if (!lists.value.some((l) => l.id === DEFAULT_LIST_ID)) {
      lists.value.push({
        id: DEFAULT_LIST_ID,
        name: '其他',
        areaId: DEFAULT_AREA_ID,
        color: '#9B8EBB',
        icon: 'more-horizontal',
        order: lists.value.length,
        createdAt: Date.now(),
        updatedAt: Date.now()
      })
    }
  }

  const loadFromStorage = () => {
    try {
      if (typeof localStorage === 'undefined') return
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        const valid = parsed
          .filter((l) => l && l.id && typeof l.name === 'string')
          .map((l) => ({
            id: l.id,
            name: String(l.name).slice(0, 60),
            areaId: l.areaId || DEFAULT_AREA_ID,
            color: l.color || '#9B8EBB',
            icon: l.icon || 'folder',
            order: typeof l.order === 'number' ? l.order : 0,
            createdAt: typeof l.createdAt === 'number' ? l.createdAt : Date.now(),
            updatedAt: typeof l.updatedAt === 'number' ? l.updatedAt : Date.now()
          }))
        if (valid.length) lists.value = valid
      }
    } catch (e) {
      console.warn('[ListStore] load failed:', e)
    } finally {
      ensureDefaultList()
    }
  }

  let saveTimeout = null
  const saveToStorage = () => {
    try {
      if (typeof localStorage === 'undefined') return
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lists.value))
    } catch (e) {
      console.warn('[ListStore] save failed:', e)
    }
  }

  const debouncedSave = () => {
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = setTimeout(saveToStorage, 250)
  }

  const setupStorageWatch = (watchFn) => {
    watchFn(lists, debouncedSave, { deep: true })
  }

  // addList：根据 areaId 归属。允许传入 order、color、icon 等 meta。
  const addList = (name, meta = {}) => {
    if (!name || !String(name).trim()) return null
    const now = Date.now()
    const areaId = meta.areaId || DEFAULT_AREA_ID
    const sameArea = lists.value.filter((l) => l.areaId === areaId)
    let maxOrder = -1
    sameArea.forEach((l) => {
      if (typeof l.order === 'number' && l.order > maxOrder) maxOrder = l.order
    })
    const newList = {
      id: meta.id || generateListId(),
      name: String(name).trim().slice(0, 60),
      areaId,
      color: meta.color || '#6B7280',
      icon: meta.icon || 'folder',
      order: maxOrder + 1,
      createdAt: now,
      updatedAt: now
    }
    lists.value.push(newList)
    return newList
  }

  const renameList = (id, name) => {
    if (!id || !name || !String(name).trim()) return false
    const idx = listIndexMap.value.get(id) ?? -1
    if (idx === -1) return false
    lists.value[idx].name = String(name).trim().slice(0, 60)
    lists.value[idx].updatedAt = Date.now()
    return true
  }

  const reorderList = (id, newIndex, areaIdScope) => {
    if (!id) return false
    const fromIdx = listIndexMap.value.get(id) ?? -1
    if (fromIdx === -1) return false
    // scope: areaIdScope = undefined 表示全局重排；否则在该 area 内重排
    let scopeArr = lists.value
      .map((l, i) => ({ l, i }))
    if (areaIdScope) {
      scopeArr = scopeArr.filter((x) => x.l.areaId === areaIdScope)
    }
    scopeArr.sort((a, b) => (a.l.order || 0) - (b.l.order || 0))
    const fromInScope = scopeArr.findIndex((x) => x.l.id === id)
    if (fromInScope === -1) return false
    const toInScope = Math.max(
      0,
      Math.min(scopeArr.length - 1, Number.isInteger(newIndex) ? newIndex : 0)
    )
    if (fromInScope === toInScope) return true
    const [moved] = scopeArr.splice(fromInScope, 1)
    scopeArr.splice(toInScope, 0, moved)
    scopeArr.forEach((x, i) => {
      const target = lists.value[x.i]
      if (target) {
        target.order = i
        target.updatedAt = Date.now()
      }
    })
    return true
  }

  // removeList：规格约束
  // - 最后一个 list 禁止删除
  // - 要删除的 list 被任务引用时，任务迁到 default-list（外部调用方使用 returned.defaultTargetId 处理）
  // - 若删除的是 default-list 且不止一个 list，则自动把剩余第一个 list 提升为新 default-list（语义兜底）
  const removeList = (id) => {
    if (!id) return { success: false, defaultTargetId: DEFAULT_LIST_ID }
    if (lists.value.length <= 1) {
      return { success: false, defaultTargetId: lists.value[0]?.id || DEFAULT_LIST_ID }
    }
    const idx = listIndexMap.value.get(id) ?? -1
    if (idx === -1) return { success: false, defaultTargetId: DEFAULT_LIST_ID }
    lists.value.splice(idx, 1)
    ensureDefaultList()
    lists.value.forEach((l, i) => {
      l.order = i
      l.updatedAt = Date.now()
    })
    const defaultTarget = lists.value.find((l) => l.id === DEFAULT_LIST_ID) || lists.value[0]
    return { success: true, defaultTargetId: defaultTarget.id }
  }

  // moveListsToArea：删除 area 时，把其下 lists 迁到 default-area
  const moveListsToArea = (fromAreaId, toAreaId = DEFAULT_AREA_ID) => {
    if (!fromAreaId || fromAreaId === toAreaId) return 0
    let moved = 0
    lists.value.forEach((l) => {
      if (l.areaId === fromAreaId) {
        l.areaId = toAreaId
        l.updatedAt = Date.now()
        moved++
      }
    })
    return moved
  }

  const resetAll = () => {
    lists.value = DEFAULT_LISTS.map((l) => ({
      ...l,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }))
    if (saveTimeout) clearTimeout(saveTimeout)
    saveToStorage()
  }

  const cleanup = () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout)
      saveTimeout = null
    }
  }

  ensureDefaultList()

  return {
    lists,
    getListById,
    getListsByArea,
    addList,
    renameList,
    reorderList,
    removeList,
    moveListsToArea,
    loadFromStorage,
    setupStorageWatch,
    debouncedSave,
    resetAll,
    cleanup
  }
})

export { DEFAULT_LIST_ID }
