<template>
  <div class="app-container" :class="{ standalone: isStandaloneRoute, 'web-mode': isWebMode }">
    <template v-if="!isStandaloneRoute">
      <TitleBar v-if="!isWebMode" />
      <div class="main-body">
        <Sidebar v-if="!isMobile" />
        <main class="content-area">
          <template v-if="isMobile">
            <MobileSearchBar />
            <MobileCategoryPills v-if="showMobileCats" />
          </template>
          <router-view v-slot="{ Component }">
            <transition name="route" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </main>
      </div>
      <MobileBottomNav v-if="isMobile" />
      <MobileFab v-if="isMobile && showFab" @click="openAddTask" />
    </template>
    <div v-else class="standalone-content">
      <router-view v-slot="{ Component }">
        <transition name="route" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </div>

    <TaskModal
      :visible="showTaskModal"
      :task="editingTask"
      @close="closeTaskModal"
      @save="saveTask"
    />

    <Teleport to="body">
      <div v-if="showShortcutsHelp" class="shortcuts-overlay" @click="showShortcutsHelp = false">
        <div class="shortcuts-modal scale-in-center" @click.stop>
          <div class="shortcuts-header">
            <h3>键盘快捷键</h3>
            <button class="shortcuts-close" @click="showShortcutsHelp = false" aria-label="关闭">
              <X :size="18" />
            </button>
          </div>
          <div class="shortcuts-body">
            <div class="shortcuts-group">
              <h4>全局操作</h4>
              <div class="shortcut-item">
                <span class="shortcut-keys"> <kbd>Ctrl</kbd> + <kbd>N</kbd> </span>
                <span class="shortcut-desc">新建任务</span>
              </div>
              <div class="shortcut-item">
                <span class="shortcut-keys"> <kbd>Ctrl</kbd> + <kbd>K</kbd> </span>
                <span class="shortcut-desc">搜索任务</span>
              </div>
              <div class="shortcut-item">
                <span class="shortcut-keys"> <kbd>Ctrl</kbd> + <kbd>/</kbd> </span>
                <span class="shortcut-desc">显示快捷键帮助</span>
              </div>
              <div class="shortcut-item">
                <span class="shortcut-keys">
                  <kbd>Esc</kbd>
                </span>
                <span class="shortcut-desc">关闭弹窗/取消编辑</span>
              </div>
            </div>
            <div class="shortcuts-divider"></div>
            <div class="shortcuts-group">
              <h4>任务导航</h4>
              <div class="shortcut-item">
                <span class="shortcut-keys"> <kbd>J</kbd> / <kbd>↓</kbd> </span>
                <span class="shortcut-desc">下一个任务</span>
              </div>
              <div class="shortcut-item">
                <span class="shortcut-keys"> <kbd>K</kbd> / <kbd>↑</kbd> </span>
                <span class="shortcut-desc">上一个任务</span>
              </div>
              <div class="shortcut-item">
                <span class="shortcut-keys">
                  <kbd>Space</kbd>
                </span>
                <span class="shortcut-desc">切换完成状态</span>
              </div>
              <div class="shortcut-item">
                <span class="shortcut-keys">
                  <kbd>I</kbd>
                </span>
                <span class="shortcut-desc">切换重要标记</span>
              </div>
              <div class="shortcut-item">
                <span class="shortcut-keys">
                  <kbd>D</kbd>
                </span>
                <span class="shortcut-desc">打开日期选择</span>
              </div>
              <div class="shortcut-item">
                <span class="shortcut-keys">
                  <kbd>/</kbd>
                </span>
                <span class="shortcut-desc">聚焦搜索</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <Snackbar />
    <ConfirmModal />
    <ReminderModal />
    <ThemeTransition
      :trigger="themeTransitionTrigger"
      :start-x="themeTransitionX"
      :start-y="themeTransitionY"
      :target-theme="themeTransitionTarget"
      @complete="onThemeTransitionComplete"
    />
    <UpdateModal ref="updateModalRef" />

    <div
      v-if="bingWallpaperUrl"
      class="bing-wallpaper"
      :style="{ backgroundImage: `url(${bingWallpaperUrl})` }"
    ></div>
    <div v-if="bingWallpaperUrl" class="bing-wallpaper-overlay"></div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, provide, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTaskStore } from './stores/taskStore'
