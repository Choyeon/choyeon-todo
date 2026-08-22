import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryProvider, LocalStorageProvider, SyncProvider } from '@/sync/SyncProvider'
import { SyncEngine } from '@/sync/SyncEngine'
import { createPinia, setActivePinia } from 'pinia'
import { useTaskStore } from '@/stores/taskStore'
import { useAreaStore } from '@/stores/areaStore'
import { useListStore } from '@/stores/listStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { hashData } from '@/utils/compress'

const makeTask = (id, title, extra = {}) => ({
  id,
  title,
  category: 'work',
  categoryId: 'work',
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
  order: 0,
  pomodoroSessions: 0,
  totalFocusTime: 0,
  createdAt: 1,
  updatedAt: 2,
  completedAt: null,
  listId: 'work',
  areaId: 'default-area',
  parentId: null,
  headingId: null,
  blockedBy: [],
  comments: [],
  attachments: [],
  assignee: '',
  createdBy: '',
  nextReminderAt: null,
  snoozeCount: 0,
  activity: [{ type: 'add', at: 1 }],
  ...extra
})

const makePkgV3 = ({ tasks = [], areas, lists, categories, settings } = {}) => ({
  version: 3,
  tasksVersion: 3,
  generatedAt: new Date().toISOString(),
  tasks,
  areas: areas || [
    { id: 'default-area', name: '未分组', color: '#9B8EBB', icon: 'layers', order: 0, createdAt: 1, updatedAt: 2, meta: {} }
  ],
  lists: lists || [
    { id: 'work', name: '工作', areaId: 'default-area', color: '#4A90D9', icon: 'briefcase', order: 0, createdAt: 1, updatedAt: 2 },
    { id: 'other', name: '其他', areaId: 'default-area', color: '#9B8EBB', icon: 'more-horizontal', order: 1, createdAt: 1, updatedAt: 2 }
  ],
  categories: categories || [
    { id: 'work', name: '工作', color: '#4A90D9', icon: 'briefcase' },
    { id: 'other', name: '其他', color: '#9B8EBB', icon: 'more-horizontal' }
  ],
  settings: settings || { tasksVersion: 3 }
})

