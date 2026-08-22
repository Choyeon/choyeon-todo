import { describe, it, expect, beforeEach } from 'vitest'
import {
  validateDataPackageV3,
  normalizeDataPackage,
  genDiff,
  DEFAULT_AREA_ID,
  DEFAULT_LIST_ID,
  UNDELETABLE_CATEGORY_ID,
  MIN_VERSION,
  MIN_TASKS_VERSION,
  SCHEMA_REVISION
} from '@/utils/schema-v3'

const makeBaseTask = (overrides = {}) => ({
  id: 'task_1',
  title: 'Test Task',
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
  order: 0,
  pomodoroSessions: 0,
  totalFocusTime: 0,
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
  completedAt: null,
  listId: DEFAULT_LIST_ID,
  areaId: DEFAULT_AREA_ID,
  parentId: null,
  headingId: null,
  blockedBy: [],
  comments: [],
  attachments: [],
  assignee: '',
  createdBy: '',
  nextReminderAt: null,
  snoozeCount: 0,
  activity: [{ type: 'add', at: 1700000000000 }],
  ...overrides
})

const makeValidPkg = (extra = {}) => ({
  version: 3,
  tasksVersion: 3,
  generatedAt: '2026-01-01T00:00:00.000Z',
  tasks: [makeBaseTask({ id: 'task_1' }), makeBaseTask({ id: 'task_2' })],
  areas: [
    {
      id: DEFAULT_AREA_ID,
      name: '未分组',
      color: '#9B8EBB',
      icon: 'layers',
      order: 0,
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
      meta: {}
    }
  ],
  lists: [
    {
      id: DEFAULT_LIST_ID,
      name: '其他',
      areaId: DEFAULT_AREA_ID,
      color: '#9B8EBB',
      icon: 'more-horizontal',
      order: 0,
      createdAt: 1700000000000,
      updatedAt: 1700000000000
    }
  ],
  categories: [
    { id: UNDELETABLE_CATEGORY_ID, name: '其他', color: '#9B8EBB', icon: 'more-horizontal' }
  ],
  settings: { tasksVersion: 3, themeMode: 'light' },
  tags: [{ id: 'tag_urgent', name: '紧急', color: '#EF4444' }],
  templates: [
    { id: 'tpl_daily', name: '日常任务', icon: 'sun', color: '#F59E0B' }
  ],
  meta: {
    app: 'choyeon-todo',
    appVersion: '3.0.0',
    schemaRevision: SCHEMA_REVISION,
    userId: 'u_anonymous'
  },
  ...extra
})

