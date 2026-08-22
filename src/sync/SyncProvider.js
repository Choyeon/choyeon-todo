// SyncProvider.js
// Task 8-C: Sync 抽象接口 + 两种内置实现（Memory / LocalStorage）。
import { validateDataPackageV3 } from '../utils/schema-v3'
import { hashData } from '../utils/compress'

const STORAGE_KEY_LOCAL = 'todo_sync_local_v3'
const clone = (x) => JSON.parse(JSON.stringify(x))

/**
 * SyncProvider 抽象接口。第三方实现继承并覆写 pull / push / resolveConflicts。
 */
export class SyncProvider {
  constructor(config = {}) {
    this.config = config
    this.type = 'abstract'
  }

  /**
   * @param {any} [tokens] 凭证/游标
   * @returns {Promise<{snapshot:any, delta?:any, hash?:string}>}
   */
  async pull(/* tokens */) {
    throw new Error('[SyncProvider#pull] not implemented')
  }

  /**
   * @param {any} localSnapshot
   * @returns {Promise<{remoteHash:string, conflicts:Array}>}
   */
  async push(/* localSnapshot */) {
    throw new Error('[SyncProvider#push] not implemented')
  }

  /**
   * 手动解决冲突（由调用方在 onConflict 回调中生成 patches 后回传）。
   * @param {Array} manualPatches
   */
  async resolveConflicts(/* manualPatches */) {
    throw new Error('[SyncProvider#resolveConflicts] not implemented')
  }
}

/**
 * MemoryProvider：纯内存，用于单元测试 / 离线场景。
 */
export class MemoryProvider extends SyncProvider {
  constructor(initialSnapshot = null) {
    super({ type: 'memory' })
    this.type = 'memory'
    this.snapshot = initialSnapshot ? clone(initialSnapshot) : this._emptySnapshot()
    this.conflicts = []
  }

  _emptySnapshot() {
    return {
      version: 3,
      tasksVersion: 3,
      generatedAt: new Date().toISOString(),
      tasks: [],
      areas: [],
      lists: [],
      categories: [],
      settings: { tasksVersion: 3 },
      meta: {
        app: 'choyeon-todo',
        appVersion: '3.0.0',
        schemaRevision: 1
      }
    }
  }

  async pull() {
    const snap = clone(this.snapshot)
    return { snapshot: snap, delta: null, hash: hashData(snap) }
  }

  async push(localSnapshot) {
    const incoming = clone(localSnapshot || this._emptySnapshot())
    // 不做 schema 校验：允许未完全填 meta 等字段的包先写入（测试 & 渐进式场景）；
    // 真正的 schema 校验放在 SyncEngine 合并阶段或 importJSON 时执行。
    const conflicts = []
    // hash 冲突检查：remote / local 内容若一致，跳过写
    const currentHash = hashData(this.snapshot)
    const incomingHash = hashData(incoming)
    if (currentHash === incomingHash) {
      return { remoteHash: currentHash, conflicts: [] }
    }
    this.snapshot = incoming
    this.snapshot.generatedAt = new Date().toISOString()
    // 写入后再计算 remoteHash，保证与 pull 出的 snapshot.hash 保持一致
    const finalHash = hashData(this.snapshot)
    return { remoteHash: finalHash, conflicts }
  }

  async resolveConflicts(manualPatches) {
    // MemoryProvider 直接把 manualPatches 合并到 snapshot（非常朴素的 id 级 merge）
    const patches = Array.isArray(manualPatches) ? manualPatches : []
    const apply = (coll, op) => {
      const target = this.snapshot[coll] || []
      const byId = new Map(target.map((x) => [x.id, x]))
      if (op.op === 'delete') {
        this.snapshot[coll] = target.filter((x) => x.id !== op.id)
      } else if (op.op === 'add' || op.op === 'update') {
        const record = clone(op.after || op.before)
        if (!record || !record.id) return
        byId.set(record.id, record)
        this.snapshot[coll] = [...byId.values()]
      }
    }
    for (const p of patches) {
      if (!p || !p.type || !p.op) continue
      if (p.type === 'tasks') apply('tasks', p)
      else if (p.type === 'areas') apply('areas', p)
      else if (p.type === 'lists') apply('lists', p)
      else if (p.type === 'categories') apply('categories', p)
      else if (p.type === 'settings') {
        if (p.after && typeof p.after === 'object') this.snapshot.settings = { ...p.after }
      }
    }
    return { ok: true, applied: patches.length, hash: hashData(this.snapshot) }
  }
}

/**
 * LocalStorageProvider：基于 localStorage 的双向写入，hash 检查冲突。
 * 可用于浏览器端离线“伪远端”或多 tab 同步演练。
 */