import { useSettingsStore } from './stores/settingsStore'
import { usePomodoroStore } from './stores/pomodoroStore'
import { useReminderScheduler } from './composables/useReminderScheduler'
import { getTodayStr } from './utils/date'
import { X } from '@lucide/vue'
import TitleBar from './components/TitleBar.vue'
import Sidebar from './components/Sidebar.vue'
import MobileBottomNav from './components/MobileBottomNav.vue'
import MobileSearchBar from './components/MobileSearchBar.vue'
import MobileCategoryPills from './components/MobileCategoryPills.vue'
import MobileFab from './components/MobileFab.vue'
import TaskModal from './components/TaskModal.vue'
import Snackbar from './components/Snackbar.vue'
import ConfirmModal from './components/ConfirmModal.vue'
import ReminderModal from './components/ReminderModal.vue'
import ThemeTransition from './components/ThemeTransition.vue'
import UpdateModal from './components/UpdateModal.vue'

const route = useRoute()
const router = useRouter()
const taskStore = useTaskStore()
const settingsStore = useSettingsStore()
const pomodoroStore = usePomodoroStore()

const isMobile = ref(false)
const showTaskModal = ref(false)
const editingTask = ref(null)
const highlightedTaskId = ref(null)
let highlightTimeout = null
const showShortcutsHelp = ref(false)

const themeTransitionTrigger = ref(0)
const themeTransitionX = ref(0)
const themeTransitionY = ref(0)
const themeTransitionTarget = ref('dark')
const updateModalRef = ref(null)
const currentAppVersion = ref(__APP_VERSION__)
let updateCheckTimer = null
let updateCleanupListeners = []

const { start: startReminderScheduler } = useReminderScheduler()

const bingWallpaperUrl = ref('')
const BING_WALLPAPER_STORAGE_KEY = 'choyeon_bing_wallpaper'

const fetchBingWallpaper = async () => {
  try {
    const today = new Date().toDateString()
    const cached = localStorage.getItem(BING_WALLPAPER_STORAGE_KEY)
    if (cached) {
      const parsed = JSON.parse(cached)
      if (parsed.date === today && parsed.url) {
        bingWallpaperUrl.value = parsed.url
        return
      }
    }

    const response = await fetch(
      'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN'
    )
    if (!response.ok) throw new Error('Failed to fetch Bing wallpaper')

    const data = await response.json()
    if (data.images && data.images.length > 0) {
      const imageUrl = `https://www.bing.com${data.images[0].url}`
      bingWallpaperUrl.value = imageUrl
      localStorage.setItem(
        BING_WALLPAPER_STORAGE_KEY,
        JSON.stringify({ date: today, url: imageUrl })
      )
    }
  } catch (e) {
    console.warn('[App] Failed to fetch Bing wallpaper:', e)
  }
}

const isStandaloneRoute = computed(
  () =>
    route.name === 'Debug' ||
    route.name === 'PomodoroFullscreen' ||
    route.name === 'PomodoroFab' ||
    route.name === 'MiniWindow'
)

const isWebMode = computed(() => !window.electronAPI)

const showMobileCats = computed(() => route.name === 'Home')
const showFab = computed(() => route.name === 'Home' || route.name === 'Calendar')

const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

const openAddTask = () => {
  editingTask.value = null
  showTaskModal.value = true
}

const closeTaskModal = () => {
  showTaskModal.value = false
  editingTask.value = null
}

const saveTask = () => {
  closeTaskModal()
}

const openEditTask = (task) => {
  editingTask.value = task
  showTaskModal.value = true
}

const triggerThemeTransition = (x, y, targetTheme) => {
  themeTransitionX.value = x
  themeTransitionY.value = y
  themeTransitionTarget.value = targetTheme
  themeTransitionTrigger.value++
}

const onThemeTransitionComplete = () => {}

