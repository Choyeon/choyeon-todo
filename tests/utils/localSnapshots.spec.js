import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  createSnapshot,
  listSnapshots,
  pruneSnapshots,
  restoreSnapshot,
  SNAP_KEY_PREFIX
} from '@/utils/localSnapshots'
import { hashData, decompressFromBase64 } from '@/utils/compress'
import { validateDataPackageV3 } from '@/utils/schema-v3'

const makeFakeStores = (tasks = [], extras = {}) => {
  return {
    taskStore: {
      tasks,
      categories: [{ id: 'other', name: '其他', color: '#9B8EBB', icon: 'more-horizontal' }],
      tags: [],
      templates: [],
      exportData: () => ({
        tasks,
        categories: [{ id: 'other', name: '其他', color: '#9B8EBB', icon: 'more-horizontal' }],
        areas: [
          { id: 'default-area', name: '未分组', order: 0, createdAt: 1, updatedAt: 2, meta: {} }
        ],
        lists: [
          { id: 'other', name: '其他', areaId: 'default-area', color: '#9B8EBB', icon: 'more-horizontal', order: 0, createdAt: 1, updatedAt: 2 }
        ],
        settings: { tasksVersion: 3 }
      })
    },
    ...extras
  }
}

describe('localSnapshots / createSnapshot + listSnapshots', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  it('createSnapshot 返回 {ok, key, hash}，key 以 todo_snap_v3: 开头', () => {
    const stores = makeFakeStores([{ id: 't1', title: 'hi' }])
    const r = createSnapshot({ label: 'backup-1', stores })
    expect(r.ok).toBe(true)
    expect(r.key.startsWith(SNAP_KEY_PREFIX)).toBe(true)
    expect(typeof r.hash).toBe('string')
    expect(r.hash).toMatch(/^[0-9a-f]{8}$/)
    // key 内包含 label + hash
    expect(r.key).toContain('backup-1')
    expect(r.key.endsWith(r.hash)).toBe(true)
  })

  it('localStorage 内键格式合法，仅前缀 SNAP_KEY_PREFIX', () => {
    const stores = makeFakeStores([])
    createSnapshot({ label: 'a', stores })
    const keys = Object.keys(localStorage)
    expect(keys.every((k) => k.startsWith(SNAP_KEY_PREFIX))).toBe(true)
  })

  it('createSnapshot 内容是 gzip 前缀，可解为 v3 pkg 通过 validate', () => {
    const stores = makeFakeStores([{ id: 't_xx', title: 'xyz', date: '2026-01-01' }])
    const r = createSnapshot({ label: 'ok', stores })
    const raw = localStorage.getItem(r.key)
    expect(raw.startsWith('gz:')).toBe(true)
    const pkg = decompressFromBase64(raw)
    const v = validateDataPackageV3(pkg)
    expect(v.ok).toBe(true)
    expect(pkg.tasks[0].id).toBe('t_xx')
  })

  it('listSnapshots 返回按 createdAt 倒序，字段完整', () => {
    const a = makeFakeStores([{ id: 'a' }])
    const b = makeFakeStores([{ id: 'b' }])
    const r1 = createSnapshot({ label: 'first', stores: a })
    // 稍等 1ms（jsdom 同步 Date.now 通常可区分，但保证稳妥用 Date.now 推进）
    const before = Date.now()
    while (Date.now() - before < 2) { /* spin */ }
    const r2 = createSnapshot({ label: 'second', stores: b })
    const list = listSnapshots()
    expect(Array.isArray(list)).toBe(true)
    expect(list.length).toBe(2)
    expect(list[0].label).toBe('second')
    expect(list[1].label).toBe('first')
    expect(list[0].key.startsWith(SNAP_KEY_PREFIX)).toBe(true)
    expect(list[0].hash).toBe(r2.hash)
    expect(list[1].hash).toBe(r1.hash)
    expect(typeof list[0].size).toBe('number')
    expect(list[0].size).toBeGreaterThan(0)
  })

  it('多次 createSnapshot 可正确列出 N 条', () => {
    for (let i = 0; i < 10; i++) {
      createSnapshot({ label: `s${i}`, stores: makeFakeStores([{ id: `t${i}` }]) })
    }
    expect(listSnapshots().length).toBe(10)
  })

  it('label 含非法字符替换为下划线并截断', () => {
    const r = createSnapshot({
      label: 'foo / bar:\\ baz  very long xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      stores: makeFakeStores([{ id: 'x' }])
    })
    expect(r.key.includes(' ')).toBe(false)
    expect(r.key.includes('/')).toBe(false)
  })
})

