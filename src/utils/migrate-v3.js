// migrate-v3.js
// Task 1: 数据契约 v3 迁移与回滚工具
// 功能：
//   1. migrateV2ToV3(stateSnapshot) - 无副作用迁移 v2 数据到 v3 模型
//   2. rollbackSaveAndPersist(name, payload) - 压缩暂存迁移前快照
//   3. saveConflict(name, payload) - 保存冲突/失败数据用于事后排查

// 本地语言键 defaultAreaName 的本地化映射（可静态访问，不依赖 i18n 实例）
const DEFAULT_AREA_NAMES = {
  'zh-CN': '未分组',
  'en-US': 'Ungrouped',
  'ja-JP': '未分類'
}

// 读取当前语言（按 i18n 相同规则），兜底 'zh-CN'
const readCurrentLanguage = () => {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('choyeon_locale')
      if (saved && DEFAULT_AREA_NAMES[saved]) return saved
    }
  } catch {
    /* ignore */
  }
  if (typeof navigator !== 'undefined' && navigator.language) {
    const lang = navigator.language
    if (lang.startsWith('zh')) return 'zh-CN'
    if (lang.startsWith('ja')) return 'ja-JP'
    if (lang.startsWith('en')) return 'en-US'
  }
  return 'zh-CN'
}

const getDefaultAreaName = () => {
  return DEFAULT_AREA_NAMES[readCurrentLanguage()] || '未分组'
}

// 非常简易的 utf8 字符串 => Uint8Array（避免引入 TextEncoder polyfill，保持零依赖）
const utf8Encode = (str) => {
  // 优先用浏览器原生
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str)
  }
  // 兜底
  const out = []
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i)
    if (c < 0x80) {
      out.push(c)
    } else if (c < 0x800) {
      out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f))
    } else if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
      const c2 = str.charCodeAt(++i)
      const cp = 0x10000 + (((c & 0x3ff) << 10) | (c2 & 0x3ff))
      out.push(
        0xf0 | (cp >> 18),
        0x80 | ((cp >> 12) & 0x3f),
        0x80 | ((cp >> 6) & 0x3f),
        0x80 | (cp & 0x3f)
      )
    } else {
      out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f))
    }
  }
  return new Uint8Array(out)
}

// Uint8Array => base64 string（浏览器环境用 btoa）
const bytesToBase64 = (bytes) => {
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk))
  }
  if (typeof btoa !== 'undefined') return btoa(bin)
  return Buffer.from(bin, 'binary').toString('base64')
}

// 纯 JS gzip（RFC 1951 DEFLATE 最简霍夫曼 + 存储块）。
// 注意：此处为兼容性考虑，不使用 pako/zlib；浏览器/Node 端均可运行，
// 压缩率较低但足够存放小体量 JSON 快照。
const encodeRFC1951Stored = (inputBytes) => {
  // 构造一系列存储块（每块 65535 字节）
  const blocks = []
  let i = 0
  const total = inputBytes.length
  while (i <= total) {
    const remaining = total - i
    const len = Math.min(remaining, 65535)
    const isLast = i + len === total
    const header = new Uint8Array(5)
    header[0] = isLast ? 0x01 : 0x00
    const lenLo = len & 0xff
    const lenHi = (len >> 8) & 0xff
    header[1] = lenLo
    header[2] = lenHi
    header[3] = (~lenLo) & 0xff
    header[4] = (~lenHi) & 0xff
    blocks.push(header)
    if (len > 0) blocks.push(inputBytes.subarray(i, i + len))
    if (isLast) break
    i += len
  }
  // 计算总长度
  let totalLen = 0
  blocks.forEach((b) => (totalLen += b.length))
  const out = new Uint8Array(totalLen)
  let pos = 0
  blocks.forEach((b) => {
    out.set(b, pos)
    pos += b.length
  })
  return out
}

// gzip 包头 + DEFLATE 数据 + 校验（CRC32、ISIZE）
const crc32Table = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
})()

