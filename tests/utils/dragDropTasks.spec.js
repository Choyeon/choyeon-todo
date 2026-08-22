import { describe, test, expect } from 'vitest'
import { buildDropIndex, validateDrop, applyDrop } from '@/utils/dragDropTasks'

// 辅助：构造任务
const buildTree = () => {
  // 层级结构：
  // root (r1)
  //   - child (c1, parentId=r1)
  //     - grandchild (g1, parentId=c1)
  //   - child (c2, parentId=r1)
  // standalone (s1)
  // deleted_parent (d1) — 存在但用于负向
  return [
    { id: 'r1', title: 'Root 1', category: 'work', completed: false, order: 0 },
    { id: 'c1', title: 'Child 1', category: 'work', completed: false, order: 0, parentId: 'r1' },
    { id: 'g1', title: 'Grandchild 1', category: 'work', completed: false, order: 0, parentId: 'c1' },
    { id: 'c2', title: 'Child 2', category: 'work', completed: false, order: 1, parentId: 'r1' },
    { id: 's1', title: 'Standalone 1', category: 'personal', completed: false, order: 1 },
    { id: 's2', title: 'Standalone 2', category: 'personal', completed: false, order: 2 },
    { id: 's3', title: 'Standalone 3', category: 'personal', completed: false, order: 3 }
  ]
}

const LISTS = [
  { id: 'list_work', name: '工作清单', deleted: false },
  { id: 'list_personal', name: '个人清单', deleted: false },
  { id: 'list_deleted', name: '已删除清单', deleted: true }
]

const AREAS = [
  { id: 'area_p1', name: '项目 1', archived: false },
  { id: 'area_deleted', name: '归档区域', archived: true }
]

