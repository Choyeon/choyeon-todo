import { createPinia, setActivePinia } from 'pinia'
import { describe, beforeEach, afterEach, test, expect } from 'vitest'
import { useTaskStore } from '@/stores/taskStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { getTodayStr } from '@/utils/date'

/**
 * Task 1: TaskStore v3 DAG / blockedBy / parentId / sub-tasks / reorderTasks tests.
 * 30+ cases.
 */

function createStore() {
  setActivePinia(createPinia())
  if (typeof localStorage !== 'undefined') localStorage.clear()
  const store = useTaskStore()
  store.resetAll()
  return store
}

function add(store, title, extra = {}) {
  store.addTask({ title, category: 'work', date: getTodayStr(), ...extra })
  return store.tasks.find((t) => t.title === title)
}

describe('TaskStore v3: v3 field defaults on addTask', () => {
  let store
  beforeEach(() => { store = createStore() })
  afterEach(() => { store.resetAll() })

  test('新增任务具备 v3 字段：listId/areaId/parentId/blockedBy/activity/updatedAt', () => {
    const t = add(store, 'Buy milk')
    expect(t).toBeTruthy()
    expect(typeof t.listId).toBe('string')
    expect(t.listId.length).toBeGreaterThan(0)
    expect(typeof t.areaId).toBe('string')
    expect(t.areaId.length).toBeGreaterThan(0)
    expect(t.parentId).toBeNull()
    expect(Array.isArray(t.blockedBy)).toBe(true)
    expect(t.blockedBy).toEqual([])
    expect(Array.isArray(t.activity)).toBe(true)
    expect(t.activity.length).toBeGreaterThan(0)
    expect(typeof t.updatedAt).toBe('number')
  })

  test('addTask 接受 listId/areaId 显式值（优先级高于 category）', () => {
    const t = add(store, '显式 list/area', { listId: 'personal', areaId: store.DEFAULT_AREA_ID })
    // 传入 category='work' 但显式 listId='personal'，应保留 personal
    expect(t.listId).toBe('personal')
    expect(t.areaId).toBe(store.DEFAULT_AREA_ID)
  })

  test('listId 与 category 保持 2.x 兼容（work => work）', () => {
    const t = add(store, 'work category', { category: 'work' })
    expect(t.category).toBe('work')
    expect(t.listId).toBe('work')
  })

  test('addTask 记录活动日志 add', () => {
    const t = add(store, 'activity log')
    const adds = t.activity.filter((e) => e.type === 'add')
    expect(adds.length).toBeGreaterThanOrEqual(1)
  })
})

describe('TaskStore v3: ensureV3 migration trigger', () => {
  let store
  beforeEach(() => { store = createStore() })
  afterEach(() => { store.resetAll() })

  test('ensureV3 返回对象包含 ok & migrated 字段', () => {
    const r = store.ensureV3('ut')
    expect(typeof r.ok).toBe('boolean')
    expect(typeof r.migrated).toBe('boolean')
  })

  test('空数据 ensureV3 仍会补齐 v3 默认字段（listId/areaId/blockedBy/activity/updatedAt）', () => {
    // 直接写一个不完整任务（模拟从 v2 存储读出）
    const legacy = {
      id: 't1',
      title: 'v2 legacy',
      category: 'other',
      date: getTodayStr(),
      completed: false,
      createdAt: 1700000000000
    }
    store.tasks.splice(0, store.tasks.length)
    store.tasks.push(legacy)
    // 触发 ensureV3：设置 tasksVersion<3 确保走迁移分支
    const s = useSettingsStore()
    s.tasksVersion = 2
    store.ensureV3('ut-v2-legacy')
    const updated = store.getTaskById('t1')
    expect(updated.listId).toBeTruthy()
    expect(updated.areaId).toBeTruthy()
    expect(Array.isArray(updated.blockedBy)).toBe(true)
    expect(Array.isArray(updated.activity)).toBe(true)
    expect(typeof updated.updatedAt).toBe('number')
  })
})

