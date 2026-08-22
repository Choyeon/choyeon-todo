import { createPinia, setActivePinia } from 'pinia'
import { describe, beforeEach, afterEach, test, expect, vi } from 'vitest'
import {
  useFilterStore,
  compileFilterToPredicate,
  getMyDayRecommendations,
  generateFilterId
} from '@/stores/filterStore'
import { formatDateStr } from '@/utils/date'

const makeTasks = (now = new Date()) => {
  const today = formatDateStr(now)
  const yesterday = formatDateStr(new Date(now.getTime() - 86400000))
  const tomorrow = formatDateStr(new Date(now.getTime() + 86400000))
  const nextWeek = formatDateStr(new Date(now.getTime() + 7 * 86400000))
  return [
    {
      id: 't1',
      title: '设计数据库架构',
      category: 'work',
      date: today,
      time: '10:00',
      completed: false,
      important: true,
      priority: 1,
      reminder: true,
      notes: '高优先级',
      tags: ['tag_urgent', 'tag_project'],
      repeat: null,
      pomodoroSessions: 5,
      createdAt: Date.now() - 3600_000,
      parentId: null
    },
    {
      id: 't2',
      title: '写周报',
      category: 'work',
      date: yesterday,
      time: '18:00',
      completed: false,
      important: false,
      priority: 2,
      reminder: false,
      notes: '待办',
      tags: [],
      repeat: null,
      pomodoroSessions: 2,
      createdAt: Date.now() - 7200_000
    },
    {
      id: 't3',
      title: '阅读技术文档',
      category: 'study',
      date: today,
      time: null,
      completed: false,
      important: false,
      priority: 3,
      reminder: false,
      notes: 'Vitest Pinia 相关',
      tags: ['tag_idea'],
      repeat: { frequency: 'daily', interval: 1 },
      repeatRootId: 't3',
      pomodoroSessions: 0,
      createdAt: Date.now() - 10800_000
    },
    {
      id: 't4',
      title: '买菜',
      category: 'personal',
      date: tomorrow,
      time: '19:00',
      completed: false,
      important: false,
      priority: 4,
      reminder: true,
      notes: '',
      tags: [],
      repeat: null,
      pomodoroSessions: 1,
      createdAt: Date.now() - 14400_000
    },
    {
      id: 't5',
      title: '修复登录 bug',
      category: 'work',
      date: nextWeek,
      time: null,
      completed: true,
      important: true,
      priority: 1,
      reminder: false,
      notes: '',
      tags: ['tag_urgent'],
      repeat: null,
      completedAt: Date.now() - 1800_000,
      pomodoroSessions: 3,
      createdAt: Date.now() - 86400_000
    },
    {
      id: 't6',
      title: '健身训练',
      category: 'health',
      date: null,
      time: null,
      completed: false,
      important: false,
      priority: 4,
      reminder: false,
      notes: '',
      tags: [],
      repeat: null,
      pomodoroSessions: 0,
      createdAt: Date.now() - 500_000
    }
  ]
}

