<template>
  <nav class="mobile-bottom-bar">
    <div class="bar-inner">
      <button
        class="bottom-tab"
        :class="{ active: $route.name === 'Home' && taskStore.currentView === 'today' }"
        @click="navigateTo('today')"
        aria-label="主页"
      >
        <Home :size="22" />
        <span>主页</span>
      </button>
      <button
        class="bottom-tab"
        :class="{ active: $route.name === 'Home' && taskStore.currentView === 'important' }"
        @click="navigateTo('important')"
        aria-label="重要任务"
      >
        <Star :size="22" />
        <span>重要</span>
      </button>
      <button
        class="bottom-tab"
        :class="{ active: $route.name === 'Calendar' }"
        @click="$router.push('/calendar')"
        aria-label="日历"
      >
        <CalendarDays :size="22" />
        <span>日历</span>
      </button>
      <button
        class="bottom-tab"
        :class="{ active: $route.name === 'Completed' }"
        @click="$router.push('/completed')"
        aria-label="已完成"
      >
        <CheckCircle :size="22" />
        <span>已完成</span>
      </button>
      <button
        class="bottom-tab"
        :class="{ active: $route.name === 'Settings' }"
        @click="$router.push('/settings')"
        aria-label="设置"
      >
        <Settings :size="22" />
        <span>设置</span>
      </button>
    </div>
  </nav>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useTaskStore } from '../stores/taskStore'
import { Home, Star, CalendarDays, CheckCircle, Settings } from '@lucide/vue'

const router = useRouter()
const taskStore = useTaskStore()

const navigateTo = (view) => {
  taskStore.currentView = view
  taskStore.currentCategory = null
  router.push('/')
}
</script>

<style scoped>
.mobile-bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: var(--z-sidebar);
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  padding: 6px 0 calc(env(safe-area-inset-bottom, 10px) + 2px) 0;
  display: none;
  box-shadow: 0 -1px 3px rgba(60, 64, 67, 0.08);
}

.bottom-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 0 4px 0;
  color: var(--color-text-tertiary);
  cursor: pointer;
  border: none;
  background: transparent;
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 500;
  transition: color 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  flex: 1;
  min-width: 0;
}

.bottom-tab.active {
  color: var(--color-primary);
}

.bottom-tab:active {
  opacity: 0.7;
}

.bottom-tab:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-primary-ring);
  border-radius: 4px;
}

.bar-inner {
  display: flex;
  justify-content: space-around;
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
}

@media (max-width: 767px) {
  .mobile-bottom-bar {
    display: flex;
  }
}
</style>