describe('dragDropTasks — buildDropIndex', () => {
  const VIEW = { viewportHeight: 1000, rowHeight: 50, vscrollOffset: 0 }

  test('空 currentList → dropIndex=0，锚点均 null', () => {
    const r = buildDropIndex(0, [], VIEW)
    expect(r.dropIndex).toBe(0)
    expect(r.afterId).toBeNull()
    expect(r.beforeId).toBeNull()
    expect(r.parentId).toBeNull()
  })

  test('insertions 为数字：放到第 0 行之前（上半部）', () => {
    const list = [
      { id: 'a' },
      { id: 'b' },
      { id: 'c' }
    ]
    // y=10 位于第 0 行上半部 (<25)
    const r = buildDropIndex(10, list, VIEW)
    expect(r.dropIndex).toBe(0)
    expect(r.beforeId).toBe('a')
    expect(r.afterId).toBeNull()
  })

  test('放到第 0 行中间位置（下半部）— 在 a 之后 b 之前', () => {
    const list = [
      { id: 'a' },
      { id: 'b' },
      { id: 'c' }
    ]
    // y=30 处于第 0 行下半部 (>25)
    const r = buildDropIndex(30, list, VIEW)
    expect(r.dropIndex).toBe(1)
    expect(r.afterId).toBe('a')
    expect(r.beforeId).toBe('b')
  })

  test('放到超过末尾，追加到末尾', () => {
    const list = [
      { id: 'a' },
      { id: 'b' },
      { id: 'c' }
    ]
    const r = buildDropIndex(300, list, VIEW) // row 50*3=150 以外
    expect(r.dropIndex).toBe(3)
    expect(r.afterId).toBe('c')
    expect(r.beforeId).toBeNull()
  })

  test('负数 Y → 视为 0（第 0 行前）', () => {
    const list = [
      { id: 'a' },
      { id: 'b' }
    ]
    const r = buildDropIndex(-10, list, VIEW)
    expect(r.dropIndex).toBe(0)
    expect(r.beforeId).toBe('a')
  })

  test('insertions 为对象形式：{y}', () => {
    const list = [{ id: 'a' }, { id: 'b' }]
    const r = buildDropIndex({ y: 60 }, list, VIEW) // 第 1 行上半部
    expect(r.dropIndex).toBe(1)
    expect(r.afterId).toBe('a')
    expect(r.beforeId).toBe('b')
  })

  test('insertions 为数组形式 [y]', () => {
    const list = [{ id: 'a' }, { id: 'b' }]
    const r = buildDropIndex([60], list, VIEW)
    expect(r.dropIndex).toBe(1)
    expect(r.afterId).toBe('a')
  })

  test('insertions 为空数组 → 追加末尾', () => {
    const list = [{ id: 'a' }, { id: 'b' }]
    const r = buildDropIndex([], list, VIEW)
    expect(r.dropIndex).toBe(2)
  })

  test('考虑 vscrollOffset：滚动 50px，y=28 表示内容空间 y=78（第 1 行 AFTER 区 50%~70%）', () => {
    const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]
    const r = buildDropIndex({ y: 28 }, list, {
      viewportHeight: 1000,
      rowHeight: 50,
      vscrollOffset: 50
    })
    // contentY = 28 + 50 = 78 → row 1 (50~100)
    // offsetInRow = 78 - 50 = 28 → [25, 35) = AFTER 模式 → insert after row1(b)
    expect(r.dropIndex).toBe(2)
    expect(r.afterId).toBe('b')
    expect(r.beforeId).toBe('c')
  })

  test('下 30% 行位置检测 parentId（嵌套）', () => {
    const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    // row 0 内 offset 45/50 = 90% → nest
    const r = buildDropIndex(45, list, VIEW)
    expect(r.parentId).toBe('a')
    expect(r.dropIndex).toBe(1)
  })

  test('beforeId 和 afterId 一致性：不能同时指向同一个位置', () => {
    const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    // 遍历所有行位置
    for (let y = 0; y < 200; y += 5) {
      const r = buildDropIndex(y, list, VIEW)
      // afterId、beforeId、parentId 不能同时存在冲突
      if (r.parentId) {
        expect(r.dropIndex).toBeGreaterThan(0)
      } else if (r.dropIndex === 0) {
        expect(r.afterId).toBeNull()
      } else if (r.dropIndex === list.length) {
        expect(r.beforeId).toBeNull()
      }
    }
  })

  test('单行列表：放置在行下半部（嵌套父级）的 parentId 正确', () => {
    const list = [{ id: 'a' }]
    const r = buildDropIndex(45, list, VIEW)
    expect(r.parentId).toBe('a')
    expect(r.dropIndex).toBe(1)
  })

  test('默认 rowHeight=48（未传）', () => {
    const list = [{ id: 'a' }, { id: 'b' }]
    // 无 rowHeight → 默认 48
    // y=28: offsetInRow=28, 区间 [0.5*48=24, 0.7*48=33.6) = AFTER 区
    const r = buildDropIndex(28, list, { viewportHeight: 800 })
    expect(r.dropIndex).toBe(1)
    expect(r.afterId).toBe('a')
    expect(r.beforeId).toBe('b')
  })
})