const crc32Bytes = (bytes) => {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i++) {
    crc = crc32Table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

const gzipBytes = (inputBytes) => {
  const deflated = encodeRFC1951Stored(inputBytes)
  const crc = crc32Bytes(inputBytes)
  const isize = inputBytes.length & 0xffffffff
  const header = new Uint8Array([
    0x1f,
    0x8b, // magic
    0x08, // deflate
    0x00, // flags
    0x00,
    0x00,
    0x00,
    0x00, // mtime
    0x00, // xfl
    0x03 // OS: Unix
  ])
  const trailer = new Uint8Array(8)
  trailer[0] = crc & 0xff
  trailer[1] = (crc >>> 8) & 0xff
  trailer[2] = (crc >>> 16) & 0xff
  trailer[3] = (crc >>> 24) & 0xff
  trailer[4] = isize & 0xff
  trailer[5] = (isize >>> 8) & 0xff
  trailer[6] = (isize >>> 16) & 0xff
  trailer[7] = (isize >>> 24) & 0xff
  const out = new Uint8Array(header.length + deflated.length + trailer.length)
  out.set(header, 0)
  out.set(deflated, header.length)
  out.set(trailer, header.length + deflated.length)
  return out
}

// 清理过期或超限的 rollback / conflict 键
const STORAGE_PREFIX_ROLLBACK = '__rollback_'
const STORAGE_PREFIX_CONFLICT = '__conflict_'
const MAX_ROLLBACK_ENTRIES = 10
const ROLLBACK_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 天

const listStorageKeysByPrefix = (prefix) => {
  if (typeof localStorage === 'undefined') return []
  const keys = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith(prefix)) keys.push(k)
  }
  return keys
}

const cleanupRollbackEntries = (name) => {
  if (typeof localStorage === 'undefined') return
  const prefix = `${STORAGE_PREFIX_ROLLBACK}${name}_`
  const allKeys = listStorageKeysByPrefix(prefix)
  const now = Date.now()
  // 过期清理
  allKeys.forEach((k) => {
    const ts = parseInt(k.slice(prefix.length), 10)
    if (isNaN(ts) || now - ts > ROLLBACK_TTL_MS) {
      try {
        localStorage.removeItem(k)
      } catch {
        /* ignore */
      }
    }
  })
  // 数量清理（按时间倒序取前 MAX）
  const remainKeys = listStorageKeysByPrefix(prefix).sort((a, b) => {
    const ta = parseInt(a.slice(prefix.length), 10)
    const tb = parseInt(b.slice(prefix.length), 10)
    return tb - ta
  })
  for (let i = MAX_ROLLBACK_ENTRIES; i < remainKeys.length; i++) {
    try {
      localStorage.removeItem(remainKeys[i])
    } catch {
      /* ignore */
    }
  }
}

/**
 * 把 payload 压缩并保存为 rollback 键
 * @param {string} name  命名空间（如 'migrate-v2'）
 * @param {any} payload  任意可序列化数据
 * @returns {{ok:boolean, key?:string, error?:string}}
 */
export const rollbackSaveAndPersist = (name, payload) => {
  try {
    if (typeof localStorage === 'undefined') {
      return { ok: false, error: 'localStorage unavailable' }
    }
    const jsonStr = JSON.stringify(payload)
    const bytes = utf8Encode(jsonStr)
    const gz = gzipBytes(bytes)
    const b64 = bytesToBase64(gz)
    const ts = Date.now()
    const key = `${STORAGE_PREFIX_ROLLBACK}${name}_${ts}`
    localStorage.setItem(key, b64)
    cleanupRollbackEntries(name)
    return { ok: true, key }
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) }
  }
}

/**
 * 保存冲突/失败快照（base64(JSON)，直接可读，不压缩）
 * @param {string} name
 * @param {any} payload
 * @returns {{ok:boolean, key?:string, error?:string}}
 */
export const saveConflict = (name, payload) => {
  try {
    if (typeof localStorage === 'undefined') {
      return { ok: false, error: 'localStorage unavailable' }
    }
    const jsonStr = JSON.stringify(payload)
    const bytes = utf8Encode(jsonStr)
    const b64 = bytesToBase64(bytes)
    const ts = Date.now()
    const key = `${STORAGE_PREFIX_CONFLICT}${name}_${ts}.json`
    localStorage.setItem(key, b64)
    return { ok: true, key }
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) }
  }
}

