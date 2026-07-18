<template>
  <aside class="sidebar" :class="{ collapsed: settingsStore.sidebarCollapsed }">
    <div class="sidebar-header"></div>

    <div class="sidebar-search" v-show="!settingsStore.sidebarCollapsed">
      <div class="search-input-wrap">
        <Search class="search-icon" :size="16" />
        <input
          type="text"
          :placeholder="$t('nav.search')"
          :value="taskStore.searchQuery"
          @input="onSearchInput"
          :aria-label="$t('nav.searchAria')"
        />
      </div>
    </div>

    <nav class="sidebar-nav">
      <div class="nav-section">
        <button
          class="nav-btn"
          :class="{ active: isActive('today') }"
          @click="navigateTo('today')"
          :aria-label="isActive('today') ? `${$t('nav.myDay')}，${$t('common.currentlySelected')}` : $t('nav.myDay')"
        >
          <Sun :size="20" />
          <span class="nav-label">{{ $t('nav.myDay') }}</span>
          <span class="nav-count" :key="'today-' + taskStore.getCount('today')">{{
            taskStore.getCount('today')
          }}</span>
          <span class="nav-tooltip">{{ $t('nav.myDay') }}</span>
        </button>

        <button
          class="nav-btn"
          :class="{ active: isActive('tomorrow') }"
          @click="navigateTo('tomorrow')"
          :aria-label="isActive('tomorrow') ? `${$t('nav.tomorrow')}，${$t('common.currentlySelected')}` : $t('nav.tomorrow')"
        >
          <Sunrise :size="20" />
          <span class="nav-label">{{ $t('nav.tomorrow') }}</span>
          <span class="nav-count" :key="'tomorrow-' + taskStore.getCount('tomorrow')">{{
            taskStore.getCount('tomorrow')
          }}</span>
          <span class="nav-tooltip">{{ $t('nav.tomorrow') }}</span>
        </button>

        <button
          class="nav-btn"
          :class="{ active: isActive('week') }"
          @click="navigateTo('week')"
          :aria-label="isActive('week') ? `${$t('nav.nextWeek')}，${$t('common.currentlySelected')}` : $t('nav.nextWeek')"
        >
          <CalendarRange :size="20" />
          <span class="nav-label">{{ $t('nav.nextWeek') }}</span>
          <span class="nav-count" :key="'week-' + taskStore.getCount('week')">{{
            taskStore.getCount('week')
          }}</span>
          <span class="nav-tooltip">{{ $t('nav.nextWeek') }}</span>
        </button>

        <button
          class="nav-btn"
          :class="{ active: isActive('important') }"
          @click="navigateTo('important')"
          :aria-label="isActive('important') ? `${$t('nav.important')}，${$t('common.currentlySelected')}` : $t('nav.important')"
        >
          <Star :size="20" />
          <span class="nav-label">{{ $t('nav.important') }}</span>
          <span class="nav-count" :key="'important-' + taskStore.getCount('important')">{{
            taskStore.getCount('important')
          }}</span>
          <span class="nav-tooltip">{{ $t('nav.important') }}</span>
        </button>

        <button
          class="nav-btn"
          :class="{ active: isActive('planned') }"
          @click="navigateTo('planned')"
          :aria-label="isActive('planned') ? `${$t('nav.planned')}，${$t('common.currentlySelected')}` : $t('nav.planned')"
        >
          <Calendar :size="20" />
          <span class="nav-label">{{ $t('nav.planned') }}</span>
          <span class="nav-count" :key="'planned-' + taskStore.getCount('planned')">{{
            taskStore.getCount('planned')
          }}</span>
          <span class="nav-tooltip">{{ $t('nav.planned') }}</span>
        </button>

        <button
          class="nav-btn"
          :class="{ active: isActive('all') }"
          @click="navigateTo('all')"
          :aria-label="isActive('all') ? `${$t('nav.allTasks')}，${$t('common.currentlySelected')}` : $t('nav.allTasks')"
        >
          <ListTodo :size="20" />
          <span class="nav-label">{{ $t('nav.allTasks') }}</span>
          <span class="nav-count" :key="'all-' + taskStore.getCount('all')">{{
            taskStore.getCount('all')
          }}</span>
          <span class="nav-tooltip">{{ $t('nav.allTasks') }}</span>
        </button>
      </div>

      <div class="nav-section">
        <button
          class="nav-btn"
          :class="{ active: $route.name === 'Completed' }"
          @click="$router.push('/completed')"
          :aria-label="$route.name === 'Completed' ? `${$t('nav.completed')}，${$t('common.currentlySelected')}` : $t('nav.completed')"
        >
          <CheckCircle :size="20" />
          <span class="nav-label">{{ $t('nav.completed') }}</span>
          <span class="nav-count" :key="'completed-' + taskStore.getCount('completed')">{{
            taskStore.getCount('completed')
          }}</span>
          <span class="nav-tooltip">{{ $t('nav.completed') }}</span>
        </button>

        <button
          class="nav-btn"
          :class="{ active: $route.name === 'Calendar' }"
          @click="$router.push('/calendar')"
          :aria-label="$route.name === 'Calendar' ? `${$t('nav.calendar')}，${$t('common.currentlySelected')}` : $t('nav.calendar')"
        >
          <CalendarDays :size="20" />
          <span class="nav-label">{{ $t('nav.calendar') }}</span>
          <span class="nav-tooltip">{{ $t('nav.calendar') }}</span>
        </button>

        <button
          class="nav-btn"
          :class="{ active: $route.name === 'Stats' }"
          @click="$router.push('/stats')"
          :aria-label="$route.name === 'Stats' ? `${$t('nav.stats')}，${$t('common.currentlySelected')}` : $t('nav.stats')"
        >
          <BarChart3 :size="20" />
          <span class="nav-label">{{ $t('nav.stats') }}</span>
          <span class="nav-tooltip">{{ $t('nav.stats') }}</span>
        </button>

        <button
          class="nav-btn"
          :class="{ active: $route.name === 'Pomodoro' }"
          @click="$router.push('/pomodoro')"
          :aria-label="$route.name === 'Pomodoro' ? `${$t('nav.pomodoro')}，${$t('common.currentlySelected')}` : $t('nav.pomodoro')"
        >
          <Timer :size="20" />
          <span class="nav-label">{{ $t('nav.pomodoro') }}</span>
          <span class="nav-tooltip">{{ $t('nav.pomodoro') }}</span>
        </button>
      </div>

      <div class="nav-divider"></div>

      <div class="nav-section">
        <span class="nav-section-label" v-show="!settingsStore.sidebarCollapsed">{{ $t('nav.categories') }}</span>
        <button
          v-for="cat in taskStore.categories"
          :key="cat.id"
          class="nav-btn cat-btn"
          :class="{ active: isCategoryActive(cat.id) }"
          @click="navigateToCategory(cat.id)"
          @contextmenu.prevent="onCategoryContextMenu($event, cat)"
          :aria-label="isCategoryActive(cat.id) ? `${cat.name}，${$t('common.currentlySelected')}` : cat.name"
        >
          <component :is="getIcon(cat.icon)" :size="20" />
          <span class="cat-dot" :style="{ background: cat.color }"></span>
          <span class="nav-label">{{ cat.name }}</span>
          <span
            class="nav-count"
            :key="'cat-' + cat.id + '-' + taskStore.getCategoryCount(cat.id)"
            >{{ taskStore.getCategoryCount(cat.id) }}</span
          >
          <span class="nav-tooltip">{{ cat.name }}</span>
        </button>
      </div>

      <div class="nav-divider" v-show="taskStore.tags.length > 0"></div>

      <div class="nav-section" v-show="taskStore.tags.length > 0">
        <span class="nav-section-label" v-show="!settingsStore.sidebarCollapsed">{{ $t('nav.tags') }}</span>
        <button
          v-for="tag in taskStore.tags"
          :key="tag.id"
          class="nav-btn tag-btn"
          :class="{ active: isTagActive(tag.id) }"
          @click="navigateToTag(tag.id)"
          @contextmenu.prevent="onTagContextMenu($event, tag)"
          :aria-label="isTagActive(tag.id) ? `${tag.name}，${$t('common.currentlySelected')}` : tag.name"
        >
          <Tag :size="20" />
          <span class="tag-dot" :style="{ background: tag.color }"></span>
          <span class="nav-label">{{ tag.name }}</span>
          <span class="nav-count" :key="'tag-' + tag.id + '-' + taskStore.getTagCount(tag.id)">{{
            taskStore.getTagCount(tag.id)
          }}</span>
          <span class="nav-tooltip">{{ tag.name }}</span>
        </button>
      </div>
    </nav>

    <div class="sidebar-bottom">
      <button
        class="nav-btn"
        :class="{ active: $route.name === 'Settings' || $route.name === 'Theme' }"
        @click="$router.push('/settings')"
        :aria-label="$t('nav.settings')"
      >
        <Settings :size="20" />
        <span class="nav-label">{{ $t('nav.settings') }}</span>
        <span class="nav-tooltip">{{ $t('nav.settings') }}</span>
      </button>
      <button
        class="nav-btn collapse-toggle-btn"
        @click="settingsStore.toggleSidebar()"
        :aria-label="settingsStore.sidebarCollapsed ? $t('sidebar.expandSidebar') : $t('sidebar.collapseSidebar')"
      >
        <ChevronLeft v-if="!settingsStore.sidebarCollapsed" :size="20" />
        <ChevronRight v-else :size="20" />
        <span class="nav-label">{{ settingsStore.sidebarCollapsed ? $t('sidebar.expand') : $t('sidebar.collapse') }}</span>
        <span class="nav-tooltip">{{
          settingsStore.sidebarCollapsed ? $t('sidebar.expandSidebar') : $t('sidebar.collapseSidebar')
        }}</span>
      </button>
    </div>

    <Teleport to="body">
      <Transition name="ctx-menu">
        <div
          v-if="contextMenu.visible"
          class="context-menu"
          :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
          @click.stop
        >
          <template v-if="contextMenu.type === 'category'">
            <button
              v-if="contextMenu.category && contextMenu.category.id !== 'other'"
              class="context-menu-item"
              @click="handleContextEdit"
            >
              <Pencil :size="14" />
              <span>{{ $t('categories.editCategory') }}</span>
            </button>
            <button
              v-if="contextMenu.category && contextMenu.category.id !== 'other'"
              class="context-menu-item danger"
              @click="handleContextDelete"
            >
              <Trash2 :size="14" />
              <span>{{ $t('categories.deleteCategory') }}</span>
            </button>
            <button class="context-menu-item" @click="handleContextAdd">
              <Plus :size="14" />
              <span>{{ $t('categories.addNew') }}</span>
            </button>
          </template>
          <template v-else-if="contextMenu.type === 'tag'">
            <button class="context-menu-item" @click="handleTagEdit">
              <Pencil :size="14" />
              <span>{{ $t('tags.editTag') }}</span>
            </button>
            <button class="context-menu-item danger" @click="handleTagDelete">
              <Trash2 :size="14" />
              <span>{{ $t('tags.deleteTag') }}</span>
            </button>
          </template>
        </div>
      </Transition>
    </Teleport>
  </aside>
