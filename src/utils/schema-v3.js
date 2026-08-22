// schema-v3.js
// Task 8-A: 数据契约 v3 校验 / 归一化 / diff。
import { migrateV2ToV3 } from './migrate-v3'
import { hashData } from './compress'

// ========== 常量（与 stores 语义对齐，但不耦合 store，用硬编码一份保证“纯 JS 即可校验”） ==========
export const UNDELETABLE_CATEGORY_ID = 'other'
export const DEFAULT_AREA_ID = 'default-area'
export const DEFAULT_LIST_ID = 'other'
export const MIN_VERSION = 3
export const MIN_TASKS_VERSION = 3
export const SCHEMA_REVISION = 1

const REQ_TOPLEVEL = [
  'version',
  'tasksVersion',
  'generatedAt',
  'tasks',
  'areas',
  'lists',
  'categories',
  'settings',
  'meta'
]

const REQ_TASK_KEYS = [
  'id',
  'title',
  'listId',
  'areaId',
  'parentId'
]

const META_REQUIRED = ['app', 'appVersion', 'schemaRevision']

// ========== 小工具 ==========
const isStr = (x) => typeof x === 'string'
const isNum = (x) => typeof x === 'number' && Number.isFinite(x)
const isArr = Array.isArray
const isObj = (x) => x !== null && typeof x === 'object' && !isArr(x)
const isIsoDate = (s) => {
  if (!isStr(s)) return false
  // 放宽：允许 Date#toISOString / 简化 YYYY-MM-DDTHH:mm:ss
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/.test(s)
}
const isDateStr = (s) => s == null || s === '' || /^\d{4}-\d{2}-\d{2}$/.test(s)
const isTimeStr = (s) => s == null || s === '' || /^\d{2}:\d{2}(?::\d{2})?$/.test(s)

// ========== 顶层：validateDataPackageV3 ==========
/**
 * @param {any} pkg  待校验对象
 * @returns {{ok:boolean, errors:Array<{path:string,msg:string}>, warnings:Array<string>}}
 */