/**
 * 从 v2 状态快照迁移到 v3。无副作用：返回新对象，不修改入参。
 *
 * stateSnapshot 至少包含：
 *   tasks: []
 *   categories?: []
 *   areas?: []
 *   lists?: []
 *   settings?: { tasksVersion?: number, ... }
 *
 * @param {object} stateSnapshot
 * @returns {{ok:boolean, migrated?:{tasks,areas,lists,categories,settings}}}
 */
export const migrateV2ToV3 = (stateSnapshot) => {
  try {
    // Task 1：null / undefined / 非 object 入参直接报错（零互斥不会误返回空 ok）
    if (stateSnapshot == null) {
      return { ok: false, error: 'stateSnapshot is null/undefined' }
    }
    if (typeof stateSnapshot !== 'object') {
      return { ok: false, error: 'stateSnapshot must be an object' }
    }
    const snap = stateSnapshot
    const settings = (snap.settings && typeof snap.settings === 'object') ? { ...snap.settings } : {}
    const tasksVersion = typeof settings.tasksVersion === 'number' ? settings.tasksVersion : 0

    // tasks 必须是数组（无论什么版本，若传入且非数组 -> 报错）
    if ('tasks' in snap && !Array.isArray(snap.tasks)) {
      return { ok: false, error: 'tasks must be an array' }
    }

    if (tasksVersion >= 3) {
      // 原样返回：按规格带 ok:true
      return {
        ok: true,
        migrated: {
          tasks: Array.isArray(snap.tasks) ? snap.tasks : [],
          areas: Array.isArray(snap.areas) ? snap.areas : [],
          lists: Array.isArray(snap.lists) ? snap.lists : [],
          categories: Array.isArray(snap.categories) ? snap.categories : [],
          settings
        }
      }
    }

    const now = Date.now()
    const createdAtFallback = typeof snap.__migratedAt === 'number' ? snap.__migratedAt : now

    // ====== 构建 Areas ======
    let areas = Array.isArray(snap.areas) ? snap.areas.map((a) => ({ ...a })) : []
    if (!areas.length) {
      areas.push({
        id: 'default-area',
        name: getDefaultAreaName(),
        order: 0,
        createdAt: createdAtFallback,
        updatedAt: now,
        meta: {}
      })
    }
    // 保证 default-area 存在
    if (!areas.some((a) => a.id === 'default-area')) {
      areas.push({
        id: 'default-area',
        name: getDefaultAreaName(),
        order: areas.length,
        createdAt: createdAtFallback,
        updatedAt: now,
        meta: {}
      })
    }

    // ====== 构建 Categories（原样保留 2.x） ======
    let categories = Array.isArray(snap.categories)
      ? snap.categories.map((c) => ({ ...c }))
      : []
    // 保证兜底分类存在（保持 taskStore UNDELETABLE_CATEGORY='other' 语义）
    if (!categories.some((c) => c.id === 'other')) {
      categories.push({ id: 'other', name: '其他', color: '#9B8EBB', icon: 'more-horizontal' })
    }

    // ====== 构建 Lists：categories => lists（id 同名） ======
    let lists = Array.isArray(snap.lists) ? snap.lists.map((l) => ({ ...l })) : []
    if (!lists.length) {
      if (categories.length) {
        lists = categories.map((c, idx) => ({
          id: c.id,
          name: c.name,
          areaId: 'default-area',
          color: c.color || '#9B8EBB',
          icon: c.icon || 'folder',
          order: typeof c.order === 'number' ? c.order : idx,
          createdAt: createdAtFallback,
          updatedAt: now
        }))
      } else {
        // 兜底：与 UNDELETABLE_CATEGORY 对齐
        lists.push({
          id: 'other',
          name: '其他',
          areaId: 'default-area',
          color: '#9B8EBB',
          icon: 'more-horizontal',
          order: 0,
          createdAt: createdAtFallback,
          updatedAt: now
        })
      }
    }
    // 保证 'other' 兜底 list 存在（对齐 category 'other'）
    if (!lists.some((l) => l.id === 'other')) {
      lists.push({
        id: 'other',
        name: '其他',
        areaId: 'default-area',
        color: '#9B8EBB',
        icon: 'more-horizontal',
        order: lists.length,
        createdAt: createdAtFallback,
        updatedAt: now
      })
    }

    // ====== 构建 Tasks ======
    const validCategoryIds = new Set(categories.map((c) => c.id))
    const validListIds = new Set(lists.map((l) => l.id))
    const validAreaIds = new Set(areas.map((a) => a.id))

    const safeTasks = Array.isArray(snap.tasks) ? snap.tasks : []
    // blockedBy 有效性校验：必须引用现有任务 id
    const taskIdSet = new Set()
    for (const t of safeTasks) {
      if (t && t.id) taskIdSet.add(t.id)
    }

    const tasks = safeTasks.map((orig) => {
      const t = orig && typeof orig === 'object' ? { ...orig } : {}
      // categoryId -> list 映射：老数据存 category（字符串 id）
      const categoryValue = t.categoryId ?? t.category ?? null
      // 优先使用显式 listId（若传入且在有效列表中）
      const explicitListId = typeof t.listId === 'string' && validListIds.has(t.listId) ? t.listId : null
      const listId =
        explicitListId ||
        (categoryValue != null && validListIds.has(categoryValue)
          ? categoryValue
          : validListIds.has('other')
            ? 'other'
            : lists[0].id)

      const areaId = validAreaIds.has(t.areaId)
        ? t.areaId
        : validAreaIds.has('default-area')
          ? 'default-area'
          : areas[0].id

      // order -> createdAt 兜底
      const orderNum = typeof t.order === 'number' ? t.order : 0
      const baseCreatedAt =
        typeof t.createdAt === 'number' && t.createdAt > 0
          ? t.createdAt
          : // 兜底：以 createdAtFallback 为基线，按 order 前移毫秒数
            Math.max(1, createdAtFallback - Math.max(0, 1000000 - orderNum * 10))

      // 保证 2.x 兼容字段 category 存在
      const categoryBackport =
        validCategoryIds.has(categoryValue) ? categoryValue : 'other'

      // blockedBy：仅保留合法引用
      const blockedBy = Array.isArray(t.blockedBy)
        ? t.blockedBy.filter((b) => typeof b === 'string' && taskIdSet.has(b) && b !== t.id)
        : []

      return {
        ...t,
        // v3 新字段
        parentId: t.parentId ?? null,
        headingId: t.headingId ?? null,
        blockedBy,
        comments: Array.isArray(t.comments) ? t.comments.slice() : [],
        attachments: Array.isArray(t.attachments) ? t.attachments.slice() : [],
        assignee: typeof t.assignee === 'string' ? t.assignee : '',
        createdBy: typeof t.createdBy === 'string' ? t.createdBy : '',
        nextReminderAt:
          typeof t.nextReminderAt === 'number' && t.nextReminderAt > 0 ? t.nextReminderAt : null,
        snoozeCount: typeof t.snoozeCount === 'number' ? Math.max(0, t.snoozeCount) : 0,
        listId,
        areaId,
        activity: Array.isArray(t.activity)
          ? t.activity.slice().concat([{ type: 'migrate', at: now }])
          : [{ type: 'migrate', at: now }],
        createdAt: baseCreatedAt,
        updatedAt: now,
        // 兼容旧 2.x：category 字段保留，保证旧 UI 不崩
        category: categoryBackport
      }
    })

    settings.tasksVersion = 3

    return {
      ok: true,
      migrated: {
        tasks,
        areas,
        lists,
        categories,
        settings
      }
    }
  } catch (e) {
    return {
      ok: false,
      error: e && e.message ? e.message : String(e)
    }
  }
}

export default {
  migrateV2ToV3,
  rollbackSaveAndPersist,
  saveConflict
}
