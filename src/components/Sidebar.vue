<template>
  <aside
    class="sidebar"
    :class="[
      settingsStore.sidebarCollapsed ? 'collapsed' : '',
      `density-${settingsStore.density}`
    ]"
    role="navigation"
    :aria-label="$t('nav.sidebarAriaLabel')"
  >
    <div class="sidebar-header"></div>

    <!-- 侧边栏搜索（100ms debounce；搜索默认视图/区/列表/过滤器/标签/分类） -->
    <div class="sidebar-search" v-show="!settingsStore.sidebarCollapsed">
      <div class="search-input-wrap">
        <Search class="search-icon" :size="16" aria-hidden="true" />
        <input
          type="text"
          name="sidebarSearch"
          :placeholder="$t('nav.search')"
          v-model="searchInput"
          @input="onSearchInput"
          :aria-label="$t('nav.searchAria')"
          role="searchbox"
        />
        <button
          v-if="searchInput"
          type="button"
          class="search-clear-btn"
          @click="clearSearch"
          :aria-label="$t('common.clear')"
        >
          <X :size="14" aria-hidden="true" />
        </button>
      </div>
    </div>

    <nav
      class="sidebar-nav"
      ref="scrollRef"
      role="list"
      @scroll="maybeCloseAllCollapsedOnScroll"
    >
      <!-- 默认视图区（置顶，不可折叠） -->
      <div class="nav-section" role="listitem">
        <button
          v-for="item in defaultViews"
          :key="item.id"
          class="nav-btn"
          :class="{ active: isDefaultActive(item.id) }"
          @click="navigateDefault(item.id)"
          @keydown.enter.prevent="navigateDefault(item.id)"
          :aria-current="isDefaultActive(item.id) ? 'page' : undefined"
          :aria-label="
            isDefaultActive(item.id)
              ? `${item.label}，${$t('common.currentlySelected')}`
              : item.label
          "
        >
          <component :is="item.icon" :size="20" aria-hidden="true" />
          <span class="nav-label">{{ item.label }}</span>
          <span class="nav-count" :key="'dv-' + item.id + '-' + defaultCount(item.id)">{{
            defaultCount(item.id)
          }}</span>
          <span class="nav-tooltip">{{ item.label }}</span>
        </button>
      </div>

      <div class="nav-divider" aria-hidden="true"></div>

      <!-- 过滤器区（置顶 + 折叠，受 settingsStore.sidebarShowFilters 控制） -->
      <div
        v-if="anyFiltersVisible"
        class="nav-section filters-section"
        role="listitem"
        :aria-label="$t('nav.filters')"
      >
        <button
          type="button"
          class="section-header"
          v-show="!settingsStore.sidebarCollapsed"
          @click="settingsStore.toggleSidebarShowFilters()"
          :aria-expanded="settingsStore.sidebarShowFilters"
          :aria-label="
            settingsStore.sidebarShowFilters
              ? $t('sidebar.collapseSection')
              : $t('sidebar.expandSection')
          "
        >
          <ChevronDown
            class="section-chevron"
            :class="{ collapsed: !settingsStore.sidebarShowFilters }"
            :size="14"
            aria-hidden="true"
          />
          <span class="nav-section-label">{{ $t('nav.filters') }}</span>
          <button
            class="section-action"
            type="button"
            @click.stop="addFilterQuick"
            :aria-label="$t('filters.addNew')"
            title="$t('filters.addNew')"
          >
            <Plus :size="14" aria-hidden="true" />
          </button>
        </button>

        <Transition name="collapse">
          <div v-show="settingsStore.sidebarShowFilters" class="nav-section-body">
            <template v-if="visiblePinnedFilters.length">
              <button
                v-for="f in visiblePinnedFilters"
                :key="'pin-' + f.id"
                class="nav-btn filter-btn"
                :class="{ active: isFilterActive(f.id) }"
                @click="navigateFilter(f.id)"
                @contextmenu.prevent="onFilterContextMenu($event, f)"
                :aria-label="
                  isFilterActive(f.id)
                    ? `${f.name}，${$t('common.currentlySelected')}`
                    : f.name
                "
              >
                <Pin :size="18" class="pin-icon" aria-hidden="true" />
                <Filter :size="18" aria-hidden="true" />
                <span class="nav-label">{{ f.name }}</span>
                <span class="nav-count" :key="'flt-' + f.id">{{ filterCount(f.id) }}</span>
                <span class="nav-tooltip">{{ f.name }}</span>
              </button>
            </template>
            <template v-if="visibleUnpinnedFilters.length">
              <button
                v-for="f in visibleUnpinnedFilters"
                :key="'uf-' + f.id"
                class="nav-btn filter-btn"
                :class="{ active: isFilterActive(f.id) }"
                @click="navigateFilter(f.id)"
                @contextmenu.prevent="onFilterContextMenu($event, f)"
                :aria-label="
                  isFilterActive(f.id)
                    ? `${f.name}，${$t('common.currentlySelected')}`
                    : f.name
                "
              >
                <Filter :size="18" aria-hidden="true" />
                <span class="nav-label">{{ f.name }}</span>
                <span class="nav-count" :key="'flu-' + f.id">{{ filterCount(f.id) }}</span>
                <span class="nav-tooltip">{{ f.name }}</span>
              </button>
            </template>
            <!-- 过滤器空状态 -->
            <div v-if="!visiblePinnedFilters.length && !visibleUnpinnedFilters.length" class="empty-inline" role="status">
              <EmptyState kind="filter" :mini="true" @primary="addFilterQuick" />
            </div>
          </div>
        </Transition>
      </div>

      <div class="nav-divider" aria-hidden="true"></div>

      <!-- 分类（单层扁平；受 sidebarShowAreas 折叠控制） -->
      <div class="nav-section" role="listitem" :aria-label="$t('nav.categories')">
        <button
          type="button"
          class="section-header"
          v-show="!settingsStore.sidebarCollapsed"
          @click="settingsStore.toggleSidebarShowAreas()"
          :aria-expanded="settingsStore.sidebarShowAreas"
          :aria-label="
            settingsStore.sidebarShowAreas
              ? $t('sidebar.collapseSection')
              : $t('sidebar.expandSection')
          "
        >
          <ChevronDown
            class="section-chevron"
            :class="{ collapsed: !settingsStore.sidebarShowAreas }"
            :size="14"
            aria-hidden="true"
          />
          <span class="nav-section-label">{{ $t('nav.categories') }}</span>
          <button
            class="section-action"
            type="button"
            @click.stop="addListQuick()"
            :aria-label="$t('lists.addList')"
            title="$t('lists.addList')"
          >
            <Plus :size="14" aria-hidden="true" />
          </button>
        </button>

        <Transition name="collapse">
          <div v-show="settingsStore.sidebarShowAreas" class="nav-section-body">
            <template v-if="visibleLists.length">
              <button
                v-for="list in visibleLists"
                :key="list.id"
                class="nav-btn list-btn cat-btn"
                :class="{ active: isListActive(list.id) }"
                @click="navigateList(list.id)"
                @contextmenu.prevent="onListContextMenu($event, list)"
                @dragover.prevent="onListDragOver($event, list.id)"
                @dragleave="onListDragLeave"
                @drop="onListDrop($event, list.id)"
                :aria-label="
                  isListActive(list.id)
                    ? `${list.name}，${$t('common.currentlySelected')}`
                    : list.name
                "
              >
                <component :is="getListIcon(list.icon)" :size="18" aria-hidden="true" />
                <span class="nav-label">{{ list.name }}</span>
                <span class="nav-count" :key="'lst-' + list.id">{{ listCount(list.id) }}</span>
                <span class="nav-tooltip">{{ list.name }}</span>
              </button>
            </template>
            <div v-else class="empty-inline" role="status">
              <EmptyState kind="category" :mini="true" @primary="addListQuick()" />
            </div>
          </div>
        </Transition>
      </div>

      <div class="nav-divider" aria-hidden="true"></div>

      <!-- 标签（保留旧版可折叠分组；受 sidebarShowAreas 折叠不影响，但保持独立） -->
      <div
        class="nav-section tags-section"
        role="listitem"
      >
        <button
          type="button"
          class="section-header"
          v-show="!settingsStore.sidebarCollapsed"
          @click="toggleTagsCollapsed()"
          :aria-expanded="!tagsCollapsed"
          :aria-label="
            tagsCollapsed ? $t('sidebar.expandSection') : $t('sidebar.collapseSection')
          "
        >
          <ChevronDown
            class="section-chevron"
            :class="{ collapsed: tagsCollapsed }"
            :size="14"
            aria-hidden="true"
          />
          <span class="nav-section-label">{{ $t('nav.tags') }}</span>
          <button
            class="section-action"
            type="button"
            @click.stop="addTagQuick"
            :aria-label="$t('tags.addTag')"
            title="$t('tags.addTag')"
          >
            <Plus :size="14" aria-hidden="true" />
          </button>
        </button>
        <Transition name="collapse">
          <div v-show="!tagsCollapsed" class="nav-section-body">
            <template v-if="visibleTags.length">
              <button
                v-for="tag in visibleTags"
                :key="tag.id"
                class="nav-btn tag-btn"
                :class="{ active: isTagActive(tag.id) }"
                @click="navigateToTag(tag.id)"
                @contextmenu.prevent="onTagContextMenu($event, tag)"
                :aria-label="
                  isTagActive(tag.id) ? `${tag.name}，${$t('common.currentlySelected')}` : tag.name
                "
              >
                <Tag :size="18" aria-hidden="true" />
                <span class="tag-dot" :style="{ background: tag.color }" aria-hidden="true"></span>
                <span class="nav-label">{{ tag.name }}</span>
                <span class="nav-count" :key="'tg-' + tag.id">{{
                  taskStore.getTagCount(tag.id)
                }}</span>
                <span class="nav-tooltip">{{ tag.name }}</span>
              </button>
            </template>
            <div v-else class="empty-inline" role="status">
              <EmptyState kind="tag" :mini="true" @primary="addTagQuick" />
            </div>
          </div>
        </Transition>
      </div>
    </nav>

    <!-- 底部操作（设置 / 折叠） -->
    <div class="sidebar-bottom">
      <button
        class="nav-btn"
        :class="{ active: $route.name === 'Settings' || $route.name === 'Theme' }"
        @click="$router.push('/settings')"
        :aria-label="$t('nav.settings')"
        :title="$t('nav.settings')"
      >
        <Settings :size="20" aria-hidden="true" />
        <span class="nav-label">{{ $t('nav.settings') }}</span>
        <span class="nav-tooltip">{{ $t('nav.settings') }}</span>
      </button>
      <button
        class="nav-btn collapse-toggle-btn"
        @click="settingsStore.toggleSidebar()"
        :aria-label="
          settingsStore.sidebarCollapsed
            ? $t('sidebar.expandSidebar')
            : $t('sidebar.collapseSidebar')
        "
      >
        <ChevronLeft v-if="!settingsStore.sidebarCollapsed" :size="20" aria-hidden="true" />
        <ChevronRight v-else :size="20" aria-hidden="true" />
        <span class="nav-label">{{
          settingsStore.sidebarCollapsed ? $t('sidebar.expand') : $t('sidebar.collapse')
        }}</span>
        <span class="nav-tooltip">{{
          settingsStore.sidebarCollapsed
            ? $t('sidebar.expandSidebar')
            : $t('sidebar.collapseSidebar')
        }}</span>
      </button>
    </div>

    <!-- 上下文菜单（覆盖分类/标签/区/列表/过滤器） -->
    <Teleport to="body">
      <Transition name="ctx-menu">
        <div
          v-if="contextMenu.visible"
          class="context-menu"
          role="menu"
          :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
          @click.stop
          @keydown.escape="closeContextMenu"
        >
          <!-- List -->
          <template v-if="contextMenu.type === 'list'">
            <button class="context-menu-item" role="menuitem" :aria-label="$t('lists.rename')" @click="handleListRename">
              <Pencil :size="14" aria-hidden="true" />
              <span>{{ $t('lists.rename') }}</span>
            </button>
            <button
              v-if="contextMenu.list && listStore.lists.length > 1"
              class="context-menu-item danger"
              role="menuitem"
              :aria-label="$t('lists.delete')"
              @click="handleListDelete"
            >
              <Trash2 :size="14" aria-hidden="true" />
              <span>{{ $t('lists.delete') }}</span>
            </button>
          </template>
          <!-- Category (legacy) -->
          <template v-else-if="contextMenu.type === 'category'">
            <button
              v-if="contextMenu.category && contextMenu.category.id !== 'other'"
              class="context-menu-item"
              role="menuitem"
              :aria-label="$t('categories.editCategory')"
              @click="handleContextEdit"
            >
              <Pencil :size="14" aria-hidden="true" />
              <span>{{ $t('categories.editCategory') }}</span>
            </button>
            <button
              v-if="contextMenu.category && contextMenu.category.id !== 'other'"
              class="context-menu-item danger"
              role="menuitem"
              :aria-label="$t('categories.deleteCategory')"
              @click="handleContextDelete"
            >
              <Trash2 :size="14" aria-hidden="true" />
              <span>{{ $t('categories.deleteCategory') }}</span>
            </button>
            <button class="context-menu-item" role="menuitem" :aria-label="$t('categories.addNew')" @click="handleContextAdd">
              <Plus :size="14" aria-hidden="true" />
              <span>{{ $t('categories.addNew') }}</span>
            </button>
          </template>
          <!-- Tag -->
          <template v-else-if="contextMenu.type === 'tag'">
            <button class="context-menu-item" role="menuitem" :aria-label="$t('tags.editTag')" @click="handleTagEdit">
              <Pencil :size="14" aria-hidden="true" />
              <span>{{ $t('tags.editTag') }}</span>
            </button>
            <button class="context-menu-item danger" role="menuitem" :aria-label="$t('tags.deleteTag')" @click="handleTagDelete">
              <Trash2 :size="14" aria-hidden="true" />
              <span>{{ $t('tags.deleteTag') }}</span>
            </button>
          </template>
          <!-- Filter -->
          <template v-else-if="contextMenu.type === 'filter'">
            <button class="context-menu-item" role="menuitem" :aria-label="$t('filters.rename')" @click="handleFilterRename">
              <Pencil :size="14" aria-hidden="true" />
              <span>{{ $t('filters.rename') }}</span>
            </button>
            <button class="context-menu-item" role="menuitem" :aria-label="contextMenu.filter && contextMenu.filter.pinned ? $t('filters.unpin') : $t('filters.pin')" @click="handleFilterTogglePin">
              <Pin :size="14" aria-hidden="true" />
              <span>{{
                contextMenu.filter && contextMenu.filter.pinned
                  ? $t('filters.unpin')
                  : $t('filters.pin')
              }}</span>
            </button>
            <button class="context-menu-item" role="menuitem" :aria-label="$t('filters.duplicate')" @click="handleFilterDuplicate">
              <Copy :size="14" aria-hidden="true" />
              <span>{{ $t('filters.duplicate') }}</span>
            </button>
            <button class="context-menu-item danger" role="menuitem" :aria-label="$t('filters.delete')" @click="handleFilterDelete">
              <Trash2 :size="14" aria-hidden="true" />
              <span>{{ $t('filters.delete') }}</span>
            </button>
          </template>
        </div>
      </Transition>
    </Teleport>
  </aside>
