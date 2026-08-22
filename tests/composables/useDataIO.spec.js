import { createPinia, setActivePinia } from 'pinia'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useTaskStore } from '@/stores/taskStore'
import { useAreaStore, DEFAULT_AREA_ID } from '@/stores/areaStore'
import { useListStore } from '@/stores/listStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useDataIO, CSV_COLUMNS, FALLBACK_APP, FALLBACK_APP_VERSION } from '@/composables/useDataIO'
import {
  validateDataPackageV3,
  SCHEMA_REVISION,
  MIN_VERSION
} from '@/utils/schema-v3'

const makeLegacyV2 = () => ({
  tasks: [
    {
      id: 'old_a',
      title: 'Legacy task',
      category: 'work',
      date: '2026-01-02',
      time: '10:00',
      completed: false,
      important: true,
      notes: 'from v2',
      tags: ['tag_urgent'],
      priority: 2,
      createdAt: 1700000000000
    }
  ],
  categories: [
    { id: 'work', name: '工作', color: '#4A90D9', icon: 'briefcase' },
    { id: 'other', name: '其他', color: '#9B8EBB', icon: 'more-horizontal' }
  ],
  tags: [{ id: 'tag_urgent', name: '紧急', color: '#EF4444' }],
  settings: { tasksVersion: 2 }
})