describe('schema-v3 / validateDataPackageV3', () => {
  it('常量暴露正确', () => {
    expect(typeof MIN_VERSION).toBe('number')
    expect(typeof MIN_TASKS_VERSION).toBe('number')
    expect(typeof SCHEMA_REVISION).toBe('number')
    expect(DEFAULT_AREA_ID).toBeTruthy()
    expect(DEFAULT_LIST_ID).toBeTruthy()
    expect(UNDELETABLE_CATEGORY_ID).toBeTruthy()
  })

  it('pkg=null/非对象 → 错误', () => {
    expect(validateDataPackageV3(null).ok).toBe(false)
    expect(validateDataPackageV3(undefined).ok).toBe(false)
    expect(validateDataPackageV3([]).ok).toBe(false)
    expect(validateDataPackageV3('{}').ok).toBe(false)
  })

  it('缺顶层字段：version / tasksVersion / generatedAt / tasks / areas / lists / categories / settings / meta → 至少 9 条 error', () => {
    const r = validateDataPackageV3({})
    expect(r.ok).toBe(false)
    expect(r.errors.length).toBeGreaterThanOrEqual(9)
  })

  it('version 非数字报错', () => {
    const r = validateDataPackageV3(makeValidPkg({ version: '3' }))
    expect(r.ok).toBe(false)
    expect(r.errors.some((e) => e.path === '$.version')).toBe(true)
  })

  it('version < 3 报错', () => {
    const r = validateDataPackageV3(makeValidPkg({ version: 2 }))
    expect(r.ok).toBe(false)
    expect(r.errors.some((e) => e.path === '$.version')).toBe(true)
  })

  it('generatedAt 非 ISO8601 报错', () => {
    const r = validateDataPackageV3(makeValidPkg({ generatedAt: 'not-a-date' }))
    expect(r.ok).toBe(false)
    expect(r.errors.some((e) => e.path === '$.generatedAt')).toBe(true)
  })

  it('tasks 非数组报错', () => {
    const r = validateDataPackageV3(makeValidPkg({ tasks: null }))
    expect(r.ok).toBe(false)
    expect(r.errors.some((e) => e.path === '$.tasks')).toBe(true)
  })

  it('areas/lists/categories 非数组报错', () => {
    let r = validateDataPackageV3(makeValidPkg({ areas: 'x' }))
    expect(r.ok).toBe(false)
    expect(r.errors.some((e) => e.path === '$.areas')).toBe(true)
    r = validateDataPackageV3(makeValidPkg({ lists: {} }))
    expect(r.ok).toBe(false)
    expect(r.errors.some((e) => e.path === '$.lists')).toBe(true)
    r = validateDataPackageV3(makeValidPkg({ categories: 123 }))
    expect(r.ok).toBe(false)
    expect(r.errors.some((e) => e.path === '$.categories')).toBe(true)
  })

  it('settings 非对象报错', () => {
    const r = validateDataPackageV3(makeValidPkg({ settings: [] }))
    expect(r.ok).toBe(false)
    expect(r.errors.some((e) => e.path === '$.settings')).toBe(true)
  })

  it('meta 缺 app / appVersion / schemaRevision → 至少 3 条 errors', () => {
    const r = validateDataPackageV3(makeValidPkg({ meta: {} }))
    expect(r.ok).toBe(false)
    expect(r.errors.filter((e) => e.path.startsWith('$.meta.')).length).toBeGreaterThanOrEqual(3)
  })

  it('meta.userId 数字报错', () => {
    const r = validateDataPackageV3(makeValidPkg({ meta: {
      app: 'choyeon-todo',
      appVersion: '3.0.0',
      schemaRevision: 1,
      userId: 123
    } }))
    expect(r.ok).toBe(false)
    expect(r.errors.some((e) => e.path === '$.meta.userId')).toBe(true)
  })

  it('snapshots 可选；若非数组报错', () => {
    let r = validateDataPackageV3(makeValidPkg({ snapshots: 'x' }))
    expect(r.ok).toBe(false)
    expect(r.errors.some((e) => e.path === '$.snapshots')).toBe(true)
    r = validateDataPackageV3(makeValidPkg({ snapshots: [{ key: 'k' }] }))
    expect(r.ok).toBe(true)
  })

  it('有效 pkg：ok=true，errors 空', () => {
    const r = validateDataPackageV3(makeValidPkg())
    expect(r.ok).toBe(true)
    expect(r.errors).toEqual([])
  })

  it('task 缺 listId → 报错', () => {
    const t = makeBaseTask({ id: 'task_xx' })
    delete t.listId
    const r = validateDataPackageV3(makeValidPkg({ tasks: [t] }))
    expect(r.ok).toBe(false)
    expect(r.errors.some((e) => /listId/.test(e.path))).toBe(true)
  })

  it('task 缺 areaId → 报错', () => {
    const t = makeBaseTask({ id: 'task_xx' })
    delete t.areaId
    const r = validateDataPackageV3(makeValidPkg({ tasks: [t] }))
    expect(r.ok).toBe(false)
    expect(r.errors.some((e) => /areaId/.test(e.path))).toBe(true)
  })

  it('task 缺 parentId → 报错', () => {
    const t = makeBaseTask({ id: 'task_xx' })
    delete t.parentId
    const r = validateDataPackageV3(makeValidPkg({ tasks: [t] }))
    expect(r.ok).toBe(false)
    expect(r.errors.some((e) => /parentId/.test(e.path))).toBe(true)
  })

  it('task 缺 blockedBy / comments / attachments / activity → 各报一条 error', () => {
    const t = makeBaseTask({ id: 'task_xx' })
    delete t.blockedBy
    delete t.comments
    delete t.attachments
    delete t.activity
    const r = validateDataPackageV3(makeValidPkg({ tasks: [t] }))
    expect(r.errors.filter((e) => /blockedBy|comments|attachments|activity/.test(e.path)).length)
      .toBe(4)
  })

  it('task 缺 id → 报错', () => {
    const t = makeBaseTask({})
    delete t.id
    const r = validateDataPackageV3(makeValidPkg({ tasks: [t] }))
    expect(r.errors.some((e) => /\.id$/.test(e.path) && e.path.includes('tasks[0]'))).toBe(true)
  })

  it('task 重复 id → 报错', () => {
    const r = validateDataPackageV3(
      makeValidPkg({ tasks: [makeBaseTask({ id: 'dup' }), makeBaseTask({ id: 'dup' })] })
    )
    expect(r.ok).toBe(false)
    expect(r.errors.some((e) => /duplicate task\.id: dup/.test(e.msg))).toBe(true)
  })

  it('task.blockedBy 自我引用 → 报错', () => {
    const r = validateDataPackageV3(
      makeValidPkg({ tasks: [makeBaseTask({ id: 't1', blockedBy: ['t1'] })] })
    )
    expect(r.ok).toBe(false)
    expect(r.errors.some((e) => /self-reference/.test(e.msg))).toBe(true)
  })

  it('task.blockedBy 引用未知 id → warning（非 error）', () => {
    const r = validateDataPackageV3(
      makeValidPkg({ tasks: [makeBaseTask({ id: 't1', blockedBy: ['not-exist'] })] })
    )
    expect(r.ok).toBe(true)
    expect(r.warnings.some((w) => /not-exist/.test(w))).toBe(true)
  })

  it('task.parentId 未知引用 → warning', () => {
    const r = validateDataPackageV3(
      makeValidPkg({ tasks: [makeBaseTask({ id: 't1', parentId: 'ghost' })] })
    )
    expect(r.ok).toBe(true)
    expect(r.warnings.some((w) => /ghost/.test(w))).toBe(true)
  })

  it('area 缺 UNDELETABLE DEFAULT_AREA_ID → warning', () => {
    const r = validateDataPackageV3(
      makeValidPkg({ areas: [{ id: 'other-area', name: 'x', order: 0, createdAt: 1, updatedAt: 1 }] })
    )
    expect(r.warnings.some((w) => w.includes(DEFAULT_AREA_ID))).toBe(true)
  })

  it('list 缺 UNDELETABLE DEFAULT_LIST_ID → warning', () => {
    const r = validateDataPackageV3(
      makeValidPkg({ lists: [{ id: 'work', name: 'Work', areaId: DEFAULT_AREA_ID, order: 0, createdAt: 1, updatedAt: 1 }] })
    )
    expect(r.warnings.some((w) => w.includes(DEFAULT_LIST_ID))).toBe(true)
  })

  it('categories 缺 UNDELETABLE 其他 → warning', () => {
    const r = validateDataPackageV3(
      makeValidPkg({ categories: [{ id: 'work', name: '工作', color: '#000', icon: 'x' }] })
    )
    expect(r.warnings.some((w) => w.includes(UNDELETABLE_CATEGORY_ID))).toBe(true)
  })

  it('task.completed 非 bool 报错', () => {
    const r = validateDataPackageV3(
      makeValidPkg({ tasks: [makeBaseTask({ completed: 'true' })] })
    )
    expect(r.ok).toBe(false)
    expect(r.errors.some((e) => /completed/.test(e.path) && /boolean/.test(e.msg))).toBe(true)
  })

  it('task.date 非法日期 → 报错', () => {
    const r = validateDataPackageV3(
      makeValidPkg({ tasks: [makeBaseTask({ date: '2026/01/01' })] })
    )
    expect(r.ok).toBe(false)
    expect(r.errors.some((e) => /\.date/.test(e.path))).toBe(true)
  })

  it('task.time 非法时间 → 报错', () => {
    const r = validateDataPackageV3(
      makeValidPkg({ tasks: [makeBaseTask({ time: '9:0' })] })
    )
    expect(r.ok).toBe(false)
    expect(r.errors.some((e) => /\.time/.test(e.path))).toBe(true)
  })

  it('task.priority out-of-range → warning', () => {
    const r = validateDataPackageV3(
      makeValidPkg({ tasks: [makeBaseTask({ priority: 5 })] })
    )
    expect(r.ok).toBe(true)
    expect(r.warnings.some((w) => /out of \[1,4\]/.test(w))).toBe(true)
  })

  it('task.activity 每项必须有 type 字符串', () => {
    const r = validateDataPackageV3(
      makeValidPkg({
        tasks: [makeBaseTask({ activity: [{ foo: 1 }, { type: 2 }] })]
      })
    )
    expect(r.ok).toBe(false)
    expect(r.errors.filter((e) => /activity\[\d\]\.type/.test(e.path)).length).toBe(2)
  })

  it('tags/templates 可选但非数组报错', () => {
    let r = validateDataPackageV3(makeValidPkg({ tags: 'x' }))
    expect(r.ok).toBe(false)
    expect(r.errors.some((e) => e.path === '$.tags')).toBe(true)
    r = validateDataPackageV3(makeValidPkg({ templates: 123 }))
    expect(r.ok).toBe(false)
    expect(r.errors.some((e) => e.path === '$.templates')).toBe(true)
  })
})