</template>

<script setup>
import {
  ref,
  reactive,
  watch,
  computed,
  onMounted,
  onUnmounted,
  provide,
  nextTick
} from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useTaskStore } from '../stores/taskStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useListStore } from '../stores/listStore'
import { useFilterStore } from '../stores/filterStore'
import { useConfirm } from '../composables/useConfirm'
import { usePrompt } from '../composables/usePrompt'
import EmptyState from './EmptyState.vue'
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
  ChevronDown,
  Tag,
  Inbox,
  Sunrise,
  CalendarRange,
  Grid2x2,
  Target,
  ClipboardCheck,
  Award,
  BarChart2,
  Pin,
  Filter,
  X,
  Copy,
  Layers,
  TrendingUp,
  LayoutGrid
} from '@lucide/vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const taskStore = useTaskStore()
const settingsStore = useSettingsStore()
const listStore = useListStore()
const filterStore = useFilterStore()
const { confirm: confirmDialog } = useConfirm()
const { prompt: promptDialog } = usePrompt()

provide('sidebarSettings', {
  get density() {
    return settingsStore.density
  }
})

const scrollRef = ref(null)
const searchInput = ref('')
const tagsCollapsed = ref(false)
const dragOverListId = ref(null)

const DEFAULT_VIEW_IDS = [
  'myday',
  'today',
  'tomorrow',
  'week',
  'important',
  'planned',
  'all',
  'inbox',
  'completed'
]