describe('useDataIO setup + CSV helpers', () => {
  let taskStore, areaStore, listStore, settingsStore, io

  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    taskStore = useTaskStore()
    areaStore = useAreaStore()
    listStore = useListStore()
    settingsStore = useSettingsStore()
    taskStore.resetAll()
    areaStore.resetAll()
    listStore.resetAll()
    settingsStore.resetSettings()
    taskStore.ensureV3('test')
    io = useDataIO()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('useDataIO 导出所需方法', () => {
    expect(typeof io.exportJSON).toBe('function')
    expect(typeof io.importJSON).toBe('function')
    expect(typeof io.exportCSV).toBe('function')
    expect(typeof io.importCSV).toBe('function')
    expect(typeof io.currentSnapshotPkg).toBe('function')
  })

  it('CSV_COLUMNS 按规格列齐全', () => {
    const expected = [
      'id','title','date','time','completed','important','priority',
      'categoryId','listId','areaId','parentId','blockedBy','tags','notes',
      'repeat','dueUntil','nextReminderAt','snoozeCount','createdAt','updatedAt',
      'completedAt','assignee','createdBy'
    ]
    expect(CSV_COLUMNS).toEqual(expected)
    expect(CSV_COLUMNS.length).toBe(23)
  })

  it('internals csvEscape：空值返回空字符串，逗号/双引号正确转义', () => {
    const { csvEscape } = io._internals
    expect(csvEscape(null)).toBe('')
    expect(csvEscape(undefined)).toBe('')
    expect(csvEscape('hello, world')).toBe('"hello, world"')
    expect(csvEscape('He said "hi"')).toBe('"He said ""hi"""')
    expect(csvEscape(42)).toBe('42')
    expect(csvEscape({ a: 1 })).toBe('{"a":1}')
  })

  it('internals csvParse：简单 CSV 双向解析', () => {
    const { csvParse } = io._internals
    const text = 'id,title,date\n1,"任务 1, 重要",2026-01-01\n2,"He said ""hi""",2026-02-01'
    const { headers, rows } = csvParse(text)
    expect(headers).toEqual(['id', 'title', 'date'])
    expect(rows.length).toBe(2)
    expect(rows[0].id).toBe('1')
    expect(rows[0].title).toBe('任务 1, 重要')
    expect(rows[1].title).toBe('He said "hi"')
    expect(rows[1].date).toBe('2026-02-01')
  })

  it('buildPkgV3：导出合法 v3 包', () => {
    taskStore.addTask({ title: 'sample', category: 'work', date: '2026-01-01' })
    const pkg = io._internals.buildPkgV3({ withSnapshots: true })
    expect(pkg.version).toBe(3)
    expect(pkg.tasksVersion).toBe(MIN_VERSION)
    expect(pkg.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(Array.isArray(pkg.tasks)).toBe(true)
    expect(pkg.meta.app).toBe(FALLBACK_APP)
    expect(pkg.meta.appVersion).toBe(FALLBACK_APP_VERSION)
    expect(pkg.meta.schemaRevision).toBe(SCHEMA_REVISION)
    const v = validateDataPackageV3(pkg)
    expect(v.ok).toBe(true)
    expect(Array.isArray(pkg.snapshots)).toBe(true)
  })
})

describe('useDataIO / exportJSON', () => {
  let taskStore, areaStore, listStore, settingsStore, io

  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    taskStore = useTaskStore()
    areaStore = useAreaStore()
    listStore = useListStore()
    settingsStore = useSettingsStore()
    taskStore.resetAll()
    areaStore.resetAll()
    listStore.resetAll()
    settingsStore.resetSettings()
    taskStore.ensureV3('test')
    io = useDataIO()
  })
  afterEach(() => localStorage.clear())

  it('exportJSON 返回 {ok,pkg,hash}，pkg 通过 v3 validate', async () => {
    taskStore.addTask({ title: 'x', category: 'work', date: '2026-01-01' })
    const r = await io.exportJSON()
    expect(r.ok).toBe(true)
    expect(typeof r.hash).toBe('string')
    const v = validateDataPackageV3(r.pkg)
    expect(v.ok).toBe(true)
    expect(r.compressed).toBe(false)
  })

  it('exportJSON pretty=true 仍能解析为合法 JSON', async () => {
    taskStore.addTask({ title: 'pretty', date: '2026-01-01' })
    const r = await io.exportJSON({ pretty: true })
    expect(r.ok).toBe(true)
    expect(r.content).toContain('\n') // pretty 包含换行
    const parsed = JSON.parse(r.content)
    expect(parsed.version).toBe(3)
  })

  it('exportJSON compressed=true → prefix gz: 且 decompressFromBase64 可逆', async () => {
    const { decompressFromBase64 } = await import('@/utils/compress')
    taskStore.addTask({ title: 'compressed', date: '2026-01-01' })
    const r = await io.exportJSON({ compressed: true })
    expect(r.compressed).toBe(true)
    expect(r.content.startsWith('gz:')).toBe(true)
    const obj = decompressFromBase64(r.content)
    expect(obj.version).toBe(3)
    expect(Array.isArray(obj.tasks)).toBe(true)
    expect(obj.meta.schemaRevision).toBe(SCHEMA_REVISION)
  })

  it('exportJSON withSnapshots=false → pkg.snapshots 未定义或空', async () => {
    const r = await io.exportJSON({ withSnapshots: false })
    expect(r.pkg.snapshots).toBeUndefined()
  })

  it('exportJSON 文件名含 choyeon-todo 前缀 & 时间戳', async () => {
    const r = await io.exportJSON()
    expect(r.path).toMatch(/^choyeon-todo-\d{8}-\d{4}\.json$/)
  })
})

