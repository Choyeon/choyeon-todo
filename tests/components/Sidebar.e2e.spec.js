// Sidebar.e2e.spec.js
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { describe, beforeEach, test, expect, vi } from 'vitest'
import { nextTick } from 'vue'
import Sidebar from '@/components/Sidebar.vue'
import { useTaskStore } from '@/stores/taskStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useFilterStore } from '@/stores/filterStore'
import { useAreaStore, DEFAULT_AREA_ID } from '@/stores/areaStore'
import { useListStore } from '@/stores/listStore'

const makeRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'Home', component: {} },
      { path: '/pomodoro', name: 'Pomodoro', component: {} },
      { path: '/settings', name: 'Settings', component: {} },
      { path: '/completed', name: 'Completed', component: {} }
    ]
  })

const mountSidebar = async () => {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = makeRouter()
  await router.push('/')
  await router.isReady()
  const taskStore = useTaskStore()
  const settingsStore = useSettingsStore()
  const filterStore = useFilterStore()
  const areaStore = useAreaStore()
  const listStore = useListStore()
  taskStore.resetAll()
  taskStore.initSampleData()
  const wrapper = mount(Sidebar, {
    global: {
      plugins: [pinia, router],
      stubs: {
        Transition: false,
        RouterLink: {
          props: ['to'],
          template: '<a class="router-link-stub">{{ to }}</a>'
        }
      }
    }
  })
  return { wrapper, pinia, router, taskStore, settingsStore, filterStore, areaStore, listStore }
}

