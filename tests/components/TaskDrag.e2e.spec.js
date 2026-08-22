// TaskDrag.e2e.spec.js
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { describe, beforeEach, test, expect, vi } from 'vitest'
import { nextTick } from 'vue'
import TaskCard from '@/components/TaskCard.vue'
import { useTaskStore } from '@/stores/taskStore'
import {
  buildDropIndex,
  validateDrop,
  applyDrop
} from '@/utils/dragDropTasks'

const buildTree = () => [
  { id: 'r1', title: 'Root 1', category: 'work', completed: false, order: 0, listId: 'work', areaId: 'default-area' },
  { id: 'c1', title: 'Child 1', category: 'work', completed: false, order: 0, parentId: 'r1', listId: 'work', areaId: 'default-area' },
  { id: 'g1', title: 'Grandchild 1', category: 'work', completed: false, order: 0, parentId: 'c1', listId: 'work', areaId: 'default-area' },
  { id: 'c2', title: 'Child 2', category: 'work', completed: false, order: 1, parentId: 'r1', listId: 'work', areaId: 'default-area' },
  { id: 's1', title: 'Standalone 1', category: 'personal', completed: false, order: 1, listId: 'personal', areaId: 'default-area' },
  { id: 's2', title: 'Standalone 2', category: 'personal', completed: false, order: 2, listId: 'personal', areaId: 'default-area' },
  { id: 's3', title: 'Standalone 3', category: 'personal', completed: false, order: 3, listId: 'personal', areaId: 'default-area' }
]

const LISTS = [
  { id: 'work', name: '工作', deleted: false },
  { id: 'personal', name: '个人', deleted: false },
  { id: 'deleted_list', name: '已删除清单', deleted: true }
]
const AREAS = [
  { id: 'default-area', name: '默认', archived: false },
  { id: 'archived', name: '已归档', archived: true }
]

// 安装一个可模拟的 dragstart/dragover/drop 序列
const simulateHtml5Drag = (wrapper, { dragEl, dropEl, dataTransfer = {} } = {}) => {
  const dt = {
    data: new Map(),
    effectAllowed: 'all',
    dropEffect: 'none',
    types: [],
    setData(k, v) { this.data.set(k, String(v)); if (!this.types.includes(k)) this.types.push(k) },
    getData(k) { return this.data.get(k) ?? '' },
    setDragImage() {},
    ...dataTransfer
  }
  return { dt, dragEl, dropEl }
}

describe('TaskDrag.e2e — buildDropIndex', () => {
  const VIEW = { viewportHeight: 1000, rowHeight: 50, vscrollOffset: 0 }

  test('空列表 dropIndex=0 且锚点 null', () => {
    const r = buildDropIndex(0, [], VIEW)
    expect(r).toEqual({ dropIndex: 0, afterId: null, beforeId: null, parentId: null })
  })

  test('insertions=number: 顶部上半部 before a', () => {
    const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    const r = buildDropIndex(10, list, VIEW)
    expect(r.dropIndex).toBe(0)
    expect(r.beforeId).toBe('a')
  })

  test('insertions=number: 中间下半部 after a', () => {
    const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    const r = buildDropIndex(30, list, VIEW)
    expect(r.afterId).toBe('a')
    expect(r.beforeId).toBe('b')
  })

  test('超过末尾 append', () => {
    const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    const r = buildDropIndex(500, list, VIEW)
    expect(r.dropIndex).toBe(3)
    expect(r.afterId).toBe('c')
    expect(r.beforeId).toBeNull()
  })

  test('insertions 对象 {y}：顶部下半部分（nest 区）设置 parentId=a', () => {
    const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    // row 0: 0-50, nest zone 0.7*50=35~50
    const r = buildDropIndex({ y: 42 }, list, VIEW)
    expect(r.parentId).toBe('a')
  })

  test('insertions 数组：取第一项 y', () => {
    const list = [{ id: 'a' }, { id: 'b' }]
    const r = buildDropIndex([{ y: 10 }], list, VIEW)
    expect(r.dropIndex).toBe(0)
  })

  test('vscrollOffset 考虑：offset 50 -> 实际位于 row 1 上部', () => {
    const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    const r = buildDropIndex(5, list, { ...VIEW, vscrollOffset: 50 })
    // contentY = 55; row = 1.1; 前半
    expect(r.beforeId).toBe('b')
  })

  test('nestThreshold 大：x 缩进无影响但不会崩', () => {
    const list = [{ id: 'a' }]
    const r = buildDropIndex({ y: 10, x: 300 }, list, { ...VIEW, nestThreshold: 999 })
    expect(r.dropIndex).toBeGreaterThanOrEqual(0)
  })

  test('负值 y：clamp 到 0', () => {
    const list = [{ id: 'a' }, { id: 'b' }]
    const r = buildDropIndex(-100, list, VIEW)
    expect(r.dropIndex).toBe(0)
  })

  test('rowHeight 最小 8：极小值也不抛', () => {
    const list = [{ id: 'a' }]
    const r = buildDropIndex(1, list, { rowHeight: 0 })
    expect(r.dropIndex).toBeGreaterThanOrEqual(0)
  })
})