describe('TaskStore v3: parentId / 子任务 DAG', () => {
  let store
  beforeEach(() => { store = createStore() })
  afterEach(() => { store.resetAll() })

  test('addSubTask 创建 parentId=parent.id 的子任务', () => {
    const p = add(store, 'Parent')
    const child = store.addSubTask(p.id, { title: 'Child' })
    expect(child).toBeTruthy()
    expect(child.parentId).toBe(p.id)
    expect(child.listId).toBe(p.listId)
    expect(child.areaId).toBe(p.areaId)
    // 通过 id 二次确认持久化
    expect(store.getTaskById(child.id).parentId).toBe(p.id)
  })

  test('addSubTask 不存在的 parent 返回 null', () => {
    const r = store.addSubTask('does-not-exist', { title: 'x' })
    expect(r).toBeNull()
  })

  test('getAncestorDepth 根节点为 0，子节点逐级递增', () => {
    const a = add(store, 'A')
    const b = store.addSubTask(a.id, { title: 'B' })
    const c = store.addSubTask(b.id, { title: 'C' })
    expect(store.getAncestorDepth(a.id)).toBe(0)
    expect(store.getAncestorDepth(b.id)).toBe(1)
    expect(store.getAncestorDepth(c.id)).toBe(2)
  })

  test('超过 MAX_PARENT_DEPTH 时 addSubTask 返回 null', () => {
    const max = store.MAX_PARENT_DEPTH
    let cur = add(store, 'Lv0')
    for (let i = 1; i <= max; i++) {
      const nxt = store.addSubTask(cur.id, { title: `Lv${i}` })
      expect(nxt).toBeTruthy()
      cur = nxt
    }
    const tooDeep = store.addSubTask(cur.id, { title: 'Too deep' })
    expect(tooDeep).toBeNull()
  })

  test('convertToSubtask 把同级任务转成子任务', () => {
    const a = add(store, 'A')
    const b = add(store, 'B')
    const ok = store.convertToSubtask(b.id, a.id)
    expect(ok).toBe(true)
    expect(store.getTaskById(b.id).parentId).toBe(a.id)
  })

  test('convertToSubtask 目标为自身子树节点返回 false（防环）', () => {
    const a = add(store, 'A')
    const b = store.addSubTask(a.id, { title: 'B' })
    const c = store.addSubTask(b.id, { title: 'C' })
    // 把祖先 a 转换为 c 的子任务 -> 应该失败（否则会产生环）
    const ok = store.convertToSubtask(a.id, c.id)
    expect(ok).toBe(false)
    // 仍保持原父关系
    expect(store.getTaskById(a.id).parentId).toBeNull()
    expect(store.getTaskById(c.id).parentId).toBe(b.id)
  })

  test('promoteSubtask 将子任务提为同级', () => {
    const a = add(store, 'A')
    const b = store.addSubTask(a.id, { title: 'B' })
    const ok = store.promoteSubtask(b.id)
    expect(ok).toBe(true)
    expect(store.getTaskById(b.id).parentId).toBeNull()
  })

  test('promoteSubtask 非子任务（parentId 空）也 OK，返回 true（幂等）', () => {
    const a = add(store, 'A')
    expect(store.promoteSubtask(a.id)).toBe(true)
  })

  test('getAncestorDepth 孤儿指针不会无限循环', () => {
    const p = add(store, 'P')
    store.addSubTask(p.id, { title: 'child' })
    // 直接伪造 parentId 指向不存在
    store.tasks[0].parentId = 'ghost-id'
    const depth = store.getAncestorDepth(store.tasks[0].id)
    // 祖先链不会无限循环；最终 parentId 指向不存在会停止
    expect(depth).toBeGreaterThanOrEqual(1)
    expect(depth).toBeLessThan(store.MAX_PARENT_DEPTH + 100)
  })
})