</template>

<script setup>
import { reactive, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useTaskStore } from '../stores/taskStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useConfirm } from '../composables/useConfirm'
import {
  Sun,
  Star,
  Calendar,
  ListTodo,
  CheckCircle,
  CalendarDays,
  BarChart3,
  Timer,
  Settings,
  Search,
  Briefcase,
  User,
  BookOpen,
  ShoppingCart,
  Heart,
  MoreHorizontal,
  Folder,
  Pencil,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  Tag,
  Sunrise,
  CalendarRange,
  AlertTriangle
} from '@lucide/vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const taskStore = useTaskStore()
const settingsStore = useSettingsStore()
const { confirm: confirmDialog } = useConfirm()

const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  type: null,
  category: null,
  tag: null
})

const iconMap = {
  briefcase: Briefcase,
  user: User,
  'book-open': BookOpen,
  'shopping-cart': ShoppingCart,
  heart: Heart,
  'more-horizontal': MoreHorizontal,
  folder: Folder
}

const getIcon = (iconName) => {
  return iconMap[iconName] || Folder
}

const isActive = (view) => {
  if (route.name !== 'Home') return false
  return taskStore.currentView === view
}

const isCategoryActive = (catId) => {
  if (route.name !== 'Home') return false
  return taskStore.currentView === 'category' && taskStore.currentCategory === catId
}

