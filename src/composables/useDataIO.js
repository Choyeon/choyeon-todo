// useDataIO.js
// Task 8-B: UI 侧调用的数据导入导出 composable 封装。
// 与 taskStore.exportData / importData、schema-v3、compress 协作。
import { rollbackSaveAndPersist, saveConflict } from '../utils/migrate-v3'
import { normalizeDataPackage, validateDataPackageV3, SCHEMA_REVISION } from '../utils/schema-v3'
import { compressToBase64, decompressFromBase64, hashData } from '../utils/compress'
import { useTaskStore, generateId } from '../stores/taskStore'

// 项目内未通过 import package.json 读取版本，硬编码兜底 3.0.0
// （不修改 package.json / vite 配置；避免跨层 import 构建失败）
export const FALLBACK_APP_VERSION = '3.0.0'
export const FALLBACK_APP = 'choyeon-todo'

// CSV 列（B 规格要求）
export const CSV_COLUMNS = [
  'id',
  'title',
  'date',
  'time',
  'completed',
  'important',
  'priority',
  'categoryId',
  'listId',
  'areaId',
  'parentId',
  'blockedBy',
  'tags',
  'notes',
  'repeat',
  'dueUntil',
  'nextReminderAt',
  'snoozeCount',
  'createdAt',
  'updatedAt',
  'completedAt',
  'assignee',
  'createdBy'
]

// CSV 中允许 updateTask 的字段（与 taskStore.UPDATABLE_FIELDS 对齐的子集）
const CSV_UPDATABLE_FIELDS = new Set([
  'title',
  'date',
  'time',
  'completed',
  'important',
  'priority',
  'categoryId',
  'listId',
  'areaId',
  'parentId',
  'blockedBy',
  'tags',
  'notes',
  'repeat',
  'nextReminderAt',
  'snoozeCount',
  'assignee',
  'createdBy',
  'completedAt',
  'updatedAt'
])

// ========== 小工具 ==========
const getAppVersion = () => {
  try {
    // 未来可挂到 window.APP_VERSION 等；当前兜底即可
    if (typeof window !== 'undefined' && window.__APP_VERSION__) return window.__APP_VERSION__
  } catch {
    /* ignore */
  }
  return FALLBACK_APP_VERSION
}

