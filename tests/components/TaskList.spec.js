import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { describe, beforeEach, test, expect, vi } from 'vitest'
import TaskList from '@/components/TaskList.vue'
import { useTaskStore } from '@/stores/taskStore'

describe('TaskList', () => {
  let store = null

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useTaskStore()
    store.resetAll()
    store.initSampleData()
  })

  const getTasks = () => {
    return store.tasks.filter(t => !t.completed)
  }

  test('应该渲染任务列表', () => {
    const tasks = getTasks()
    const wrapper = mount(TaskList, {
      props: {
        tasks
      },
      global: {
        plugins: [createPinia()],
        provide: {
          openEditTask: vi.fn()
        }
      }
    })
    expect(wrapper.find('.task-list').exists()).toBe(true)
    expect(wrapper.findAll('.task-row').length).toBe(tasks.length)
  })

  test('应该显示任务标题', () => {
    const tasks = getTasks()
    const wrapper = mount(TaskList, {
      props: {
        tasks
      },
      global: {
        plugins: [createPinia()],
        provide: {
          openEditTask: vi.fn()
        }
      }
    })
    const taskRow = wrapper.find('.task-row')
    expect(taskRow.find('.task-title').exists()).toBe(true)
  })

  test('应该显示分类标签', () => {
    const tasks = getTasks()
    const wrapper = mount(TaskList, {
      props: {
        tasks
      },
      global: {
        plugins: [createPinia()],
        provide: {
          openEditTask: vi.fn()
        }
      }
    })
    const taskRow = wrapper.find('.task-row')
    expect(taskRow.find('.cat-pill').exists()).toBe(true)
  })

  test('应该显示逾期标记', () => {
    store.addTask({
      title: '逾期任务',
      category: 'work',
      date: '2026-01-01'
    })
    const tasks = getTasks()
    const wrapper = mount(TaskList, {
      props: {
        tasks
      },
      global: {
        plugins: [createPinia()],
        provide: {
          openEditTask: vi.fn()
        }
      }
    })
    expect(wrapper.find('.overdue').exists()).toBe(true)
  })

  test('应该显示重要标记', () => {
    store.addTask({
      title: '重要任务',
      category: 'work',
      date: '2026-12-01',
      important: true
    })
    const tasks = getTasks()
    const wrapper = mount(TaskList, {
      props: {
        tasks
      },
      global: {
        plugins: [createPinia()],
        provide: {
          openEditTask: vi.fn()
        }
      }
    })
    expect(wrapper.find('.meta-icon.important').exists()).toBe(true)
  })

  test('任务完成后应该有删除线样式', () => {
    const task = store.tasks[0]
    store.toggleComplete(task.id)
    const tasks = store.tasks.filter(t => t.completed)
    const wrapper = mount(TaskList, {
      props: {
        tasks
      },
      global: {
        plugins: [createPinia()],
        provide: {
          openEditTask: vi.fn()
        }
      }
    })
    expect(wrapper.find('.task-row.completed').exists()).toBe(true)
  })
})