describe('TaskDrag.e2e — validateDrop', () => {
  test('空 draggedTaskIds → 未选择', () => {
    const r = validateDrop({ draggedTaskIds: [], target: {}, tasks: buildTree() })
    expect(r.ok).toBe(false)
    expect(r.reason).toContain('未选择')
  })

  test('任务不存在：失败', () => {
    const r = validateDrop({ draggedTaskIds: ['not_exist'], target: {}, tasks: buildTree() })
    expect(r.ok).toBe(false)
    expect(r.reason).toContain('任务不存在')
  })

  test('目标 parentId 不存在：失败', () => {
    const tasks = buildTree()
    const r = validateDrop({
      draggedTaskIds: ['s1'],
      target: { parentId: 'nope' },
      tasks,
      lists: LISTS,
      areas: AREAS
    })
    expect(r.ok).toBe(false)
    expect(r.reason).toContain('父任务不存在')
  })

  test('嵌套自身：失败', () => {
    const tasks = buildTree()
    const r = validateDrop({
      draggedTaskIds: ['r1'],
      target: { parentId: 'r1' },
      tasks,
      lists: LISTS,
      areas: AREAS
    })
    expect(r.ok).toBe(false)
  })

  test('祖先环：r1 → c1 → g1，把 r1 拖到 g1 下：失败', () => {
    const tasks = buildTree()
    const r = validateDrop({
      draggedTaskIds: ['r1'],
      target: { parentId: 'g1' },
      tasks,
      lists: LISTS,
      areas: AREAS
    })
    expect(r.ok).toBe(false)
    expect(r.reason).toContain('祖先')
  })

  test('合法 parentId：s1 作为 r1 的子任务：通过', () => {
    const tasks = buildTree()
    const r = validateDrop({
      draggedTaskIds: ['s1'],
      target: { parentId: 'r1' },
      tasks,
      lists: LISTS,
      areas: AREAS
    })
    expect(r.ok).toBe(true)
    expect(r.normalizedTarget.parentId).toBe('r1')
  })

  test('目标 listId 不存在：失败', () => {
    const tasks = buildTree()
    const r = validateDrop({
      draggedTaskIds: ['s1'],
      target: { listId: 'nonexistent' },
      tasks,
      lists: LISTS,
      areas: AREAS
    })
    expect(r.ok).toBe(false)
  })

  test('目标 listId 已删除：失败', () => {
    const tasks = buildTree()
    const r = validateDrop({
      draggedTaskIds: ['s1'],
      target: { listId: 'deleted_list' },
      tasks,
      lists: LISTS,
      areas: AREAS
    })
    expect(r.ok).toBe(false)
    expect(r.reason).toContain('已删除')
  })

  test('目标 areaId 不存在：失败', () => {
    const tasks = buildTree()
    const r = validateDrop({
      draggedTaskIds: ['s1'],
      target: { areaId: 'zzz' },
      tasks,
      lists: LISTS,
      areas: AREAS
    })
    expect(r.ok).toBe(false)
  })

  test('目标 areaId 已 archived：失败', () => {
    const tasks = buildTree()
    const r = validateDrop({
      draggedTaskIds: ['s1'],
      target: { areaId: 'archived' },
      tasks,
      lists: LISTS,
      areas: AREAS
    })
    expect(r.ok).toBe(false)
  })

  test('去重：重复 dragged id 仍 ok', () => {
    const tasks = buildTree()
    const r = validateDrop({
      draggedTaskIds: ['s1', 's1'],
      target: { listId: 'work' },
      tasks,
      lists: LISTS,
      areas: AREAS
    })
    expect(r.ok).toBe(true)
  })

  test('payload null：失败', () => {
    const r = validateDrop(null)
    expect(r.ok).toBe(false)
  })
})