const defaultViews = computed(() => [
  { id: 'myday', icon: Sun, label: t('nav.myDay') },
  { id: 'today', icon: Calendar, label: t('nav.today') },
  { id: 'tomorrow', icon: Sunrise, label: t('nav.tomorrow') },
  { id: 'week', icon: CalendarRange, label: t('nav.nextWeek') },
  { id: 'important', icon: Star, label: t('nav.important') },
  { id: 'planned', icon: Calendar, label: t('nav.planned') },
  { id: 'all', icon: ListTodo, label: t('nav.allTasks') },
  { id: 'inbox', icon: Inbox, label: t('nav.inbox') },
  {
    id: 'completed',
    icon: CheckCircle,
    label: t('nav.completed'),
    external: () => router.push('/completed')
  },
  { id: 'stats', icon: BarChart3, label: t('nav.stats'), external: () => router.push('/stats') },
  { id: 'pomodoro', icon: Timer, label: t('nav.pomodoro'), external: () => router.push('/pomodoro') },
  { id: 'review', icon: ClipboardCheck, label: t('nav.review'), external: () => router.push('/review') },
  { id: 'dailyReview', icon: Sunrise, label: t('nav.dailyReview'), external: () => router.push('/daily-review') },
  { id: 'habitTracker', icon: Target, label: t('nav.habitTracker'), external: () => router.push('/habit-tracker') },
  { id: 'achievement', icon: TrendingUp, label: t('nav.achievement'), external: () => router.push('/achievement') },
  { id: 'quadrant', icon: LayoutGrid, label: t('nav.quadrant'), external: () => router.push('/quadrant') }
])

