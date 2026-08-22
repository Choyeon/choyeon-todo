// SyncEngine.js
// Task 8-C: SyncEngine。基于 SyncProvider 完成一次“pull → diff → 应用 patches → push”的同步。
import { genDiff, validateDataPackageV3 } from '../utils/schema-v3'
import { hashData } from '../utils/compress'
import { rollbackSaveAndPersist, saveConflict } from '../utils/migrate-v3'

const clone = (x) => JSON.parse(JSON.stringify(x))

/**
 * 把一组 patches 应用到 pkg（返回新对象，不修改入参）。
 * 冲突项（conflictFields 非空）不会被强制覆盖，而是收集到 returned.conflicts。
 */
const applyPatches = (pkg, patches, { strategy = 'union' } = {}) => {
  const result = clone(pkg || emptyPkg())
  const conflicts = []
  for (const patch of patches) {
    if (!patch || !patch.type || !patch.op) continue
    if (patch.type === 'settings') {
      if (patch.conflictFields && patch.conflictFields.length) {
        conflicts.push(patch)
        if (strategy !== 'union') result.settings = { ...(patch.after || result.settings) }
        continue
      }
      if (patch.op === 'update' && patch.after) result.settings = { ...patch.after }
      continue
    }
    const coll = patch.type // tasks/areas/lists
    if (!Array.isArray(result[coll])) result[coll] = []
    const byId = new Map(result[coll].map((x) => [x.id, x]))
    if (patch.op === 'delete') {
      result[coll] = result[coll].filter((x) => x.id !== patch.id)
      continue
    }
    const record = clone(patch.after || patch.before)
    if (!record || !record.id) continue
    if (patch.op === 'add') {
      if (!byId.has(record.id)) result[coll].push(record)
      continue
    }
    // update
    if (patch.conflictFields && patch.conflictFields.length) {
      conflicts.push(patch)
      if (strategy === 'union') {
        // 保留本地：nothing to do
      } else {
        byId.set(record.id, record)
        result[coll] = [...byId.values()]
      }
    } else {
      byId.set(record.id, record)
      result[coll] = [...byId.values()]
    }
  }
  return { pkg: result, conflicts }
}

const emptyPkg = () => ({
  version: 3,
  tasksVersion: 3,
  generatedAt: new Date().toISOString(),
  tasks: [],
  areas: [],
  lists: [],
  categories: [],
  settings: { tasksVersion: 3 },
  meta: { app: 'choyeon-todo', appVersion: '3.0.0', schemaRevision: 1 }
})

/**
 * SyncEngine 构造。
 * @param {{provider: SyncProvider, taskStore: PiniaStore, settingsStore?: PiniaStore, areaStore?: PiniaStore, listStore?: PiniaStore, filterStore?: PiniaStore}} opts
 */
export class SyncEngine {
  constructor(opts = {}) {
    if (!opts.provider) throw new Error('[SyncEngine] provider is required')
    this.provider = opts.provider
    this.taskStore = opts.taskStore || null
    this.settingsStore = opts.settingsStore || null
    this.areaStore = opts.areaStore || null
    this.listStore = opts.listStore || null
    this.filterStore = opts.filterStore || null
    this._conflictListeners = new Set()
    this._lastSyncAt = null
    this._status = 'idle'
    this.lastError = null
  }

  get status() {
    return this._status
  }

  onConflict(callback) {
    if (typeof callback !== 'function') return () => {}
    this._conflictListeners.add(callback)
    return () => this._conflictListeners.delete(callback)
  }

  _emitConflicts(conflicts, ctx) {
    const payload = { conflicts, context: ctx, at: new Date().toISOString() }
    for (const fn of this._conflictListeners) {
      try {
        fn(payload)
      } catch {
        /* ignore listener error */
      }
    }
  }

  /**
   * 从 stores 构造“当前本地 pkg v3”。
   * 如果 taskStore.exportData 存在就用其（已包含 areas/lists/settings.tasksVersion），
   * 否则退回手动拼装（便于测试 mock）。
   */
  _buildLocalPkg() {
    const ts = this.taskStore
    const s = (() => {
      try {
        if (ts && typeof ts.exportData === 'function') return ts.exportData()
      } catch {
        /* ignore */
      }
      return null
    })()
    if (s) {
      return {
        version: 3,
        tasksVersion: 3,
        generatedAt: new Date().toISOString(),
        tasks: Array.isArray(s.tasks) ? clone(s.tasks) : [],
        areas: Array.isArray(s.areas) ? clone(s.areas) : [],
        lists: Array.isArray(s.lists) ? clone(s.lists) : [],
        categories: Array.isArray(s.categories) ? clone(s.categories) : [],
        settings:
          s.settings && typeof s.settings === 'object'
            ? clone(s.settings)
            : { tasksVersion: 3 },
        meta: {
          app: 'choyeon-todo',
          appVersion: '3.0.0',
          schemaRevision: 1
        }
      }
    }
    const areas = this.areaStore && Array.isArray(this.areaStore.areas) ? clone(this.areaStore.areas) : []
    const lists = this.listStore && Array.isArray(this.listStore.lists) ? clone(this.listStore.lists) : []
    const tasks = ts && Array.isArray(ts.tasks) ? clone(ts.tasks) : []
    const categories = ts && Array.isArray(ts.categories) ? clone(ts.categories) : []
    const settings =
      this.settingsStore && typeof this.settingsStore.tasksVersion === 'number'
        ? { tasksVersion: this.settingsStore.tasksVersion }
        : { tasksVersion: 3 }
    return {
      version: 3,
      tasksVersion: 3,
      generatedAt: new Date().toISOString(),
      tasks,
      areas,
      lists,
      categories,
      settings,
      meta: { app: 'choyeon-todo', appVersion: '3.0.0', schemaRevision: 1 }
    }
  }