describe('useDataIO / importJSON', () => {
  let taskStore, areaStore, listStore, settingsStore, io

  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    taskStore = useTaskStore()
    areaStore = useAreaStore()
    listStore = useListStore()
    settingsStore = useSettingsStore()
    taskStore.resetAll()
    areaStore.resetAll()
    listStore.resetAll()
    settingsStore.resetSettings()
    taskStore.ensureV3('test')
    io = useDataIO()
  })
  afterEach(() => localStorage.clear())

  it('空字符串 → read/normalize 阶段失败', async () => {
    const r = await io.importJSON('')
    expect(r.ok).toBe(false)
    expect(['read', 'normalize'].includes(r.phase)).toBe(true)
  })

  it('非法 JSON → normalize 阶段失败', async () => {
    const r = await io.importJSON('{ not a valid json')
    expect(r.ok).toBe(false)
    expect(r.phase).toBe('normalize')
  })

  it('导入合法 v3 JSON → 成功写入并返回 imported', async () => {
    const existing = (await io.exportJSON()).pkg
    existing.tasks = existing.tasks.concat([
      {
        id: 'imported_task_1',
        title: '导入任务',
        category: 'work',
        categoryId: 'work',
        date: '2026-02-01',
        time: '09:00',
        completed: false,
        important: true,
        priority: 1,
        reminder: false,
        notes: 'notes',
        tags: [],
        subTasks: [],
        repeat: null,
        order: 99,
        pomodoroSessions: 0,
        totalFocusTime: 0,
        createdAt: 1,
        updatedAt: 2,
        listId: 'work',
        areaId: 'default-area',
        parentId: null,
        blockedBy: [],
        comments: [],
        attachments: [],
        activity: [{ type: 'add', at: 1 }]
      }
    ])
    const r = await io.importJSON(JSON.stringify(existing))
    expect(r.ok).toBe(true)
    expect(typeof r.imported).toBe('number')
    expect(r.imported).toBeGreaterThan(0)
    const found = taskStore.getTaskById('imported_task_1')
    expect(found).toBeTruthy()
    expect(found.title).toBe('导入任务')
  })

  it('v2 JSON → normalize + import 成功（migrate 补齐 v3 字段）', async () => {
    const legacy = makeLegacyV2()
    const r = await io.importJSON(JSON.stringify(legacy))
    expect(r.ok).toBe(true)
    const imported = taskStore.getTaskById('old_a')
    expect(imported).toBeTruthy()
    expect(imported.listId).toBeTruthy()
    expect(imported.areaId).toBeTruthy()
    expect(Array.isArray(imported.blockedBy)).toBe(true)
    expect(Array.isArray(imported.activity)).toBe(true)
    expect(imported.notes).toBe('from v2')
  })

  it('v2 导入后 areas/lists 存在默认项', async () => {
    const legacy = makeLegacyV2()
    const r = await io.importJSON(JSON.stringify(legacy))
    expect(r.ok).toBe(true)
    expect(areaStore.areas.some((a) => a.id === DEFAULT_AREA_ID)).toBe(true)
    expect(listStore.lists.some((l) => l.id === 'work')).toBe(true)
    expect(settingsStore.tasksVersion).toBeGreaterThanOrEqual(3)
  })

  it('导入压缩包（gz: 前缀）→ 成功', async () => {
    const pkg = (await io.exportJSON()).pkg
    pkg.tasks = [
      {
        id: 'gz_task',
        title: 'compressed import',
        category: 'work',
        categoryId: 'work',
        date: '2026-03-01',
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
        updatedAt: 1,
        listId: 'work',
        areaId: DEFAULT_AREA_ID,
        parentId: null,
        blockedBy: [],
        comments: [],
        attachments: [],
        activity: [{ type: 'add', at: 1 }]
      }
    ]
    const { compressToBase64 } = await import('@/utils/compress')
    const compressed = compressToBase64(pkg)
    const r = await io.importJSON(compressed)
    expect(r.ok).toBe(true)
    expect(taskStore.getTaskById('gz_task')).toBeTruthy()
  })

  it('pkg.version=3 但缺 tasks → validate 失败', async () => {
    const bad = (await io.exportJSON()).pkg
    delete bad.tasks
    const r = await io.importJSON(JSON.stringify(bad))
    expect(r.ok).toBe(false)
    expect(r.phase).toBe('validate')
    expect(r.errors.some((e) => e.path === '$.tasks')).toBe(true)
  })

  it('成功 importJSON 返回 warnings 数组', async () => {
    const legacy = makeLegacyV2()
    const r = await io.importJSON(JSON.stringify(legacy))
    expect(Array.isArray(r.warnings)).toBe(true)
  })
})