describe('localSnapshots / pruneSnapshots', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  it('按 max=3 裁剪超出数量条目', () => {
    for (let i = 0; i < 10; i++) {
      createSnapshot({ label: `s${i}`, stores: makeFakeStores([{ id: `t${i}` }]) })
      const before = Date.now()
      while (Date.now() - before < 2) {}
    }
    const r = pruneSnapshots({ max: 3, maxDays: 10000 })
    expect(r.ok).toBe(true)
    expect(r.pruned).toBe(7)
    expect(r.remaining).toBe(3)
    // 剩余为最近 3 条：s9 s8 s7
    const list = listSnapshots()
    const labels = list.map((x) => x.label)
    expect(labels).toEqual(['s9', 's8', 's7'])
  })

  it('按 maxDays 裁剪超出天数条目', () => {
    // 手动写入旧 key（31 天前）
    const longAgo = new Date(Date.now() - 31 * 24 * 3600 * 1000)
    const pad = (n) => String(n).padStart(2, '0')
    const y = longAgo.getFullYear()
    const m = pad(longAgo.getMonth() + 1)
    const d = pad(longAgo.getDate())
    const hh = pad(longAgo.getHours())
    const mm = pad(longAgo.getMinutes())
    const ss = pad(longAgo.getSeconds())
    const iso = `${y}${m}${d}-${hh}${mm}${ss}`
    const oldKey = `${SNAP_KEY_PREFIX}${iso}_old_aaaaaaaa`
    localStorage.setItem(oldKey, 'gz:placeholder')
    // 一个新的
    createSnapshot({ label: 'new', stores: makeFakeStores([{ id: 'new' }]) })
    const r = pruneSnapshots({ max: 100, maxDays: 30 })
    expect(r.ok).toBe(true)
    expect(r.pruned).toBeGreaterThanOrEqual(1)
    expect(localStorage.getItem(oldKey)).toBeNull()
  })

  it('默认 pruneSnapshots() max=100, maxDays=30：< N 条不删', () => {
    for (let i = 0; i < 10; i++) {
      createSnapshot({ label: `n${i}`, stores: makeFakeStores([{ id: `t${i}` }]) })
    }
    const r = pruneSnapshots()
    expect(r.ok).toBe(true)
    expect(r.pruned).toBe(0)
    expect(r.remaining).toBe(10)
  })

  it('pruneSnapshots 在 localStorage 不可用时返回 ok=false', () => {
    const origLS = globalThis.localStorage
    // 删除全局 localStorage：Node 中 localSnapshots.hasLS 会判断
    delete globalThis.localStorage
    const r = pruneSnapshots()
    globalThis.localStorage = origLS
    expect(r.ok).toBe(false)
  })
})