// ================= 搜索 (100ms debounce) =================
let searchDebounceTimer = null
const onSearchInput = () => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  const query = searchInput.value
  searchDebounceTimer = setTimeout(() => {
    taskStore.searchQuery = query
    if (query && route.name !== 'Home') {
      router.push('/')
    }
  }, 100)
}

const clearSearch = () => {
  searchInput.value = ''
  taskStore.searchQuery = ''
}

// ================= 默认视图 =================
const defaultCount = (id) => {
  if (id === 'completed') return taskStore.getCount('completed')
  return taskStore.getCount(id)
}

const isDefaultActive = (id) => {
  if (id === 'completed') return route.name === 'Completed'
  if (route.name !== 'Home') return false
  return taskStore.currentView === id
}

const navigateDefault = (id) => {
  const def = defaultViews.value.find((v) => v.id === id)
  if (def && def.external) {
    def.external()
    return
  }
  taskStore.currentView = id
  taskStore.currentCategory = null
  taskStore.currentTag = null
  taskStore.currentFilterId = null
  taskStore.currentListId = null
  taskStore.currentAreaId = null
  router.push('/')
}

// ================= 过滤器 =================
const _matchedFilterIds = computed(() => {
  const q = searchInput.value.trim().toLowerCase()
  if (!q) return null
  const ids = new Set()
  for (const f of filterStore.filters) {
    if (f.name.toLowerCase().includes(q)) ids.add(f.id)
  }
  return ids
})