describe('dragDropTasks — validateDrop', () => {
  test('空 payload → 失败', () => {
    const r = validateDrop(null)
    expect(r.ok).toBe(false)
    expect(typeof r.reason).toBe('string')
  })

  test('空 draggedTaskIds → 失败', () => {
    const r = validateDrop({
      draggedTaskIds: [],
      target: {},
      tasks: buildTree()
    })
    expect(r.ok).toBe(false)
  })

  test('dragged 任务不存在 → 失败', () => {
    const r = validateDrop({
      draggedTaskIds: ['nonexistent'],
      target: {},
      tasks: buildTree()
    })
    expect(r.ok).toBe(false)
    expect(r.reason).toContain('不存在')
  })

  test('基础跨 List 拖拽：合法', () => {
    const r = validateDrop({
      draggedTaskIds: ['s1'],
      target: { listId: 'list_work' },
      tasks: buildTree(),
      lists: LISTS,
      areas: AREAS
    })
    expect(r.ok).toBe(true)
    expect(r.normalizedTarget.listId).toBe('list_work')
  })

  test('目标清单不存在 → 失败', () => {
    const r = validateDrop({
      draggedTaskIds: ['s1'],
      target: { listId: 'list_nope' },
      tasks: buildTree(),
      lists: LISTS,
      areas: AREAS
    })
    expect(r.ok).toBe(false)
    expect(r.reason).toContain('不存在')
  })

  test('目标清单已删除 → 失败', () => {
    const r = validateDrop({
      draggedTaskIds: ['s1'],
      target: { listId: 'list_deleted' },
      tasks: buildTree(),
      lists: LISTS,
      areas: AREAS
    })
    expect(r.ok).toBe(false)
    expect(r.reason).toContain('已删除')
  })

  test('目标区域不存在 → 失败', () => {
    const r = validateDrop({
      draggedTaskIds: ['s1'],
      target: { areaId: 'area_nope' },
      tasks: buildTree(),
      lists: LISTS,
      areas: AREAS
    })
    expect(r.ok).toBe(false)
  })

  test('目标区域已归档（删除语义）→ 失败', () => {
    const r = validateDrop({
      draggedTaskIds: ['s1'],
      target: { areaId: 'area_deleted' },
      tasks: buildTree(),
      lists: LISTS,
      areas: AREAS
    })
    expect(r.ok).toBe(false)
    expect(r.reason).toContain('已删除')
  })

  test('合法区域 + 合法清单 = 通过', () => {
    const r = validateDrop({
      draggedTaskIds: ['s1', 's2'],
      target: { listId: 'list_work', areaId: 'area_p1' },
      tasks: buildTree(),
      lists: LISTS,
      areas: AREAS
    })
    expect(r.ok).toBe(true)
  })

  test('拖入自己（parentId=自身） → 失败', () => {
    const r = validateDrop({
      draggedTaskIds: ['r1'],
      target: { parentId: 'r1' },
      tasks: buildTree()
    })
    expect(r.ok).toBe(false)
    expect(r.reason).toContain('自己内部')
  })

  test('祖先拖入直接子节点：r1 → c1 → 失败', () => {
    const r = validateDrop({
      draggedTaskIds: ['r1'],
      target: { parentId: 'c1' },
      tasks: buildTree()
    })
    expect(r.ok).toBe(false)
    expect(r.reason).toContain('祖先')
  })

  test('祖先拖入孙子节点：r1 → g1 → 失败', () => {
    const r = validateDrop({
      draggedTaskIds: ['r1'],
      target: { parentId: 'g1' },
      tasks: buildTree()
    })
    expect(r.ok).toBe(false)
  })

  test('中间层节点拖入自己的后代：c1 → g1 → 失败', () => {
    const r = validateDrop({
      draggedTaskIds: ['c1'],
      target: { parentId: 'g1' },
      tasks: buildTree()
    })
    expect(r.ok).toBe(false)
  })

  test('后代拖入祖先：c1 → r1 → 合法（子节点已经是 r1 的子，但允许再次指定）', () => {
    const r = validateDrop({
      draggedTaskIds: ['c1'],
      target: { parentId: 'r1' },
      tasks: buildTree()
    })
    expect(r.ok).toBe(true)
  })

  test('兄弟节点互相嵌套：c2 → c1 → 合法（两者都是 r1 的子，平级嵌套允许）', () => {
    const r = validateDrop({
      draggedTaskIds: ['c2'],
      target: { parentId: 'c1' },
      tasks: buildTree()
    })
    expect(r.ok).toBe(true)
  })

  test('独立节点拖入根独立 → 合法', () => {
    const r = validateDrop({
      draggedTaskIds: ['s1'],
      target: { parentId: null },
      tasks: buildTree()
    })
    expect(r.ok).toBe(true)
    expect(r.normalizedTarget.parentId).toBeNull()
  })

  test('多任务拖拽，其中一个导致 DAG 环 → 失败', () => {
    const r = validateDrop({
      draggedTaskIds: ['s1', 'r1'], // r1 会被拖到 g1 下
      target: { parentId: 'g1' },
      tasks: buildTree()
    })
    expect(r.ok).toBe(false)
    expect(r.reason).toContain('祖先')
  })

  test('多任务拖拽全部合法 → 通过', () => {
    const r = validateDrop({
      draggedTaskIds: ['s1', 's2', 's3'],
      target: { parentId: null },
      tasks: buildTree(),
      lists: LISTS,
      areas: AREAS
    })
    expect(r.ok).toBe(true)
  })

  test('target 字段缺失 → 标准化为 null', () => {
    const r = validateDrop({
      draggedTaskIds: ['s1'],
      target: {},
      tasks: buildTree()
    })
    expect(r.ok).toBe(true)
    expect(r.normalizedTarget).toEqual({
      listId: null,
      headingId: null,
      parentId: null,
      areaId: null
    })
  })

  test('target 字段含空字符串 → 标准化为 null', () => {
    const r = validateDrop({
      draggedTaskIds: ['s1'],
      target: { listId: '', headingId: '', parentId: '', areaId: '' },
      tasks: buildTree()
    })
    expect(r.ok).toBe(true)
    expect(r.normalizedTarget.listId).toBeNull()
    expect(r.normalizedTarget.headingId).toBeNull()
    expect(r.normalizedTarget.parentId).toBeNull()
    expect(r.normalizedTarget.areaId).toBeNull()
  })

  test('parentId 不存在 → 失败', () => {
    const r = validateDrop({
      draggedTaskIds: ['s1'],
      target: { parentId: 'phantom' },
      tasks: buildTree()
    })
    expect(r.ok).toBe(false)
    expect(r.reason).toContain('父任务不存在')
  })
})