describe('localSnapshots / restoreSnapshot', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  it('key 不存在 → ok=false', () => {
    const r = restoreSnapshot('not-exist')
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/not found/)
  })

  it('非法压缩内容 → ok=false, phase=decompress', () => {
    localStorage.setItem(`${SNAP_KEY_PREFIX}20260101-000000_bad_aaaaaaaa`, 'gz:not-valid')
    const r = restoreSnapshot(`${SNAP_KEY_PREFIX}20260101-000000_bad_aaaaaaaa`)
    expect(r.ok).toBe(false)
    expect(r.phase).toBe('decompress')
  })

  it('成功 restore → ok=true', () => {
    const stores = makeFakeStores([
      {
        id: 't_save',
        title: 'saved task',
        category: 'other',
        categoryId: 'other',
        date: '2026-01-01',
        time: '09:00',
        completed: false,
        important: false,
        priority: 4,
        reminder: false,
        notes: 'restore note',
        tags: [],
        subTasks: [],
        repeat: null,
        order: 0,
        pomodoroSessions: 0,
        totalFocusTime: 0,
        createdAt: 1,
        updatedAt: 2,
        completedAt: null,
        listId: 'other',
        areaId: 'default-area',
        parentId: null,
        blockedBy: [],
        comments: [],
        attachments: [],
        assignee: '',
        createdBy: '',
        nextReminderAt: null,
        snoozeCount: 0,
        activity: [{ type: 'add', at: 1 }]
      }
    ])
    let imported = null
    stores.taskStore.importData = (str) => {
      imported = JSON.parse(str)
      return { success: true, imported: imported.tasks.length }
    }
    const snap = createSnapshot({ label: 's', stores })
    const r = restoreSnapshot(snap.key, { stores })
    expect(r.ok).toBe(true)
    expect(r.imported).toBe(1)
    expect(imported.tasks[0].id).toBe('t_save')
  })

  it('restore 成功会触发 rollback 存档（localStorage 中出现 __rollback_ 键）', () => {
    const stores = makeFakeStores([
      {
        id: 't_rollback',
        title: 'x',
        category: 'other',
        categoryId: 'other',
        date: '2026-01-01',
        time: null,
        completed: false,
        important: false,
        priority: 4,
        reminder: false,
        notes: '',
        tags: [],
        subTasks: [],
        repeat: null,
        order: 0,
        pomodoroSessions: 0,
        totalFocusTime: 0,
        createdAt: 1,
        updatedAt: 2,
        completedAt: null,
        listId: 'other',
        areaId: 'default-area',
        parentId: null,
        blockedBy: [],
        comments: [],
        attachments: [],
        assignee: '',
        createdBy: '',
        nextReminderAt: null,
        snoozeCount: 0,
        activity: [{ type: 'add', at: 1 }]
      }
    ])
    stores.taskStore.importData = () => ({ success: true, imported: 1 })
    const snap = createSnapshot({ label: 's', stores })
    restoreSnapshot(snap.key, { stores })
    const keys = Object.keys(localStorage)
    expect(keys.some((k) => k.startsWith('__rollback_snapshot-restore-pre_'))).toBe(true)
  })

  it('taskStore.importData 失败 → ok=false, phase=importData', () => {
    const stores = makeFakeStores([
      {
        id: 't_bad',
        title: 'x',
        category: 'other',
        categoryId: 'other',
        date: '2026-01-01',
        time: null,
        completed: false,
        important: false,
        priority: 4,
        reminder: false,
        notes: '',
        tags: [],
        subTasks: [],
        repeat: null,
        order: 0,
        pomodoroSessions: 0,
        totalFocusTime: 0,
        createdAt: 1,
        updatedAt: 2,
        completedAt: null,
        listId: 'other',
        areaId: 'default-area',
        parentId: null,
        blockedBy: [],
        comments: [],
        attachments: [],
        assignee: '',
        createdBy: '',
        nextReminderAt: null,
        snoozeCount: 0,
        activity: [{ type: 'add', at: 1 }]
      }
    ])
    stores.taskStore.importData = () => ({ success: false, error: 'db down' })
    const snap = createSnapshot({ label: 's', stores })
    const r = restoreSnapshot(snap.key, { stores })
    expect(r.ok).toBe(false)
    expect(r.phase).toBe('importData')
  })

  it('没有 taskStore.importData 可用 → skippedImport=true（仅返回 restored pkg）', () => {
    const stores = {}
    const snap = createSnapshot({
      label: 's',
      stores: makeFakeStores([{ id: 'x', title: 'minimal' }])
    })
    const r = restoreSnapshot(snap.key, { stores })
    expect(r.ok).toBe(true)
    expect(r.skippedImport).toBe(true)
    expect(r.restored.tasks.length).toBeGreaterThanOrEqual(1)
  })
})

describe('localSnapshots / 端到端 create → list → prune → restore', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  it('完整链路：内容 hash 一致且可恢复', () => {
    const tasks = Array.from({ length: 15 }).map((_, i) => ({
      id: `loop_${i}`,
      title: `task ${i}`,
      category: 'other',
      categoryId: 'other',
      date: '2026-01-01',
      time: '09:00',
      completed: false,
      important: false,
      priority: 4,
      reminder: false,
      notes: '',
      tags: [],
      subTasks: [],
      repeat: null,
      order: i,
      pomodoroSessions: 0,
      totalFocusTime: 0,
      createdAt: i,
      updatedAt: i + 1,
      completedAt: null,
      listId: 'other',
      areaId: 'default-area',
      parentId: null,
      blockedBy: [],
      comments: [],
      attachments: [],
      assignee: '',
      createdBy: '',
      nextReminderAt: null,
      snoozeCount: 0,
      activity: [{ type: 'add', at: i }]
    }))
    const stores = makeFakeStores(tasks)
    let importedPkg = null
    stores.taskStore.importData = (s) => {
      importedPkg = JSON.parse(s)
      return { success: true, imported: importedPkg.tasks.length }
    }
    const originalHash = hashData(stores.taskStore.exportData().tasks)
    const { key } = createSnapshot({ label: 'roundtrip', stores })
    // 先裁剪（不删除当前这条）
    const pr = pruneSnapshots({ max: 5 })
    expect(pr.remaining).toBe(1)
    // 恢复
    const r = restoreSnapshot(key, { stores })
    expect(r.ok).toBe(true)
    expect(importedPkg.tasks.length).toBe(15)
    // 对比 hash：exportData 还原的 task 数组（除 snapshots 外不影响结构）与原始一致
    expect(hashData(importedPkg.tasks)).toBe(originalHash)
  })

  it('自动裁剪：超过默认 100 条仍会在 createSnapshot 末尾自动 prune', () => {
    for (let i = 0; i < 150; i++) {
      createSnapshot({ label: `a${i}`, stores: makeFakeStores([{ id: `t${i}` }]) })
    }
    // createSnapshot 内部默认 pruneSnapshots()（max=100）
    const remaining = listSnapshots().length
    expect(remaining).toBeLessThanOrEqual(100)
  })
})