const visiblePinnedFilters = computed(() => {
  const list = filterStore.pinnedFilters || []
  const ids = _matchedFilterIds.value
  if (!ids) return list
  return list.filter((f) => ids.has(f.id))
})

const visibleUnpinnedFilters = computed(() => {
  const list = filterStore.unpinnedFilters || []
  const ids = _matchedFilterIds.value
  if (!ids) return list
  return list.filter((f) => ids.has(f.id))
})

const anyFiltersVisible = computed(() => {
  if (searchInput.value.trim()) {
    return visiblePinnedFilters.value.length + visibleUnpinnedFilters.value.length > 0
  }
  return filterStore.filters && filterStore.filters.length > 0
})

const filterCount = (id) => {
  try {
    const tasks = taskStore.tasks || []
    const res = filterStore.runFilter(id, {
      tasks,
      areas: [],
      lists: listStore.lists,
      now: new Date()
    })
    return Array.isArray(res) ? res.filter((t) => t && !t.completed).length : 0
  } catch {
    return 0
  }
}

const isFilterActive = (id) => {
  return route.name === 'Home' && taskStore.currentView === 'filter' && taskStore.currentFilterId === id
}

const navigateFilter = (id) => {
  taskStore.currentView = 'filter'
  taskStore.currentFilterId = id
  taskStore.currentListId = null
  taskStore.currentAreaId = null
  taskStore.currentCategory = null
  taskStore.currentTag = null
  router.push('/')
}

const addFilterQuick = async () => {
  const name = await promptDialog({ message: t('filters.namePrompt'), maxLength: 100 })
  if (!name) return
  const f = filterStore.addFilter({
    name: name.trim().slice(0, 100),
    groups: [{ logic: 'AND', conds: [] }]
  })
  if (f) navigateFilter(f.id)
}

