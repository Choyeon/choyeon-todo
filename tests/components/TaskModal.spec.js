import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { describe, beforeEach, test, expect } from 'vitest'
import TaskModal from '@/components/TaskModal.vue'
import { useTaskStore } from '@/stores/taskStore'

describe('TaskModal', () => {
  let store = null

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useTaskStore()
    store.resetAll()
    store.initSampleData()
  })

  test('弹窗应该在 visible 为 true 时显示', () => {
    const wrapper = mount(TaskModal, {
      props: {
        visible: true
      },
      global: {
        plugins: [createPinia()]
      },
      attachTo: document.body
    })
    const backdrop = document.querySelector('.modal-backdrop')
    expect(backdrop).not.toBeNull()
    wrapper.unmount()
  })

  test('弹窗应该在 visible 为 false 时隐藏', () => {
    const wrapper = mount(TaskModal, {
      props: {
        visible: false
      },
      global: {
        plugins: [createPinia()]
      },
      attachTo: document.body
    })
    const backdrop = document.querySelector('.modal-backdrop')
    expect(backdrop).toBeNull()
    wrapper.unmount()
  })

  test('应该包含表单输入', () => {
    const wrapper = mount(TaskModal, {
      props: {
        visible: true
      },
      global: {
        plugins: [createPinia()]
      },
      attachTo: document.body
    })
    const container = document.querySelector('.modal-container')
    expect(container).not.toBeNull()
    expect(container.querySelector('.form-title-input')).not.toBeNull()
    expect(container.querySelector('input[type="date"]')).not.toBeNull()
    expect(container.querySelector('input[type="time"]')).not.toBeNull()
    wrapper.unmount()
  })

  test('应该包含分类选择', () => {
    const wrapper = mount(TaskModal, {
      props: {
        visible: true
      },
      global: {
        plugins: [createPinia()]
      },
      attachTo: document.body
    })
    const container = document.querySelector('.modal-container')
    expect(container).not.toBeNull()
    expect(container.querySelector('.category-scroll')).not.toBeNull()
    wrapper.unmount()
  })

  test('应该包含保存和取消按钮', () => {
    const wrapper = mount(TaskModal, {
      props: {
        visible: true
      },
      global: {
        plugins: [createPinia()]
      },
      attachTo: document.body
    })
    const container = document.querySelector('.modal-container')
    expect(container).not.toBeNull()
    expect(container.querySelector('.save-btn')).not.toBeNull()
    expect(container.querySelector('.cancel-btn')).not.toBeNull()
    wrapper.unmount()
  })

  test('编辑模式应该显示编辑标题', () => {
    const task = store.tasks[0]
    const wrapper = mount(TaskModal, {
      props: {
        visible: true,
        task: task
      },
      global: {
        plugins: [createPinia()]
      },
      attachTo: document.body
    })
    const container = document.querySelector('.modal-container')
    expect(container).not.toBeNull()
    expect(container.querySelector('h2').textContent).toBe('编辑任务')
    wrapper.unmount()
  })

  test('添加模式应该显示添加标题', () => {
    const wrapper = mount(TaskModal, {
      props: {
        visible: true,
        task: null
      },
      global: {
        plugins: [createPinia()]
      },
      attachTo: document.body
    })
    const container = document.querySelector('.modal-container')
    expect(container).not.toBeNull()
    expect(container.querySelector('h2').textContent).toBe('新建任务')
    wrapper.unmount()
  })
})