const focusTask = async (taskId) => {
  if (!taskId) return

  const task = taskStore.tasks.find((t) => t.id === taskId)
  if (!task) return

  taskStore.searchQuery = ''

  const today = getTodayStr()
  if (task.date === today && !task.completed) {
    taskStore.currentView = 'today'
    taskStore.currentCategory = null
  } else if (task.important && !task.completed) {
    taskStore.currentView = 'important'
    taskStore.currentCategory = null
  } else if (!task.completed && task.date >= today) {
    taskStore.currentView = 'planned'
    taskStore.currentCategory = null
  } else if (task.completed) {
    taskStore.currentView = 'completed'
    taskStore.currentCategory = null
  } else {
    taskStore.currentView = 'all'
    taskStore.currentCategory = null
  }

  if (router.currentRoute.value.name !== 'Home') {
    await router.push({ name: 'Home' })
  }

  await nextTick()

  highlightedTaskId.value = taskId

  await nextTick()

  const taskElement = document.querySelector(`[data-task-id="${taskId}"]`)
  if (taskElement) {
    taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  if (highlightTimeout) clearTimeout(highlightTimeout)
  highlightTimeout = setTimeout(() => {
    highlightedTaskId.value = null
  }, 3000)
}

const focusSearchInput = () => {
  const searchInput = document.querySelector('.sidebar-search input, .mobile-search-bar input')
  if (searchInput) {
    searchInput.focus()
    searchInput.select()
  }
}

const moveFocus = (direction) => {
  if (route.name !== 'Home') return

  const tasks = taskStore.filteredTasks
  if (tasks.length === 0) return

  const currentIndex = taskStore.focusedTaskId
    ? tasks.findIndex((t) => t.id === taskStore.focusedTaskId)
    : -1

  let newIndex
  if (direction === 'down') {
    newIndex = currentIndex < tasks.length - 1 ? currentIndex + 1 : 0
  } else {
    newIndex = currentIndex > 0 ? currentIndex - 1 : tasks.length - 1
  }

  taskStore.focusedTaskId = tasks[newIndex].id

  nextTick(() => {
    const taskElement = document.querySelector(`[data-task-id="${taskStore.focusedTaskId}"]`)
    if (taskElement) {
      taskElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  })
}

const toggleFocusedTaskComplete = () => {
  if (taskStore.focusedTaskId) {
    taskStore.toggleComplete(taskStore.focusedTaskId)
  }
}

const toggleFocusedTaskImportant = () => {
  if (taskStore.focusedTaskId) {
    taskStore.toggleImportant(taskStore.focusedTaskId)
  }
}

const openFocusedTaskDate = () => {
  if (taskStore.focusedTaskId) {
    const task = taskStore.tasks.find((t) => t.id === taskStore.focusedTaskId)
    if (task) {
      openEditTask(task)
    }
  }
}

const handleKeyDown = (e) => {
  const tag = e.target.tagName
  const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
  const isContentEditable = e.target.isContentEditable
  const modifier = e.ctrlKey || e.metaKey

  if (modifier && e.key.toLowerCase() === 'n') {
    e.preventDefault()
    openAddTask()
    return
  }

  if (modifier && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    focusSearchInput()
    return
  }

  if (modifier && e.key === '/') {
    e.preventDefault()
    showShortcutsHelp.value = !showShortcutsHelp.value
    return
  }

  if (modifier && e.key === ',') {
    e.preventDefault()
    router.push('/settings')
    return
  }

  if (modifier && e.shiftKey && e.key.toLowerCase() === 'p') {
    e.preventDefault()
    if (router.currentRoute.value.name !== 'Pomodoro') {
      router.push('/pomodoro')
    } else {
      pomodoroStore.toggleTimer?.()
    }
    return
  }

  if (e.key === 'Escape') {
    if (showTaskModal.value) {
      closeTaskModal()
    } else if (showShortcutsHelp.value) {
      showShortcutsHelp.value = false
    }
    return
  }

  if (isInput || isContentEditable) return

  switch (e.key) {
    case 'j':
    case 'ArrowDown':
      e.preventDefault()
      moveFocus('down')
      break
    case 'k':
    case 'ArrowUp':
      e.preventDefault()
      moveFocus('up')
      break
    case ' ':
      e.preventDefault()
      toggleFocusedTaskComplete()
      break
    case 'i':
    case 'I':
      e.preventDefault()
      toggleFocusedTaskImportant()
      break
    case 'd':
    case 'D':
      e.preventDefault()
      openFocusedTaskDate()
      break
    case '/':
      e.preventDefault()
      focusSearchInput()
      break
  }
}

provide('openAddTask', openAddTask)
provide('openEditTask', openEditTask)
provide('triggerThemeTransition', triggerThemeTransition)
provide('highlightedTaskId', highlightedTaskId)
provide('focusTask', focusTask)

let cleanupFns = []

const setupElectronListeners = () => {
  if (!window.electronAPI) return

  cleanupFns.push(window.electronAPI.onTaskNew?.(() => openAddTask()))
  cleanupFns.push(window.electronAPI.onTaskFocus?.(({ taskId }) => focusTask(taskId)))
  cleanupFns.push(window.electronAPI.onNotificationTaskClick?.(({ taskId }) => focusTask(taskId)))
  cleanupFns.push(window.electronAPI.onNavigateSettings?.(() => router.push('/settings')))
  cleanupFns.push(
    window.electronAPI.onDoNotDisturbChanged?.((enabled) => {
      settingsStore.doNotDisturb = enabled
    })
  )

  setupAutoUpdateListeners()
}

const setupAutoUpdateListeners = () => {
  if (!window.electronAPI) return

  updateCleanupListeners.push(
    window.electronAPI.onUpdateAvailable?.((info) => {
      if (updateModalRef.value) {
        updateModalRef.value.show({
          currentVersion: currentAppVersion.value,
          version: info.version,
          releaseNotes: info.releaseNotes
        })
      }
    })
  )

  updateCleanupListeners.push(
    window.electronAPI.onUpdateDownloadProgress?.((progress) => {
      if (updateModalRef.value) {
        updateModalRef.value.setDownloadProgress(progress)
      }
    })
  )

  updateCleanupListeners.push(
    window.electronAPI.onUpdateDownloaded?.(() => {
      if (updateModalRef.value) {
        updateModalRef.value.onDownloadComplete()
      }
    })
  )

  updateCleanupListeners.push(
    window.electronAPI.onUpdateError?.((err) => {
      if (updateModalRef.value) {
        updateModalRef.value.onDownloadError()
      }
    })
  )

  const mockUpdateHandler = (e) => {
    if (updateModalRef.value) {
      updateModalRef.value.show({
        currentVersion: currentAppVersion.value,
        version: e.detail.version,
        releaseNotes: e.detail.releaseNotes
      })
    }
  }
  window.addEventListener('mock-update-available', mockUpdateHandler)
  updateCleanupListeners.push(() => {
    window.removeEventListener('mock-update-available', mockUpdateHandler)
  })
}

const checkForUpdatesOnStartup = async () => {
  if (!window.electronAPI?.checkForUpdates || !window.electronAPI?.getAppVersion) return

  try {
    const ver = await window.electronAPI.getAppVersion()
    if (ver) {
      currentAppVersion.value = ver
    }
  } catch (_) {
    // ignore errors when getting app version
  }

  updateCheckTimer = setTimeout(() => {
    window.electronAPI.checkForUpdates()
  }, 3000)
}

const syncTasksToTray = () => {
  try {
    const tasks = Array.isArray(taskStore.tasks)
      ? taskStore.tasks.map((t) => {
          const obj = { ...t }
          Object.keys(obj).forEach((key) => {
            if (typeof obj[key] === 'function' || obj[key] === undefined) {
              delete obj[key]
            }
          })
          return obj
        })
      : []
    const categories = Array.isArray(taskStore.categories)
      ? taskStore.categories.map((c) => {
          const obj = { ...c }
          Object.keys(obj).forEach((key) => {
            if (typeof obj[key] === 'function' || obj[key] === undefined) {
              delete obj[key]
            }
          })
          return obj
        })
      : []
    window.electronAPI?.syncTasks?.(tasks, categories)
  } catch (e) {
    console.error('[App] syncTasksToTray error:', e)
  }
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  window.addEventListener('keydown', handleKeyDown)

  setupElectronListeners()
  syncTasksToTray()
  checkForUpdatesOnStartup()
  startReminderScheduler()

  if (settingsStore.bingWallpaperEnabled) {
    fetchBingWallpaper()
  }

  watch(() => [taskStore.tasks, taskStore.categories], syncTasksToTray, { deep: true })

  watch(
    () => settingsStore.doNotDisturb,
    (newVal) => {
      window.electronAPI?.setDoNotDisturb?.(newVal)
    }
  )

  watch(
    () => settingsStore.bingWallpaperEnabled,
    (newVal) => {
      if (newVal) {
        fetchBingWallpaper()
      } else {
        bingWallpaperUrl.value = ''
      }
    }
  )
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
  window.removeEventListener('keydown', handleKeyDown)
  if (highlightTimeout) clearTimeout(highlightTimeout)
  if (updateCheckTimer) clearTimeout(updateCheckTimer)
  cleanupFns.forEach((fn) => fn?.())
  cleanupFns = []
  updateCleanupListeners.forEach((fn) => fn?.())
  updateCleanupListeners = []
})
</script>

<style scoped>
.app-container {
  height: 100%;
  width: 100%;
  background: transparent;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.app-container.standalone {
  flex-direction: column;
}

.app-container.web-mode .main-body {
  padding-top: 0;
}

.main-body {
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
  padding-top: var(--title-bar-height);
  /* 背景透明：标题栏 padding 区域可透出 Windows 亚克力；内容区和侧边栏各自有不透明背景 */
  background: transparent;
}

.content-area {
  flex: 1;
  min-width: 0;
  min-height: 0;
  background: var(--content-bg);
  backdrop-filter: blur(var(--content-blur)) saturate(var(--content-saturate));
  -webkit-backdrop-filter: blur(var(--content-blur)) saturate(var(--content-saturate));
  overflow-y: auto;
  overflow-x: hidden;
}

.standalone-content {
  flex: 1;
  height: 100%;
  overflow: auto;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
}

.shortcuts-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.15s ease;
  backdrop-filter: blur(4px);
}

.shortcuts-modal {
  background: var(--color-surface-elevated);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  border: 1px solid var(--color-border);
  width: 440px;
  max-width: 90vw;
  animation: scaleIn 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.shortcuts-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border-light);
}