// ================= 分类（单层扁平） =================
const visibleLists = computed(() => {
  const q = searchInput.value.trim().toLowerCase()
  const lists = (listStore.lists || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0))
  if (!q) return lists
  return lists.filter((l) => l.name.toLowerCase().includes(q))
})

const listCount = (listId) => {
  if (taskStore.getCategoryCount) {
    // 等价：listId 映射为 category（list.id = category.id 语义）
    const c = taskStore.getCategoryCount(listId)
    if (Number.isFinite(c)) return c
  }
  const tasks = taskStore.tasks || []
  return tasks.filter((t) => !t.completed && (t.listId === listId || t.category === listId)).length
}

const isListActive = (id) => {
  if (route.name !== 'Home') return false
  if (taskStore.currentView === 'list' && taskStore.currentListId === id) return true
  // 兼容旧 category 视图
  if (taskStore.currentView === 'category' && taskStore.currentCategory === id) return true
  return false
}

const navigateList = (id) => {
  taskStore.currentView = 'list'
  taskStore.currentListId = id
  taskStore.currentAreaId = null
  taskStore.currentCategory = null
  taskStore.currentTag = null
  taskStore.currentFilterId = null
  router.push('/')
}

const addListQuick = async () => {
  const name = await promptDialog({ message: t('lists.namePrompt'), maxLength: 60 })
  if (!name) return
  const list = listStore.addList(name.trim().slice(0, 60), {
    color: pickAccentColor()
  })
  if (list) navigateList(list.id)
}

const addTagQuick = async () => {
  const name = await promptDialog({ message: t('tags.namePrompt') || '标签名称', maxLength: 30 })
  if (!name) return
  taskStore.addTag({
    name: name.trim().slice(0, 30),
    color: pickAccentColor()
  })
}

const visibleTags = computed(() => {
  const tags = taskStore.tags || []
  const q = searchInput.value.trim().toLowerCase()
  if (!q) return tags
  return tags.filter((t) => t.name.toLowerCase().includes(q))
})

const toggleTagsCollapsed = () => {
  tagsCollapsed.value = !tagsCollapsed.value
}

const isCategoryActive = (catId) => {
  if (route.name !== 'Home') return false
  return taskStore.currentView === 'category' && taskStore.currentCategory === catId
}

const isTagActive = (tagId) => {
  if (route.name !== 'Home') return false
  return taskStore.currentView === 'tag' && taskStore.currentTag === tagId
}

const navigateToCategory = (catId) => {
  taskStore.currentView = 'category'
  taskStore.currentCategory = catId
  taskStore.currentTag = null
  taskStore.currentFilterId = null
  taskStore.currentListId = null
  router.push('/')
}

const navigateToTag = (tagId) => {
  taskStore.currentView = 'tag'
  taskStore.currentTag = tagId
  taskStore.currentCategory = null
  taskStore.currentFilterId = null
  taskStore.currentListId = null
  router.push('/')
}

// Drag / drop for lists (任务拖到列表)
const onListDragOver = (event, listId) => {
  event.dataTransfer.dropEffect = 'move'
  dragOverListId.value = listId
}
const onListDragLeave = () => {
  dragOverListId.value = null
}
const onListDrop = (event, listId) => {
  event.preventDefault()
  const taskId = event.dataTransfer.getData('text/plain')
  if (taskId) {
    taskStore.updateTask(taskId, { listId, category: listId })
  }
  dragOverListId.value = null
}

// ================= 图标解析 =================
const areaIconMap = {
  briefcase: Briefcase,
  user: User,
  'book-open': BookOpen,
  'shopping-cart': ShoppingCart,
  heart: Heart,
  'more-horizontal': MoreHorizontal,
  folder: Folder,
  layers: Layers
}
const listIconMap = { ...areaIconMap }
const getAreaIcon = (name) => areaIconMap[name] || Layers
const getListIcon = (name) => listIconMap[name] || Folder
const pickAccentColor = () => {
  const palette = ['#4A90D9', '#E91E8C', '#A855F7', '#22C55E', '#EF4444', '#F97316', '#06B6D4', '#9B8EBB']
  return palette[Math.floor(Math.random() * palette.length)]
}

// ================= 上下文菜单 =================
const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  type: null,
  list: null,
  category: null,
  tag: null,
  filter: null
})

