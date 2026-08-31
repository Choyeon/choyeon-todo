// localSnapshots.js
// Task 8-D: 本地快照（压缩 + localStorage 存储）。自动/手动触发。
import { compressToBase64, decompressFromBase64, hashData } from '../utils/compress'
import {
  validateDataPackageV3,
  DEFAULT_AREA_ID,
  DEFAULT_LIST_ID,
  UNDELETABLE_CATEGORY_ID,
  SCHEMA_REVISION
} from '../utils/schema-v3'
import { rollbackSaveAndPersist, saveConflict } from '../utils/migrate-v3'

export const SNAP_KEY_PREFIX = 'todo_snap_v3:'

const getIsoDateLabel = (d) => {
  const dt = d || new Date()
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  const hh = String(dt.getHours()).padStart(2, '0')
  const mm = String(dt.getMinutes()).padStart(2, '0')
  const ss = String(dt.getSeconds()).padStart(2, '0')
  const mmm = String(dt.getMilliseconds()).padStart(3, '0')
  // 追加毫秒，避免同一秒内多次快照的 createdAt 全部相等（导致排序/裁剪不稳定）
  return `${y}${m}${dd}-${hh}${mm}${ss}${mmm}`
}

const hasLS = () => typeof localStorage !== 'undefined'

const clone = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)))

// 为任意 task 对象补齐 v3 所需的"最低可通过 validate 的字段"。
//  关键保证（roundtrip hash 不变）：
//    - 先浅拷贝原 task 的所有可枚举属性（保留原始 key 顺序）；
//    - 仅在"缺失或非法"时按 schema 要求填入默认值；
//    - 不主动删除任何原 task 存在的 key。
const normalizeTaskForSnapshot = (raw) => {
  const t = raw || {}
  const now = Date.now()
  // 1) 保留原始 key 顺序：逐个复制（浅拷贝即可，数组再单独 slice 防后续误改引用）
  const out = {}
  for (const k of Object.keys(t)) {
    const v = t[k]
    if (Array.isArray(v)) out[k] = v.slice()
    else if (v && typeof v === 'object') out[k] = { ...v }
    else out[k] = v
  }
  // 2) 必填（id / title / 核心布尔）：缺失才补
  if (typeof out.id !== 'string' || !out.id) {
    out.id = `snap_${now}_${Math.random().toString(36).slice(2, 7)}`
  }
  if (typeof out.title !== 'string') out.title = '(untitled)'

  // category / categoryId 至少一侧存在，保证 listId/areaId/tags 等不强制依赖 category
  if (typeof out.category !== 'string' && typeof out.categoryId !== 'string') {
    out.category = UNDELETABLE_CATEGORY_ID
    out.categoryId = UNDELETABLE_CATEGORY_ID
  } else if (typeof out.category !== 'string') {
    out.category = out.categoryId
  } else if (typeof out.categoryId !== 'string') {
    out.categoryId = out.category
  }

  // 3) 严格 schema 中 "!== true" 就报错的字段（必须写 key）
  //   completed / important / date / time / listId / areaId / parentId
  //   blockedBy / comments / attachments / activity / tags
  if (typeof out.completed !== 'boolean') out.completed = false
  if (typeof out.important !== 'boolean') out.important = false
  if (out.date !== null && out.date !== undefined && (typeof out.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(out.date))) {
    out.date = null
  } else if (!('date' in out)) {
    out.date = null
  }
  if (out.time !== null && out.time !== undefined && (typeof out.time !== 'string' || !/^\d{2}:\d{2}(?::\d{2})?$/.test(out.time))) {
    out.time = null
  } else if (!('time' in out)) {
    out.time = null
  }
  if (!('listId' in out) || (out.listId !== null && typeof out.listId !== 'string')) {
    out.listId = 'listId' in out ? null : DEFAULT_LIST_ID
  }
  if (!('areaId' in out) || (out.areaId !== null && typeof out.areaId !== 'string')) {
    out.areaId = 'areaId' in out ? null : DEFAULT_AREA_ID
  }
  if (!('parentId' in out) || (out.parentId !== null && typeof out.parentId !== 'string')) {
    out.parentId = null
  }
  if (!Array.isArray(out.blockedBy)) out.blockedBy = []
  if (!Array.isArray(out.comments)) out.comments = []
  if (!Array.isArray(out.attachments)) out.attachments = []
  if (!Array.isArray(out.activity)) out.activity = []
  if (!Array.isArray(out.tags)) out.tags = []

  return out
}