const isTagActive = (tagId) => {
  if (route.name !== 'Home') return false
  return taskStore.currentView === 'tag' && taskStore.currentTag === tagId
}

const navigateTo = (view) => {
  taskStore.currentView = view
  taskStore.currentCategory = null
  taskStore.currentTag = null
  router.push('/')
}

const navigateToCategory = (catId) => {
  taskStore.currentView = 'category'
  taskStore.currentCategory = catId
  taskStore.currentTag = null
  router.push('/')
}

const navigateToTag = (tagId) => {
  taskStore.currentView = 'tag'
  taskStore.currentTag = tagId
  taskStore.currentCategory = null
  router.push('/')
}

const onCategoryContextMenu = (e, cat) => {
  contextMenu.visible = true
  contextMenu.x = e.clientX
  contextMenu.y = e.clientY
  contextMenu.type = 'category'
  contextMenu.category = cat
  contextMenu.tag = null
}

const onTagContextMenu = (e, tag) => {
  contextMenu.visible = true
  contextMenu.x = e.clientX
  contextMenu.y = e.clientY
  contextMenu.type = 'tag'
  contextMenu.tag = tag
  contextMenu.category = null
}

const closeContextMenu = () => {
  contextMenu.visible = false
  contextMenu.category = null
  contextMenu.tag = null
  contextMenu.type = null
}