describe('useDataIO / CSV 往返', () => {
  let taskStore, areaStore, listStore, settingsStore, io

  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    taskStore = useTaskStore()
    areaStore = useAreaStore()
    listStore = useListStore()
    settingsStore = useSettingsStore()
    taskStore.resetAll()
    areaStore.resetAll()
    listStore.resetAll()
    settingsStore.resetSettings()
    taskStore.ensureV3('test')
    io = useDataIO()
  })
  afterEach(() => localStorage.clear())

  it('exportCSV 默认 range=today 导出 header 正确 + rowCount 与 filter 一致', () => {
    const today = new Date()
    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const todayStr = fmt(today)
    taskStore.addTask({ title: 'today a', date: todayStr, category: 'work' })
    taskStore.addTask({ title: 'tomorrow b', date: fmt(new Date(today.getTime() + 86400000)), category: 'work' })
    const r = io.exportCSV({ scope: { range: 'today' } })
    expect(r.ok).toBe(true)
    expect(r.text.split('\n')[0]).toBe(CSV_COLUMNS.join(','))
    expect(r.rowCount).toBe(1)
    expect(r.scope).toEqual({ range: 'today' })
  })

  it('exportCSV range=week 包含本周内任务', () => {
    const today = new Date()
    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const weekFromNow = new Date(today.getTime() + 3 * 86400000)
    taskStore.addTask({ title: 'in 3 days', date: fmt(weekFromNow), category: 'work' })
    const r = io.exportCSV({ scope: { range: 'week' } })
    expect(r.rowCount).toBeGreaterThanOrEqual(1)
  })

  it('exportCSV range=all 导出所有非完成任务 + 完成任务', () => {
    taskStore.addTask({ title: 'a', category: 'other' })
    taskStore.addTask({ title: 'b', category: 'other' })
    taskStore.addTask({ title: 'c', category: 'other' })
    const t = taskStore.tasks[0]
    taskStore.toggleComplete(t.id)
    const r = io.exportCSV({ scope: { range: 'all' } })
    expect(r.rowCount).toBe(taskStore.tasks.length)
  })

  it('exportCSV range=list 按 listId 过滤', () => {
    taskStore.addTask({ title: 'list-only', category: 'work', date: '2026-01-01' })
    taskStore.addTask({ title: 'other-only', category: 'other', date: '2026-01-01' })
    const r = io.exportCSV({ scope: { range: 'list', id: 'work' } })
    for (const row of r.text.split('\n').slice(1)) {
      if (!row.trim()) continue
      // 找到 categoryId / listId 列
      const cols = row.split(',')
      const listIdx = CSV_COLUMNS.indexOf('listId')
      const catIdx = CSV_COLUMNS.indexOf('categoryId')
      expect(cols[listIdx] === 'work' || cols[catIdx] === 'work').toBe(true)
    }
  })

  it('exportCSV 列：blockedBy / tags 用逗号分隔（带引号转义）', () => {
    const t1 = taskStore.addTask({ title: 't1', date: '2026-01-01' })
    const t2 = taskStore.addTask({ title: 't2', date: '2026-01-01' })
    taskStore.updateTask(t1.id, { blockedBy: [t2.id], tags: ['tag_urgent', 'tag_idea'] })
    const r = io.exportCSV({ scope: { range: 'all' } })
    const lines = r.text.split('\n')
    const idx = CSV_COLUMNS.indexOf('blockedBy')
    const tagIdx = CSV_COLUMNS.indexOf('tags')
    const targetLine = lines.find((l) => l.includes('t1'))
    expect(targetLine).toBeTruthy()
    // blockedBy + tags 都包含 csvEscape 后的内容
    expect(targetLine).toContain(t2.id)
    expect(targetLine).toContain('tag_urgent')
  })

  it('importCSV 空文件 → 0 操作', async () => {
    const r = await io.importCSV('id,title\n')
    expect(r.stats.added).toBe(0)
    expect(r.stats.updated).toBe(0)
  })

  it('importCSV 新增任务（无 id 列时走 addTask，也能按标题创建）', async () => {
    const text = ['title,date,priority,categoryId', 'buy milk,2026-05-01,2,work', 'call mom,2026-05-02,4,personal'].join('\n')
    const before = taskStore.tasks.length
    const r = await io.importCSV(text)
    expect(r.ok).toBe(true)
    expect(r.stats.added).toBe(2)
    expect(taskStore.tasks.length - before).toBe(2)
    expect(taskStore.tasks.some((t) => t.title === 'buy milk')).toBe(true)
  })

  it('importCSV 带 id：已存在 → updateTask；不存在 → addTask', async () => {
    const created = taskStore.addTask({ title: 'old', date: '2026-01-01' })
    const newId = 'task_fixed_imported_id_001'
    const rows = [
      'id,title,date,important,priority,blockedBy,tags,notes',
      `${created.id},new title,2026-06-01,true,1,,,"updated notes"`,
      `${newId},brand new task,2026-06-02,false,4,,"tag_urgent,tag_idea",fresh note`
    ].join('\n')
    const r = await io.importCSV(rows)
    expect(r.stats.updated).toBe(1)
    expect(r.stats.added).toBe(1)
    const updated = taskStore.getTaskById(created.id)
    expect(updated.title).toBe('new title')
    expect(updated.important).toBe(true)
    expect(updated.notes).toBe('updated notes')
    const brandNew = taskStore.getTaskById(newId)
    expect(brandNew).toBeTruthy()
    expect(brandNew.tags.includes('tag_urgent')).toBe(true)
    expect(brandNew.priority).toBe(4)
  })

  it('importCSV blockedBy 从逗号分隔解析为数组；非法引用不崩', async () => {
    const t0 = taskStore.addTask({ title: 'dep task', date: '2026-01-01' })
    const t1 = taskStore.addTask({ title: 'blocked task', date: '2026-01-01' })
    const rows = [
      'id,title,date,blockedBy',
      `${t1.id},blocked task updated,2026-01-01,"${t0.id},nonexistent_id"`
    ].join('\n')
    const r = await io.importCSV(rows)
    expect(r.stats.updated).toBe(1)
    const fetched = taskStore.getTaskById(t1.id)
    // blockedBy 仅保留合法 id
    expect(fetched.blockedBy.includes(t0.id)).toBe(true)
  })

  it('CSV 往返：export → import → 数据保留（标题 / 优先级 / 备注）', async () => {
    taskStore.addTask({
      title: 'CSV round-trip',
      category: 'work',
      date: '2026-07-01',
      time: '15:30',
      important: true,
      priority: 1,
      notes: 'round-trip 备注\n包含换行'
    })
    const { text } = io.exportCSV({ scope: { range: 'all' } })
    const nBefore = taskStore.tasks.length
    taskStore.resetAll()
    taskStore.ensureV3('test')
    const r = await io.importCSV(text)
    expect(taskStore.tasks.length).toBeGreaterThanOrEqual(1)
    const t = taskStore.tasks.find((x) => x.title === 'CSV round-trip')
    expect(t).toBeTruthy()
    expect(t.priority).toBe(1)
    expect(t.important).toBe(true)
    expect(t.date).toBe('2026-07-01')
    expect(t.time).toBe('15:30')
    expect(t.notes).toContain('round-trip')
  })

  it('range=month 覆盖本月内任务（与当前月）', () => {
    const d = new Date()
    const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    taskStore.addTask({ title: 'this month', date: `${prefix}-02`, category: 'work' })
    taskStore.addTask({ title: 'next', date: `${prefix}-28`, category: 'work' })
    const r = io.exportCSV({ scope: { range: 'month' } })
    expect(r.rowCount).toBeGreaterThanOrEqual(2)
  })

  it('scope=filter + id 匹配 categoryId/tag', () => {
    taskStore.addTask({ title: 'tag match', tags: ['tag_urgent'], category: 'work', date: '2026-01-01' })
    taskStore.addTask({ title: 'no match', category: 'other', date: '2026-01-01' })
    const r = io.exportCSV({ scope: { range: 'filter', id: 'tag_urgent' } })
    expect(r.rowCount).toBe(1)
  })
})