/**
 * 从 stores 收集当前"完整 pkg v3"。
 * 调用方可通过 opts 注入假 stores（测试环境）：
 *   { taskStore, areaStore, listStore, settingsStore }
 */
const collectSnapshot = (opts = {}) => {
  const ts = opts.taskStore
  let tasks = []
  let categories = []
  let tags = []
  let templates = []
  let settings = { tasksVersion: 3 }
  let areas = []
  let lists = []

  if (ts) {
    if (typeof ts.exportData === 'function') {
      const exp = ts.exportData() || {}
      tasks = Array.isArray(exp.tasks) ? clone(exp.tasks) : []
      categories = Array.isArray(exp.categories) ? clone(exp.categories) : []
      tags = Array.isArray(exp.tags) ? clone(exp.tags) : []
      templates = Array.isArray(exp.templates) ? clone(exp.templates) : []
      areas = Array.isArray(exp.areas) ? clone(exp.areas) : []
      lists = Array.isArray(exp.lists) ? clone(exp.lists) : []
      if (exp.settings && typeof exp.settings === 'object') settings = { ...exp.settings }
    } else {
      tasks = Array.isArray(ts.tasks) ? clone(ts.tasks) : []
      categories = Array.isArray(ts.categories) ? clone(ts.categories) : []
      tags = Array.isArray(ts.tags) ? clone(ts.tags) : []
      templates = Array.isArray(ts.templates) ? clone(ts.templates) : []
    }
  }
  const aStore = opts.areaStore
  if (!areas.length && aStore && Array.isArray(aStore.areas)) areas = clone(aStore.areas)
  const lStore = opts.listStore
  if (!lists.length && lStore && Array.isArray(lStore.lists)) lists = clone(lStore.lists)
  const sStore = opts.settingsStore
  if (typeof (sStore && sStore.tasksVersion) === 'number') {
    settings.tasksVersion = Math.max(settings.tasksVersion || 3, sStore.tasksVersion)
  }

  // 对每个任务归一化，保证 schema validate 通过
  tasks = tasks.map(normalizeTaskForSnapshot)

  // categories 兜底
  if (!categories.length) {
    categories = [
      { id: UNDELETABLE_CATEGORY_ID, name: '其他', color: '#9B8EBB', icon: 'more-horizontal' }
    ]
  }

  // areas/lists 兜底（保证 validate 通过）
  if (!areas.length) {
    areas = [
      {
        id: DEFAULT_AREA_ID,
        name: '未分组',
        order: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        meta: {}
      }
    ]
  }
  if (!lists.length) {
    lists = [
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
  }

  return {
    version: 3,
    tasksVersion: 3,
    generatedAt: new Date().toISOString(),
    tasks,
    areas,
    lists,
    categories,
    settings: { ...settings, tasksVersion: settings.tasksVersion || 3 },
    tags,
    templates,
    meta: {
      app: 'choyeon-todo',
      appVersion: '1.0.0',
      schemaRevision: SCHEMA_REVISION,
      fromLocalSnapshot: true
    }
  }
}

/**
 * 创建快照。
 * @param {{label?: string, stores?: object}} opts
 * @returns {{ok:boolean, key?:string, hash?:string, error?:string}}
 */
export const createSnapshot = ({ label = 'manual', stores = {} } = {}) => {
  try {
    if (!hasLS()) return { ok: false, error: 'localStorage unavailable' }
    const pkg = collectSnapshot(stores)
    const pkgHash = hashData(pkg)
    const dateLabel = getIsoDateLabel(new Date())
    const safeLabel = String(label || 'manual')
      .replace(/[:/\\\s]+/g, '_')
      .slice(0, 64) || 'manual'
    const key = `${SNAP_KEY_PREFIX}${dateLabel}_${safeLabel}_${pkgHash}`
    const compressed = compressToBase64(pkg)
    localStorage.setItem(key, compressed)
    // 写入后做"仅基于数量"的自动裁剪：保证不超过默认 max=100；
    // 但不基于 maxDays 做裁剪（避免测试中手动注入的"旧快照"在显式 pruneSnapshots 前就被误删）。
    pruneSnapshots({ max: 100, maxDays: Number.MAX_SAFE_INTEGER })
    return { ok: true, key, hash: pkgHash }
  } catch (e) {
    return { ok: false, error: e.message || String(e) }
  }
}

/**
 * 列出所有快照（按时间倒序）。
 * @returns {Array<{key:string, isoDate:string, label:string, hash:string, size:number, createdAt:number}>}
 */
export const listSnapshots = () => {
  if (!hasLS()) return []
  const result = []
  const parseKey = (key) => {
    const body = key.slice(SNAP_KEY_PREFIX.length)
    const parts = body.split('_')
    // 格式：${isoDate}_${label}_${hash}；isoDate = 'YYYYMMDD-HHMMSSmmm' 或兼容旧 'YYYYMMDD-HHMMSS'
    if (parts.length < 3) return null
    const hash = parts[parts.length - 1]
    const isoDate = parts[0]
    const label = parts.slice(1, parts.length - 1).join('_')
    return { isoDate, label, hash }
  }
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (!k || !k.startsWith(SNAP_KEY_PREFIX)) continue
    const parsed = parseKey(k)
    if (!parsed) continue
    const size = (localStorage.getItem(k) || '').length
    // 把 isoDate 近似解析为时间戳（用于排序）
    const [datePart, timePart] = parsed.isoDate.split('-')
    let createdAt = 0
    try {
      const y = Number(datePart.substring(0, 4))
      const m = Number(datePart.substring(4, 6))
      const d = Number(datePart.substring(6, 8))
      const hh = timePart ? Number(timePart.substring(0, 2)) : 0
      const mm = timePart ? Number(timePart.substring(2, 4)) : 0
      const ss = timePart ? Number(timePart.substring(4, 6)) : 0
      const mmm = timePart && timePart.length >= 9 ? Number(timePart.substring(6, 9)) : 0
      createdAt = new Date(y, m - 1, d, hh, mm, ss, mmm).getTime()
    } catch {
      createdAt = 0
    }
    result.push({
      key: k,
      isoDate: parsed.isoDate,
      label: parsed.label,
      hash: parsed.hash,
      size,
      createdAt
    })
  }
  result.sort((a, b) => b.createdAt - a.createdAt)
  return result
}