describe('schema-v3 / normalizeDataPackage', () => {
  it('null 入参 → ok=false', () => {
    const r = normalizeDataPackage(null)
    expect(r.ok).toBe(false)
    expect(r.raw).toBeNull()
  })

  it('非法 JSON 字符串 → ok=false', () => {
    const r = normalizeDataPackage('{ not json')
    expect(r.ok).toBe(false)
    expect(r.errors.length).toBeGreaterThanOrEqual(1)
  })

  it('已是 v3 合法包 → normalized.ok & validate ok', () => {
    const r = normalizeDataPackage(makeValidPkg())
    expect(r.ok).toBe(true)
    expect(r.normalized.version).toBe(3)
    expect(r.normalized.tasksVersion).toBe(3)
  })

  it('已是 v3 但 meta 缺 → normalize 补齐后 ok', () => {
    const pkg = makeValidPkg({ meta: undefined })
    delete pkg.meta
    const r = normalizeDataPackage(pkg)
    expect(r.ok).toBe(true)
    expect(r.normalized.meta.app).toBe('choyeon-todo')
  })

  it('version 缺省 / tasksVersion < 3 → 通过 migrateV2ToV3 归一化', () => {
    const legacy = {
      tasks: [{ id: 'a', title: 'Legacy', category: 'work', date: '2026-01-01', completed: false, createdAt: 1 }],
      categories: [{ id: 'work', name: '工作', color: '#000', icon: 'x' }]
    }
    const r = normalizeDataPackage(legacy)
    expect(r.ok).toBe(true)
    expect(r.normalized.version).toBe(3)
    expect(r.normalized.tasks[0].listId).toBeTruthy()
    expect(r.normalized.tasks[0].areaId).toBeTruthy()
    expect(Array.isArray(r.normalized.tasks[0].blockedBy)).toBe(true)
    expect(Array.isArray(r.normalized.tasks[0].activity)).toBe(true)
    expect(r.warnings.some((w) => /normalized legacy package/.test(w))).toBe(true)
  })

  it('返回的 raw 字段保留原始值（对象引用）', () => {
    const orig = makeValidPkg()
    const r = normalizeDataPackage(orig)
    expect(r.raw).toBe(orig)
    expect(r.normalized).not.toBe(orig)
  })

  it('任务 v3 字段缺也会在 normalize 时按 migrate 补齐（即便 tasksVersion=2 无 version）', () => {
    const pkg = {
      tasksVersion: 2,
      tasks: [{ id: 'x', title: 'x', category: 'work', date: '2026-01-01', completed: false, createdAt: 1 }],
      categories: [{ id: 'work', name: 'w', color: '#000', icon: 'x' }]
    }
    const r = normalizeDataPackage(pkg)
    expect(r.ok).toBe(true)
    const t = r.normalized.tasks[0]
    expect(t.listId).toBeTruthy()
    expect(t.areaId).toBeTruthy()
    expect(Array.isArray(t.blockedBy)).toBe(true)
    expect(Array.isArray(t.activity)).toBe(true)
  })
})

