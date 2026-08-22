// areaStore.js
// Task 1: v3 Area Store - 工作区维度的任务组织
// 与 settings/task 解耦，仅维护 areas 集合与持久化。
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const STORAGE_KEY = 'choyeon_areas_v3'
const DEFAULT_AREA_ID = 'default-area'

const generateAreaId = (prefix = 'area_') => {
  return `${prefix}${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`
}

const DEFAULT_AREAS = [
  {
    id: DEFAULT_AREA_ID,
    name: '未分组',
    color: '#9B8EBB',
    icon: 'layers',
    order: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    meta: {}
  }
]

export const useAreaStore = defineStore('area', () => {
  const areas = ref([])
  const currentAreaId = ref(null)

  const areaIndexMap = computed(() => {
    const m = new Map()
    areas.value.forEach((a, i) => m.set(a.id, i))
    return m
  })

  const getAreaById = (id) => {
    const idx = areaIndexMap.value.get(id) ?? -1
    return idx >= 0 ? areas.value[idx] : null
  }

  const ensureDefaultArea = () => {
    if (!areas.value.length) {
      areas.value = DEFAULT_AREAS.map((a) => ({ ...a, createdAt: Date.now(), updatedAt: Date.now() }))
      return
    }
    if (!areas.value.some((a) => a.id === DEFAULT_AREA_ID)) {
      areas.value.push({
        id: DEFAULT_AREA_ID,
        name: '未分组',
        color: '#9B8EBB',
        icon: 'layers',
        order: areas.value.length,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        meta: {}
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
          .filter((a) => a && a.id && typeof a.name === 'string')
          .map((a) => ({
            id: a.id,
            name: String(a.name).slice(0, 60),
            color: a.color || '#9B8EBB',
            icon: a.icon || 'layers',
            order: typeof a.order === 'number' ? a.order : 0,
            createdAt: typeof a.createdAt === 'number' ? a.createdAt : Date.now(),
            updatedAt: typeof a.updatedAt === 'number' ? a.updatedAt : Date.now(),
            meta: a.meta && typeof a.meta === 'object' ? a.meta : {}
          }))
        if (valid.length) areas.value = valid
      }
    } catch (e) {
      console.warn('[AreaStore] load failed:', e)
    } finally {
      ensureDefaultArea()
    }
  }

  let saveTimeout = null
  const saveToStorage = () => {
    try {
      if (typeof localStorage === 'undefined') return
      localStorage.setItem(STORAGE_KEY, JSON.stringify(areas.value))
    } catch (e) {
      console.warn('[AreaStore] save failed:', e)
    }
  }

  const debouncedSave = () => {
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = setTimeout(saveToStorage, 250)
  }

  const setupStorageWatch = (watchFn) => {
    watchFn(areas, debouncedSave, { deep: true })
  }

  const addArea = (name, meta) => {
    if (!name || !String(name).trim()) return null
    const now = Date.now()
    let maxOrder = -1
    for (const a of areas.value) if (typeof a.order === 'number' && a.order > maxOrder) maxOrder = a.order
    const newArea = {
      id: generateAreaId(),
      name: String(name).trim().slice(0, 60),
      color: (meta && meta.color) || '#6B7280',
      icon: (meta && meta.icon) || 'layers',
      order: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
      meta: meta && typeof meta === 'object' ? { ...meta } : {}
    }
    areas.value.push(newArea)
    return newArea
  }

  const renameArea = (id, name) => {
    if (!id || !name || !String(name).trim()) return false
    const idx = areaIndexMap.value.get(id) ?? -1
    if (idx === -1) return false
    areas.value[idx].name = String(name).trim().slice(0, 60)
    areas.value[idx].updatedAt = Date.now()
    return true
  }

  const reorderArea = (id, newIndex) => {
    if (!id) return false
    const fromIdx = areaIndexMap.value.get(id) ?? -1
    if (fromIdx === -1) return false
    const total = areas.value.length
    const toIdx = Math.max(0, Math.min(total - 1, Number.isInteger(newIndex) ? newIndex : 0))
    if (fromIdx === toIdx) return true
    const [moved] = areas.value.splice(fromIdx, 1)
    areas.value.splice(toIdx, 0, moved)
    areas.value.forEach((a, i) => {
      a.order = i
      a.updatedAt = Date.now()
    })
    return true
  }

  // removeArea：最后一个 area 不允许删除；删除后其下的 lists 会在 listStore.removeAreaRef() 中由调用方处理
  // 这里返回新的归属 areaId，供联动使用；同时对本 store 的直接依赖：自动将 lists 视为外部模块不处理，
  // 仅按规格保证约束：若为最后一个 area 返回 false。
  const removeArea = (id) => {
    if (!id) return false
    if (id === DEFAULT_AREA_ID && areas.value.length === 1) return false
    if (areas.value.length <= 1) return false
    const idx = areaIndexMap.value.get(id) ?? -1
    if (idx === -1) return false
    // 保证剩余 area 中存在 default-area：若要删 default-area 且非最后一个，则重指派顺序即可
    areas.value.splice(idx, 1)
    ensureDefaultArea()
    // 重排 order
    areas.value.forEach((a, i) => {
      a.order = i
      a.updatedAt = Date.now()
    })
    if (currentAreaId.value === id) currentAreaId.value = DEFAULT_AREA_ID
    return true
  }

  const resetAll = () => {
    areas.value = DEFAULT_AREAS.map((a) => ({ ...a, createdAt: Date.now(), updatedAt: Date.now() }))
    currentAreaId.value = null
    if (saveTimeout) clearTimeout(saveTimeout)
    saveToStorage()
  }

  const cleanup = () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout)
      saveTimeout = null
    }
  }

  // 初始化时保证默认项
  ensureDefaultArea()

  return {
    areas,
    currentAreaId,
    getAreaById,
    addArea,
    renameArea,
    reorderArea,
    removeArea,
    loadFromStorage,
    setupStorageWatch,
    debouncedSave,
    resetAll,
    cleanup
  }
})

export { DEFAULT_AREA_ID }