.shortcuts-header h3 {
  margin: 0;
  font-size: var(--font-size-h4);
  font-weight: 600;
  color: var(--color-text-primary);
  font-family: var(--font-title);
}

.shortcuts-close {
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
    background var(--transition-smooth),
    color var(--transition-smooth);
}

.shortcuts-close:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
}

.shortcuts-body {
  padding: 16px 20px 20px 20px;
}

.shortcuts-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shortcuts-group h4 {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.shortcuts-divider {
  height: 1px;
  background: var(--color-border-light);
  margin: 16px 0;
}

.shortcut-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 6px 0;
}

.shortcut-keys {
  display: flex;
  align-items: center;
  gap: 4px;
}

.shortcut-keys kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 6px;
  font-family: var(--font-mono, monospace);
  font-size: var(--font-size-xs);
  font-weight: 500;
  color: var(--color-text-secondary);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  box-shadow: 0 1px 0 var(--color-border);
}

.shortcut-desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  font-family: var(--font-body);
  font-weight: 400;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.route-enter-active {
  transition:
    opacity var(--duration-normal) var(--ease-out-expo),
    transform var(--duration-normal) var(--ease-out-expo);
}

.route-leave-active {
  transition:
    opacity var(--duration-fast) var(--ease-standard),
    transform var(--duration-fast) var(--ease-standard);
}

.route-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.route-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.bing-wallpaper {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  z-index: -2;
  transition: opacity 0.5s ease;
}

.bing-wallpaper-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bing-wallpaper-overlay, rgba(255, 255, 255, 0.7));
  z-index: -1;
  transition: background 0.3s ease;
}

html[data-theme='dark'] .bing-wallpaper-overlay {
  --bing-wallpaper-overlay: rgba(18, 18, 26, 0.85);
}

@media (max-width: 767px) {
  .content-area {
    padding-bottom: 72px;
  }
}
</style>