describe('schema-v3 / genDiff', () => {
  it('空包 vs 空包 → 0 patches', () => {
    const empty = { tasks: [], areas: [], lists: [], settings: {} }
    const r = genDiff(empty, empty)
    expect(r.stats.adds).toBe(0)
    expect(r.stats.updates).toBe(0)
    expect(r.stats.deletes).toBe(0)
    expect(r.hash.before).toEqual(r.hash.after)
  })

  it('新增一条 task → adds=1', () => {
    const a = { tasks: [], areas: [], lists: [], settings: {} }
    const b = { tasks: [makeBaseTask({ id: 'new' })], areas: [], lists: [], settings: {} }
    const r = genDiff(a, b)
    expect(r.stats.adds).toBe(1)
    expect(r.patches[0].type).toBe('tasks')
    expect(r.patches[0].op).toBe('add')
    expect(r.patches[0].id).toBe('new')
  })

  it('删除一条 task → deletes=1', () => {
    const a = { tasks: [makeBaseTask({ id: 'gone' })], areas: [], lists: [], settings: {} }
    const b = { tasks: [], areas: [], lists: [], settings: {} }
    const r = genDiff(a, b)
    expect(r.stats.deletes).toBe(1)
    expect(r.patches[0].op).toBe('delete')
  })

  it('task.title 变化 → updates=1，conflictFields 含 title', () => {
    const t1 = makeBaseTask({ id: 't1', title: 'A', updatedAt: 1 })
    const t2 = makeBaseTask({ id: 't1', title: 'B', updatedAt: 2 })
    const r = genDiff(
      { tasks: [t1], areas: [], lists: [], settings: {} },
      { tasks: [t2], areas: [], lists: [], settings: {} }
    )
    expect(r.stats.updates).toBe(1)
    expect(r.patches[0].conflictFields.includes('title')).toBe(true)
  })

  it('settings 变化 → settings patch + conflictFields', () => {
    const r = genDiff(
      { tasks: [], areas: [], lists: [], settings: { tasksVersion: 3, theme: 'light' } },
      { tasks: [], areas: [], lists: [], settings: { tasksVersion: 3, theme: 'dark' } }
    )
    const sp = r.patches.find((p) => p.type === 'settings')
    expect(sp).toBeTruthy()
    expect(sp.conflictFields.includes('theme')).toBe(true)
  })

  it('strategy=local：after 字段覆盖为 before', () => {
    const t1 = makeBaseTask({ id: 't1', title: 'LOCAL', updatedAt: 1 })
    const t2 = makeBaseTask({ id: 't1', title: 'REMOTE', updatedAt: 999 })
    const r = genDiff(
      { tasks: [t1], areas: [], lists: [], settings: {} },
      { tasks: [t2], areas: [], lists: [], settings: {} },
      { strategy: 'local' }
    )
    expect(r.patches[0].after.title).toBe('LOCAL')
  })

  it('strategy=remote：after 字段为 remote 原值', () => {
    const t1 = makeBaseTask({ id: 't1', title: 'LOCAL', updatedAt: 999 })
    const t2 = makeBaseTask({ id: 't1', title: 'REMOTE', updatedAt: 1 })
    const r = genDiff(
      { tasks: [t1], areas: [], lists: [], settings: {} },
      { tasks: [t2], areas: [], lists: [], settings: {} },
      { strategy: 'remote' }
    )
    expect(r.patches[0].after.title).toBe('REMOTE')
  })

  it('strategy=lww：updatedAt 新者胜（local 新 → 取 local）', () => {
    const t1 = makeBaseTask({ id: 't1', title: 'LOCAL', updatedAt: 1000 })
    const t2 = makeBaseTask({ id: 't1', title: 'REMOTE', updatedAt: 1 })
    const r = genDiff(
      { tasks: [t1], areas: [], lists: [], settings: {} },
      { tasks: [t2], areas: [], lists: [], settings: {} },
      { strategy: 'lww' }
    )
    expect(r.patches[0].after.title).toBe('LOCAL')
  })

  it('strategy=lww：updatedAt 新者胜（remote 新 → 取 remote）', () => {
    const t1 = makeBaseTask({ id: 't1', title: 'LOCAL', updatedAt: 1 })
    const t2 = makeBaseTask({ id: 't1', title: 'REMOTE', updatedAt: 1000 })
    const r = genDiff(
      { tasks: [t1], areas: [], lists: [], settings: {} },
      { tasks: [t2], areas: [], lists: [], settings: {} },
      { strategy: 'lww' }
    )
    expect(r.patches[0].after.title).toBe('REMOTE')
  })

  it('areas 变化：新增 → op=add', () => {
    const r = genDiff(
      { tasks: [], areas: [], lists: [], settings: {} },
      { tasks: [], areas: [{ id: 'a1', name: 'New', order: 0, createdAt: 1, updatedAt: 1 }], lists: [], settings: {} }
    )
    const p = r.patches.find((x) => x.type === 'areas')
    expect(p && p.op).toBe('add')
  })

  it('lists 变化：删除 → op=delete', () => {
    const r = genDiff(
      {
        tasks: [],
        areas: [],
        lists: [{ id: 'l1', name: 'List', areaId: 'default-area', order: 0, createdAt: 1, updatedAt: 1 }],
        settings: {}
      },
      { tasks: [], areas: [], lists: [], settings: {} }
    )
    const p = r.patches.find((x) => x.type === 'lists')
    expect(p && p.op).toBe('delete')
  })

  it('hash 字段可复现：相同包 → hash.before === hash.after', () => {
    const base = { tasks: [makeBaseTask({ id: 't1' })], areas: [], lists: [], settings: { tasksVersion: 3 } }
    const r = genDiff(base, base)
    expect(r.hash.before).toEqual(r.hash.after)
  })

  it('strategy 参数记录在 result', () => {
    const r = genDiff({}, {}, { strategy: 'lww' })
    expect(r.strategy).toBe('lww')
  })

  it('空 before vs 含内容 after：adds 汇总 tasks+areas+lists+settings 变化', () => {
    const r = genDiff(
      { tasks: [], areas: [], lists: [], settings: {} },
      {
        tasks: [makeBaseTask({ id: 't1' })],
        areas: [{ id: 'a1', name: 'x', order: 0, createdAt: 1, updatedAt: 1 }],
        lists: [{ id: 'l1', name: 'y', areaId: 'a1', order: 0, createdAt: 1, updatedAt: 1 }],
        settings: { tasksVersion: 3, extra: 1 }
      }
    )
    expect(r.stats.adds).toBe(3) // tasks 1 + areas 1 + lists 1
    expect(r.stats.updates).toBe(1) // settings
  })
})