describe('SyncProvider / base & implementations', () => {
  it('SyncProvider 抽象方法直接 throw', async () => {
    const p = new SyncProvider()
    await expect(p.pull()).rejects.toThrow(/not implemented/)
    await expect(p.push({})).rejects.toThrow(/not implemented/)
    await expect(p.resolveConflicts([])).rejects.toThrow(/not implemented/)
  })

  it('MemoryProvider pull → 返回 empty pkg + hash', async () => {
    const p = new MemoryProvider()
    const r = await p.pull()
    expect(r.snapshot.version).toBe(3)
    expect(Array.isArray(r.snapshot.tasks)).toBe(true)
    expect(typeof r.hash).toBe('string')
    expect(r.hash).toBe(hashData(r.snapshot))
  })

  it('MemoryProvider push：写入后 pull 得到相同数据', async () => {
    const p = new MemoryProvider()
    const data = makePkgV3({ tasks: [makeTask('m1', 'hello')] })
    const r = await p.push(data)
    expect(Array.isArray(r.conflicts)).toBe(true)
    expect(r.remoteHash).toBe(hashData({ ...data, generatedAt: expect.any(String) }))
    const pulled = await p.pull()
    expect(pulled.snapshot.tasks[0].id).toBe('m1')
    expect(pulled.snapshot.tasks[0].title).toBe('hello')
  })

  it('MemoryProvider push 相同 hash → 无冲突且不覆盖 generatedAt', async () => {
    const p = new MemoryProvider()
    const data = makePkgV3({ tasks: [makeTask('m1', 'stable')] })
    const first = await p.push(data)
    const sameData = JSON.parse(JSON.stringify(data))
    sameData.generatedAt = p.snapshot.generatedAt // 保证 hash 一致
    const second = await p.push(sameData)
    expect(second.remoteHash).toBe(first.remoteHash)
    expect(second.conflicts).toEqual([])
  })

  it('MemoryProvider.resolveConflicts patches：add/delete/update settings 写入生效', async () => {
    const p = new MemoryProvider()
    const patches = [
      {
        type: 'tasks',
        id: 't_new',
        op: 'add',
        after: makeTask('t_new', 'patched in')
      },
      {
        type: 'areas',
        id: 'a2',
        op: 'add',
        after: { id: 'a2', name: 'Area 2', order: 1, createdAt: 1, updatedAt: 2, meta: {} }
      },
      {
        type: 'settings',
        id: 'settings',
        op: 'update',
        after: { tasksVersion: 3, extra: 1 }
      }
    ]
    const r = await p.resolveConflicts(patches)
    expect(r.ok).toBe(true)
    expect(r.applied).toBe(3)
    const { snapshot } = await p.pull()
    expect(snapshot.tasks.some((t) => t.id === 't_new')).toBe(true)
    expect(snapshot.areas.some((a) => a.id === 'a2')).toBe(true)
    expect(snapshot.settings.extra).toBe(1)
  })

  it('LocalStorageProvider: pull / push / pull → 数据持久化到 todo_sync_local_v3', () => {
    localStorage.clear()
    const p = new LocalStorageProvider()
    const data = makePkgV3({ tasks: [makeTask('ls_1', 'local storage 1')] })
    // jsdom 环境下，async/await 同步立即 resolve 即可
    return p.push(data).then(async (r) => {
      expect(r.conflicts.length).toBe(0)
      const pulled = await p.pull()
      expect(pulled.snapshot.tasks[0].id).toBe('ls_1')
      expect(localStorage.getItem('todo_sync_local_v3')).toBeTruthy()
    })
  })

  it('LocalStorageProvider.push 乐观锁：lastPushedHash 与当前不一致时给出 conflict', () => {
    localStorage.clear()
    const p1 = new LocalStorageProvider({ lastPushedHash: 'whatever-fake-hash' })
    const data = makePkgV3({ tasks: [makeTask('a', 'A')] })
    return p1.push(data).then(async (r) => {
      // p1 会在 push 成功后更新 config.lastPushedHash
      // 新建 provider 2 不共享 lastPushedHash；写入后，p1 再次 push 应冲突
      const p2 = new LocalStorageProvider({})
      await p2.push(makePkgV3({ tasks: [makeTask('b', 'B')] }))
      const p1second = await p1.push(makePkgV3({ tasks: [makeTask('a2', 'A2')] }))
      expect(p1second.conflicts.some((c) => c.type === 'optimistic-lock')).toBe(true)
    })
  })

  it('LocalStorageProvider.resolveConflicts → push 合并版本', () => {
    localStorage.clear()
    const p = new LocalStorageProvider()
    return p.push(makePkgV3({ tasks: [makeTask('original', 'o')] })).then(async () => {
      const patches = [
        {
          type: 'tasks',
          id: 'new_one',
          op: 'add',
          after: makeTask('new_one', 'new')
        }
      ]
      const r = await p.resolveConflicts(patches)
      expect(typeof r.remoteHash).toBe('string')
      const { snapshot } = await p.pull()
      expect(snapshot.tasks.some((t) => t.id === 'new_one')).toBe(true)
    })
  })
})