const handleContextEdit = () => {
  const cat = contextMenu.category
  closeContextMenu()
  router.push('/settings')
  pendingTimers.push(
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('edit-category', { detail: cat }))
    }, 100)
  )
}

const handleContextDelete = () => {
  const cat = contextMenu.category
  closeContextMenu()
  router.push('/settings')
  pendingTimers.push(
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('delete-category', { detail: cat }))
    }, 100)
  )
}

const handleContextAdd = () => {
  closeContextMenu()
  router.push('/settings')
  pendingTimers.push(
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('add-category'))
    }, 100)
  )
}

const handleTagEdit = () => {
  const tag = contextMenu.tag
  closeContextMenu()
  router.push('/settings')
  pendingTimers.push(
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('edit-tag', { detail: tag }))
    }, 100)
  )
}

const handleTagDelete = async () => {
  const tag = contextMenu.tag
  closeContextMenu()
  const confirmed = await confirmDialog({
    message: t('tags.deleteConfirm', { name: tag.name }),
    confirmLabel: t('common.delete'),
    danger: true
  })
  if (confirmed) {
    taskStore.deleteTag(tag.id)
  }
}

let searchDebounce = null
const pendingTimers = []

const onSearchInput = (e) => {
  const value = e.target.value.trim()

  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    taskStore.searchQuery = value
    if (value && route.name !== 'Home') {
      router.push('/')
    }
  }, 200)
}

const onDocumentClick = () => {
  if (contextMenu.visible) closeContextMenu()
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
  if (searchDebounce) clearTimeout(searchDebounce)
  pendingTimers.forEach(clearTimeout)
})
</script>

<style scoped>
.sidebar {
  width: 260px;
  background: var(--sidebar-bg);
  backdrop-filter: blur(var(--sidebar-blur)) saturate(var(--sidebar-saturate));
  -webkit-backdrop-filter: blur(var(--sidebar-blur)) saturate(var(--sidebar-saturate));
  border-right: 1px solid var(--sidebar-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
  min-height: 0;
  transition: width var(--duration-normal) var(--ease-out-expo);
}

.sidebar.collapsed {
  width: 72px;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 12px 12px 12px;
  border-bottom: none;
  min-width: 0;
  flex-shrink: 0;
}

.app-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  opacity: 1;
  transition: opacity var(--transition-smooth);
}

.brand-icon {
  width: 24px;
  height: 24px;
  object-fit: contain;
  border-radius: 6px;
}

.sidebar.collapsed .app-brand {
  opacity: 1;
  width: auto;
  overflow: visible;
}

.sidebar.collapsed .brand-icon {
  width: 20px;
  height: 20px;
}

.brand-text {
  font-size: var(--font-size-h4);
  font-weight: 600;
  color: var(--color-text-primary);
  font-family: var(--font-title);
  letter-spacing: -0.3px;
}

.collapse-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition:
    background var(--transition-micro),
    color var(--transition-micro);
  flex-shrink: 0;
}

.collapse-btn:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
}

.collapse-toggle-btn {
  margin-top: 4px;
}

.sidebar-search {
  padding: 0 12px 12px 12px;
  border-bottom: none;
  min-width: 0;
  flex-shrink: 0;
}

.search-input-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  height: 40px;
  border-radius: var(--radius-full);
  background: var(--sidebar-search-bg);
  backdrop-filter: blur(var(--sidebar-search-blur)) saturate(var(--sidebar-search-saturate));
  -webkit-backdrop-filter: blur(var(--sidebar-search-blur)) saturate(var(--sidebar-search-saturate));
  transition:
    background-color var(--transition-smooth),
    border-color var(--transition-smooth),
    box-shadow var(--duration-moderate) var(--ease-out-expo);
  box-sizing: border-box;
  border: 1px solid var(--sidebar-search-border);
  min-width: 0;
}