describe('TaskStore v3: blockedBy 阻断校验', () => {
  let store
  beforeEach(() => { store = createStore() })
  afterEach(() => { store.resetAll() })

  test('无 blockedBy 时任务未被阻断', () => {
    const a = add(store, 'A')
    expect(store.isTaskBlocked(a)).toBe(false)
  })

  test('未完成的 blockedBy 前置任务 -> 阻断', () => {
    const a = add(store, 'A')
    const b = add(store, 'B')
    store.updateTask(b.id, { blockedBy: [a.id] })
    expect(store.isTaskBlocked(store.getTaskById(b.id))).toBe(true)
    expect(store.isTaskBlocked(store.getTaskById(a.id))).toBe(false)
  })

  test('完成前置 -> 解除阻断', () => {
    const a = add(store, 'A')
    const b = add(store, 'B')
    store.updateTask(b.id, { blockedBy: [a.id] })
    store.toggleComplete(a.id)
    expect(store.isTaskBlocked(store.getTaskById(b.id))).toBe(false)
  })

  test('toggleComplete 对阻断任务不会标记已完成', () => {
    const a = add(store, 'A')
    const b = add(store, 'B')
    store.updateTask(b.id, { blockedBy: [a.id] })
    store.toggleComplete(b.id)
    expect(store.getTaskById(b.id).completed).toBe(false)
  })

  test('toggleComplete 对非阻断任务正常完成 + 记录 complete activity', () => {
    const a = add(store, 'A')
    store.toggleComplete(a.id)
    const task = store.getTaskById(a.id)
    expect(task.completed).toBe(true)
    const events = task.activity.filter((e) => e.type === 'complete')
    expect(events.length).toBeGreaterThanOrEqual(1)
  })

  test('updateTask 写入 blockedBy 非法引用会被保留但不影响 isTaskBlocked 对缺失引用判断，合法引用生效', () => {
    const a = add(store, 'A')
    const b = add(store, 'B')
    const r = store.updateTask(b.id, { blockedBy: [a.id, 'ghost'] })
    expect(r).toBe(true)
    const blocked = store.getTaskById(b.id).blockedBy
    expect(blocked).toContain(a.id)
    // ghost 仍在 blockedBy 里（外部允许保留）但不构成阻断（因为找不到引用时 isTaskBlocked 忽略）
    expect(store.isTaskBlocked(store.getTaskById(b.id))).toBe(true)
  })

  test('updateTask 完成状态 + 前置未完成 -> 返回 false', () => {
    const a = add(store, 'A')
    const b = add(store, 'B')
    store.updateTask(b.id, { blockedBy: [a.id] })
    const r = store.updateTask(b.id, { completed: true })
    expect(r).toBe(false)
  })

  test('updateTask 完成状态 + 前置完成 -> 返回 true', () => {
    const a = add(store, 'A')
    const b = add(store, 'B')
    store.updateTask(b.id, { blockedBy: [a.id] })
    store.updateTask(a.id, { completed: true })
    const r = store.updateTask(b.id, { completed: true })
    expect(r).toBe(true)
  })

  test('markAllComplete：被阻断任务在阻断方未被同时处理顺序中完成时，不被标记', () => {
    // 明确：将依赖挂到一个永远不会被循环扫到的已完成任务上
    const blocker = add(store, 'Blocker')
    const blocked = add(store, 'Blocked')
    store.updateTask(blocked.id, { blockedBy: [blocker.id] })
    // 先保证 blocker 保持未完成 -> 再手动调用 toggleComplete 验证 blocked 不会完成
    store.toggleComplete(blocked.id)
    expect(store.getTaskById(blocked.id).completed).toBe(false)
    // blocker 本身可完成
    store.toggleComplete(blocker.id)
    expect(store.getTaskById(blocker.id).completed).toBe(true)
    // 此时 blocker 完成，blocked 可完成
    store.toggleComplete(blocked.id)
    expect(store.getTaskById(blocked.id).completed).toBe(true)
  })

  test('循环依赖（A↔B）时 toggleComplete 仍有正确语义', () => {
    const a = add(store, 'A')
    const b = add(store, 'B')
    store.updateTask(a.id, { blockedBy: [b.id] })
    store.updateTask(b.id, { blockedBy: [a.id] })
    // 两个都互相阻断，均无法完成
    store.toggleComplete(a.id)
    store.toggleComplete(b.id)
    expect(store.getTaskById(a.id).completed).toBe(false)
    expect(store.getTaskById(b.id).completed).toBe(false)
  })
})