  /**
   * 把合并后的 pkg 写回 stores（通过 taskStore.importData / areaStore.areas 等）。
   * 失败时触发 rollback 机制（rollbackSaveAndPersist + saveConflict）。
   */
  _writeBackMergedPkg(mergedPkg, rollbackSnapshot) {
    const problems = []
    try {
      const mergedStr = JSON.stringify(mergedPkg)
      if (this.taskStore && typeof this.taskStore.importData === 'function') {
        const r = this.taskStore.importData(mergedStr)
        if (!r || !r.success) problems.push(`taskStore.importData failed: ${r && r.error}`)
      } else if (this.taskStore && Array.isArray(this.taskStore.tasks)) {
        // mock store 兼容
        this.taskStore.tasks = clone(mergedPkg.tasks)
        if (Array.isArray(this.taskStore.categories))
          this.taskStore.categories = clone(mergedPkg.categories)
      } else {
        problems.push('no taskStore available')
      }
      if (this.areaStore && Array.isArray(this.areaStore.areas)) {
        this.areaStore.areas = clone(mergedPkg.areas)
      }
      if (this.listStore && Array.isArray(this.listStore.lists)) {
        this.listStore.lists = clone(mergedPkg.lists)
      }
      if (this.settingsStore && typeof this.settingsStore.tasksVersion === 'number') {
        const tv =
          mergedPkg.settings && typeof mergedPkg.settings.tasksVersion === 'number'
            ? mergedPkg.settings.tasksVersion
            : 3
        this.settingsStore.tasksVersion = Math.max(this.settingsStore.tasksVersion, tv)
      }
    } catch (e) {
      problems.push(`_writeBackMergedPkg throw: ${e.message}`)
      try {
        rollbackSaveAndPersist('sync-writeback-failed', rollbackSnapshot)
        saveConflict('sync-writeback-failed', { error: e.message, mergedPkg })
      } catch {
        /* ignore */
      }
    }
    return problems
  }