const closeContextMenu = () => {
  contextMenu.visible = false
  contextMenu.list = null
  contextMenu.category = null
  contextMenu.tag = null
  contextMenu.filter = null
  contextMenu.type = null
}

const onListContextMenu = (e, list) => {
  contextMenu.visible = true
  contextMenu.x = e.clientX
  contextMenu.y = e.clientY
  contextMenu.type = 'list'
  contextMenu.list = list
}
const onCategoryContextMenu = (e, cat) => {
  contextMenu.visible = true
  contextMenu.x = e.clientX
  contextMenu.y = e.clientY
  contextMenu.type = 'category'
  contextMenu.category = cat
}
const onTagContextMenu = (e, tag) => {
  contextMenu.visible = true
  contextMenu.x = e.clientX
  contextMenu.y = e.clientY
  contextMenu.type = 'tag'
  contextMenu.tag = tag
}
const onFilterContextMenu = (e, filter) => {
  contextMenu.visible = true
  contextMenu.x = e.clientX
  contextMenu.y = e.clientY
  contextMenu.type = 'filter'
  contextMenu.filter = filter
}

const pendingTimers = []
const goSettingsAndDispatch = (eventName, detail) => {
  router.push('/settings')
  pendingTimers.push(
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent(eventName, { detail }))
    }, 100)
  )
}

const handleContextEdit = () => {
  const cat = contextMenu.category
  closeContextMenu()
  goSettingsAndDispatch('edit-category', cat)
}
const handleContextDelete = () => {
  const cat = contextMenu.category
  closeContextMenu()
  goSettingsAndDispatch('delete-category', cat)
}
const handleContextAdd = () => {
  closeContextMenu()
  goSettingsAndDispatch('add-category')
}
const handleTagEdit = () => {
  const tag = contextMenu.tag
  closeContextMenu()
  goSettingsAndDispatch('edit-tag', tag)
}
const handleTagDelete = async () => {
  const tag = contextMenu.tag
  closeContextMenu()
  const confirmed = await confirmDialog({
    message: t('tags.deleteConfirm', { name: tag.name }),
    confirmLabel: t('common.delete'),
    danger: true
  })
  if (confirmed) taskStore.deleteTag(tag.id)
}

const handleListRename = async () => {
  const list = contextMenu.list
  closeContextMenu()
  if (!list) return
  const nextName = await promptDialog({
    message: t('lists.renamePrompt', { name: list.name }),
    defaultValue: list.name,
    maxLength: 60
  })
  if (nextName) listStore.renameList(list.id, nextName)
}
const handleListDelete = async () => {
  const list = contextMenu.list
  closeContextMenu()
  if (!list) return
  const confirmed = await confirmDialog({
    message: t('lists.deleteConfirm', { name: list.name }),
    confirmLabel: t('common.delete'),
    danger: true
  })
  if (!confirmed) return
  const res = listStore.removeList(list.id)
  if (res && res.success) {
    // 将指向被删 list 的任务迁回 defaultTargetId（兼容 category 字段）
    for (const task of taskStore.tasks) {
      if (task.listId === list.id || task.category === list.id) {
        taskStore.updateTask(task.id, { listId: res.defaultTargetId, category: res.defaultTargetId })
      }
    }
  }
}

const handleFilterRename = async () => {
  const f = contextMenu.filter
  closeContextMenu()
  if (!f) return
  const nextName = await promptDialog({
    message: t('filters.renamePrompt', { name: f.name }),
    defaultValue: f.name,
    maxLength: 100
  })
  if (nextName) filterStore.updateFilter(f.id, { name: nextName })
}
const handleFilterTogglePin = () => {
  const f = contextMenu.filter
  closeContextMenu()
  if (!f) return
  filterStore.updateFilter(f.id, { pinned: !f.pinned })
}
const handleFilterDuplicate = () => {
  const f = contextMenu.filter
  closeContextMenu()
  if (f) filterStore.duplicateFilter(f.id)
}
const handleFilterDelete = async () => {
  const f = contextMenu.filter
  closeContextMenu()
  if (!f) return
  const confirmed = await confirmDialog({
    message: t('filters.deleteConfirm', { name: f.name }),
    confirmLabel: t('common.delete'),
    danger: true
  })
  if (confirmed) filterStore.removeFilter(f.id)
}