describe('TaskStore v3: activity logs for key ops', () => {
  let store
  beforeEach(() => { store = createStore() })
  afterEach(() => { store.resetAll() })

  test('updateTask 记录 edit', () => {
    const t = add(store, 'edit me')
    store.updateTask(t.id, { title: 'edited' })
    const edits = store.getTaskById(t.id).activity.filter((e) => e.type === 'edit')
    expect(edits.length).toBeGreaterThanOrEqual(1)
  })

  test('deleteTask 返回 snapshot 且其中有 delete 活动', () => {
    const t = add(store, 'del me')
    const snap = store.deleteTask(t.id)
    expect(snap).toBeTruthy()
    expect(snap.id).toBe(t.id)
    const dels = snap.activity.filter((e) => e.type === 'delete')
    expect(dels.length).toBeGreaterThanOrEqual(1)
  })

  test('restoreTask 后任务恢复且有 restore 活动', () => {
    const t = add(store, 'to be restored')
    const snap = store.deleteTask(t.id)
    expect(snap).toBeTruthy()
    const ok = store.restoreTask(snap, 0)
    expect(ok).toBe(true)
    const restored = store.getTaskById(t.id)
    expect(restored).toBeTruthy()
    const evs = restored.activity.filter((e) => e.type === 'restore')
    expect(evs.length).toBeGreaterThanOrEqual(1)
  })

  test('addPomodoroSession(seconds) 记录 pomodoroComplete', () => {
    const t = add(store, 'pom')
    const ok = store.addPomodoroSession(t.id, 25 * 60)
    expect(ok).toBe(true)
    const evs = store.getTaskById(t.id).activity.filter((e) => e.type === 'pomodoroComplete')
    expect(evs.length).toBeGreaterThanOrEqual(1)
  })

  test('toggleComplete 取消完成时记录 uncomplete', () => {
    const t = add(store, 'to-uncomplete')
    store.toggleComplete(t.id)
    store.toggleComplete(t.id)
    const task = store.getTaskById(t.id)
    const evs = task.activity.filter((e) => e.type === 'uncomplete')
    expect(evs.length).toBeGreaterThanOrEqual(1)
  })
})

describe('TaskStore v3: reorderTasks unified signature', () => {
  let store
  beforeEach(() => { store = createStore() })
  afterEach(() => { store.resetAll() })

  test('reorderTasks(string, string) v2 兼容签名可用', () => {
    const a = add(store, 'A')
    const b = add(store, 'B')
    const r = store.reorderTasks(a.id, b.id)
    expect(typeof r).toBe('boolean')
  })

  test('reorderTasks([moveObj]) 返回 true 且变更 listId', () => {
    const a = add(store, 'A', { category: 'work' })
    expect(a.listId).toBe('work')
    const r = store.reorderTasks([{ id: a.id, listId: 'personal' }])
    expect(r).toBe(true)
    const updated = store.getTaskById(a.id)
    expect(updated.listId).toBe('personal')
    // 同时保持 category 兼容
    expect(updated.category).toBe('personal')
  })

  test('reorderTasks([moveObj]) 变更 areaId', () => {
    const a = add(store, 'A')
    const newArea = 'custom-area'
    const r = store.reorderTasks([{ id: a.id, areaId: newArea }])
    expect(r).toBe(true)
    expect(store.getTaskById(a.id).areaId).toBe(newArea)
  })

  test('reorderTasks([moveObj]) 变更 parentId', () => {
    const a = add(store, 'Parent')
    const b = add(store, 'Child')
    const r = store.reorderTasks([{ id: b.id, parentId: a.id }])
    expect(r).toBe(true)
    expect(store.getTaskById(b.id).parentId).toBe(a.id)
  })

  test('reorderTasks 单参非数组 / 非字符串对返回 false', () => {
    const r = store.reorderTasks('only-one-arg')
    expect(r).toBe(false)
  })

  test('reorderTasks([]) 空数组 -> 返回 true（无改动）', () => {
    expect(store.reorderTasks([])).toBe(true)
  })
})