describe('FilterStore', () => {
  let store = null

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useFilterStore()
    store.reset()
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('todo_filters_v3')
    }
  })

  afterEach(() => {
    store.reset()
    store.cleanup()
  })

  describe('初始化与 ID 生成', () => {
    test('generateFilterId 生成带前缀的 ID', () => {
      const id = generateFilterId()
      expect(typeof id).toBe('string')
      expect(id.startsWith('flt_')).toBe(true)
      expect(id.length).toBeGreaterThan(10)
    })

    test('连续生成的 ID 不重复', () => {
      const ids = new Set()
      for (let i = 0; i < 100; i++) ids.add(generateFilterId())
      expect(ids.size).toBe(100)
    })

    test('初始状态 filters 为空', () => {
      expect(Array.isArray(store.filters)).toBe(true)
      expect(store.filters.length).toBe(0)
      expect(store.pinnedFilterIds.length).toBe(0)
    })
  })

  describe('CRUD: addFilter', () => {
    test('addFilter 成功创建基础过滤器', () => {
      const f = store.addFilter({ name: '重要任务' })
      expect(f).not.toBeNull()
      expect(f.id).toBeTruthy()
      expect(f.name).toBe('重要任务')
      expect(f.pinned).toBe(false)
      expect(Array.isArray(f.groups)).toBe(true)
      expect(f.groups.length).toBe(0)
      expect(typeof f.createdAt).toBe('number')
      expect(typeof f.updatedAt).toBe('number')
      expect(store.filters.length).toBe(1)
    })

    test('addFilter 空名称失败', () => {
      const f = store.addFilter({ name: '' })
      expect(f).toBeNull()
      expect(store.filters.length).toBe(0)
    })

    test('addFilter 名称过长被截断到 100 字符', () => {
      const longName = 'A'.repeat(500)
      const f = store.addFilter({ name: longName })
      expect(f).not.toBeNull()
      expect(f.name.length).toBe(100)
    })

    test('addFilter 会去掉首尾空白', () => {
      const f = store.addFilter({ name: '  今日任务  ' })
      expect(f.name).toBe('今日任务')
    })

    test('addFilter 创建带 pinned 的过滤器并加入 pinnedFilterIds', () => {
      const f = store.addFilter({ name: 'Pinned', pinned: true })
      expect(f.pinned).toBe(true)
      expect(store.pinnedFilterIds.includes(f.id)).toBe(true)
    })

    test('addFilter 支持 sort 字段', () => {
      const f = store.addFilter({
        name: 'Srt',
        sort: { field: 'priority', dir: 'desc' }
      })
      expect(f.sort).toEqual({ field: 'priority', dir: 'desc' })
    })

    test('addFilter 无效 sort 字段被忽略为 null', () => {
      const f = store.addFilter({
        name: 'SrtBad',
        sort: { field: 'unknownField', dir: 'asc' }
      })
      expect(f.sort).toBeNull()
    })

    test('addFilter 正确保留 groups 和 conditions', () => {
      const f = store.addFilter({
        name: 'Grp',
        groups: [
          {
            logic: 'AND',
            conds: [{ field: 'important', op: 'eq', value: true }]
          }
        ]
      })
      expect(f.groups.length).toBe(1)
      expect(f.groups[0].logic).toBe('AND')
      expect(f.groups[0].conds.length).toBe(1)
      expect(f.groups[0].conds[0]).toEqual({
        field: 'important',
        op: 'eq',
        value: true,
        unit: undefined
      })
    })

    test('addFilter 剥离无效 conditions', () => {
      const f = store.addFilter({
        name: 'BadConds',
        groups: [
          {
            logic: 'AND',
            conds: [
              { field: 'important', op: 'eq', value: true },
              { field: 'badField', op: 'eq', value: 1 }, // 无效 field
              { field: 'priority', op: 'badOp', value: 1 } // 无效 op
            ]
          }
        ]
      })
      expect(f.groups[0].conds.length).toBe(1)
      expect(f.groups[0].conds[0].field).toBe('important')
    })

    test('addFilter 无效数据返回 null', () => {
      expect(store.addFilter(null)).toBeNull()
      expect(store.addFilter(undefined)).toBeNull()
      expect(store.addFilter({})).toBeNull() // 无 name
    })
  })

  describe('CRUD: updateFilter / removeFilter / duplicateFilter / reorder', () => {
    test('updateFilter 更新名称', () => {
      const f = store.addFilter({ name: 'Old' })
      const ok = store.updateFilter(f.id, { name: 'New' })
      expect(ok).toBe(true)
      expect(store.getFilterById(f.id).name).toBe('New')
    })

    test('updateFilter 空名称失败', () => {
      const f = store.addFilter({ name: 'Old' })
      const ok = store.updateFilter(f.id, { name: '   ' })
      expect(ok).toBe(false)
      expect(store.getFilterById(f.id).name).toBe('Old')
    })

    test('updateFilter 更新 pinned 状态同步 pinnedFilterIds', () => {
      const f = store.addFilter({ name: 'A' })
      expect(store.pinnedFilterIds.includes(f.id)).toBe(false)
      store.updateFilter(f.id, { pinned: true })
      expect(store.pinnedFilterIds.includes(f.id)).toBe(true)
      store.updateFilter(f.id, { pinned: false })
      expect(store.pinnedFilterIds.includes(f.id)).toBe(false)
    })

    test('updateFilter 更新 groups 结构', () => {
      const f = store.addFilter({ name: 'A' })
      store.updateFilter(f.id, {
        groups: [
          {
            logic: 'OR',
            conds: [{ field: 'completed', op: 'eq', value: true }]
          }
        ]
      })
      const got = store.getFilterById(f.id)
      expect(got.groups.length).toBe(1)
      expect(got.groups[0].logic).toBe('OR')
      expect(got.groups[0].conds[0].field).toBe('completed')
    })

    test('updateFilter 不存在的 ID 返回 false', () => {
      expect(store.updateFilter('nope', { name: 'x' })).toBe(false)
    })

    test('removeFilter 删除过滤器并同步 pinned', () => {
      const f = store.addFilter({ name: 'D', pinned: true })
      expect(store.filters.length).toBe(1)
      expect(store.pinnedFilterIds.includes(f.id)).toBe(true)
      const ok = store.removeFilter(f.id)
      expect(ok).toBe(true)
      expect(store.filters.length).toBe(0)
      expect(store.pinnedFilterIds.includes(f.id)).toBe(false)
    })

    test('removeFilter 不存在的 ID 返回 false', () => {
      expect(store.removeFilter('nope')).toBe(false)
    })

    test('duplicateFilter 复制成功', () => {
      const f = store.addFilter({
        name: 'Orig',
        pinned: true,
        sort: { field: 'priority', dir: 'asc' },
        groups: [{ logic: 'AND', conds: [{ field: 'priority', op: 'eq', value: 1 }] }]
      })
      const copy = store.duplicateFilter(f.id)
      expect(copy).not.toBeNull()
      expect(copy.id).not.toBe(f.id)
      expect(copy.name).toContain('副本')
      expect(copy.pinned).toBe(false) // 复制不保留 pinned
      expect(copy.sort).toEqual(f.sort)
      expect(copy.groups).toEqual(f.groups)
    })

    test('duplicateFilter 不存在的 ID 返回 null', () => {
      expect(store.duplicateFilter('nope')).toBeNull()
    })

    test('reorder 按给定顺序排列 pinnedFilterIds', () => {
      const a = store.addFilter({ name: 'A', pinned: true })
      const b = store.addFilter({ name: 'B', pinned: true })
      const c = store.addFilter({ name: 'C', pinned: true })
      store.reorder([c.id, a.id, b.id])
      expect(store.pinnedFilterIds).toEqual([c.id, a.id, b.id])
    })

    test('reorder 过滤无效 ID，未提及的 pinned 追加末尾', () => {
      const a = store.addFilter({ name: 'A', pinned: true })
      const b = store.addFilter({ name: 'B', pinned: true })
      store.addFilter({ name: 'C', pinned: false }) // 未 pinned
      store.reorder([b.id, 'invalid-id'])
      expect(store.pinnedFilterIds).toEqual([b.id, a.id])
    })
  })

  describe('Predicate 编译与条件执行', () => {
    test('空过滤器 → predicate 恒为 true', () => {
      const pred = compileFilterToPredicate({ groups: [] })
      expect(pred({ id: 'x' })).toBe(true)
      expect(pred(null)).toBe(false) // null task
    })

    test('单条件 AND: important=true', () => {
      const pred = compileFilterToPredicate({
        groups: [
          {
            logic: 'AND',
            conds: [{ field: 'important', op: 'eq', value: true }]
          }
        ]
      })
      expect(pred({ important: true })).toBe(true)
      expect(pred({ important: false })).toBe(false)
    })

    test('单条件 AND: completed=false', () => {
      const pred = compileFilterToPredicate({
        groups: [{ logic: 'AND', conds: [{ field: 'completed', op: 'eq', value: false }] }]
      })
      expect(pred({ completed: false })).toBe(true)
      expect(pred({ completed: true })).toBe(false)
    })

    test('AND 组内多条件：重要 + 未完成', () => {
      const pred = compileFilterToPredicate({
        groups: [
          {
            logic: 'AND',
            conds: [
              { field: 'important', op: 'eq', value: true },
              { field: 'completed', op: 'eq', value: false }
            ]
          }
        ]
      })
      expect(pred({ important: true, completed: false })).toBe(true)
      expect(pred({ important: true, completed: true })).toBe(false)
      expect(pred({ important: false, completed: false })).toBe(false)
    })

    test('OR 组内多条件：已完成 或 重要', () => {
      const pred = compileFilterToPredicate({
        groups: [
          {
            logic: 'OR',
            conds: [
              { field: 'completed', op: 'eq', value: true },
              { field: 'important', op: 'eq', value: true }
            ]
          }
        ]
      })
      expect(pred({ completed: false, important: true })).toBe(true)
      expect(pred({ completed: true, important: false })).toBe(true)
      expect(pred({ completed: false, important: false })).toBe(false)
    })

    test('多组 AND 组合：组 1 AND 组 2', () => {
      // 组 1：重要 OR 完成；组 2：priority <= 2
      const pred = compileFilterToPredicate({
        groups: [
          {
            logic: 'OR',
            conds: [
              { field: 'important', op: 'eq', value: true },
              { field: 'completed', op: 'eq', value: true }
            ]
          },
          {
            logic: 'AND',
            conds: [{ field: 'priority', op: 'lte', value: 2 }]
          }
        ]
      })
      expect(pred({ important: true, completed: false, priority: 1 })).toBe(true)
      expect(pred({ important: false, completed: true, priority: 2 })).toBe(true)
      expect(pred({ important: true, completed: false, priority: 3 })).toBe(false)
      expect(pred({ important: false, completed: false, priority: 1 })).toBe(false)
    })

    test('优先级比较 ops: gt/gte/lt/lte', () => {
      const predGt = compileFilterToPredicate({
        groups: [{ conds: [{ field: 'priority', op: 'gt', value: 2 }] }]
      })
      expect(predGt({ priority: 3 })).toBe(true)
      expect(predGt({ priority: 2 })).toBe(false)

      const predGte = compileFilterToPredicate({
        groups: [{ conds: [{ field: 'priority', op: 'gte', value: 2 }] }]
      })
      expect(predGte({ priority: 2 })).toBe(true)
      expect(predGte({ priority: 1 })).toBe(false)

      const predLt = compileFilterToPredicate({
        groups: [{ conds: [{ field: 'priority', op: 'lt', value: 2 }] }]
      })
      expect(predLt({ priority: 1 })).toBe(true)
      expect(predLt({ priority: 2 })).toBe(false)
    })

    test('between 边界正确（包含端点）', () => {
      const pred = compileFilterToPredicate({
        groups: [{ conds: [{ field: 'priority', op: 'between', value: [2, 3] }] }]
      })
      expect(pred({ priority: 2 })).toBe(true)
      expect(pred({ priority: 3 })).toBe(true)
      expect(pred({ priority: 1 })).toBe(false)
      expect(pred({ priority: 4 })).toBe(false)
      expect(pred({ priority: null })).toBe(false)
    })

    test('between 长度不足数组 false', () => {
      const pred = compileFilterToPredicate({
        groups: [{ conds: [{ field: 'priority', op: 'between', value: [2] }] }]
      })
      expect(pred({ priority: 2 })).toBe(false)
    })

    test('in / notIn 操作符', () => {
      const predIn = compileFilterToPredicate({
        groups: [{ conds: [{ field: 'categoryId', op: 'in', value: ['work', 'study'] }] }]
      })
      expect(predIn({ category: 'work' })).toBe(true)
      expect(predIn({ category: 'study' })).toBe(true)
      expect(predIn({ category: 'personal' })).toBe(false)

      const predNotIn = compileFilterToPredicate({
        groups: [{ conds: [{ field: 'categoryId', op: 'notIn', value: ['work', 'study'] }] }]
      })
      expect(predNotIn({ category: 'personal' })).toBe(true)
      expect(predNotIn({ category: 'work' })).toBe(false)
    })

    test('contains 字符串：标题包含关键字（不区分大小写）', () => {
      const pred = compileFilterToPredicate({
        groups: [{ conds: [{ field: 'title', op: 'contains', value: 'Bug' }] }]
      })
      expect(pred({ title: '修复登录 bug' })).toBe(true)
      expect(pred({ title: 'Bug report' })).toBe(true)
      expect(pred({ title: '其他任务' })).toBe(false)
    })

    test('contains 数组：tags 包含 tag', () => {
      const pred = compileFilterToPredicate({
        groups: [{ conds: [{ field: 'tags', op: 'contains', value: 'tag_urgent' }] }]
      })
      expect(pred({ tags: ['tag_urgent', 'tag_meeting'] })).toBe(true)
      expect(pred({ tags: ['tag_meeting'] })).toBe(false)
    })

    test('contains 数组：tag 数组匹配所有', () => {
      const pred = compileFilterToPredicate({
        groups: [
          { conds: [{ field: 'tags', op: 'contains', value: ['tag_urgent', 'tag_project'] }] }
        ]
      })
      expect(pred({ tags: ['tag_urgent', 'tag_project', 'tag_meeting'] })).toBe(true)
      expect(pred({ tags: ['tag_urgent'] })).toBe(false)
    })

    test('regex 操作符', () => {
      const pred = compileFilterToPredicate({
        groups: [{ conds: [{ field: 'title', op: 'regex', value: '^设计' }] }]
      })
      expect(pred({ title: '设计数据库' })).toBe(true)
      expect(pred({ title: '写周报' })).toBe(false)
    })

    test('regex 非法模式安全返回 false', () => {
      const pred = compileFilterToPredicate({
        groups: [{ conds: [{ field: 'title', op: 'regex', value: '[' }] }]
      })
      // 不会抛错
      expect(() => pred({ title: 'x' })).not.toThrow()
    })

    test('isNull / exists 操作符', () => {
      const predNull = compileFilterToPredicate({
        groups: [{ conds: [{ field: 'date', op: 'isNull', value: null }] }]
      })
      expect(predNull({ date: null })).toBe(true)
      expect(predNull({ date: '2025-01-01' })).toBe(false)

      const predExists = compileFilterToPredicate({
        groups: [{ conds: [{ field: 'date', op: 'exists', value: null }] }]
      })
      expect(predExists({ date: '2025-01-01' })).toBe(true)
      expect(predExists({ date: null })).toBe(false)
    })

    test('ne 操作符（不等于）', () => {
      const pred = compileFilterToPredicate({
        groups: [{ conds: [{ field: 'categoryId', op: 'ne', value: 'work' }] }]
      })
      expect(pred({ category: 'study' })).toBe(true)
      expect(pred({ category: 'work' })).toBe(false)
    })

    test('keywords 匹配标题 + 备注', () => {
      const pred = compileFilterToPredicate({
        groups: [{ conds: [{ field: 'keywords', op: 'contains', value: 'vitest' }] }]
      })
      expect(
        pred({ title: '阅读技术文档', notes: 'Vitest Pinia 相关' })
      ).toBe(true)
      expect(pred({ title: '其他', notes: '无' })).toBe(false)
    })

    test('overdue: 昨日日期未完成 = 逾期', () => {
      const now = new Date()
      const pred = compileFilterToPredicate({
        groups: [{ conds: [{ field: 'overdue', op: 'eq', value: true }] }]
      })
      const yesterday = formatDateStr(new Date(now.getTime() - 86400000))
      expect(pred({ date: yesterday, completed: false }, { now })).toBe(true)
      expect(pred({ date: yesterday, completed: true }, { now })).toBe(false)
    })

    test('overdue: 今日但时间已过 = 逾期', () => {
      const now = new Date(2025, 0, 15, 14, 30) // 14:30
      const pred = compileFilterToPredicate({
        groups: [{ conds: [{ field: 'overdue', op: 'eq', value: true }] }]
      })
      const today = formatDateStr(now)
      expect(pred({ date: today, time: '10:00', completed: false }, { now })).toBe(true)
      expect(pred({ date: today, time: '18:00', completed: false }, { now })).toBe(false)
    })

    test('overdue: 无日期 = 不逾期', () => {
      const pred = compileFilterToPredicate({
        groups: [{ conds: [{ field: 'overdue', op: 'eq', value: true }] }]
      })
      expect(pred({ date: null, completed: false })).toBe(false)
    })

    test('无效 field/op 在编译阶段被过滤不影响结果', () => {
      const pred = compileFilterToPredicate({
        groups: [
          {
            logic: 'AND',
            conds: [
              { field: 'completed', op: 'eq', value: false },
              { field: 'bad', op: 'unknown', value: 1 }
            ]
          }
        ]
      })
      expect(pred({ completed: false })).toBe(true)
      expect(pred({ completed: true })).toBe(false)
    })
  })

  describe('runFilter 执行 + 排序', () => {
    test('runFilter 返回匹配任务数组', () => {
      const f = store.addFilter({
        name: 'ImportantActive',
        groups: [
          {
            logic: 'AND',
            conds: [
              { field: 'important', op: 'eq', value: true },
              { field: 'completed', op: 'eq', value: false }
            ]
          }
        ]
      })
      const tasks = makeTasks()
      const result = store.runFilter(f.id, { tasks })
      expect(result.length).toBe(1)
      expect(result[0].id).toBe('t1')
    })

    test('runFilter 按 priority 降序排序', () => {
      const f = store.addFilter({
        name: 'SortP',
        sort: { field: 'priority', dir: 'desc' },
        groups: [
          {
            conds: [
              { field: 'completed', op: 'eq', value: false }
            ]
          }
        ]
      })
      const tasks = makeTasks()
      const result = store.runFilter(f.id, { tasks })
      // 按优先级从高到低（1 最高，但按数值降序 — 4>3>2>1；需要确认）
      // priority 1 = highest; 数值 desc => 4 在前, 1 在后
      const priorities = result.map((t) => t.priority)
      for (let i = 1; i < priorities.length; i++) {
        expect(priorities[i - 1] >= priorities[i]).toBe(true)
      }
    })

    test('runFilter 不存在的 filter 返回空数组', () => {
      expect(store.runFilter('nope', { tasks: makeTasks() })).toEqual([])
    })
  })

  describe('getMyDayRecommendations 智能推荐', () => {
    test('设置 myDaySmartEnabled=false 返回空', () => {
      const tasks = makeTasks()
      const r = getMyDayRecommendations({ tasks, settings: { myDaySmartEnabled: false } })
      expect(r).toEqual([])
    })

    test('空任务返回空数组', () => {
      const r = getMyDayRecommendations({ tasks: [] })
      expect(r).toEqual([])
    })

    test('默认最多返回 15 个（或 myDaySmartCount 指定）', () => {
      const tasks = []
      const today = formatDateStr(new Date())
      for (let i = 0; i < 30; i++) {
        tasks.push({
          id: `t${i}`,
          title: `任务${i}`,
          date: today,
          completed: false,
          priority: 1,
          createdAt: Date.now() - i * 1000
        })
      }
      const r1 = getMyDayRecommendations({ tasks, settings: { myDaySmartCount: 15 } })
      expect(r1.length).toBe(15)
      const r2 = getMyDayRecommendations({ tasks, settings: { myDaySmartCount: 5 } })
      expect(r2.length).toBe(5)
    })

    test('已完成任务不会被推荐', () => {
      const today = formatDateStr(new Date())
      const tasks = [
        { id: 'a', title: 'A', completed: true, priority: 1, date: today },
        { id: 'b', title: 'B', completed: false, priority: 1, date: today }
      ]
      const r = getMyDayRecommendations({ tasks })
      expect(r.includes('a')).toBe(false)
      expect(r.includes('b')).toBe(true)
    })

    test('逾期任务 + 重要 → 排名更高', () => {
      const now = new Date(2025, 5, 15, 12, 0)
      const today = formatDateStr(now)
      const yesterday = formatDateStr(new Date(now.getTime() - 86400000))
      const tasks = [
        {
          id: 'overdueImp',
          title: '逾期重要',
          date: yesterday,
          time: '09:00',
          completed: false,
          priority: 2,
          important: true
        },
        {
          id: 'todayLow',
          title: '今日低优先级',
          date: today,
          completed: false,
          priority: 4,
          important: false
        }
      ]
      const r = getMyDayRecommendations({ tasks, now })
      expect(r.length).toBeGreaterThan(0)
      expect(r[0]).toBe('overdueImp')
    })

    test('优先级权重：p1 > p4', () => {
      const today = formatDateStr(new Date())
      const tasks = [
        { id: 'a', title: 'A', priority: 4, date: null, completed: false, createdAt: 1000 },
        { id: 'b', title: 'B', priority: 1, date: null, completed: false, createdAt: 900 }
      ]
      const r = getMyDayRecommendations({ tasks })
      // b 应该在前面
      expect(r[0]).toBe('b')
    })

    test('pomodoro 历史 7 天内加分', () => {
      const today = formatDateStr(new Date())
      const now = new Date()
      const within7 = Date.now() - 3 * 86400000
      const tasks = [
        {
          id: 'a',
          title: 'A',
          priority: 3,
          date: null,
          completed: false,
          pomodoroSessions: 10
        },
        { id: 'b', title: 'B', priority: 3, date: null, completed: false, pomodoroSessions: 0 }
      ]
      const pomodoroHistory = {
        a: [within7, within7, within7, within7], // 4 次
        b: []
      }
      const r = getMyDayRecommendations({ tasks, pomodoroHistory, now })
      expect(r[0]).toBe('a')
    })
  })

  describe('pinnedFilters / unpinnedFilters 计算属性', () => {
    test('pinnedFilters 按 pinnedFilterIds 顺序返回', () => {
      const a = store.addFilter({ name: 'A', pinned: true })
      const b = store.addFilter({ name: 'B', pinned: true })
      store.reorder([b.id, a.id])
      const pinned = store.pinnedFilters
      expect(pinned.map((f) => f.id)).toEqual([b.id, a.id])
    })

    test('unpinnedFilters 返回非 pinned 项', () => {
      const a = store.addFilter({ name: 'A', pinned: true })
      const b = store.addFilter({ name: 'B', pinned: false })
      expect(store.unpinnedFilters.map((f) => f.id)).toEqual([b.id])
    })
  })
})