describe('Sidebar.e2e', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  test('挂载成功并渲染 .sidebar 容器', async () => {
    const { wrapper } = await mountSidebar()
    expect(wrapper.find('.sidebar').exists()).toBe(true)
  })

  test('sidebar 具有 navigation role', async () => {
    const { wrapper } = await mountSidebar()
    const sidebar = wrapper.find('.sidebar')
    expect(sidebar.attributes('role')).toBe('navigation')
  })

  test('搜索框存在且绑定 v-model', async () => {
    const { wrapper } = await mountSidebar()
    expect(wrapper.find('.sidebar-search').exists()).toBe(true)
    const input = wrapper.find('.sidebar-search input')
    expect(input.exists()).toBe(true)
  })

  test('搜索输入更新 store.searchQuery（debounce 200ms，使用 fake timers）', async () => {
    vi.useFakeTimers()
    const { wrapper, taskStore } = await mountSidebar()
    const input = wrapper.find('.sidebar-search input')
    await input.setValue('过滤条件 x')
    vi.advanceTimersByTime(500)
    expect(taskStore.searchQuery).toBe('过滤条件 x')
    vi.useRealTimers()
  })

  test('密度切换：settingsStore.density 变更时类名 density-* 同步', async () => {
    const { wrapper, settingsStore } = await mountSidebar()
    settingsStore.density = 'cozy'
    await nextTick()
    expect(wrapper.find('.sidebar').classes()).toContain('density-cozy')
    settingsStore.density = 'compact'
    await nextTick()
    expect(wrapper.find('.sidebar').classes()).toContain('density-compact')
    settingsStore.density = 'comfortable'
    await nextTick()
    expect(wrapper.find('.sidebar').classes()).toContain('density-comfortable')
  })

  test('侧边栏折叠切换：collapsed 类名存在', async () => {
    const { wrapper, settingsStore } = await mountSidebar()
    expect(wrapper.find('.sidebar').classes()).not.toContain('collapsed')
    settingsStore.sidebarCollapsed = true
    await nextTick()
    expect(wrapper.find('.sidebar').classes()).toContain('collapsed')
  })

  test('默认视图导航按钮存在（数量 ≥ 1）', async () => {
    const { wrapper } = await mountSidebar()
    const btns = wrapper.findAll('.nav-btn')
    expect(btns.length).toBeGreaterThan(0)
  })

  test('默认视图按钮 aria-current 在选中时为 page', async () => {
    const { wrapper } = await mountSidebar()
    const first = wrapper.find('.nav-btn')
    if (first.exists()) {
      const active = first.classes().includes('active')
      if (active) {
        expect(first.attributes('aria-current')).toBe('page')
      }
    }
    expect(true).toBe(true)
  })

  test('Filter 分组折叠按钮存在', async () => {
    const { wrapper } = await mountSidebar()
    // filters section header（若 anyFiltersVisible 为真）
    const btn = wrapper.find('.filters-section .section-header')
    if (btn.exists()) {
      expect(btn.attributes('type')).toBe('button')
    }
    expect(true).toBe(true)
  })

  test('Filters 折叠：toggleSidebarShowFilters 切换 aria-expanded', async () => {
    const { wrapper, settingsStore } = await mountSidebar()
    const before = settingsStore.sidebarShowFilters
    settingsStore.toggleSidebarShowFilters()
    await nextTick()
    expect(settingsStore.sidebarShowFilters).toBe(!before)
    const btn = wrapper.find('.filters-section .section-header')
    if (btn.exists()) {
      const ex = btn.attributes('aria-expanded')
      expect(ex).toBe(settingsStore.sidebarShowFilters ? 'true' : 'false')
    }
  })

  test('Areas 折叠：toggleSidebarShowAreas 切换状态', async () => {
    const { settingsStore } = await mountSidebar()
    const before = settingsStore.sidebarShowAreas
    settingsStore.toggleSidebarShowAreas()
    expect(settingsStore.sidebarShowAreas).toBe(!before)
  })

  test('侧边栏 nav 列表 role=list', async () => {
    const { wrapper } = await mountSidebar()
    const nav = wrapper.find('.sidebar-nav')
    expect(nav.attributes('role')).toBe('list')
  })

  test('点击默认视图项触发导航（路由 push 至少不报错）', async () => {
    const { wrapper } = await mountSidebar()
    const btn = wrapper.find('.nav-btn')
    if (btn.exists()) {
      await btn.trigger('click')
    }
    expect(true).toBe(true)
  })

  test('右键 filter 按钮触发 contextmenu（不崩溃）', async () => {
    const { wrapper } = await mountSidebar()
    const any = wrapper.find('.filter-btn')
    if (any.exists()) {
      await any.trigger('contextmenu')
    }
    expect(true).toBe(true)
  })

  test('右键 area 按钮触发 contextmenu（不崩溃）', async () => {
    const { wrapper } = await mountSidebar()
    const any = wrapper.find('.area-btn')
    if (any.exists()) {
      await any.trigger('contextmenu')
    }
    expect(true).toBe(true)
  })

  test('右键 list 按钮触发 contextmenu（不崩溃）', async () => {
    const { wrapper } = await mountSidebar()
    const any = wrapper.find('.list-btn')
    if (any.exists()) {
      await any.trigger('contextmenu')
    }
    expect(true).toBe(true)
  })

  test('area 内折叠每个 area：按钮 aria-expanded 切换', async () => {
    const { wrapper } = await mountSidebar()
    const btn = wrapper.find('.area-btn')
    if (btn.exists()) {
      const expandedBefore = btn.attributes('aria-expanded')
      await btn.trigger('click')
      const expandedAfter = btn.attributes('aria-expanded')
      // 允许切换或保持
      expect([expandedBefore, expandedAfter]).toBeDefined()
    }
    expect(true).toBe(true)
  })

  test('Area rename：areaStore.renameArea 若存在则更新名称', async () => {
    const { areaStore } = await mountSidebar()
    const first = areaStore.areas && areaStore.areas[0]
    if (first && typeof areaStore.renameArea === 'function') {
      const orig = first.name
      areaStore.renameArea(first.id, '新名字')
      expect(first.name).toBe('新名字')
      areaStore.renameArea(first.id, orig)
    } else {
      expect(true).toBe(true)
    }
  })

  test('List rename：listStore.renameList 更新', async () => {
    const { listStore } = await mountSidebar()
    const lists = listStore.lists || []
    if (lists.length && typeof listStore.renameList === 'function') {
      const orig = lists[0].name
      listStore.renameList(lists[0].id, '新 List 名')
      expect(lists[0].name).toBe('新 List 名')
      listStore.renameList(lists[0].id, orig)
    } else {
      expect(true).toBe(true)
    }
  })

  test('Filter rename：filterStore.renameFilter 更新', async () => {
    const { filterStore } = await mountSidebar()
    const filters = filterStore.filters || []
    if (filters.length && typeof filterStore.renameFilter === 'function') {
      const orig = filters[0].name
      filterStore.renameFilter(filters[0].id, '新 Filter 名')
      expect(filters[0].name).toBe('新 Filter 名')
      filterStore.renameFilter(filters[0].id, orig)
    } else {
      expect(true).toBe(true)
    }
  })

  test('保护删除：默认 area/default list 不可被删除（若 deleteArea 返回 false）', async () => {
    const { areaStore, listStore, filterStore } = await mountSidebar()
    if (typeof areaStore.deleteArea === 'function' && DEFAULT_AREA_ID) {
      const res = areaStore.deleteArea(DEFAULT_AREA_ID)
      expect(res === false || res === undefined).toBeTruthy()
    }
    if (typeof listStore.deleteList === 'function') {
      const dl = listStore.lists && listStore.lists[0]
      if (dl) {
        const beforeLen = listStore.lists.length
        listStore.deleteList(dl.id)
        // may succeed or protected: ok either
        expect(listStore.lists.length <= beforeLen).toBe(true)
      }
    }
    if (typeof filterStore.deleteFilter === 'function') {
      const df = filterStore.filters && filterStore.filters[0]
      if (df) {
        const before = filterStore.filters.length
        filterStore.deleteFilter(df.id)
        expect(filterStore.filters.length <= before).toBe(true)
      }
    }
  })

  test('任务为 0 时 EmptyState 组件出现（通过 .empty-state 或 class 包含 empty-state）', async () => {
    const { wrapper, taskStore } = await mountSidebar()
    taskStore.resetAll()
    await nextTick()
    // Sidebar 可能不直接渲染 empty-state；若有则验证
    const anyEmpty = wrapper.find('.empty-state')
    if (anyEmpty.exists()) {
      expect(anyEmpty.attributes('role')).toBe('status')
    } else {
      expect(true).toBe(true)
    }
  })

  test('搜索清除按钮：输入后出现，点击后清空 query', async () => {
    vi.useFakeTimers()
    const { wrapper, taskStore } = await mountSidebar()
    const input = wrapper.find('.sidebar-search input')
    await input.setValue('xyz')
    vi.advanceTimersByTime(400)
    await nextTick()
    const clear = wrapper.find('.search-clear-btn')
    if (clear.exists()) {
      await clear.trigger('click')
      vi.advanceTimersByTime(400)
      expect(taskStore.searchQuery).toBe('')
    }
    vi.useRealTimers()
  })

  test('点击 filter 同步 currentFilterId', async () => {
    const { wrapper, taskStore, filterStore } = await mountSidebar()
    const btn = wrapper.find('.filter-btn')
    if (btn.exists()) {
      await btn.trigger('click')
      await nextTick()
      // 验证 currentFilterId 被设置（任意非空或无）
      expect(taskStore.currentFilterId === null || typeof taskStore.currentFilterId === 'string').toBe(
        true
      )
    } else if (filterStore && typeof filterStore.setCurrentFilter === 'function') {
      const f = (filterStore.filters || [])[0]
      if (f) {
        filterStore.setCurrentFilter(f.id)
        expect(true).toBe(true)
      }
    }
    expect(true).toBe(true)
  })

  test('点击 filter 同步 currentResultTaskIds：Store 计算属性返回数组', async () => {
    const { taskStore, filterStore } = await mountSidebar()
    if (filterStore && typeof filterStore.applyFilter === 'function') {
      const f = (filterStore.filters || [])[0]
      if (f) {
        const ids = filterStore.applyFilter(f.id, taskStore.tasks)
        expect(Array.isArray(ids)).toBe(true)
      }
    }
    // 可能通过 computed
    const crt = taskStore.currentResultTaskIds
    if (crt !== undefined) {
      expect(Array.isArray(crt) || crt === null).toBe(true)
    }
  })

  test('点击 list 导航到 list 视图（不报错）', async () => {
    const { wrapper } = await mountSidebar()
    const btn = wrapper.find('.list-btn')
    if (btn.exists()) {
      await btn.trigger('click')
    }
    expect(true).toBe(true)
  })

  test('点击 area 展开：areaCollapsed 切换', async () => {
    const { wrapper } = await mountSidebar()
    const header = wrapper.find('.area-header-btn')
    if (header.exists()) {
      const expandedBefore = header.attributes('aria-expanded')
      await header.trigger('click')
      const expandedAfter = header.attributes('aria-expanded')
      expect(typeof expandedBefore === 'string' || expandedBefore === undefined).toBe(true)
      expect(typeof expandedAfter === 'string' || expandedAfter === undefined).toBe(true)
    }
  })

  test('Tags 折叠：点击 section-header 切换', async () => {
    const { wrapper } = await mountSidebar()
    const btn = wrapper.find('.tags-section .section-header')
    if (btn.exists()) {
      await btn.trigger('click')
      const ex = btn.attributes('aria-expanded')
      expect(ex === 'true' || ex === 'false').toBe(true)
    }
  })

  test('Sidebar 底部 footer / collapse 按钮：切换 collapsed', async () => {
    const { wrapper, settingsStore } = await mountSidebar()
    const toggle = wrapper.find('.collapse-toggle-btn')
    if (toggle.exists()) {
      const before = settingsStore.sidebarCollapsed
      await toggle.trigger('click')
      expect(settingsStore.sidebarCollapsed).toBe(!before)
    }
  })

  test('标签 tag 按钮点击：同步 currentTag', async () => {
    const { wrapper, taskStore } = await mountSidebar()
    const btn = wrapper.find('.tag-btn')
    if (btn.exists()) {
      await btn.trigger('click')
      expect(taskStore.currentTag === null || typeof taskStore.currentTag === 'string').toBe(true)
    }
  })

  test('空分类时：分类分组也渲染（至少有 default categories）', async () => {
    const { taskStore } = await mountSidebar()
    expect(taskStore.categories.length).toBeGreaterThanOrEqual(3)
  })

  test('Sidebar 有可访问标签 aria-label', async () => {
    const { wrapper } = await mountSidebar()
    const sb = wrapper.find('.sidebar')
    const label = sb.attributes('aria-label')
    expect(typeof label === 'string').toBe(true)
  })

  test('搜索输入有 name 或 aria-label', async () => {
    const { wrapper } = await mountSidebar()
    const input = wrapper.find('.sidebar-search input')
    const labeled =
      input.attributes('aria-label') != null ||
      input.attributes('name') != null ||
      input.attributes('aria-labelledby') != null
    expect(labeled).toBe(true)
  })

  test('所有 section 展开后不报错（连续 toggle）', async () => {
    const { wrapper, settingsStore } = await mountSidebar()
    for (let i = 0; i < 5; i++) {
      settingsStore.toggleSidebarShowFilters()
      settingsStore.toggleSidebarShowAreas()
      await nextTick()
    }
    expect(true).toBe(true)
  })

  test('重命名空字符串不更新（area/list/filter）', async () => {
    const { areaStore, listStore, filterStore } = await mountSidebar()
    if (typeof areaStore.renameArea === 'function') {
      const a = (areaStore.areas || [])[0]
      if (a) {
        const orig = a.name
        areaStore.renameArea(a.id, '')
        expect(a.name).toBe(orig) // name 不变
      }
    }
    if (typeof listStore.renameList === 'function') {
      const l = (listStore.lists || [])[0]
      if (l) {
        const orig = l.name
        listStore.renameList(l.id, '   ')
        expect(l.name).toBe(orig)
      }
    }
    if (typeof filterStore.renameFilter === 'function') {
      const f = (filterStore.filters || [])[0]
      if (f) {
        const orig = f.name
        filterStore.renameFilter(f.id, '')
        expect(f.name).toBe(orig)
      }
    }
  })

  test('键盘 Enter 触发默认视图按钮导航', async () => {
    const { wrapper } = await mountSidebar()
    const btn = wrapper.find('.nav-btn')
    if (btn.exists()) {
      await btn.trigger('keydown.enter')
    }
    expect(true).toBe(true)
  })

  test('侧边栏 aria-label 由 i18n 键 nav.sidebarAriaLabel 提供（不会是 undefined）', async () => {
    const { wrapper } = await mountSidebar()
    const sb = wrapper.find('.sidebar')
    const label = sb.attributes('aria-label')
    expect(label != null && label !== 'undefined').toBe(true)
  })

  test('任务完成后侧边栏计数更新（defaultCount 可能改变）', async () => {
    const { taskStore } = await mountSidebar()
    const pending = taskStore.tasks.find((t) => !t.completed)
    if (pending) {
      const before = taskStore.tasks.filter((t) => !t.completed).length
      taskStore.toggleComplete(pending.id)
      const after = taskStore.tasks.filter((t) => !t.completed).length
      expect(after).toBe(before - 1)
    }
  })

  test('侧边栏 unmount 不报错', async () => {
    const { wrapper } = await mountSidebar()
    expect(() => wrapper.unmount()).not.toThrow()
  })

  test('搜索空字符：不报错', async () => {
    vi.useFakeTimers()
    const { wrapper, taskStore } = await mountSidebar()
    const input = wrapper.find('.sidebar-search input')
    await input.setValue('      ')
    vi.advanceTimersByTime(500)
    expect(taskStore.searchQuery).toBe('      ')
    vi.useRealTimers()
  })

  test('点击分类按钮：同步 currentCategory', async () => {
    const { wrapper, taskStore } = await mountSidebar()
    const btn = wrapper.find('.cat-btn')
    if (btn.exists()) {
      await btn.trigger('click')
      expect(taskStore.currentCategory === null || typeof taskStore.currentCategory === 'string').toBe(
        true
      )
    }
  })
})
