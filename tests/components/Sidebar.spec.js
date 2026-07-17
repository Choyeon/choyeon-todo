import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { describe, beforeEach, test, expect, vi } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'
import Sidebar from '@/components/Sidebar.vue'
import { useTaskStore } from '@/stores/taskStore'

describe('Sidebar', () => {
  let store = null
  let router = null
  let pinia = null

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    store = useTaskStore()
    store.resetAll()
    store.initSampleData()

    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'Home', component: {} },
        { path: '/calendar', name: 'Calendar', component: {} },
        { path: '/completed', name: 'Completed', component: {} },
        { path: '/settings', name: 'Settings', component: {} }
      ]
    })
  })

  test('应该渲染侧边栏', async () => {
    await router.push('/')
    await router.isReady()

    const wrapper = mount(Sidebar, {
      global: {
        plugins: [pinia, router]
      }
    })
    expect(wrapper.find('.sidebar').exists()).toBe(true)
  })

  test('应该显示搜索框', async () => {
    await router.push('/')
    await router.isReady()

    const wrapper = mount(Sidebar, {
      global: {
        plugins: [pinia, router]
      }
    })
    expect(wrapper.find('.sidebar-search').exists()).toBe(true)
    expect(wrapper.find('.sidebar-search input').exists()).toBe(true)
  })

  test('应该显示导航按钮', async () => {
    await router.push('/')
    await router.isReady()

    const wrapper = mount(Sidebar, {
      global: {
        plugins: [pinia, router]
      }
    })
    expect(wrapper.find('.sidebar-nav').exists()).toBe(true)
    expect(wrapper.findAll('.nav-btn').length).toBeGreaterThan(0)
  })

  test('应该显示分类列表', async () => {
    await router.push('/')
    await router.isReady()

    const wrapper = mount(Sidebar, {
      global: {
        plugins: [pinia, router]
      }
    })
    expect(wrapper.find('.nav-section-label').exists()).toBe(true)
    expect(wrapper.findAll('.cat-btn').length).toBeGreaterThan(0)
  })

  test('搜索应该更新 store 的 searchQuery', async () => {
    vi.useFakeTimers()
    await router.push('/')
    await router.isReady()

    const wrapper = mount(Sidebar, {
      global: {
        plugins: [pinia, router]
      }
    })
    const input = wrapper.find('.sidebar-search input')
    await input.setValue('测试搜索')
    // 搜索输入有 200ms 防抖，推进定时器
    vi.advanceTimersByTime(300)
    expect(store.searchQuery).toBe('测试搜索')
    vi.useRealTimers()
  })
})