export const validateDataPackageV3 = (pkg) => {
  const errors = []
  const warnings = []
  const pushErr = (path, msg) => errors.push({ path, msg })

  if (!isObj(pkg)) {
    pushErr('$', 'pkg must be an object')
    return { ok: false, errors, warnings }
  }

  // 顶层字段存在性 + 类型
  for (const k of REQ_TOPLEVEL) {
    if (!(k in pkg)) pushErr(`$.${k}`, `missing required field: ${k}`)
  }
  if (pkg.version !== undefined && !isNum(pkg.version)) {
    pushErr('$.version', 'version must be a number')
  } else if (isNum(pkg.version) && pkg.version < MIN_VERSION) {
    pushErr('$.version', `version must be >= ${MIN_VERSION}`)
  }
  if (pkg.tasksVersion !== undefined && !isNum(pkg.tasksVersion)) {
    pushErr('$.tasksVersion', 'tasksVersion must be a number')
  } else if (isNum(pkg.tasksVersion) && pkg.tasksVersion < MIN_TASKS_VERSION) {
    warnings.push(`tasksVersion < ${MIN_TASKS_VERSION} (will migrate/normalize)`)
  }
  if (pkg.generatedAt !== undefined && !isIsoDate(pkg.generatedAt)) {
    pushErr('$.generatedAt', 'generatedAt must be ISO8601 string')
  }

  if (!isArr(pkg.tasks)) pushErr('$.tasks', 'tasks must be an array')
  if (!isArr(pkg.areas)) pushErr('$.areas', 'areas must be an array')
  if (!isArr(pkg.lists)) pushErr('$.lists', 'lists must be an array')
  if (!isArr(pkg.categories)) pushErr('$.categories', 'categories must be an array')
  if (!isObj(pkg.settings)) pushErr('$.settings', 'settings must be an object')

  if (!isObj(pkg.meta)) {
    pushErr('$.meta', 'meta must be an object')
  } else {
    for (const k of META_REQUIRED) {
      if (!(k in pkg.meta)) pushErr(`$.meta.${k}`, `meta missing ${k}`)
    }
    if (pkg.meta.app !== undefined && !isStr(pkg.meta.app)) {
      pushErr('$.meta.app', 'meta.app must be string')
    }
    if (pkg.meta.appVersion !== undefined && !isStr(pkg.meta.appVersion)) {
      pushErr('$.meta.appVersion', 'meta.appVersion must be string')
    }
    if (pkg.meta.schemaRevision !== undefined && !isNum(pkg.meta.schemaRevision)) {
      pushErr('$.meta.schemaRevision', 'meta.schemaRevision must be number')
    }
    if (pkg.meta.userId !== undefined && !(isStr(pkg.meta.userId) || pkg.meta.userId == null)) {
      pushErr('$.meta.userId', 'meta.userId must be string or null')
    }
  }

  // snapshots? 可选，存在则必须数组
  if ('snapshots' in pkg && pkg.snapshots !== undefined && !isArr(pkg.snapshots)) {
    pushErr('$.snapshots', 'snapshots must be an array if provided')
  }

  // tags? 可选
  if ('tags' in pkg && pkg.tags !== undefined && !isArr(pkg.tags)) {
    pushErr('$.tags', 'tags must be an array if provided')
  }
  // templates? 可选
  if ('templates' in pkg && pkg.templates !== undefined && !isArr(pkg.templates)) {
    pushErr('$.templates', 'templates must be an array if provided')
  }

  // ========== tasks 字段级校验 ==========
  if (isArr(pkg.tasks)) {
    const seenIds = new Set()
    pkg.tasks.forEach((t, idx) => {
      const p = `$.tasks[${idx}]`
      if (!isObj(t)) {
        pushErr(p, 'task must be an object')
        return
      }
      for (const k of REQ_TASK_KEYS) {
        if (!(k in t)) pushErr(`${p}.${k}`, `task missing required field: ${k}`)
      }
      if (!isStr(t.id) || !t.id) pushErr(`${p}.id`, 'task.id must be non-empty string')
      else if (seenIds.has(t.id)) pushErr(`${p}.id`, `duplicate task.id: ${t.id}`)
      else seenIds.add(t.id)
      if (!isStr(t.title)) pushErr(`${p}.title`, 'task.title must be string')
      else if (t.title.length > 500) pushErr(`${p}.title`, 'task.title too long (>500)')
      if (!('completed' in t) || typeof t.completed !== 'boolean')
        pushErr(`${p}.completed`, 'task.completed must be boolean')
      if (!('important' in t) || typeof t.important !== 'boolean')
        pushErr(`${p}.important`, 'task.important must be boolean')
      if (t.priority !== undefined) {
        if (!isNum(t.priority)) pushErr(`${p}.priority`, 'task.priority must be number')
        else if (t.priority < 1 || t.priority > 4)
          warnings.push(`${p}.priority out of [1,4] (${t.priority})`)
      }
      if (!isDateStr(t.date)) pushErr(`${p}.date`, 'task.date must be YYYY-MM-DD or null')
      if (!isTimeStr(t.time)) pushErr(`${p}.time`, 'task.time must be HH:mm or null')
      // listId / areaId / parentId：允许 null 或 string；缺失按 "REQ_TASK_KEYS" 规则由上面 for 循环已报错
      if (t.listId !== null && t.listId !== undefined && !isStr(t.listId))
        pushErr(`${p}.listId`, 'task.listId must be string or null')
      if (t.areaId !== null && t.areaId !== undefined && !isStr(t.areaId))
        pushErr(`${p}.areaId`, 'task.areaId must be string or null')
      if (t.parentId !== null && t.parentId !== undefined && !isStr(t.parentId))
        pushErr(`${p}.parentId`, 'task.parentId must be string or null')
      // blockedBy / comments / attachments / activity / tags：缺省按严格校验要求报错（在缺失时被视为非法）
      if (!isArr(t.blockedBy)) pushErr(`${p}.blockedBy`, 'task.blockedBy must be array')
      else if (t.blockedBy.some((b) => !isStr(b)))
        pushErr(`${p}.blockedBy`, 'task.blockedBy must be string[]')
      if (!isArr(t.comments)) pushErr(`${p}.comments`, 'task.comments must be array')
      if (!isArr(t.attachments)) pushErr(`${p}.attachments`, 'task.attachments must be array')
      if (!isArr(t.activity)) pushErr(`${p}.activity`, 'task.activity must be array')
      else {
        t.activity.forEach((a, ai) => {
          const ap = `${p}.activity[${ai}]`
          if (!isObj(a)) pushErr(ap, 'activity entry must be object')
          else if (!isStr(a.type)) pushErr(`${ap}.type`, 'activity.type must be string')
        })
      }
      if (t.createdAt !== undefined && !isNum(t.createdAt))
        pushErr(`${p}.createdAt`, 'task.createdAt must be number')
      if (t.updatedAt !== undefined && !isNum(t.updatedAt))
        pushErr(`${p}.updatedAt`, 'task.updatedAt must be number')
      if (!isArr(t.tags || [])) pushErr(`${p}.tags`, 'task.tags must be array')
      if (t.assignee !== undefined && !isStr(t.assignee))
        pushErr(`${p}.assignee`, 'task.assignee must be string')
      if (t.createdBy !== undefined && !isStr(t.createdBy))
        pushErr(`${p}.createdBy`, 'task.createdBy must be string')
    })
    // blockedBy / parentId 引用完整性（warning 级别，不阻塞导入）
    for (let i = 0; i < pkg.tasks.length; i++) {
      const t = pkg.tasks[i]
      if (!isObj(t)) continue
      const p = `$.tasks[${i}]`
      if (isArr(t.blockedBy)) {
        for (const b of t.blockedBy) {
          if (b === t.id) {
            pushErr(`${p}.blockedBy`, `task.blockedBy cannot self-reference (${b})`)
          } else if (!seenIds.has(b)) {
            warnings.push(`${p}.blockedBy references missing id: ${b}`)
          }
        }
      }
      if (t.parentId && !seenIds.has(t.parentId)) {
        warnings.push(`${p}.parentId references missing id: ${t.parentId}`)
      }
    }
  }

  // ========== areas 校验 ==========
  if (isArr(pkg.areas)) {
    const seen = new Set()
    pkg.areas.forEach((a, idx) => {
      const p = `$.areas[${idx}]`
      if (!isObj(a)) {
        pushErr(p, 'area must be object')
        return
      }
      if (!isStr(a.id) || !a.id) pushErr(`${p}.id`, 'area.id must be non-empty string')
      else if (seen.has(a.id)) pushErr(`${p}.id`, `duplicate area.id: ${a.id}`)
      else seen.add(a.id)
      if (!isStr(a.name)) pushErr(`${p}.name`, 'area.name must be string')
      if (a.createdAt !== undefined && !isNum(a.createdAt))
        pushErr(`${p}.createdAt`, 'area.createdAt must be number')
      if (a.updatedAt !== undefined && !isNum(a.updatedAt))
        pushErr(`${p}.updatedAt`, 'area.updatedAt must be number')
    })
    // UNDELETABLE DEFAULT_AREA_ID（warning 级 — 导入后会自动补齐，但契约层面 warn）
    if (!seen.has(DEFAULT_AREA_ID)) {
      warnings.push(`areas missing UNDELETABLE DEFAULT_AREA_ID='${DEFAULT_AREA_ID}'`)
    }
  }

  // ========== lists 校验 ==========
  if (isArr(pkg.lists)) {
    const seen = new Set()
    pkg.lists.forEach((l, idx) => {
      const p = `$.lists[${idx}]`
      if (!isObj(l)) {
        pushErr(p, 'list must be object')
        return
      }
      if (!isStr(l.id) || !l.id) pushErr(`${p}.id`, 'list.id must be non-empty string')
      else if (seen.has(l.id)) pushErr(`${p}.id`, `duplicate list.id: ${l.id}`)
      else seen.add(l.id)
      if (!isStr(l.name)) pushErr(`${p}.name`, 'list.name must be string')
      if (l.areaId !== undefined && !(l.areaId == null || isStr(l.areaId)))
        pushErr(`${p}.areaId`, 'list.areaId must be string or null')
    })
    if (!seen.has(DEFAULT_LIST_ID)) {
      warnings.push(`lists missing UNDELETABLE DEFAULT_LIST_ID='${DEFAULT_LIST_ID}'`)
    }
  }

  // ========== categories 校验 ==========
  if (isArr(pkg.categories)) {
    const seen = new Set()
    pkg.categories.forEach((c, idx) => {
      const p = `$.categories[${idx}]`
      if (!isObj(c)) {
        pushErr(p, 'category must be object')
        return
      }
      if (!isStr(c.id) || !c.id) pushErr(`${p}.id`, 'category.id must be non-empty string')
      else if (seen.has(c.id)) pushErr(`${p}.id`, `duplicate category.id: ${c.id}`)
      else seen.add(c.id)
      if (!isStr(c.name)) pushErr(`${p}.name`, 'category.name must be string')
    })
    if (!seen.has(UNDELETABLE_CATEGORY_ID)) {
      warnings.push(
        `categories missing UNDELETABLE category.id='${UNDELETABLE_CATEGORY_ID}'`
      )
    }
  }

  // ========== settings.tasksVersion 校验 ==========
  if (isObj(pkg.settings)) {
    if (
      pkg.settings.tasksVersion !== undefined &&
      !isNum(pkg.settings.tasksVersion)
    ) {
      pushErr('$.settings.tasksVersion', 'settings.tasksVersion must be number')
    }
  }

  return { ok: errors.length === 0, errors, warnings }
}

