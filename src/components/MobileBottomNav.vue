<template>
  <nav class="mobile-bottom-bar">
    <div class="bar-inner">
      <button
        class="bottom-tab"
        :class="{ active: $route.name === 'Home' && taskStore.currentView === 'today' }"
        @click="navigateTo('today')"
        :aria-label="$t('nav.homeMobile')"
      >
        <Home :size="22" />
        <span>{{ $t('nav.homeMobile') }}</span>
      </button>
      <button
        class="bottom-tab"
        :class="{ active: $route.name === 'Home' && taskStore.currentView === 'important' }"
        @click="navigateTo('important')"
        :aria-label="$t('nav.importantTasks')"
      >
        <Star :size="22" />
        <span>{{ $t('nav.important') }}</span>
      </button>
      <button
        class="bottom-tab"
        :class="{ active: $route.name === 'Calendar' }"
        @click="$router.push('/calendar')"
        :aria-label="$t('nav.calendar')"
      >
        <CalendarDays :size="22" />
        <span>{{ $t('nav.calendar') }}</span>
      </button>
      <button
        class="bottom-tab"
        :class="{ active: $route.name === 'Completed' }"
        @click="$router.push('/completed')"
        :aria-label="$t('nav.completed')"
      >
        <CheckCircle :size="22" />
        <span>{{ $t('nav.completed') }}</span>
      </button>
      <button
        class="bottom-tab"
        :class="{ active: $route.name === 'Settings' }"
        @click="$router.push('/settings')"
        :aria-label="$t('nav.settings')"
      >
        <Settings :size="22" />
        <span>{{ $t('nav.settings') }}</span>
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
  font-size: var(--font-size-2xs);
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