describe('dragDropTasks — applyDrop', () => {
  test('空 payload 返回空数组', () => {
    expect(applyDrop(null)).toEqual([])
    expect(applyDrop({})).toEqual([])
  })

  test('无效 dragged 返回空', () => {
    expect(applyDrop({ draggedTaskIds: [], tasks: buildTree() })).toEqual([])
    expect(applyDrop({ draggedTaskIds: ['nope'], tasks: buildTree() })).toEqual([])
  })

  test('非法（DAG 环）payload 返回空 moves', () => {
    const moves = applyDrop({
      draggedTaskIds: ['r1'],
      target: { parentId: 'g1' },
      tasks: buildTree()
    })
    expect(moves).toEqual([])
  })

  test('单任务 move 包含正确锚点和 target 属性', () => {
    const moves = applyDrop({
      draggedTaskIds: ['s1'],
      target: { listId: 'list_work', parentId: null },
      afterId: 'c2',
      beforeId: 's2',
      dropIndex: 4,
      tasks: buildTree(),
      lists: LISTS
    })
    expect(moves.length).toBe(1)
    const m = moves[0]
    expect(m.taskId).toBe('s1')
    expect(m.afterId).toBe('c2')
    expect(m.beforeId).toBe('s2')
    expect(m.listId).toBe('list_work')
    expect(m.parentId).toBeNull()
    expect(m.dropIndex).toBe(4)
  })

  test('多任务 moves 顺序串联：afterId 指向链上的上一个', () => {
    const moves = applyDrop({
      draggedTaskIds: ['s1', 's2', 's3'],
      target: { listId: 'list_work', parentId: null },
      afterId: 'r1',
      beforeId: null,
      dropIndex: 1,
      tasks: buildTree(),
      lists: LISTS
    })
    expect(moves.length).toBe(3)
    expect(moves[0].taskId).toBe('s1')
    expect(moves[0].afterId).toBe('r1')

    expect(moves[1].taskId).toBe('s2')
    expect(moves[1].afterId).toBe('s1')
    expect(moves[1].beforeId).toBeNull()

    expect(moves[2].taskId).toBe('s3')
    expect(moves[2].afterId).toBe('s2')
  })

  test('多任务 dropIndex 递增：dropIndex+i', () => {
    const moves = applyDrop({
      draggedTaskIds: ['s1', 's2', 's3'],
      target: { parentId: null },
      dropIndex: 2,
      tasks: buildTree()
    })
    expect(moves[0].dropIndex).toBe(2)
    expect(moves[1].dropIndex).toBe(3)
    expect(moves[2].dropIndex).toBe(4)
  })

  test('未指定 dropIndex / afterId / beforeId → 默认', () => {
    const moves = applyDrop({
      draggedTaskIds: ['s1'],
      target: { parentId: null },
      tasks: buildTree()
    })
    expect(moves.length).toBe(1)
    expect(moves[0].afterId).toBeNull()
    expect(moves[0].beforeId).toBeNull()
    expect(moves[0].dropIndex).toBeNull()
  })

  test('去重：重复 dragged ID 仅保留一份', () => {
    const moves = applyDrop({
      draggedTaskIds: ['s1', 's1', 's1'],
      target: { parentId: null },
      tasks: buildTree()
    })
    expect(moves.length).toBe(1)
    expect(moves[0].taskId).toBe('s1')
  })

  test('嵌套 parentId 的情况正确应用到每个 move', () => {
    const moves = applyDrop({
      draggedTaskIds: ['s1', 's2'],
      target: { parentId: 'r1', listId: 'list_work' },
      afterId: 'c2',
      tasks: buildTree(),
      lists: LISTS
    })
    expect(moves.length).toBe(2)
    for (const m of moves) {
      expect(m.parentId).toBe('r1')
      expect(m.listId).toBe('list_work')
    }
  })

  test('afterId 传入空字符串标准化为 null', () => {
    const moves = applyDrop({
      draggedTaskIds: ['s1'],
      target: {},
      afterId: '',
      beforeId: '',
      tasks: buildTree()
    })
    expect(moves[0].afterId).toBeNull()
    expect(moves[0].beforeId).toBeNull()
  })
})

