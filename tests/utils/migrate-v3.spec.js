import { describe, test, expect, beforeEach } from 'vitest'
import { migrateV2ToV3, rollbackSaveAndPersist, saveConflict } from '@/utils/migrate-v3'

/**
 * Task 1 契约 v3 测试：
 *  - 迁移结果具有 { ok, migrated: { tasks, categories, areas, lists, settings } }
 *  - 每个迁移后的任务都包含 listId / areaId / parentId / blockedBy / activity / updatedAt
 *  - settings.tasksVersion = 3
 *  - 支持 v2 / v1 / 空 / null tasks
 *  - 回滚 & conflict 文件 API 不因缺少 localStorage 而崩溃
 */

const mkV2Task = (overrides = {}) => ({
  id: `task_${Math.random().toString(36).slice(2, 8)}`,
  title: 't',
  category: overrides.category ?? 'other',
  date: '2026-01-01',
  completed: false,
  important: false,
  reminder: false,
  notes: '',
  tags: [],
  subTasks: [],
  repeat: null,
  order: 0,
  pomodoroSessions: 0,
  totalFocusTime: 0,
  createdAt: 1700000000000,
  completedAt: null,
  ...overrides
})

const mkV2State = (extras = {}) => ({
  tasks: extras.tasks || [],
  categories: extras.categories || [
    { id: 'work', name: '工作', color: '#ef4444', icon: 'briefcase' },
    { id: 'personal', name: '个人', color: '#22c55e', icon: 'home' },
    { id: 'study', name: '学习', color: '#3b82f6', icon: 'book' },
    { id: 'other', name: '其他', color: '#9B8EBB', icon: 'more-horizontal' }
  ],
  areas: extras.areas || [],
  lists: extras.lists || [],
  settings: extras.settings || { tasksVersion: 2 }
})

beforeEach(() => {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.clear()
    } catch {
      /* ignore */
    }
  }
})

describe('migrateV2ToV3: basic result shape', () => {
  test('返回 ok=true & 迁移数据', () => {
    const res = migrateV2ToV3(mkV2State())
    expect(res.ok).toBe(true)
    expect(res.migrated).toBeDefined()
    expect(res.migrated.tasks).toEqual([])
    expect(Array.isArray(res.migrated.categories)).toBe(true)
    expect(Array.isArray(res.migrated.areas)).toBe(true)
    expect(Array.isArray(res.migrated.lists)).toBe(true)
    expect(res.migrated.settings.tasksVersion).toBe(3)
  })

  test('返回 conflict 错误 ok=false 当 stateSnapshot 为 null/非 object', () => {
    const r1 = migrateV2ToV3(null)
    expect(r1.ok).toBe(false)
    const r2 = migrateV2ToV3('hi')
    expect(r2.ok).toBe(false)
    const r3 = migrateV2ToV3(undefined)
    expect(r3.ok).toBe(false)
  })

  test('支持 tasks 缺失 -> 空数组', () => {
    const r = migrateV2ToV3({ categories: [], settings: {} })
    expect(r.ok).toBe(true)
    expect(r.migrated.tasks).toEqual([])
  })

  test('tasks 非数组时 ok=false', () => {
    const r = migrateV2ToV3({ tasks: 'not-array', settings: { tasksVersion: 2 } })
    expect(r.ok).toBe(false)
    expect(typeof r.error).toBe('string')
  })
})

describe('migrateV2ToV3: task defaults', () => {
  test('每个迁移任务具备 v3 字段', () => {
    const t = mkV2Task({ title: 'Buy milk', category: 'work' })
    const res = migrateV2ToV3(mkV2State({ tasks: [t] }))
    expect(res.ok).toBe(true)
    const out = res.migrated.tasks[0]
    expect(out.id).toBe(t.id)
    expect(out.title).toBe('Buy milk')
    expect(out.listId).toBe('work')
    expect(typeof out.areaId).toBe('string')
    expect(out.areaId.length).toBeGreaterThan(0)
    expect(out.parentId).toBeNull()
    expect(Array.isArray(out.blockedBy)).toBe(true)
    expect(out.blockedBy).toEqual([])
    expect(Array.isArray(out.activity)).toBe(true)
    expect(out.activity.length).toBeGreaterThanOrEqual(1)
    expect(typeof out.updatedAt).toBe('number')
  })

  test('categoryId 等价于 listId 时不会重复赋值', () => {
    const t = mkV2Task({ category: 'personal', categoryId: 'personal' })
    const res = migrateV2ToV3(mkV2State({ tasks: [t] }))
    const out = res.migrated.tasks[0]
    expect(out.listId).toBe('personal')
    expect(out.categoryId).toBe('personal')
  })

  test('不存在的 category 会回落到 UNDELETABLE_CATEGORY（other）', () => {
    const t = mkV2Task({ category: 'ghost-cat' })
    const res = migrateV2ToV3(mkV2State({ tasks: [t] }))
    const out = res.migrated.tasks[0]
    expect(out.listId).toBe('other')
    expect(out.category).toBe('other')
  })

  test('迁移后 category 数组完整保留（v2 UI 兼容）', () => {
    const cats = [
      { id: 'work', name: '工作', color: '#ef4444', icon: 'briefcase' },
      { id: 'other', name: '其他', color: '#9B8EBB', icon: 'more-horizontal' }
    ]
    const res = migrateV2ToV3(mkV2State({ categories: cats }))
    expect(res.migrated.categories.length).toBeGreaterThanOrEqual(cats.length)
    expect(res.migrated.categories.some((c) => c.id === 'other')).toBe(true)
  })
})