describe('SyncEngine / 基础流程', () => {
  it('缺 provider 构造 throw', () => {
    expect(() => new SyncEngine({})).toThrow(/provider is required/)
  })

  it('初始 status = idle；onConflict 注册/取消注册', () => {
    const engine = new SyncEngine({ provider: new MemoryProvider() })
    expect(engine.status).toBe('idle')
    let hit = 0
    const off = engine.onConflict(() => hit++)
    expect(typeof off).toBe('function')
    off()
  })

  it('空 stores + MemoryProvider → sync 成功 skip（hash match）', async () => {
    const provider = new MemoryProvider()
    const taskStore = {
      exportData: () => ({
        tasks: [],
        categories: [{ id: 'other', name: '其他', color: '#9B8EBB', icon: 'more-horizontal' }],
        areas: [{
          id: 'default-area', name: '未分组', order: 0, createdAt: 1, updatedAt: 2, meta: {}
        }],
        lists: [{
          id: 'other', name: '其他', areaId: 'default-area', color: '#9B8EBB', icon: 'more-horizontal',
          order: 0, createdAt: 1, updatedAt: 2
        }],
        settings: { tasksVersion: 3 }
      })
    }
    const localPkg = {
      version: 3,
      tasksVersion: 3,
      generatedAt: new Date().toISOString(),
      tasks: [],
      areas: taskStore.exportData().areas,
      lists: taskStore.exportData().lists,
      categories: taskStore.exportData().categories,
      settings: { tasksVersion: 3 },
      meta: { app: 'choyeon-todo', appVersion: '3.0.0', schemaRevision: 1 }
    }
    // 让 remote snapshot 与 local 内容完全相同（hash match）
    provider.snapshot = JSON.parse(JSON.stringify(localPkg))
    const engine = new SyncEngine({ provider, taskStore })
    const r = await engine.sync()
    expect(r.ok).toBe(true)
    expect(r.skipped).toBe(true)
    expect(r.reason).toBe('hash-match')
  })

  it('local ≠ remote：生成冲突并在 push 前合并（lww）', async () => {
    const t1 = makeTask('t_local', 'local copy', { updatedAt: 1 })
    const t1Remote = makeTask('t_local', 'remote copy', { updatedAt: 999 })
    const provider = new MemoryProvider(
      makePkgV3({
        tasks: [
          t1Remote,
          makeTask('t_remote_only', 'from remote')
        ]
      })
    )
    const taskStore = {
      tasks: [t1],
      categories: [
        { id: 'work', name: '工作', color: '#fff', icon: 'x' },
        { id: 'other', name: '其他', color: '#9B8EBB', icon: 'x' }
      ],
      exportData: () => ({
        tasks: taskStore.tasks,
        categories: taskStore.categories,
        areas: [{
          id: 'default-area', name: '未分组', order: 0, createdAt: 1, updatedAt: 2, meta: {}
        }],
        lists: [{
          id: 'work', name: '工作', areaId: 'default-area', order: 0, color: '#fff', icon: 'x', createdAt: 1, updatedAt: 2
        }, {
          id: 'other', name: '其他', areaId: 'default-area', order: 1, color: '#9B8EBB', icon: 'x', createdAt: 1, updatedAt: 2
        }],
        settings: { tasksVersion: 3 }
      }),
      importData: (str) => {
        try {
          const parsed = JSON.parse(str)
          taskStore.tasks = parsed.tasks
          return { success: true, imported: parsed.tasks.length }
        } catch (e) {
          return { success: false, error: e.message }
        }
      }
    }
    const areaStore = {
      areas: [{ id: 'default-area', name: '未分组', order: 0, createdAt: 1, updatedAt: 2, meta: {} }]
    }
    const listStore = { lists: [{ id: 'work', name: '工作', areaId: 'default-area', order: 0, color: '#fff', icon: 'x', createdAt: 1, updatedAt: 2 }] }
    const settingsStore = { tasksVersion: 3 }
    const engine = new SyncEngine({ provider, taskStore, areaStore, listStore, settingsStore })
    let conflictHit = null
    engine.onConflict((c) => { conflictHit = c })
    const r = await engine.sync()
    expect(r.ok).toBe(true)
    // remote 更新的 t_local.title 被 lww 合入本地
    expect(taskStore.tasks.find((t) => t.id === 't_local').title).toBe('remote copy')
    // remote-only 被拉到本地
    expect(taskStore.tasks.some((t) => t.id === 't_remote_only')).toBe(true)
    // provider 的远端 snapshot 也包含最终 merged 结果
    const pullAfter = await provider.pull()
    expect(pullAfter.snapshot.tasks.some((t) => t.id === 't_remote_only')).toBe(true)
  })

  it('taskStore.importData 失败 → 返回 ok=false phase=write-back', async () => {
    const provider = new MemoryProvider(
      makePkgV3({ tasks: [makeTask('diff', 'diff')] })
    )
    const taskStore = {
      tasks: [],
      categories: [],
      exportData: () => ({
        tasks: [],
        categories: [],
        areas: [{
          id: 'default-area', name: '未分组', order: 0, createdAt: 1, updatedAt: 2, meta: {}
        }],
        lists: [{
          id: 'other', name: '其他', areaId: 'default-area', color: '#9B8EBB', icon: 'x', order: 0, createdAt: 1, updatedAt: 2
        }],
        settings: { tasksVersion: 3 }
      }),
      importData: () => ({ success: false, error: 'boom' })
    }
    const engine = new SyncEngine({ provider, taskStore })
    const r = await engine.sync()
    expect(r.ok).toBe(false)
    expect(r.phase).toBe('write-back')
  })

  it('同步后 status 为 idle / conflict 之一', async () => {
    const provider = new MemoryProvider(makePkgV3())
    const taskStore = {
      tasks: [],
      categories: [],
      exportData: () => ({
        tasks: [],
        categories: [],
        areas: [{
          id: 'default-area', name: '未分组', order: 0, createdAt: 1, updatedAt: 2, meta: {}
        }],
        lists: [{
          id: 'other', name: '其他', areaId: 'default-area', color: '#9B8EBB', icon: 'x', order: 0, createdAt: 1, updatedAt: 2
        }],
        settings: { tasksVersion: 3 }
      }),
      importData: () => ({ success: true, imported: 0 })
    }
    const engine = new SyncEngine({ provider, taskStore })
    await engine.sync()
    expect(['idle', 'conflict', 'error'].includes(engine.status)).toBe(true)
  })

  it('真实 Pinia stores 中 sync：本地 task → push 至 MemoryProvider 后 pull 可见', async () => {
    setActivePinia(createPinia())
    localStorage.clear()
    const taskStore = useTaskStore()
    const areaStore = useAreaStore()
    const listStore = useListStore()
    const settingsStore = useSettingsStore()
    taskStore.resetAll()
    areaStore.resetAll()
    listStore.resetAll()
    settingsStore.resetSettings()
    taskStore.ensureV3('test')
    taskStore.addTask({ title: 'local task', category: 'work', date: '2026-01-01' })
    const provider = new MemoryProvider()
    const engine = new SyncEngine({ provider, taskStore, settingsStore, areaStore, listStore })
    const r = await engine.sync()
    expect(r.ok).toBe(true)
    const { snapshot } = await provider.pull()
    expect(snapshot.tasks.length).toBe(taskStore.tasks.length)
    expect(snapshot.tasks.some((t) => t.title === 'local task')).toBe(true)
  })

  it('SyncEngine push 远端冲突 → 回调 onConflict 被触发', async () => {
    const provider = new MemoryProvider()
    // 远端预置
    await provider.push(
      makePkgV3({ tasks: [makeTask('only_remote', 'R', { updatedAt: 500 })] })
    )
    // 本地：不同 title + updatedAt 较小（冲突会被 lww 选 remote；但仍会记录 conflict）
    const local = {
      tasks: [makeTask('only_remote', 'L', { updatedAt: 1 })],
      categories: [{ id: 'work', name: 'w', color: '#fff', icon: 'x' }, { id: 'other', name: 'o', color: '#999', icon: 'x' }],
      exportData: () => ({
        tasks: local.tasks,
        categories: local.categories,
        areas: [{ id: 'default-area', name: '未分组', order: 0, createdAt: 1, updatedAt: 2, meta: {} }],
        lists: [
          { id: 'work', name: '工作', areaId: 'default-area', order: 0, color: '#fff', icon: 'x', createdAt: 1, updatedAt: 2 },
          { id: 'other', name: '其他', areaId: 'default-area', order: 1, color: '#999', icon: 'x', createdAt: 1, updatedAt: 2 }
        ],
        settings: { tasksVersion: 3 }
      }),
      importData: (str) => {
        const p = JSON.parse(str)
        local.tasks = p.tasks
        return { success: true, imported: p.tasks.length }
      }
    }
    const engine = new SyncEngine({ provider, taskStore: local })
    let called = 0
    engine.onConflict(() => called++)
    const r = await engine.sync()
    // 冲突：合并阶段就会写入 mergedPkg，callback 触发（除非没有 conflictFields）
    // 由于 remote 与 local updatedAt 不一致 → conflictFields 含 title/updatedAt → 触发
    expect(called).toBeGreaterThanOrEqual(r.conflicts.length ? 1 : 0)
    expect(r.ok).toBe(true)
    // 由于 remote updatedAt 更新，merged 后 title=R（LWW 语义）
    expect(local.tasks.find((t) => t.id === 'only_remote').title).toBe('R')
  })

  it('SyncEngine 抛错 → status=error，返回 phase=uncaught', async () => {
    const badProvider = {
      pull: async () => { throw new Error('remote down') },
      push: async () => ({ remoteHash: 'x', conflicts: [] }),
      resolveConflicts: async () => ({ ok: true })
    }
    const engine = new SyncEngine({ provider: badProvider, taskStore: { exportData: () => ({}) } })
    const r = await engine.sync()
    expect(r.ok).toBe(false)
    expect(r.phase).toBe('uncaught')
    expect(engine.status).toBe('error')
    expect(typeof engine.lastError).toBe('string')
  })

  it('SyncEngine.merge 后 settings.tasksVersion 与本地保持一致', async () => {
    const provider = new MemoryProvider(makePkgV3({ settings: { tasksVersion: 3, remoteOnly: 1 } }))
    const taskStore = {
      tasks: [],
      categories: [],
      exportData: () => ({
        tasks: [],
        categories: [],
        areas: [{ id: 'default-area', name: '未分组', order: 0, createdAt: 1, updatedAt: 2, meta: {} }],
        lists: [{ id: 'other', name: '其他', areaId: 'default-area', color: '#9B8EBB', icon: 'x', order: 0, createdAt: 1, updatedAt: 2 }],
        settings: { tasksVersion: 3, localOnly: 2 }
      }),
      importData: () => ({ success: true, imported: 0 })
    }
    const settingsStore = { tasksVersion: 3 }
    const engine = new SyncEngine({ provider, taskStore, settingsStore })
    const r = await engine.sync()
    expect(settingsStore.tasksVersion).toBeGreaterThanOrEqual(3)
  })

  it('SyncEngine.sync 返回 ms 耗时字段（number）', async () => {
    const provider = new MemoryProvider(makePkgV3())
    const taskStore = {
      tasks: [],
      categories: [],
      exportData: () => ({
        tasks: [],
        categories: [],
        areas: [{ id: 'default-area', name: '未分组', order: 0, createdAt: 1, updatedAt: 2, meta: {} }],
        lists: [{ id: 'other', name: '其他', areaId: 'default-area', color: '#9B8EBB', icon: 'x', order: 0, createdAt: 1, updatedAt: 2 }],
        settings: { tasksVersion: 3 }
      }),
      importData: () => ({ success: true, imported: 0 })
    }
    const engine = new SyncEngine({ provider, taskStore })
    const r = await engine.sync()
    expect(typeof r.ms).toBe('number')
    expect(r.ms).toBeGreaterThanOrEqual(0)
  })

  it('SyncEngine.push 冲突列表包含 schema 校验失败条目（若 merged pkg 非法）', async () => {
    // 构造一个非法的 remote pkg 但走 lww 合并导致 schema 错误 → 触发 conflict type=schema
    const bad = makePkgV3()
    delete bad.tasks
    // 把 remote snapshot 设为非法对象（无 tasks 属性）
    const provider = new MemoryProvider()
    provider.snapshot = bad
    const taskStore = {
      tasks: [],
      categories: [],
      exportData: () => ({
        tasks: [],
        categories: [],
        areas: [{ id: 'default-area', name: '未分组', order: 0, createdAt: 1, updatedAt: 2, meta: {} }],
        lists: [{ id: 'other', name: '其他', areaId: 'default-area', color: '#9B8EBB', icon: 'x', order: 0, createdAt: 1, updatedAt: 2 }],
        settings: { tasksVersion: 3 }
      }),
      importData: () => ({ success: true, imported: 0 })
    }
    const engine = new SyncEngine({ provider, taskStore })
    const r = await engine.sync()
    // validateDataPackageV3 会把 tasks 缺失视为 error → conflict type=schema 被写入
    const schemaConflict = r.conflicts.find((c) => c.type === 'schema')
    expect(schemaConflict).toBeTruthy()
  })
})