// ========== normalizeDataPackage ==========
/**
 * 把“任意版本 JSON”统一为 v3 数据包。返回统一结构：
 *   { ok:boolean, normalized?:PkgV3, errors:[], warnings:[], raw:any }
 */
export const normalizeDataPackage = (raw) => {
  const errors = []
  const warnings = []
  const buildResult = (patch = {}) => ({
    ok: errors.length === 0,
    errors,
    warnings,
    raw,
    ...patch
  })

  if (raw == null) {
    errors.push({ path: '$', msg: 'raw is null/undefined' })
    return buildResult()
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      // 递归一次，避免重复逻辑
      return normalizeDataPackage(parsed)
    } catch (e) {
      errors.push({ path: '$', msg: `raw string JSON.parse failed: ${e.message}` })
      return buildResult()
    }
  }
  if (!isObj(raw)) {
    errors.push({ path: '$', msg: 'raw must be object or JSON string' })
    return buildResult()
  }

  const version = isNum(raw.version) ? raw.version : 0
  const tasksVersion = isNum(raw.tasksVersion)
    ? raw.tasksVersion
    : raw.settings && isNum(raw.settings.tasksVersion)
      ? raw.settings.tasksVersion
      : version
  const needMigrate = version < MIN_VERSION || tasksVersion < MIN_TASKS_VERSION

  if (needMigrate) {
    const res = migrateV2ToV3({
      tasks: raw.tasks,
      categories: raw.categories,
      areas: raw.areas,
      lists: raw.lists,
      settings: raw.settings || { tasksVersion }
    })
    if (!res || !res.ok) {
      errors.push({ path: '$.migrate', msg: (res && res.error) || 'migrateV2ToV3 failed' })
      return buildResult()
    }
    warnings.push(
      `normalized legacy package (version=${version}, tasksVersion=${tasksVersion}) -> v3`
    )
    const migrated = res.migrated
    const normalized = {
      version: MIN_VERSION,
      tasksVersion: MIN_TASKS_VERSION,
      generatedAt: new Date().toISOString(),
      tasks: migrated.tasks,
      areas: migrated.areas,
      lists: migrated.lists,
      categories: migrated.categories,
      settings: migrated.settings || { tasksVersion: MIN_TASKS_VERSION },
      tags: isArr(raw.tags) ? raw.tags : [],
      templates: isArr(raw.templates) ? raw.templates : [],
      meta: {
        app: 'choyeon-todo',
        appVersion: '3.0.0',
        schemaRevision: SCHEMA_REVISION,
        normalizedFrom: { version, tasksVersion }
      }
    }
    return buildResult({ normalized })
  }

  // 已是 v3：严格按 raw 结构做 normalize，**不**自动补齐缺失的顶层必填数组/对象（否则会掩盖导入时包非法的问题）。
  // 仅做：meta 补齐 / settings.tasksVersion 规整 / generatedAt 缺省。
  const topLevelArrays = ['tasks', 'areas', 'lists', 'categories']
  const baseTasks = 'tasks' in raw ? (isArr(raw.tasks) ? raw.tasks : raw.tasks) : undefined
  const baseAreas = 'areas' in raw ? (isArr(raw.areas) ? raw.areas : raw.areas) : undefined
  const baseLists = 'lists' in raw ? (isArr(raw.lists) ? raw.lists : raw.lists) : undefined
  const baseCats = 'categories' in raw ? (isArr(raw.categories) ? raw.categories : raw.categories) : undefined
  const baseSettings = isObj(raw.settings)
    ? { ...raw.settings, tasksVersion: raw.settings.tasksVersion || MIN_TASKS_VERSION }
    : undefined
  const baseMeta = isObj(raw.meta)
    ? {
        app: raw.meta.app || 'choyeon-todo',
        appVersion: raw.meta.appVersion || '3.0.0',
        schemaRevision: isNum(raw.meta.schemaRevision)
          ? raw.meta.schemaRevision
          : SCHEMA_REVISION,
        ...(raw.meta.userId != null ? { userId: raw.meta.userId } : {})
      }
    : {
        app: 'choyeon-todo',
        appVersion: '3.0.0',
        schemaRevision: SCHEMA_REVISION
      }
  const normalized = {
    ...raw,
    version: isNum(raw.version) ? raw.version : MIN_VERSION,
    tasksVersion: isNum(raw.tasksVersion) ? raw.tasksVersion : MIN_TASKS_VERSION,
    generatedAt: raw.generatedAt || new Date().toISOString(),
    ...(baseTasks !== undefined ? { tasks: baseTasks } : {}),
    ...(baseAreas !== undefined ? { areas: baseAreas } : {}),
    ...(baseLists !== undefined ? { lists: baseLists } : {}),
    ...(baseCats !== undefined ? { categories: baseCats } : {}),
    ...(baseSettings !== undefined ? { settings: baseSettings } : {}),
    tags: isArr(raw.tags) ? raw.tags : 'tags' in raw ? raw.tags : [],
    templates: isArr(raw.templates) ? raw.templates : 'templates' in raw ? raw.templates : [],
    ...(raw.snapshots !== undefined ? { snapshots: raw.snapshots } : undefined),
    meta: baseMeta
  }

  // 注意：此处**不**调用 validateDataPackageV3。
  // 原因：
  //   - 对于缺 tasks / areas / lists / categories 的非法 v3 包，要让调用方（如 useDataIO.importJSON）
  //     在 normalize 通过后再到显式的 validate 阶段报错，报告 $.tasks 等路径。
  //   - SyncProvider.push 等场景允许包不完整，只在 merge 后才校验。
  return buildResult({ normalized })
}