describe('migrateV2ToV3: category -> list mapping', () => {
  test('每个 category 都对应一个 list.id', () => {
    const cats = [
      { id: 'work', name: '工作', color: '#ef4444', icon: 'briefcase' },
      { id: 'other', name: '其他', color: '#9B8EBB', icon: 'more-horizontal' }
    ]
    const res = migrateV2ToV3(mkV2State({ categories: cats }))
    const listIds = new Set(res.migrated.lists.map((l) => l.id))
    for (const c of cats) expect(listIds.has(c.id)).toBe(true)
  })

  test('list 继承 category 的 name/color/icon', () => {
    const res = migrateV2ToV3(
      mkV2State({
        categories: [
          { id: 'work', name: '工作', color: '#ef4444', icon: 'briefcase' },
          { id: 'other', name: '其他', color: '#9B8EBB', icon: 'more-horizontal' }
        ]
      })
    )
    const work = res.migrated.lists.find((l) => l.id === 'work')
    expect(work).toBeDefined()
    expect(work.name).toBe('工作')
    expect(work.color).toBe('#ef4444')
    expect(work.icon).toBe('briefcase')
  })
})

describe('migrateV2ToV3: default areas & fallback lists', () => {
  test('areas 为空时生成默认 area，lists 为空时生成默认 list', () => {
    const res = migrateV2ToV3({
      tasks: [],
      categories: [{ id: 'other', name: '其他', color: '#9B8EBB', icon: 'more-horizontal' }],
      areas: [],
      lists: [],
      settings: { tasksVersion: 2 }
    })
    expect(res.ok).toBe(true)
    expect(res.migrated.areas.length).toBeGreaterThanOrEqual(1)
    expect(res.migrated.lists.length).toBeGreaterThanOrEqual(1)
    // 所有 lists 都能在 areas 中找到对应 areaId
    const areaIds = new Set(res.migrated.areas.map((a) => a.id))
    for (const l of res.migrated.lists) expect(areaIds.has(l.areaId)).toBe(true)
  })

  test('存在已迁移的 areas/lists 不会重新生成同名 default', () => {
    const areas = [
      { id: 'default-area', name: '默认工作区', order: 0, createdAt: 1, updatedAt: 1 }
    ]
    const lists = [
      { id: 'other', name: '其他', areaId: 'default-area', order: 0, createdAt: 1, updatedAt: 1 }
    ]
    const res = migrateV2ToV3({
      tasks: [mkV2Task()],
      categories: [{ id: 'other', name: '其他', color: '#9B8EBB', icon: 'more-horizontal' }],
      areas,
      lists,
      settings: { tasksVersion: 3 }
    })
    // 已有 default-area 数量保持
    const defAreaCount = res.migrated.areas.filter((a) => a.id === 'default-area').length
    expect(defAreaCount).toBeLessThanOrEqual(1)
  })
})

describe('migrateV2ToV3: 幂等 / 幂等性', () => {
  test('v3 数据再次运行 migrateV2ToV3 保持一致且不报错', () => {
    const first = migrateV2ToV3(
      mkV2State({
        tasks: [
          mkV2Task({ id: 'task_a', category: 'work' }),
          mkV2Task({ id: 'task_b', category: 'personal' })
        ]
      })
    )
    expect(first.ok).toBe(true)
    const second = migrateV2ToV3(first.migrated)
    expect(second.ok).toBe(true)
    expect(second.migrated.tasks.map((t) => t.id)).toEqual(
      first.migrated.tasks.map((t) => t.id)
    )
    // 不生成重复的 list
    expect(new Set(second.migrated.lists.map((l) => l.id)).size).toBe(
      second.migrated.lists.length
    )
  })

  test('多次迁移 activity 长度不爆炸（仅在缺失时补齐）', () => {
    const t = mkV2Task({ id: 'x1', category: 'other' })
    const r1 = migrateV2ToV3(mkV2State({ tasks: [t] }))
    const before = r1.migrated.tasks[0].activity.length
    const r2 = migrateV2ToV3(r1.migrated)
    const after = r2.migrated.tasks[0].activity.length
    expect(after).toBeLessThanOrEqual(before + 1)
  })
})