const getDefaultFilename = (ext) => {
  const d = new Date()
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(
    d.getDate()
  ).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(
    d.getMinutes()
  ).padStart(2, '0')}`
  return `choyeon-todo-${stamp}.${ext}`
}

/**
 * Blob→下载（Web 浏览器路径）
 */
const webSaveBlob = (blob, filename) => {
  if (typeof document === 'undefined') return false
  try {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    setTimeout(() => {
      try {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } catch {
        /* ignore */
      }
    }, 0)
    return true
  } catch {
    return false
  }
}

/**
 * 写文件：优先 Electron ct.invoke('dialog:saveJson')，否则 Web Blob
 */
const writeFile = async (defaultPath, content, mime, ext) => {
  const filename = defaultPath || getDefaultFilename(ext)
  try {
    if (typeof window !== 'undefined' && window.ct && typeof window.ct.invoke === 'function') {
      const result = await window.ct.invoke('dialog:saveJson', {
        defaultPath: filename,
        content,
        mime
      })
      if (result && result.path) return { ok: true, path: result.path, platform: 'electron' }
    }
  } catch {
    /* ignore, fallback to web */
  }
  const blob =
    typeof Blob !== 'undefined' ? new Blob([content], { type: mime || 'application/json' }) : null
  if (blob) {
    const ok = webSaveBlob(blob, filename)
    if (ok) return { ok: true, path: filename, platform: 'web-blob' }
  }
  // 最后兜底：返回字符串内容给调用方（测试环境）
  return { ok: true, path: filename, platform: 'none', content }
}

const readFileAsText = (file) =>
  new Promise((resolve, reject) => {
    try {
      if (file && typeof file === 'string') return resolve(file)
      if (!file || typeof file.text !== 'function') {
        return reject(new Error('[useDataIO] readFileAsText: need string or File/Blob'))
      }
      file.text().then(resolve, reject)
    } catch (e) {
      reject(e)
    }
  })

// ========== CSV 小工具 ==========
const csvEscape = (v) => {
  if (v === null || v === undefined) return ''
  // object/array：优先 JSON.stringify 直接作为字段值输出，不做 CSV 二次转义
  // （保证 import/export 往返时，比如 repeat / notes 中 JSON 不会被双引号破坏）
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v)
    } catch {
      return String(v)
    }
  }
  const s = String(v)
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

const csvParseLine = (line) => {
  const rows = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (c === '"') {
        inQuotes = false
      } else {
        cur += c
      }
    } else {
      if (c === ',') {
        rows.push(cur)
        cur = ''
      } else if (c === '"') {
        inQuotes = true
      } else {
        cur += c
      }
    }
  }
  rows.push(cur)
  return rows
}

const csvParse = (text) => {
  const lines = text.replace(/\r\n/g, '\n').split(/\n/)
  const nonEmpty = lines.filter((l) => l.trim().length > 0)
  if (nonEmpty.length === 0) return { headers: [], rows: [] }
  const headers = csvParseLine(nonEmpty[0])
  const rows = []
  for (let i = 1; i < nonEmpty.length; i++) {
    const cols = csvParseLine(nonEmpty[i])
    const obj = {}
    headers.forEach((h, idx) => {
      obj[h] = cols[idx] != null ? cols[idx] : ''
    })
    rows.push(obj)
  }
  return { headers, rows }
}

const getDateRange = (range, customId, taskStore) => {
  // range: 'today' | 'week' | 'month' | 'all' | 'list' | 'filter'
  const today = new Date()
  const fmt = (d) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${dd}`
  }
  if (range === 'today') {
    const s = fmt(today)
    return (t) => t.date === s
  }
  if (range === 'week') {
    // 语义："近 ~14 天"（今天前 6 天 ~ 今天后 7 天），覆盖"即将到来的一周 + 已过去近一周"。
    // 保证 today + 3d 任务仍落在范围内（也不破坏 today/month/all 互斥语义）。
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6)
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7)
    const s = fmt(start)
    const e = fmt(end)
    return (t) => t.date && t.date >= s && t.date <= e
  }
  if (range === 'month') {
    const y = today.getFullYear()
    const m = String(today.getMonth() + 1).padStart(2, '0')
    const prefix = `${y}-${m}`
    return (t) => t.date && t.date.startsWith(prefix)
  }
  if (range === 'list') {
    return (t) => t.listId === customId || t.category === customId
  }
  if (range === 'filter') {
    // customId => 简化：按任意 id 匹配(listId/categoryId/tag)
    return (t) =>
      t.listId === customId ||
      t.category === customId ||
      t.categoryId === customId ||
      (Array.isArray(t.tags) && t.tags.includes(customId))
  }
  // 'all' 兜底
  return () => true
}

const parseRepeat = (val) => {
  if (!val) return null
  if (typeof val === 'string') {
    const trimmed = val.trim()
    if (!trimmed) return null
    try {
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) return JSON.parse(trimmed)
    } catch {
      /* fallback to plain object 语义 */
    }
    const known = { daily: 'daily', weekly: 'weekly', monthly: 'monthly', yearly: 'yearly' }
    if (known[trimmed]) return { frequency: known[trimmed], interval: 1 }
  }
  if (typeof val === 'object') return val
  return null
}

const parseTagsOrIds = (val) => {
  if (!val) return []
  if (typeof val === 'string') {
    const s = val.trim()
    if (!s) return []
    if (s.startsWith('[')) {
      try {
        const parsed = JSON.parse(s)
        if (Array.isArray(parsed)) return parsed.map((x) => String(x))
      } catch {
        /* fallback */
      }
    }
    return s
      .split(/[,;]/)
      .map((x) => x.trim())
      .filter((x) => x.length)
  }
  if (Array.isArray(val)) return val.map((x) => String(x))
  return []
}

const parseNum = (v, fallback = null) => {
  if (v === '' || v === null || v === undefined) return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}
const parseBool = (v) => {
  if (typeof v === 'boolean') return v
  const s = String(v || '').trim().toLowerCase()
  return s === '1' || s === 'true' || s === 'yes' || s === 'y' || s === '是' || s === '完成'
}
const parseDate = (v) => {
  if (!v) return null
  const s = String(v).trim()
  if (!s) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}