// ========== genDiff：按 id diff ==========
const STRATEGY_UNION = 'union'
const STRATEGY_LOCAL_WINS = 'local'
const STRATEGY_REMOTE_WINS = 'remote'
const STRATEGY_LWW = 'lww' // last-write-wins（按 updatedAt）

const deepEqual = (a, b) => {
  try {
    return JSON.stringify(a) === JSON.stringify(b)
  } catch {
    return false
  }
}

const mapById = (arr) => {
  const m = new Map()
  if (isArr(arr)) arr.forEach((x) => x && x.id && m.set(x.id, x))
  return m
}

/**
 * 比较 before / after 两份 v3 包，生成 patches（仅 tasks/areas/lists/settings 四类）。
 * patch entry = { type:'tasks'|'areas'|'lists'|'settings', id?, op:'add'|'update'|'delete', before?, after?, conflictFields? }
 *
 * strategy:
 *   'union'   ：并集（仅报告 diff，不选边）
 *   'local'   ：before 覆盖 after（返回结果偏向 before）
 *   'remote'  ：after 覆盖 before
 *   'lww'     ：按 updatedAt 新者胜；对于 settings 整体，若两边都有 updatedAt 再比
 */
export const genDiff = (beforePkg, afterPkg, { strategy = STRATEGY_UNION } = {}) => {
  const patches = []
  const diffCollection = (type, before, after) => {
    const bm = mapById(before)
    const am = mapById(after)
    const ids = new Set([...bm.keys(), ...am.keys()])
    for (const id of ids) {
      const b = bm.get(id)
      const a = am.get(id)
      if (b && !a) {
        patches.push({ type, id, op: 'delete', before: b, after: null })
      } else if (!b && a) {
        patches.push({ type, id, op: 'add', before: null, after: a })
      } else {
        if (!deepEqual(b, a)) {
          const conflictFields = []
          for (const k of new Set([...Object.keys(b || {}), ...Object.keys(a || {})])) {
            if (!deepEqual(b[k], a[k])) conflictFields.push(k)
          }
          let op = 'update'
          // 对于 union 之外的 strategy，把 winner 写入 after 字段占位，保持结构一致
          let winner = a
          if (strategy === STRATEGY_LOCAL_WINS) winner = b
          else if (strategy === STRATEGY_REMOTE_WINS) winner = a
          else if (strategy === STRATEGY_LWW) {
            const bt = b && typeof b.updatedAt === 'number' ? b.updatedAt : 0
            const at = a && typeof a.updatedAt === 'number' ? a.updatedAt : 0
            winner = bt >= at ? b : a
          }
          patches.push({
            type,
            id,
            op,
            before: b,
            after: winner,
            conflictFields
          })
        }
      }
    }
  }

  const b = beforePkg || {}
  const a = afterPkg || {}
  diffCollection('tasks', b.tasks, a.tasks)
  diffCollection('areas', b.areas, a.areas)
  diffCollection('lists', b.lists, a.lists)

  // settings 特殊：当作单个条目（id='settings'）
  const bs = b.settings || {}
  const as = a.settings || {}
  if (!deepEqual(bs, as)) {
    const conflictFields = []
    for (const k of new Set([...Object.keys(bs), ...Object.keys(as)])) {
      if (!deepEqual(bs[k], as[k])) conflictFields.push(k)
    }
    let winner = as
    if (strategy === STRATEGY_LOCAL_WINS) winner = bs
    else if (strategy === STRATEGY_REMOTE_WINS) winner = as
    else if (strategy === STRATEGY_LWW) {
      const bt = typeof bs.updatedAt === 'number' ? bs.updatedAt : 0
      const at = typeof as.updatedAt === 'number' ? as.updatedAt : 0
      winner = bt >= at ? bs : as
    }
    patches.push({
      type: 'settings',
      id: 'settings',
      op: 'update',
      before: bs,
      after: winner,
      conflictFields
    })
  }

  return {
    strategy,
    patches,
    hash: {
      before: hashData(beforePkg),
      after: hashData(afterPkg)
    },
    stats: {
      adds: patches.filter((p) => p.op === 'add').length,
      updates: patches.filter((p) => p.op === 'update').length,
      deletes: patches.filter((p) => p.op === 'delete').length
    }
  }
}

export default {
  validateDataPackageV3,
  normalizeDataPackage,
  genDiff,
  MIN_VERSION,
  MIN_TASKS_VERSION,
  SCHEMA_REVISION,
  DEFAULT_AREA_ID,
  DEFAULT_LIST_ID,
  UNDELETABLE_CATEGORY_ID
}