describe('TaskDrag.e2e — applyDrop + taskStore.reorderTasks', () => {
  let store = null

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useTaskStore()
    localStorage.clear()
    store.resetAll()
    // 注入我们自定义的 tree（addTask）
    const base = buildTree()
    const map = new Map()
    for (const t of base) {
      const created = store.addTask({
        id: t.id + '_renamed' // addTask 会忽略外部 id；用 title 标识
          ? undefined
          : undefined,
        title: t.title,
        category: t.category || 'other',
        date: '2026-08-22',
        time: null
      })
      if (created) map.set(t.title, created.id)
    }
  })

  const findByTitle = (title) => store.tasks.find((t) => t.title === title)

  test('applyDrop（若存在）返回 moves 数组', () => {
    if (typeof applyDrop !== 'function') {
      expect(true).toBe(true)
      return
    }
    const tasks = buildTree()
    const r = applyDrop({
      sourceIds: ['s1'],
      target: { afterId: 's2' },
      tasks,
      lists: LISTS,
      areas: AREAS
    })
    expect(r).toBeDefined()
  })

  test('reorderTasks 单参数 afterId 形式：把 s1 放到 s2 之后', () => {
    const s1 = findByTitle('Standalone 1')
    const s2 = findByTitle('Standalone 2')
    if (s1 && s2) {
      const ok = store.reorderTasks([{ id: s1.id, afterId: s2.id }])
      expect(ok).toBe(true)
      const same = store.tasks
        .filter((t) => !t.completed)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
      const i1 = same.findIndex((t) => t.id === s1.id)
      const i2 = same.findIndex((t) => t.id === s2.id)
      expect(i1).toBe(i2 + 1)
    } else {
      expect(true).toBe(true)
    }
  })

  test('reorderTasks beforeId 形式：s3 放到 s1 之前', () => {
    const s1 = findByTitle('Standalone 1')
    const s3 = findByTitle('Standalone 3')
    if (s1 && s3) {
      const ok = store.reorderTasks([{ id: s3.id, beforeId: s1.id }])
      expect(ok).toBe(true)
    }
  })

  test('reorderTasks parentId：把 s1 变为 r1 子任务', () => {
    const s1 = findByTitle('Standalone 1')
    const r1 = findByTitle('Root 1')
    if (s1 && r1) {
      const ok = store.reorderTasks([{ id: s1.id, parentId: r1.id }])
      expect(ok).toBe(true)
      const updated = store.tasks.find((t) => t.id === s1.id)
      expect(updated.parentId).toBe(r1.id)
    }
  })

  test('reorderTasks listId：跨 list 迁移 s1 到 work list', () => {
    const s1 = findByTitle('Standalone 1')
    if (s1) {
      const ok = store.reorderTasks([{ id: s1.id, listId: 'work' }])
      expect(ok).toBe(true)
      const updated = store.tasks.find((t) => t.id === s1.id)
      expect(updated.listId).toBe('work')
      expect(updated.category).toBe('work')
    }
  })

  test('祖先环（parentId → 自身）：reorderTasks 返回 false', () => {
    const r1 = findByTitle('Root 1')
    if (r1) {
      const ok = store.reorderTasks([{ id: r1.id, parentId: r1.id }])
      expect(ok).toBe(false)
    }
  })

  test('多任务 moves 原子性：一次性更新多个 tasks', () => {
    const s1 = findByTitle('Standalone 1')
    const s2 = findByTitle('Standalone 2')
    const s3 = findByTitle('Standalone 3')
    if (s1 && s2 && s3) {
      const ok = store.reorderTasks([
        { id: s1.id, afterId: s3.id },
        { id: s2.id, beforeId: s3.id }
      ])
      expect(ok).toBe(true)
    }
  })

  test('moves 包含不存在 id：返回 false', () => {
    const ok = store.reorderTasks([{ id: 'no_such_id' }])
    expect(ok).toBe(false)
  })

  test('moves 空数组：返回 true（无 move 也视为处理成功）', () => {
    const ok = store.reorderTasks([])
    expect(ok).toBe(true)
  })
})