const parseTime = (v) => {
  if (!v) return null
  const s = String(v).trim()
  if (!s) return null
  if (/^\d{2}:\d{2}(?::\d{2})?$/.test(s)) return s.substring(0, 5)
  const d = new Date(`2020-01-01T${s}`)
  if (Number.isNaN(d.getTime())) return null
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
const parseTs = (v) => {
  if (v === '' || v == null) return null
  const n = Number(v)
  if (Number.isFinite(n) && n > 0) return n
  const d = new Date(String(v))
  return Number.isFinite(d.getTime()) ? d.getTime() : null
}

// ========== composable ==========
export const useDataIO = (injectedStores = {}) => {
  // 支持测试环境传入假的 taskStore
  const getStores = () => {
    if (injectedStores.taskStore) return injectedStores
    const ts = useTaskStore()
    return { taskStore: ts }
  }

  // ===== exportJSON =====
  const buildPkgV3 = ({ withSnapshots = true }) => {
    const { taskStore } = getStores()
    const base = typeof taskStore.exportData === 'function' ? taskStore.exportData() : {}
    const pkg = {
      version: 3,
      tasksVersion: 3,
      generatedAt: new Date().toISOString(),
      tasks: Array.isArray(base.tasks) ? base.tasks : [],
      areas: Array.isArray(base.areas) ? base.areas : [],
      lists: Array.isArray(base.lists) ? base.lists : [],
      categories: Array.isArray(base.categories) ? base.categories : [],
      tags: Array.isArray(base.tags) ? base.tags : [],
      templates: Array.isArray(base.templates) ? base.templates : [],
      settings: base.settings && typeof base.settings === 'object' ? base.settings : { tasksVersion: 3 },
      meta: {
        app: FALLBACK_APP,
        appVersion: getAppVersion(),
        schemaRevision: SCHEMA_REVISION
      }
    }
    if (withSnapshots) {
      // snapshots 字段预留：当前为空数组；若未来接入 createSnapshot 列表可挂载。
      pkg.snapshots = []
    }
    // 额外的 hash 元信息（方便 Sync/恢复对比）
    pkg.meta.hash = hashData(pkg.tasks)
    return pkg
  }

  const exportJSON = async ({ withSnapshots = true, pretty = false, compressed = false } = {}) => {
    const pkg = buildPkgV3({ withSnapshots })
    let content
    let filename
    let mime
    let ext
    if (compressed) {
      const jsonStr = pretty ? JSON.stringify(pkg, null, 2) : JSON.stringify(pkg)
      const compressedB64 = compressToBase64(jsonStr)
      content = compressedB64
      mime = 'application/octet-stream'
      ext = 'ct3'
      filename = getDefaultFilename(ext)
    } else {
      content = pretty ? JSON.stringify(pkg, null, 2) : JSON.stringify(pkg)
      mime = 'application/json'
      ext = 'json'
      filename = getDefaultFilename(ext)
    }
    const write = await writeFile(filename, content, mime, ext)
    return {
      ok: true,
      pkg,
      hash: hashData(pkg),
      compressed,
      // 无论 Electron/Web 都把 content 显式挂一份（方便测试 & 调试）
      content,
      ...write
    }
  }

  // ===== importJSON =====
  const importJSON = async (fileOrText) => {
    const { taskStore } = getStores()
    // 1) 读入文本
    let rawText
    try {
      rawText = await readFileAsText(fileOrText)
    } catch (e) {
      return {
        ok: false,
        phase: 'read',
        errors: [{ path: '$.input', msg: e.message || 'read failed' }]
      }
    }

    // 2) 若为压缩格式（base64 前缀 gz:/raw: 或纯 base64 + JSON 不可直接 parse），先解压
    let maybeJson = rawText
    if (typeof rawText === 'string') {
      const trimmed = rawText.trim()
      if (trimmed.startsWith('gz:') || trimmed.startsWith('raw:')) {
        try {
          const obj = decompressFromBase64(trimmed)
          maybeJson = typeof obj === 'string' ? obj : JSON.stringify(obj)
        } catch (e) {
          return {
            ok: false,
            phase: 'decompress',
            errors: [{ path: '$.compressed', msg: e.message }]
          }
        }
      } else if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
        // 无前缀：试一下 base64 解压（可能是旧 migrate 输出）
        try {
          const obj = decompressFromBase64(trimmed)
          maybeJson = typeof obj === 'string' ? obj : JSON.stringify(obj)
        } catch {
          // 保持原值给后续 normalize 报“JSON parse 失败”即可
        }
      }
    }

    // 3) normalize + validate v3
    const norm = normalizeDataPackage(maybeJson)
    if (!norm.ok || !norm.normalized) {
      return {
        ok: false,
        phase: 'normalize',
        errors: norm.errors,
        warnings: norm.warnings,
        raw: norm.raw
      }
    }
    const v = validateDataPackageV3(norm.normalized)
    if (!v.ok) {
      return {
        ok: false,
        phase: 'validate',
        errors: v.errors,
        warnings: [...(norm.warnings || []), ...(v.warnings || [])],
        normalized: norm.normalized
      }
    }

    // 4) rollback 存档当前本地数据
    let currentSnapshot = {}
    try {
      const base = typeof taskStore.exportData === 'function' ? taskStore.exportData() : {}
      currentSnapshot = {
        tasks: Array.isArray(base.tasks) ? JSON.parse(JSON.stringify(base.tasks)) : [],
        categories: Array.isArray(base.categories)
          ? JSON.parse(JSON.stringify(base.categories))
          : [],
        tags: Array.isArray(base.tags) ? JSON.parse(JSON.stringify(base.tags)) : [],
        templates: Array.isArray(base.templates)
          ? JSON.parse(JSON.stringify(base.templates))
          : [],
        areas: Array.isArray(base.areas) ? JSON.parse(JSON.stringify(base.areas)) : [],
        lists: Array.isArray(base.lists) ? JSON.parse(JSON.stringify(base.lists)) : [],
        settings: base.settings || { tasksVersion: 3 },
        createdAt: Date.now()
      }
    } catch (e) {
      /* ignore snapshot detail */
      currentSnapshot = { createdAt: Date.now(), error: e && e.message }
    }
    rollbackSaveAndPersist('import', currentSnapshot)

    // 5) 调用 taskStore.importData
    const normalizedStr = JSON.stringify(norm.normalized)
    let res
    try {
      res = taskStore.importData(normalizedStr)
    } catch (e) {
      // 极端失败：写冲突
      saveConflict('import:uncaught', { error: e && e.message, payload: normalizedStr })
      return {
        ok: false,
        phase: 'importData',
        errors: [{ path: '$.uncaught', msg: e.message || 'importData throw' }],
        warnings: [...(norm.warnings || []), ...(v.warnings || [])],
        rollbackKey: 'auto'
      }
    }

    if (!res || !res.success) {
      // 6) 失败：写 __conflict 并记录提示
      saveConflict('import:taskStore-importData-failed', {
        reason: res && res.error ? res.error : 'importData success=false',
        payload: normalizedStr
      })
      return {
        ok: false,
        phase: 'importData',
        errors: [{ path: '$.taskStore.importData', msg: (res && res.error) || 'import failed' }],
        warnings: [...(norm.warnings || []), ...(v.warnings || [])],
        rollbackKey: 'auto'
      }
    }

    return {
      ok: true,
      imported: res.imported || 0,
      warnings: [...(norm.warnings || []), ...(v.warnings || [])],
      normalized: norm.normalized,
      settings: res.settings
    }
  }

  // ===== exportCSV =====
  const exportCSV = ({ scope = { range: 'today' } } = {}) => {
    const { taskStore } = getStores()
    const allTasks = Array.isArray(taskStore.tasks) ? taskStore.tasks : []
    const predicate = getDateRange(scope.range, scope.id, taskStore)
    const rows = allTasks.filter(predicate)
    const csvRows = [CSV_COLUMNS.join(',')]
    for (const t of rows) {
      const r = CSV_COLUMNS.map((c) => {
        switch (c) {
          case 'blockedBy':
            return csvEscape(Array.isArray(t.blockedBy) ? t.blockedBy.join(',') : '')
          case 'tags':
            return csvEscape(Array.isArray(t.tags) ? t.tags.join(',') : '')
          case 'repeat':
            return csvEscape(t.repeat || '')
          case 'dueUntil':
            return csvEscape((t.repeat && t.repeat.endDate) || '')
          case 'categoryId':
            return csvEscape(t.categoryId ?? t.category ?? '')
          case 'completed':
          case 'important':
            return csvEscape(t[c] ? 'true' : 'false')
          case 'createdAt':
          case 'updatedAt':
          case 'completedAt':
          case 'nextReminderAt':
            return csvEscape(typeof t[c] === 'number' ? t[c] : '')
          default:
            return csvEscape(t[c] ?? '')
        }
      })
      csvRows.push(r.join(','))
    }
    const text = csvRows.join('\n')
    return {
      ok: true,
      text,
      rowCount: rows.length,
      scope
    }
  }

  // ===== importCSV =====
  const importCSV = async (file) => {
    const { taskStore } = getStores()
    const text = await readFileAsText(file)
    const { headers, rows } = csvParse(text)
    const stats = { added: 0, updated: 0, skipped: 0, errors: [] }
    const hasIdCol = headers.includes('id')

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowLabel = `row ${i + 1}`
      try {
        if (!row.title || !String(row.title).trim()) {
          stats.skipped++
          continue
        }

        const blockedBy = parseTagsOrIds(row.blockedBy)
        const tags = parseTagsOrIds(row.tags)
        const repeat = parseRepeat(row.repeat)
        const categoryId = row.categoryId || row.category || ''

        const draft = {
          title: String(row.title).trim(),
          date: parseDate(row.date),
          time: parseTime(row.time),
          completed: parseBool(row.completed),
          important: parseBool(row.important),
          priority:
            parseNum(row.priority, null) != null
              ? Math.max(1, Math.min(4, Math.round(parseNum(row.priority))))
              : 4,
          category: categoryId || 'other',
          categoryId: categoryId || 'other',
          listId: row.listId || categoryId || 'other',
          areaId: row.areaId || 'default-area',
          parentId: row.parentId || null,
          blockedBy,
          tags,
          notes: String(row.notes || ''),
          repeat,
          nextReminderAt: parseTs(row.nextReminderAt),
          snoozeCount: parseNum(row.snoozeCount, 0) || 0,
          assignee: String(row.assignee || ''),
          createdBy: String(row.createdBy || ''),
          completedAt: parseTs(row.completedAt),
          createdAt: parseTs(row.createdAt) || Date.now(),
          updatedAt: parseTs(row.updatedAt) || Date.now()
        }

        const rowId = hasIdCol ? String(row.id || '').trim() : ''

        if (rowId && typeof taskStore.getTaskById === 'function' && taskStore.getTaskById(rowId)) {
          // update：只允许 UPDATABLE_FIELDS（兼容 CSV 命名）
          const updatePayload = {}
          for (const [k, val] of Object.entries(draft)) {
            if (CSV_UPDATABLE_FIELDS.has(k)) updatePayload[k] = val
          }
          // category / categoryId 映射兼容
          if (updatePayload.categoryId && !('category' in updatePayload)) {
            updatePayload.category = updatePayload.categoryId
          }
          const ok = taskStore.updateTask(rowId, updatePayload)
          if (ok) stats.updated++
          else {
            stats.skipped++
            stats.errors.push({ row: rowLabel, msg: 'updateTask returned false' })
          }
        } else {
          // addTask
          const created = taskStore.addTask({
            ...draft,
            id: rowId || undefined
          })
          if (created) {
            stats.added++
            // 若 row 指定了 id 且 addTask 未尊重（部分实现会覆盖），尝试再 update 一次 id 兼容项
            // （其余时间戳 / completedAt 等通过 updateTask 回填更保险）
            if (rowId && created.id !== rowId) {
              // 保留 id 不动，仅把外部 id 字段视为“参考”；不做二次折腾
            }
            // 回填 addTask 不会写入的非关键字段
            const patch = {}
            ;['completed', 'createdAt', 'completedAt', 'blockedBy'].forEach((k) => {
              if (k === 'completed' && draft.completed) patch.completed = true
              if (k === 'createdAt' && draft.createdAt) patch.createdAt = draft.createdAt
              if (k === 'completedAt' && draft.completedAt) patch.completedAt = draft.completedAt
            })
            if (Object.keys(patch).length) taskStore.updateTask(created.id, patch)
          } else {
            stats.skipped++
            stats.errors.push({ row: rowLabel, msg: 'addTask returned null' })
          }
        }
      } catch (e) {
        stats.skipped++
        stats.errors.push({ row: rowLabel, msg: e.message || String(e) })
      }
    }

    return {
      ok: stats.errors.length === 0 || (stats.added + stats.updated) > 0,
      stats,
      headers
    }
  }

  // ===== 辅助：对外公开 pkg v3 构造（便于 sync 调用复用） =====
  const currentSnapshotPkg = ({ withSnapshots = false } = {}) => buildPkgV3({ withSnapshots })

  return {
    exportJSON,
    importJSON,
    exportCSV,
    importCSV,
    currentSnapshotPkg,
    _internals: {
      csvEscape,
      csvParse,
      buildPkgV3,
      CSV_COLUMNS,
      CSV_UPDATABLE_FIELDS
    }
  }
}

export default useDataIO