  /**
   * 执行一次同步流程。
   */
  async sync() {
    this._status = 'syncing'
    this.lastError = null
    const startedAt = Date.now()
    let rollbackSnapshot = null
    const elapsed = () => Date.now() - startedAt
    try {
      // 1) pull 远端
      const pullRes = await this.provider.pull()
      const remoteSnapshot = pullRes.snapshot || emptyPkg()
      const remoteHash = pullRes.hash || hashData(remoteSnapshot)

      // 远端 snapshot 自身 schema 校验失败 → 立刻记 schema conflict（即便后续合并能兜底）
      const remoteV = validateDataPackageV3(remoteSnapshot)
      const schemaConflicts = remoteV.ok ? [] : [{
        type: 'schema',
        errors: remoteV.errors,
        warnings: remoteV.warnings,
        phase: 'remote-pull'
      }]

      // 2) 构造本地 pkg
      const localPkg = this._buildLocalPkg()
      rollbackSnapshot = clone(localPkg)
      const localHash = hashData(localPkg)

      // 3) hash 相同则跳过
      if (remoteHash === localHash) {
        this._status = 'idle'
        this._lastSyncAt = startedAt
        return {
          ok: true,
          skipped: true,
          reason: 'hash-match',
          localHash,
          remoteHash,
          conflicts: [],
          ms: elapsed()
        }
      }

      // 4) 并集合并（union + LWW）：
      const unionById = (remoteArr, localArr, collName) => {
        const byId = new Map()
        const conflictsHere = []
        const push = (side, source) => {
          const arr = Array.isArray(source) ? source : []
          for (const item of arr) {
            if (!item || item.id == null) continue
            const existing = byId.get(item.id)
            if (!existing) {
              byId.set(item.id, clone(item))
              continue
            }
            const existingUpdated = typeof existing.updatedAt === 'number' ? existing.updatedAt : 0
            const itemUpdated = typeof item.updatedAt === 'number' ? item.updatedAt : 0
            let winner = side
            let winnerRecord = item
            let loserRecord = existing
            if (side === 'remote') {
              winner = existingUpdated >= itemUpdated ? 'remote' : 'local'
              if (existingUpdated >= itemUpdated) { winnerRecord = existing; loserRecord = item } else { winnerRecord = item; loserRecord = existing }
            } else {
              // local pass
              winner = itemUpdated >= existingUpdated ? 'local' : 'remote'
              if (itemUpdated >= existingUpdated) { winnerRecord = item; loserRecord = existing } else { winnerRecord = existing; loserRecord = item }
            }
            const cFields = []
            const mergedKeys = new Set([
              ...Object.keys(existing || {}),
              ...Object.keys(item || {})
            ])
            for (const k of mergedKeys) {
              if (JSON.stringify(existing[k]) !== JSON.stringify(item[k])) cFields.push(k)
            }
            if (cFields.length) {
              conflictsHere.push({
                type: collName,
                id: item.id,
                op: 'update',
                before: clone(loserRecord),
                after: clone(winnerRecord),
                conflictFields: cFields,
                winner
              })
            }
            byId.set(item.id, clone(winnerRecord))
          }
        }
        push('remote', remoteArr)
        push('local', localArr)
        return { merged: [...byId.values()], conflicts: conflictsHere }
      }

      const t = unionById(remoteSnapshot.tasks, localPkg.tasks, 'tasks')
      const a = unionById(remoteSnapshot.areas, localPkg.areas, 'areas')
      const l = unionById(remoteSnapshot.lists, localPkg.lists, 'lists')
      const conflicts = [...schemaConflicts, ...t.conflicts, ...a.conflicts, ...l.conflicts]

      // settings 合并：LWW 按 updatedAt
      const rset = remoteSnapshot.settings || {}
      const lset = localPkg.settings || {}
      const ru = typeof rset.updatedAt === 'number' ? rset.updatedAt : 0
      const lu = typeof lset.updatedAt === 'number' ? lset.updatedAt : 0
      const mergedSettings = lu >= ru ? { ...rset, ...lset } : { ...lset, ...rset }

      const pickArr = (r, lv) => {
        const a1 = Array.isArray(r) ? r : []
        const a2 = Array.isArray(lv) ? lv : []
        return a1.length ? a1 : a2
      }
      const mergedPkg = {
        version: 3,
        tasksVersion: 3,
        generatedAt: new Date().toISOString(),
        tasks: t.merged,
        areas: a.merged,
        lists: l.merged,
        categories: pickArr(remoteSnapshot.categories, localPkg.categories),
        tags: pickArr(remoteSnapshot.tags, localPkg.tags),
        templates: pickArr(remoteSnapshot.templates, localPkg.templates),
        settings: mergedSettings,
        meta: (localPkg.meta && Object.keys(localPkg.meta).length && localPkg.meta)
          || (remoteSnapshot.meta && Object.keys(remoteSnapshot.meta).length && remoteSnapshot.meta)
          || { app: 'choyeon-todo', appVersion: '3.0.0', schemaRevision: 1 }
      }

      // 合并后 schema 校验（失败则并入 conflicts，不中断同步流程本身）
      const v = validateDataPackageV3(mergedPkg)
      if (!v.ok) {
        conflicts.push({ type: 'schema', errors: v.errors, warnings: v.warnings })
      }

      // 5) 有冲突 → emit；写入 merge-save conflict 备用
      if (conflicts.length) {
        try {
          saveConflict('sync-merged-conflicts', {
            conflicts,
            localPkg,
            remoteSnapshot,
            mergedPkg
          })
        } catch {
          /* ignore */
        }
        this._emitConflicts(conflicts, {
          localHash,
          remoteHash
        })
      }

      // 6) 写回本地
      const writeBackProblems = this._writeBackMergedPkg(mergedPkg, rollbackSnapshot)
      if (writeBackProblems.length) {
        this.lastError = writeBackProblems.join(';')
        this._status = 'error'
        return {
          ok: false,
          phase: 'write-back',
          errors: writeBackProblems,
          conflicts: [...conflicts],
          localHash,
          remoteHash,
          ms: elapsed()
        }
      }

      // 7) push 合并版本到远端
      const pushRes = await this.provider.push(mergedPkg)
      this._status = pushRes.conflicts.length ? 'conflict' : 'idle'
      this._lastSyncAt = Date.now()
      const allConflicts = conflicts.concat(pushRes.conflicts || [])

      // ok=true 表示"同步流程走完"（即便有 conflict 记录，也已按 LWW 合并完成）。
      // push 返回的乐观锁/写入冲突 → 也视为流程完成但 ok=true；
      // 仅在 catch → 未捕获错误 或 writeBackProblems 时 ok=false。
      return {
        ok: true,
        conflicts: allConflicts,
        localHash,
        remoteHash,
        mergedHash: hashData(mergedPkg),
        remotePushedHash: pushRes.remoteHash,
        ms: elapsed()
      }
    } catch (e) {
      this._status = 'error'
      this.lastError = e.message || String(e)
      if (rollbackSnapshot) {
        try {
          rollbackSaveAndPersist('sync-uncaught', rollbackSnapshot)
        } catch {
          /* ignore */
        }
      }
      return {
        ok: false,
        phase: 'uncaught',
        errors: [{ msg: this.lastError }],
        conflicts: [],
        ms: elapsed()
      }
    }
  }
}

export default SyncEngine