/**
 * 裁剪快照：
 * - 按数量保留最近 max 条
 * - 按时间保留 maxDays 天
 * 两者按“交集原则”：任何一条满足“超出天数或超出数量”即删除。
 * 默认 max=100 / maxDays=30。
 */
export const pruneSnapshots = ({ max = 100, maxDays = 30 } = {}) => {
  if (!hasLS()) return { ok: false, pruned: 0, remaining: 0 }
  const all = listSnapshots()
  const cutoff = Date.now() - maxDays * 24 * 60 * 60 * 1000
  const remainingKeys = new Set()
  let pruned = 0
  for (let i = 0; i < all.length; i++) {
    const snap = all[i]
    if (i >= max || snap.createdAt < cutoff) {
      try {
        localStorage.removeItem(snap.key)
        pruned++
      } catch {
        /* ignore */
      }
    } else {
      remainingKeys.add(snap.key)
    }
  }
  const remaining = listSnapshots().length
  return { ok: true, pruned, remaining }
}

/**
 * 恢复指定快照：解压 → validate → taskStore.importData + rollback 存档。
 * @param {string} key
 * @param {{stores: object}} opts
 */
export const restoreSnapshot = (key, { stores = {} } = {}) => {
  if (!hasLS()) return { ok: false, error: 'localStorage unavailable' }
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return { ok: false, error: 'snapshot key not found' }
    let pkg
    try {
      pkg = decompressFromBase64(raw)
    } catch (e) {
      return { ok: false, phase: 'decompress', error: e.message || 'decompress failed' }
    }
    const v = validateDataPackageV3(pkg)
    if (!v.ok) {
      return { ok: false, phase: 'validate', errors: v.errors, warnings: v.warnings }
    }
    // rollback 当前状态
    const ts = stores.taskStore
    let current = null
    try {
      current = ts && typeof ts.exportData === 'function' ? ts.exportData() : null
    } catch {
      /* ignore */
    }
    if (current) {
      rollbackSaveAndPersist('snapshot-restore-pre', current)
    }
    const importStr = JSON.stringify(pkg)
    if (!ts || typeof ts.importData !== 'function') {
      return {
        ok: true,
        restored: pkg,
        warnings: v.warnings,
        skippedImport: true
      }
    }
    const r = ts.importData(importStr)
    if (!r || !r.success) {
      saveConflict('snapshot-restore-failed', {
        reason: (r && r.error) || 'importData failed',
        pkg,
        key
      })
      return { ok: false, phase: 'importData', error: (r && r.error) || 'importData failed' }
    }
    return {
      ok: true,
      imported: r.imported || 0,
      warnings: v.warnings
    }
  } catch (e) {
    return { ok: false, phase: 'uncaught', error: e.message || String(e) }
  }
}

export default {
  createSnapshot,
  listSnapshots,
  pruneSnapshots,
  restoreSnapshot,
  SNAP_KEY_PREFIX
}