const onDocumentClick = () => {
  if (contextMenu.visible) closeContextMenu()
}
const maybeCloseAllCollapsedOnScroll = () => {
  // 滚动时关闭上下文菜单，避免错位
  if (contextMenu.visible) closeContextMenu()
}

// ================= 兼容：taskStore 字段兜底 =================
// 保证引用安全：taskStore 的 currentFilterId/currentListId/currentAreaId 未定义则补上（undefined 逻辑自洽）
watch(
  () => settingsStore.density,
  () => {
    // density 变更由 data 属性在全局生效；此处无需 DOM 操作
  }
)

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
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

.sidebar.density-comfortable .nav-btn {
  min-height: 48px;
}
.sidebar.density-standard .nav-btn {
  min-height: 44px;
}
.sidebar.density-compact .nav-btn {
  min-height: 36px;
  font-size: var(--font-size-sm);
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
.search-input-wrap input {
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
.search-input-wrap input:focus-visible {
  box-shadow: none;
}
.search-input-wrap input::placeholder {
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
.search-clear-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  border: none;
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-micro);
  flex-shrink: 0;
}
.search-clear-btn:hover {
  color: var(--color-text-primary);
  background: var(--color-border);
}
.search-clear-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--color-primary-ring);
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

.nav-divider {
  height: 1px;
  background: var(--color-border-light);
  margin: 8px 0;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 10px 10px 6px 10px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 10px;
  color: var(--color-text-tertiary);
  transition: background-color var(--transition-micro);
}
.section-header:hover {
  background: var(--color-bg-secondary);
}
.section-chevron {
  transition: transform var(--transition-smooth) var(--ease-out-expo);
  flex-shrink: 0;
}
.section-chevron.collapsed {
  transform: rotate(-90deg);
}
.nav-section-label {
  flex: 1;
  font-size: var(--font-size-2xs);
  font-weight: 600;
  color: var(--color-text-tertiary);
  letter-spacing: 0.8px;
  text-transform: uppercase;
  text-align: left;
  padding: 0;
}
.section-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-micro);
  flex-shrink: 0;
}
.section-action:hover {
  background: var(--color-bg-secondary);
  color: var(--color-primary);
}
.section-action.mini {
  width: 18px;
  height: 18px;
  color: var(--color-text-tertiary);
}
.section-action:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--color-primary-ring);
}

.nav-section-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* 折叠动画 */
.collapse-enter-active,
.collapse-leave-active {
  overflow: hidden;
  transition:
    max-height var(--duration-normal) var(--ease-out-expo),
    opacity var(--duration-fast) ease;
}
.collapse-enter-from,
.collapse-leave-to {
  max-height: 0 !important;
  opacity: 0;
}
.collapse-enter-to,
.collapse-leave-from {
  max-height: 800px;
  opacity: 1;
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
.nav-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--color-primary-ring);
}

.sidebar.collapsed .nav-btn {
  justify-content: center;
  padding: 10px;
  gap: 0;
}

/* 选中蓝色指示条 */
.nav-btn.active {
  background: var(--color-primary-surface);
  color: var(--color-primary-dark);
  font-weight: 500;
}

.nav-btn svg:first-of-type {
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
}

.pin-icon {
  color: var(--color-primary);
}
.filter-btn .pin-icon {
  margin-right: -6px;
}
.filter-btn svg:nth-of-type(2) {
  margin-left: 0;
}

/* 标签 / 分类 圆点 */
.cat-dot,
.tag-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.tags-section {
  margin-top: 2px;
}

.empty-inline {
  padding: 6px 8px;
}

/* 底部 */
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
.collapse-toggle-btn {
  margin-top: 4px;
}

/* tooltip */
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

/* 上下文菜单 */
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
  min-width: 170px;
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
.context-menu-item:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--color-primary-ring);
}
.context-menu-item.danger {
  color: var(--state-error);
}
.context-menu-item.danger:hover {
  background: var(--color-error-surface);
}

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
  .sidebar-search,
  .section-header,
  .nav-section-label,
  .nav-btn .nav-label,
  .nav-btn .nav-count {
    display: none;
  }
}

@media (max-width: 768px) {
  .sidebar:not(.collapsed) {
    width: 240px;
  }
  .nav-btn {
    min-height: 48px;
    padding: 0 12px;
    gap: 10px;
    border-radius: 12px;
  }
  .nav-section-label {
    padding: 10px 12px 6px 12px;
  }
}

@media (max-width: 767px) {
  .sidebar {
    display: none;
  }
}
</style>