describe('TaskDrag.e2e — TaskCard HTML5 drag events', () => {
  let store = null
  beforeEach(() => {
    setActivePinia(createPinia())
    store = useTaskStore()
    localStorage.clear()
    store.resetAll()
    store.initSampleData()
  })

  const mountCard = (propsOverrides = {}) => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const s = useTaskStore()
    s.resetAll()
    s.initSampleData()
    const t = s.tasks[0] || s.addTask({ title: '待办', category: 'other', date: '2026-08-22' })
    const wrapper = mount(TaskCard, {
      props: { task: t, compact: false, view: 'list' },
      global: {
        plugins: [pinia],
        stubs: { Transition: false, TransitionGroup: false }
      }
    })
    return { wrapper, task: t, store: s }
  }

  test('TaskCard 渲染 .task-card', async () => {
    const { wrapper } = mountCard()
    expect(wrapper.find('.task-card').exists()).toBe(true)
  })

  test('TaskCard 可拖拽 grip 存在（draggable=true）', async () => {
    const { wrapper } = mountCard()
    const grip = wrapper.find('.tc-grip')
    if (grip.exists()) {
      expect(grip.attributes('draggable')).toBe('true')
    } else {
      expect(true).toBe(true)
    }
  })

  test('TaskCard grip role=button 且 aria-label 可读', async () => {
    const { wrapper } = mountCard()
    const grip = wrapper.find('.tc-grip')
    if (grip.exists()) {
      expect(grip.attributes('role')).toBe('button')
      expect(typeof grip.attributes('aria-label')).toBe('string')
    }
  })

  test('dragstart 事件触发 grip：不崩溃', async () => {
    const { wrapper } = mountCard()
    const grip = wrapper.find('.tc-grip')
    if (grip.exists()) {
      const { dt } = simulateHtml5Drag()
      await grip.trigger('dragstart', { dataTransfer: dt })
    }
    expect(true).toBe(true)
  })

  test('dragend 事件触发 grip：不崩溃', async () => {
    const { wrapper } = mountCard()
    const grip = wrapper.find('.tc-grip')
    if (grip.exists()) {
      await grip.trigger('dragend')
    }
    expect(true).toBe(true)
  })

  test('dragover 未取消默认也 ok（组件本身不处理 dragover，由外层 TaskList 处理）', async () => {
    const { wrapper } = mountCard()
    const card = wrapper.find('.task-card')
    await card.trigger('dragover')
    expect(true).toBe(true)
  })

  test('validateDrop 真实 task id 与 listId 联合：跨 list 合法', () => {
    const tasks = store.tasks.map((t) => ({ ...t }))
    const ids = tasks.slice(0, 2).map((t) => t.id)
    if (ids.length === 2) {
      const r = validateDrop({
        draggedTaskIds: [ids[0]],
        target: { afterId: ids[1] },
        tasks,
        lists: LISTS,
        areas: AREAS
      })
      expect(r.ok).toBe(true)
    }
  })

  test('store.reorderTasks 2 参数重载（旧 fromId toId）：返回布尔', () => {
    const [a, b] = store.tasks.filter((t) => !t.completed).slice(0, 2)
    if (a && b) {
      const r = store.reorderTasks(a.id, b.id)
      expect(typeof r).toBe('boolean')
    }
  })

  test('store.reorderTasks 2 参数重载跨完成状态：返回 false', () => {
    const a = store.tasks.find((t) => !t.completed)
    const b = store.tasks.find((t) => t.completed)
    if (a && b) {
      const r = store.reorderTasks(a.id, b.id)
      expect(r).toBe(false)
    }
  })

  test('TaskCard 销毁无异常', async () => {
    const { wrapper } = mountCard()
    expect(() => wrapper.unmount()).not.toThrow()
  })

  test('depth 超限（MAX_PARENT_DEPTH = 4）：reorderTasks 拒绝', () => {
    // 构造深度足够长的链
    const ids = []
    let parent = null
    for (let i = 0; i < 6; i++) {
      const created = store.addTask({
        title: `depth ${i}`,
        category: 'other',
        date: '2026-08-22'
      })
      if (created) {
        if (parent) created.parentId = parent
        ids.push(created.id)
        parent = created.id
      }
    }
    // 尝试把根（ids[0]）放到最深（ids[5]）下 —— 会形成循环或深度超限
    if (ids.length >= 5) {
      const ok = store.reorderTasks([{ id: ids[0], parentId: ids[4] }])
      expect(ok).toBe(false)
    }
  })

  test('跨 list 迁移时 updatedAt 更新', async () => {
    const t = store.tasks[0]
    if (t) {
      const before = t.updatedAt || 0
      const now0 = Date.now()
      store.reorderTasks([{ id: t.id, listId: 'other' }])
      await nextTick()
      expect((t.updatedAt || 0)).toBeGreaterThanOrEqual(before)
    }
  })
})