.search-input-wrap:hover {
  background: var(--sidebar-search-bg-hover);
}

.search-input-wrap:focus-within {
  background: var(--sidebar-search-bg-focus);
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-ring);
}

.sidebar-search input {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--color-text-primary);
  font-size: var(--font-size-body);
  font-family: var(--font-body);
  font-weight: 400;
  outline: none;
  height: 100%;
  padding: 0;
  line-height: 1.4;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-search input:focus-visible {
  box-shadow: none;
}

.sidebar-search input::placeholder {
  color: var(--color-text-tertiary);
  font-weight: 400;
}

.search-icon {
  color: var(--color-text-secondary);
  flex-shrink: 0;
  transition: color var(--transition-smooth);
}

.search-input-wrap:focus-within .search-icon {
  color: var(--color-primary);
}

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 0;
  min-width: 0;
}

.sidebar.collapsed .sidebar-nav {
  padding: 8px;
}

.sidebar-nav::-webkit-scrollbar {
  width: 6px;
}

.sidebar-nav::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 3px;
}

.sidebar-nav::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 3px;
  transition: background-color var(--transition-smooth);
}

.sidebar-nav:hover::-webkit-scrollbar-thumb {
  background: var(--color-border);
}

.sidebar-nav:hover::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-tertiary);
}

.nav-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.nav-section-label {
  font-size: var(--font-size-2xs);
  font-weight: 600;
  color: var(--color-text-tertiary);
  letter-spacing: 0.8px;
  text-transform: uppercase;
  padding: 12px 12px 6px 12px;
}

.nav-divider {
  height: 1px;
  background: var(--color-border-light);
  margin: 8px 0;
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 12px;
  min-height: 44px;
  border-radius: var(--radius-full);
  border: none;
  background: transparent;
  color: var(--color-text-primary);
  font-size: var(--font-size-body);
  font-weight: 400;
  font-family: var(--font-body);
  cursor: pointer;
  transition:
    background-color var(--transition-smooth),
    color var(--transition-smooth),
    transform var(--transition-micro) var(--ease-spring-soft);
  width: 100%;
  box-sizing: border-box;
  text-align: left;
  white-space: nowrap;
  position: relative;
  overflow: hidden;
  line-height: 1.4;
}

.nav-btn:hover {
  background: var(--color-primary-surface);
  color: var(--color-primary-dark);
}

.nav-btn:active {
  transform: scale(0.97);
  background: var(--color-bg-secondary);
}

.sidebar.collapsed .nav-btn {
  justify-content: center;
  padding: 10px;
  gap: 0;
}

.nav-btn.active {
  background: var(--color-primary-surface);
  color: var(--color-primary-dark);
  font-weight: 500;
}

.nav-btn.active svg {
  stroke-width: 1.5;
}

.nav-btn svg:first-child {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  transition: stroke-width var(--transition-micro);
}