export class LocalStorageProvider extends SyncProvider {
  constructor(config = {}) {
    super({ ...config, type: 'localStorage' })
    this.type = 'localStorage'
    this.storageKey = config.storageKey || STORAGE_KEY_LOCAL
    this.conflicts = []
    // 确保初始化时有合法 snapshot
    this._ensureInitialized()
  }

  _hasLS() {
    return typeof localStorage !== 'undefined'
  }

  _emptySnapshot() {
    return {
      version: 3,
      tasksVersion: 3,
      generatedAt: new Date().toISOString(),
      tasks: [],
      areas: [],
      lists: [],
      categories: [],
      settings: { tasksVersion: 3 },
      meta: {
        app: 'choyeon-todo',
        appVersion: '3.0.0',
        schemaRevision: 1
      }
    }
  }

  _ensureInitialized() {
    if (!this._hasLS()) return
    try {
      const raw = localStorage.getItem(this.storageKey)
      if (!raw) {
        localStorage.setItem(this.storageKey, JSON.stringify(this._emptySnapshot()))
        return
      }
      const parsed = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object') {
        localStorage.setItem(this.storageKey, JSON.stringify(this._emptySnapshot()))
      }
    } catch {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(this._emptySnapshot()))
      } catch {
        /* ignore */
      }
    }
  }

  async pull() {
    if (!this._hasLS()) {
      const s = this._emptySnapshot()
      return { snapshot: s, delta: null, hash: hashData(s) }
    }
    try {
      const raw = localStorage.getItem(this.storageKey)
      const snap = raw ? JSON.parse(raw) : this._emptySnapshot()
      return { snapshot: clone(snap), delta: null, hash: hashData(snap) }
    } catch (e) {
      return {
        snapshot: this._emptySnapshot(),
        delta: null,
        hash: hashData(null),
        error: e.message
      }
    }
  }

  async push(localSnapshot) {
    if (!this._hasLS()) {
      return { remoteHash: hashData(localSnapshot), conflicts: [] }
    }
    const incoming = clone(localSnapshot || this._emptySnapshot())
    const conflicts = []
    // 1) 当前 remote
    const rawCurrent = localStorage.getItem(this.storageKey)
    let current
    try {
      current = rawCurrent ? JSON.parse(rawCurrent) : this._emptySnapshot()
    } catch {
      current = this._emptySnapshot()
    }
    const currentHash = hashData(current)
    const incomingHash = hashData(incoming)

    if (currentHash === incomingHash) {
      return { remoteHash: currentHash, conflicts }
    }

    // 2) 期望：调用方传入的 snapshot 应是 pull 时那一份衍生（乐观锁若提供 baseHash 可校验）
    const expectedHash =
      this.config && this.config.lastPushedHash ? this.config.lastPushedHash : null
    if (expectedHash && expectedHash !== currentHash) {
      conflicts.push({
        type: 'optimistic-lock',
        expectedHash,
        remoteHash: currentHash,
        message: 'remote changed since last pull; 3-way merge required'
      })
    }

    // 3) 写入（不做 schema 校验，与 MemoryProvider.push 保持一致）
    try {
      incoming.generatedAt = new Date().toISOString()
      localStorage.setItem(this.storageKey, JSON.stringify(incoming))
    } catch (e) {
      conflicts.push({ type: 'storage', error: e.message })
      return { remoteHash: currentHash, conflicts }
    }
    const finalHash = hashData(incoming)
    if (this.config) this.config.lastPushedHash = finalHash
    return { remoteHash: finalHash, conflicts }
  }

  async resolveConflicts(manualPatches) {
    const patches = Array.isArray(manualPatches) ? manualPatches : []
    const pulled = await this.pull()
    const snap = clone(pulled.snapshot)
    const apply = (coll, op) => {
      const target = snap[coll] || []
      const byId = new Map(target.map((x) => [x.id, x]))
      if (op.op === 'delete') {
        snap[coll] = target.filter((x) => x.id !== op.id)
      } else {
        const record = clone(op.after || op.before)
        if (!record || !record.id) return
        byId.set(record.id, record)
        snap[coll] = [...byId.values()]
      }
    }
    for (const p of patches) {
      if (!p || !p.type || !p.op) continue
      if (p.type === 'tasks') apply('tasks', p)
      else if (p.type === 'areas') apply('areas', p)
      else if (p.type === 'lists') apply('lists', p)
      else if (p.type === 'categories') apply('categories', p)
      else if (p.type === 'settings' && p.after) snap.settings = clone(p.after)
    }
    snap.generatedAt = new Date().toISOString()
    const pushRes = await this.push(snap)
    return { ok: pushRes.conflicts.length === 0, applied: patches.length, ...pushRes }
  }
}

export default {
  SyncProvider,
  MemoryProvider,
  LocalStorageProvider,
  STORAGE_KEY_LOCAL
}