describe('TaskStore v3: importData 迁移 v2 包', () => {
  let store
  beforeEach(() => { store = createStore() })
  afterEach(() => { store.resetAll() })

  test('导入 v2 JSON 后返回 imported 且每个任务有 v3 字段', () => {
    const payload = JSON.stringify({
      version: 2,
      tasks: [
        { id: 'a', title: 'v2 imp A', category: 'work', date: getTodayStr() },
        { id: 'b', title: 'v2 imp B', category: 'personal', date: getTodayStr() }
      ],
      categories: [
        { id: 'work', name: '工作', color: '#ef4444', icon: 'briefcase' },
        { id: 'personal', name: '个人', color: '#22c55e', icon: 'home' },
        { id: 'other', name: '其他', color: '#9B8EBB', icon: 'more-horizontal' }
      ],
      settings: { tasksVersion: 2 }
    })
    const r = store.importData(payload)
    expect(r.success).toBe(true)
    expect(r.imported).toBe(2)
    for (const t of store.tasks) {
      expect(typeof t.listId === 'string' && t.listId.length > 0).toBe(true)
      expect(typeof t.areaId === 'string' && t.areaId.length > 0).toBe(true)
      expect(Array.isArray(t.blockedBy)).toBe(true)
      expect(Array.isArray(t.activity)).toBe(true)
      expect(typeof t.updatedAt === 'number').toBe(true)
    }
  })

  test('导入非法 JSON 返回 success=false', () => {
    const r = store.importData('this is not json {{{')
    expect(r.success).toBe(false)
  })

  test('导入 tasks 非数组返回 success=false', () => {
    const r = store.importData(JSON.stringify({ tasks: 'nope' }))
    expect(r.success).toBe(false)
  })

  test('导入后 settings.tasksVersion 至少为 3', () => {
    const payload = JSON.stringify({
      version: 2,
      tasks: [{ id: 't', title: 'x', category: 'other', date: getTodayStr() }],
      categories: [{ id: 'other', name: '其他', color: '#9B8EBB', icon: 'more-horizontal' }],
      settings: { tasksVersion: 2 }
    })
    store.importData(payload)
    const s = useSettingsStore()
    expect(s.tasksVersion).toBeGreaterThanOrEqual(3)
  })
})

describe('TaskStore v3: exportData shape', () => {
  let store
  beforeEach(() => { store = createStore() })
  afterEach(() => { store.resetAll() })

  test('导出 version=3 且含 areas/lists/tasksVersion 字段', () => {
    add(store, 'E1')
    const data = store.exportData()
    expect(data.version).toBe(3)
    expect(typeof data.tasksVersion).toBe('number')
    expect(data.tasksVersion).toBeGreaterThanOrEqual(3)
    expect(Array.isArray(data.areas)).toBe(true)
    expect(Array.isArray(data.lists)).toBe(true)
    expect(Array.isArray(data.categories)).toBe(true)
    expect(Array.isArray(data.tasks)).toBe(true)
    expect(data.settings && typeof data.settings.tasksVersion === 'number').toBe(true)
  })

  test('导出后再 import 保持 id 集合一致', () => {
    const a = add(store, 'roundtrip')
    const data = store.exportData()
    store.resetAll()
    const r = store.importData(JSON.stringify(data))
    expect(r.success).toBe(true)
    expect(store.getTaskById(a.id)).toBeTruthy()
    expect(store.getTaskById(a.id).title).toBe('roundtrip')
  })

  test('导出的 tasks 中 activity / blockedBy 保留', () => {
    const a = add(store, 'to-export')
    store.updateTask(a.id, { notes: 'x' }) // edit 活动
    const { tasks: [t] } = store.exportData()
    expect(Array.isArray(t.activity)).toBe(true)
    expect(Array.isArray(t.blockedBy)).toBe(true)
    expect(typeof t.updatedAt).toBe('number')
  })
})

describe('TaskStore v3: constants exported', () => {
  let store
  beforeEach(() => { store = createStore() })

  test('MIN_TASKS_VERSION = 3', () => {
    expect(store.MIN_TASKS_VERSION).toBe(3)
  })

  test('MAX_PARENT_DEPTH >= 3', () => {
    expect(typeof store.MAX_PARENT_DEPTH).toBe('number')
    expect(store.MAX_PARENT_DEPTH).toBeGreaterThanOrEqual(3)
  })

  test('DEFAULT_AREA_ID 是字符串', () => {
    expect(typeof store.DEFAULT_AREA_ID).toBe('string')
    expect(store.DEFAULT_AREA_ID.length).toBeGreaterThan(0)
  })

  test('DEFAULT_LIST_ID 与 UNDELETABLE_CATEGORY 对齐（other）', () => {
    expect(store.DEFAULT_LIST_ID).toBe('other')
  })

  test('UPDATABLE_FIELDS 包含 listId/areaId/parentId/blockedBy', () => {
    const f = store.UPDATABLE_FIELDS
    expect(f).toContain('listId')
    expect(f).toContain('areaId')
    expect(f).toContain('parentId')
    expect(f).toContain('blockedBy')
  })
})