.nav-label {
  flex: 1;
  text-align: left;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar.collapsed .nav-label {
  display: none;
}

.nav-count {
  font-size: var(--font-size-xs);
  font-weight: 500;
  color: var(--sidebar-count-color);
  background: var(--sidebar-count-bg);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  min-width: 24px;
  text-align: center;
  transition:
    background-color var(--transition-smooth),
    color var(--transition-smooth),
    transform var(--transition-spring-soft);
  flex-shrink: 0;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  animation: countPulse var(--transition-spring-soft);
}

@keyframes countPulse {
  0% {
    transform: scale(0.6);
    opacity: 0.4;
  }
  60% {
    transform: scale(1.12);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.sidebar.collapsed .nav-count {
  display: none;
}

.nav-btn:hover .nav-count {
  background: var(--color-primary-surface);
  color: var(--color-primary-dark);
}

.nav-btn.active .nav-count {
  background: var(--color-primary);
  color: var(--color-text-on-primary);
  transform: scale(1.06);
}

.nav-btn:active .nav-count {
  transform: scale(0.94);
}

.cat-dot,
.tag-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  transition:
    transform var(--transition-spring-soft),
    box-shadow var(--transition-smooth);
}

.cat-btn:hover .cat-dot,
.tag-btn:hover .tag-dot {
  transform: scale(1.4);
  box-shadow: 0 0 0 3px var(--color-primary-surface);
}

.sidebar.collapsed .cat-dot,
.sidebar.collapsed .tag-dot {
  position: absolute;
  bottom: 8px;
  right: 8px;
}

.nav-tooltip {
  position: absolute;
  left: calc(100% + 10px);
  top: 50%;
  transform: translateY(-50%);
  background: var(--color-surface-elevated);
  color: var(--color-text-primary);
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: 500;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  z-index: var(--z-tooltip);
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.1),
    0 2px 4px rgba(0, 0, 0, 0.06);
  border: none;
  transition: opacity var(--transition-smooth);
}

.sidebar.collapsed .nav-btn:hover .nav-tooltip {
  opacity: 1;
}

.sidebar-bottom {
  padding: 8px;
  border-top: 1px solid var(--sidebar-border);
  background: transparent;
  margin-top: auto;
  min-width: 0;
  flex-shrink: 0;
}

.sidebar.collapsed .sidebar-bottom {
  padding: 8px;
}

.sidebar-bottom .nav-btn {
  color: var(--color-text-tertiary);
}

.sidebar-bottom .nav-btn:hover {
  color: var(--color-text-secondary);
  background: var(--color-bg-secondary);
}

.sidebar-bottom .nav-btn.active {
  color: var(--color-primary-dark);
  background: var(--color-primary-surface);
}

.sidebar-bottom .collapse-toggle-btn {
  margin-top: 2px;
}

.context-menu {
  position: fixed;
  z-index: var(--z-modal);
  background: var(--color-surface-elevated);
  border: none;
  border-radius: var(--radius-lg);
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.12),
    0 4px 8px rgba(0, 0, 0, 0.08);
  padding: 6px;
  min-width: 160px;
  transform-origin: top left;
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  font-family: var(--font-body);
  font-weight: 500;
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition:
    background-color var(--transition-micro),
    color var(--transition-micro),
    transform var(--transition-spring-soft);
  text-align: left;
}

.context-menu-item:hover {
  background: var(--color-bg-secondary);
  transform: translateX(2px);
}

.context-menu-item.danger {
  color: var(--state-error);
}

.context-menu-item.danger:hover {
  background: var(--color-error-surface);
}

/* 分类管理弹窗入场/出场动画：spring 弹跳（scale + 微位移） */
.ctx-menu-enter-active {
  transition:
    transform var(--duration-normal) var(--ease-spring-soft),
    opacity var(--duration-normal) var(--ease-out-quart);
}

.ctx-menu-leave-active {
  transition:
    transform var(--duration-fast) var(--ease-standard),
    opacity var(--duration-fast) var(--ease-standard);
}

.ctx-menu-enter-from {
  transform: scale(0.85);
  opacity: 0;
}

.ctx-menu-leave-to {
  transform: scale(0.95);
  opacity: 0;
}

@media (min-width: 768px) and (max-width: 1023px) {
  .sidebar {
    width: 72px;
  }

  .sidebar-header {
    justify-content: center;
  }

  .app-brand {
    display: none;
  }

  .sidebar-search,
  .nav-section-label,
  .nav-btn .nav-label,
  .nav-btn .nav-count {
    display: none;
  }

  .nav-divider {
    margin: 4px 0;
  }
}

@media (max-width: 768px) {
  .sidebar:not(.collapsed) {
    width: 240px;
  }

  .sidebar-search {
    padding: 0 10px 10px 10px;
  }

  .search-input-wrap {
    height: 44px;
    padding: 0 12px;
    gap: 8px;
  }

  .sidebar-search input {
    font-size: var(--font-size-lg);
  }

  .sidebar-nav {
    padding: 6px;
    gap: 2px;
  }

  .nav-btn {
    min-height: 48px;
    padding: 0 12px;
    gap: 10px;
    border-radius: 12px;
  }

  .nav-btn svg:first-child {
    width: 22px;
    height: 22px;
  }

  .nav-label {
    font-size: var(--font-size-base);
  }

  .nav-count {
    font-size: var(--font-size-xs);
    padding: 2px 8px;
    min-width: 22px;
  }

  .nav-section-label {
    padding: 10px 12px 6px 12px;
    font-size: var(--font-size-2xs);
  }

  .nav-divider {
    margin: 6px 0;
  }

  .sidebar-bottom {
    padding: 6px;
  }

  .cat-dot,
  .tag-dot {
    width: 10px;
    height: 10px;
  }
}

@media (max-width: 767px) {
  .sidebar {
    display: none;
  }
}
</style>