describe('migrateV2ToV3: conflicts detection', () => {
  test('tasks 中有 listId 但 category 缺失 -> 保留 listId 并回退 category', () => {
    const t = { id: 'task_ghostlist', title: 'x', listId: 'work' }
    const res = migrateV2ToV3(mkV2State({ tasks: [t] }))
    const out = res.migrated.tasks[0]
    expect(out.listId).toBe('work')
    expect(out.category).toBeTruthy()
  })

  test('tasks 中有重复 id 不会丢失（保持全部）', () => {
    const t1 = mkV2Task({ id: 'dup' })
    const t2 = mkV2Task({ id: 'dup', title: 'dup-2' })
    const res = migrateV2ToV3(mkV2State({ tasks: [t1, t2] }))
    // migrateV2ToV3 不做去重；应仍保留两条
    expect(res.migrated.tasks.length).toBe(2)
  })
})

describe('migrateV2ToV3: parentId / blockedBy handling', () => {
  test('子任务 parentId 指向存在的任务 id 时保留', () => {
    const a = mkV2Task({ id: 'p1' })
    const b = mkV2Task({ id: 'c1', parentId: 'p1' })
    const res = migrateV2ToV3(mkV2State({ tasks: [a, b] }))
    const [pOut, cOut] = res.migrated.tasks
    expect(cOut.parentId).toBe('p1')
    expect(pOut.parentId).toBe(null)
  })

  test('blockedBy 无效引用会被剔除', () => {
    const a = mkV2Task({ id: 'a', blockedBy: ['does-not-exist', 'also-no'] })
    const res = migrateV2ToV3(mkV2State({ tasks: [a] }))
    expect(res.migrated.tasks[0].blockedBy).toEqual([])
  })

  test('blockedBy 合法引用被保留，非法引用被剔除', () => {
    const a = mkV2Task({ id: 'a' })
    const b = mkV2Task({ id: 'b', blockedBy: ['a', 'nope'] })
    const res = migrateV2ToV3(mkV2State({ tasks: [a, b] }))
    expect(res.migrated.tasks.find((t) => t.id === 'b').blockedBy).toEqual(['a'])
  })
})

describe('rollbackSaveAndPersist & saveConflict APIs', () => {
  test('rollbackSaveAndPersist 不抛出异常（无 localStorage 时也 OK）', () => {
    expect(() => rollbackSaveAndPersist('ut-1', { a: 1 })).not.toThrow()
  })

  test('saveConflict 不抛出异常', () => {
    expect(() => saveConflict('ut-conflict-1', { reason: 'test' })).not.toThrow()
  })

  test('有 localStorage 时写入 rollback key 可被读取', () => {
    if (typeof localStorage === 'undefined') return
    const ok = rollbackSaveAndPersist('ut-2', { tasks: [1, 2, 3] })
    expect(ok.ok).toBe(true)
    expect(typeof ok.key).toBe('string')
    const raw = localStorage.getItem(ok.key)
    // 实现用 gzip 压缩 + base64，只需确认有非空 payload 写入
    expect(typeof raw).toBe('string')
    expect(raw.length).toBeGreaterThan(0)
  })
})

describe('migrateV2ToV3: settings.tasksVersion upgrade', () => {
  test('v1 tasksVersion 升级到 3', () => {
    const r = migrateV2ToV3({ tasks: [], settings: { tasksVersion: 1 } })
    expect(r.ok).toBe(true)
    expect(r.migrated.settings.tasksVersion).toBe(3)
  })
  test('v0 tasksVersion 升级到 3', () => {
    const r = migrateV2ToV3({ tasks: [], settings: {} })
    expect(r.ok).toBe(true)
    expect(r.migrated.settings.tasksVersion).toBe(3)
  })
  test('v3 再迁移保持 3', () => {
    const r = migrateV2ToV3({ tasks: [], settings: { tasksVersion: 3 } })
    expect(r.ok).toBe(true)
    expect(r.migrated.settings.tasksVersion).toBe(3)
  })
  test('超出版本 v5 保持原值', () => {
    const r = migrateV2ToV3({ tasks: [], settings: { tasksVersion: 5 } })
    expect(r.ok).toBe(true)
    expect(r.migrated.settings.tasksVersion).toBe(5)
  })
})
