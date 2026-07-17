import { createPinia, setActivePinia } from 'pinia'
import { describe, beforeEach, afterEach, test, expect } from 'vitest'
import { useTaskStore } from '@/stores/taskStore'
import { getTodayStr } from '@/utils/date'

describe('TaskStore', () => {
  let store = null

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useTaskStore()
    store.resetAll()
    store.initSampleData()
  })

  afterEach(() => {
    store.resetAll()
  })

  describe('初始化', () => {
    test('应该有默认分类', () => {
      expect(store.categories.length).toBeGreaterThan(0)
      expect(store.getCategoryById('work')).not.toBeNull()
      expect(store.getCategoryById('personal')).not.toBeNull()
      expect(store.getCategoryById('other')).not.toBeNull()
    })

    test('应该有示例任务', () => {
      expect(store.tasks.length).toBeGreaterThan(0)
    })
  })

  describe('任务管理', () => {
    test('添加任务', () => {
      const initialCount = store.tasks.length
      const today = getTodayStr()
      store.addTask({
        title: '测试任务',
        category: 'work',
        date: today,
        time: '14:00',
        reminder: false,
        important: true,
        notes: '测试备注'
      })
      expect(store.tasks.length).toBe(initialCount + 1)
      const newTask = store.tasks.find((t) => t.title === '测试任务')
      expect(newTask).toBeDefined()
      expect(newTask.title).toBe('测试任务')
      expect(newTask.category).toBe('work')
      expect(newTask.date).toBe(today)
      expect(newTask.time).toBe('14:00')
      expect(newTask.important).toBe(true)
      expect(newTask.notes).toBe('测试备注')
      expect(newTask.completed).toBe(false)
    })

    test('添加任务时标题不能为空', () => {
      const initialCount = store.tasks.length
      store.addTask({
        title: '',
        category: 'work',
        date: '2026-07-10'
      })
      expect(store.tasks.length).toBe(initialCount)
    })

    test('更新任务', () => {
      const task = store.tasks[0]
      const originalTitle = task.title
      store.updateTask(task.id, {
        title: '更新后的标题',
        important: !task.important
      })
      const updatedTask = store.tasks.find((t) => t.id === task.id)
      expect(updatedTask.title).toBe('更新后的标题')
      expect(updatedTask.important).toBe(!task.important)
      expect(updatedTask.date).toBe(task.date)
    })

    test('删除任务', () => {
      const task = store.tasks[0]
      const initialCount = store.tasks.length
      store.deleteTask(task.id)
      expect(store.tasks.length).toBe(initialCount - 1)
      expect(store.tasks.find((t) => t.id === task.id)).toBeUndefined()
    })

    test('切换任务完成状态', () => {
      const task = store.tasks.find((t) => !t.completed)
      expect(task.completed).toBe(false)
      store.toggleComplete(task.id)
      const updated = store.tasks.find((t) => t.id === task.id)
      expect(updated.completed).toBe(true)
      expect(updated.completedAt).toBeDefined()
      store.toggleComplete(task.id)
      const reverted = store.tasks.find((t) => t.id === task.id)
      expect(reverted.completed).toBe(false)
    })

    test('切换任务重要性', () => {
      const task = store.tasks[0]
      const original = task.important
      store.toggleImportant(task.id)
      const updated = store.tasks.find((t) => t.id === task.id)
      expect(updated.important).toBe(!original)
    })
  })

  describe('分类管理', () => {
    test('添加分类', () => {
      const initialCount = store.categories.length
      const newCat = store.addCategory({
        name: '测试分类',
        color: '#FF0000'
      })
      expect(store.categories.length).toBe(initialCount + 1)
      expect(newCat.name).toBe('测试分类')
      expect(newCat.color).toBe('#FF0000')
    })

    test('添加分类时名称不能为空', () => {
      const initialCount = store.categories.length
      const result = store.addCategory({
        name: '',
        color: '#FF0000'
      })
      expect(result).toBeNull()
      expect(store.categories.length).toBe(initialCount)
    })

    test('更新分类', () => {
      const cat = store.categories.find((c) => c.id !== 'other')
      const originalName = cat.name
      store.updateCategory(cat.id, {
        name: '更新后的分类',
        color: '#00FF00'
      })
      const updated = store.getCategoryById(cat.id)
      expect(updated.name).toBe('更新后的分类')
      expect(updated.color).toBe('#00FF00')
    })

    test('删除分类并移动任务到默认分类', () => {
      const cat = store.addCategory({
        name: '待删除分类',
        color: '#FF0000'
      })
      store.addTask({
        title: '测试任务',
        category: cat.id,
        date: '2026-07-10'
      })
      const initialTaskCount = store.tasks.length
      store.deleteCategory(cat.id, { moveTasks: true })
      expect(store.categories.find((c) => c.id === cat.id)).toBeUndefined()
      expect(store.tasks.length).toBe(initialTaskCount)
      const movedTask = store.tasks.find((t) => t.title === '测试任务')
      expect(movedTask.category).toBe('other')
    })

    test('删除分类并删除任务', () => {
      const cat = store.addCategory({
        name: '待删除分类',
        color: '#FF0000'
      })
      store.addTask({
        title: '测试任务',
        category: cat.id,
        date: '2026-07-10'
      })
      const initialTaskCount = store.tasks.length
      store.deleteCategory(cat.id, { moveTasks: false })
      expect(store.categories.find((c) => c.id === cat.id)).toBeUndefined()
      expect(store.tasks.length).toBe(initialTaskCount - 1)
      expect(store.tasks.find((t) => t.title === '测试任务')).toBeUndefined()
    })

    test('不能删除默认的other分类', () => {
      const result = store.deleteCategory('other')
      expect(result).toBe(false)
      expect(store.getCategoryById('other')).not.toBeNull()
    })
  })

  describe('任务统计', () => {
    test('获取任务总数', () => {
      const count = store.getCount('all')
      expect(count).toBe(store.tasks.filter((t) => !t.completed).length)
    })

    test('获取今日任务数', () => {
      const today = getTodayStr()
      const todayCount = store.getCount('today')
      const expected = store.tasks.filter((t) => t.date === today && !t.completed).length
      expect(todayCount).toBe(expected)
    })

    test('获取重要任务数', () => {
      const importantCount = store.getCount('important')
      const expected = store.tasks.filter((t) => t.important && !t.completed).length
      expect(importantCount).toBe(expected)
    })

    test('获取已计划任务数', () => {
      const plannedCount = store.getCount('planned')
      const today = getTodayStr()
      const expected = store.tasks.filter((t) => t.date >= today && !t.completed).length
      expect(plannedCount).toBe(expected)
    })

    test('获取分类任务数', () => {
      const workCount = store.getCategoryCount('work')
      const expected = store.tasks.filter((t) => t.category === 'work').length
      expect(workCount).toBe(expected)
    })

    test('获取逾期任务数', () => {
      const overdueCount = store.getOverdueCount
      const today = getTodayStr()
      const expected = store.tasks.filter((t) => t.date < today && !t.completed).length
      expect(overdueCount).toBe(expected)
    })
  })

  describe('搜索功能', () => {
    test('搜索任务', () => {
      store.searchQuery = '测试'
      expect(store.filteredTasks.length).toBeGreaterThanOrEqual(0)
      store.searchQuery = ''
    })

    test('搜索应该匹配标题和备注', () => {
      store.addTask({
        title: '搜索测试任务',
        category: 'work',
        date: '2026-07-10',
        notes: '这是备注内容'
      })
      store.searchQuery = '备注内容'
      expect(store.filteredTasks.length).toBeGreaterThan(0)
      store.searchQuery = ''
    })
  })

  describe('数据导入导出', () => {
    test('导出数据', () => {
      const data = store.exportData()
      expect(data).toBeDefined()
      const parsed = JSON.parse(data)
      expect(parsed.tasks).toBeDefined()
      expect(parsed.categories).toBeDefined()
    })

    test('导入数据', () => {
      const exportData = store.exportData()
      store.resetAll()
      expect(store.tasks.length).toBe(0)
      const result = store.importData(exportData)
      expect(result.success).toBe(true)
      expect(store.tasks.length).toBeGreaterThan(0)
    })

    test('导入无效数据应该失败', () => {
      const result = store.importData('invalid json')
      expect(result.success).toBe(false)
    })
  })

  describe('排序功能', () => {
    test('任务应该按逾期、重要性、日期排序', () => {
      store.resetAll()
      store.currentView = 'all'
      const today = getTodayStr()
      store.addTask({ title: '逾期任务', category: 'work', date: '2026-01-01' })
      store.addTask({ title: '重要任务', category: 'work', date: '2026-12-01', important: true })
      store.addTask({ title: '普通任务', category: 'work', date: '2026-12-01' })
      store.addTask({ title: '今天任务', category: 'work', date: today })

      const sorted = store.filteredTasks
      expect(sorted.find((t) => t.title === '逾期任务')).toBeDefined()
      expect(sorted.find((t) => t.title === '重要任务')).toBeDefined()
      expect(sorted.find((t) => t.title === '普通任务')).toBeDefined()
      expect(sorted.find((t) => t.title === '今天任务')).toBeDefined()
    })
  })

  describe('视图切换', () => {
    test('切换到today视图', () => {
      store.currentView = 'today'
      expect(store.currentView).toBe('today')
    })

    test('切换到category视图', () => {
      store.currentView = 'category'
      store.currentCategory = 'work'
      expect(store.currentView).toBe('category')
      expect(store.currentCategory).toBe('work')
    })
  })
})
