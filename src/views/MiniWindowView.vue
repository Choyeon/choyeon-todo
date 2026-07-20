<template>
  <div class="mini-window" @contextmenu.prevent="showMenu = false">
    <div class="mini-header">
      <div class="mini-title">
        <Sun :size="16" />
        <span>{{ $t('nav.myDay') }}</span>
        <span class="mini-count">{{ taskStore.myDayCount }}</span>
      </div>
      <div class="mini-actions">
        <button class="mini-btn" @click.stop="showMenu = !showMenu" :title="$t('common.more')">
          <MoreHorizontal :size="14" />
        </button>
      </div>
    </div>

    <div v-if="showMenu" class="mini-menu" @click.stop>
      <div class="menu-item" @click="handleOpenMain">
        <Maximize2 :size="14" />
        <span>{{ $t('mini.openMain') }}</span>
      </div>
      <div class="menu-item" @click="handleToggleAlwaysOnTop">
        <Pin :size="14" />
        <span>{{ alwaysOnTop ? $t('mini.cancelPin') : $t('mini.pinTop') }}</span>
      </div>
      <div class="menu-item" @click="handleClose">
        <X :size="14" />
        <span>{{ $t('mini.close') }}</span>
      </div>
    </div>

    <div class="mini-list">
      <TransitionGroup name="mini-list" tag="div" class="mini-tasks">
        <div
          v-for="task in taskStore.myDayTasks"
          :key="task.id"
          class="mini-task"
          :class="{ completed: task.completed }"
        >
          <div
            class="mini-checkbox"
            :class="{ checked: task.completed }"
            @click="toggleComplete(task.id)"
          >
            <Check v-if="task.completed" :size="10" />
          </div>
          <span class="mini-task-title">{{ task.title }}</span>
        </div>
      </TransitionGroup>

      <div v-if="taskStore.myDayCount === 0" class="mini-empty">
        <Inbox :size="24" />
        <span>{{ $t('empty.noTasksToday') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Sun, MoreHorizontal, X, Check, Inbox, Maximize2, Pin } from '@lucide/vue'
import { useTaskStore } from '../stores/taskStore'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const taskStore = useTaskStore()
const showMenu = ref(false)
const alwaysOnTop = ref(true)

const toggleComplete = (taskId) => {
  taskStore.toggleComplete(taskId)
}

const handleOpenMain = () => {
  showMenu.value = false
  if (window.electronAPI?.showMainWindow) {
    window.electronAPI.showMainWindow()
  }
}

const handleToggleAlwaysOnTop = async () => {
  showMenu.value = false
  if (window.electronAPI?.toggleMiniAlwaysOnTop) {
    const result = await window.electronAPI.toggleMiniAlwaysOnTop()
    alwaysOnTop.value = result
  }
}

const handleClose = () => {
  showMenu.value = false
  if (window.electronAPI?.closeMiniWindow) {
    window.electronAPI.closeMiniWindow()
  }
}

const handleClickOutside = (e) => {
  if (showMenu.value) {
    const menuEl = document.querySelector('.mini-menu')
    const btnEl = document.querySelector('.mini-actions .mini-btn')
    if (
      menuEl && !menuEl.contains(e.target) &&
      btnEl && !btnEl.contains(e.target)
    ) {
      showMenu.value = false
    }
  }
}

onMounted(() => {
  if (typeof document !== 'undefined') {
    document.documentElement.style.background = 'transparent'
    document.body.style.background = 'transparent'
    document.body.style.margin = '0'
    document.body.style.padding = '0'
    document.body.style.overflow = 'hidden'
    const app = document.getElementById('app')
    if (app) {
      app.style.background = 'transparent'
    }
  }
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.mini-window {
  width: 280px;
  height: 400px;
  background: var(--color-surface);
  border-radius: 12px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.2),
    0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--color-border);
  user-select: none;
}

.mini-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--color-border);
  -webkit-app-region: drag;
}

.mini-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.mini-count {
  background: var(--color-primary);
  color: white;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
}

.mini-actions {
  display: flex;
  gap: 4px;
  -webkit-app-region: no-drag;
}

.mini-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.mini-btn:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
}

.mini-menu {
  position: absolute;
  top: 44px;
  right: 10px;
  background: var(--color-surface);
  border-radius: 8px;
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.15),
    0 2px 6px rgba(0, 0, 0, 0.1);
  padding: 6px;
  min-width: 140px;
  z-index: 100;
  border: 1px solid var(--color-border);
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  color: var(--color-text-primary);
  cursor: pointer;
  transition: background 0.15s ease;
}

.menu-item:hover {
  background: var(--color-bg-secondary);
}

.mini-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  max-height: 340px;
}

.mini-tasks {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mini-task {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.mini-task:hover {
  background: var(--color-bg-secondary);
}

.mini-task.completed .mini-task-title {
  text-decoration: line-through;
  color: var(--color-text-tertiary);
}

.mini-checkbox {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.mini-checkbox:hover {
  border-color: var(--color-primary);
}

.mini-checkbox.checked {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.mini-task-title {
  font-size: 13px;
  color: var(--color-text-primary);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.mini-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--color-text-tertiary);
  gap: 12px;
  font-size: 13px;
}

.mini-list::-webkit-scrollbar {
  width: 4px;
}

.mini-list::-webkit-scrollbar-track {
  background: transparent;
}

.mini-list::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 2px;
}

.mini-list-enter-active,
.mini-list-leave-active {
  transition: all 0.2s ease;
}

.mini-list-enter-from,
.mini-list-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