describe('dragDropTasks — 端到端：buildDropIndex → validate → apply', () => {
  test('跨 list 场景：先计算索引，再校验，再生成 moves', () => {
    const tasks = buildTree()
    const currentList = [
      { id: 'r1' },
      { id: 's1' },
      { id: 's2' },
      { id: 's3' }
    ]
    const position = buildDropIndex(75, currentList, { viewportHeight: 800, rowHeight: 50 })
    // row 50~100 即 s1 行下半部 → after s1 before s2 → dropIndex 2

    const validation = validateDrop({
      draggedTaskIds: ['s3'],
      target: { listId: 'list_work' },
      tasks,
      lists: LISTS,
      areas: AREAS
    })
    expect(validation.ok).toBe(true)

    const moves = applyDrop({
      draggedTaskIds: ['s3'],
      target: { listId: 'list_work' },
      afterId: position.afterId,
      beforeId: position.beforeId,
      parentId: position.parentId,
      dropIndex: position.dropIndex,
      tasks,
      lists: LISTS
    })
    expect(moves.length).toBe(1)
    expect(moves[0].taskId).toBe('s3')
    expect(moves[0].listId).toBe('list_work')
  })

  test('DAG 非法 → 中间步骤阻断', () => {
    const tasks = buildTree()
    const validation = validateDrop({
      draggedTaskIds: ['r1'],
      target: { parentId: 'g1' },
      tasks
    })
    expect(validation.ok).toBe(false)
    const moves = applyDrop({
      draggedTaskIds: ['r1'],
      target: { parentId: 'g1' },
      tasks
    })
    expect(moves).toEqual([])
  })
})
