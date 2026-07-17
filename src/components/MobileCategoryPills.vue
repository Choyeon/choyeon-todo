<template>
  <div class="mobile-cats">
    <div class="mobile-cat-scroll">
      <button
        class="mobile-cat-btn"
        :class="{ active: taskStore.currentView === 'today' }"
        @click="navigateTo('today')"
        :aria-label="$t('nav.myDay')"
      >
        <Sun :size="14" />
        {{ $t('nav.myDay') }}
      </button>
      <button
        class="mobile-cat-btn"
        :class="{ active: taskStore.currentView === 'important' }"
        @click="navigateTo('important')"
        :aria-label="$t('nav.important')"
      >
        <Star :size="14" />
        {{ $t('nav.important') }}
      </button>
      <button
        class="mobile-cat-btn"
        :class="{ active: taskStore.currentView === 'planned' }"
        @click="navigateTo('planned')"
        :aria-label="$t('nav.planned')"
      >
        <Calendar :size="14" />
        {{ $t('nav.planned') }}
      </button>
      <button
        class="mobile-cat-btn"
        :class="{ active: taskStore.currentView === 'all' }"
        @click="navigateTo('all')"
        :aria-label="$t('nav.allShort')"
      >
        <ListTodo :size="14" />
        {{ $t('nav.allShort') }}
      </button>
      <button
        v-for="cat in taskStore.categories"
        :key="cat.id"
        class="mobile-cat-btn"
        :class="{
          active: taskStore.currentView === 'category' && taskStore.currentCategory === cat.id
        }"
        :aria-label="cat.name"
        @click="navigateToCategory(cat.id)"
      >
        <component :is="getIcon(cat.icon)" :size="14" />
        {{ cat.name }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useTaskStore } from '../stores/taskStore'
import {
  Sun,
  Star,
  Calendar,
  ListTodo,
  Briefcase,
  User,
  BookOpen,
  ShoppingCart,
  Heart,
  MoreHorizontal,
  Folder
} from '@lucide/vue'

const router = useRouter()
const taskStore = useTaskStore()

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

const navigateTo = (view) => {
  taskStore.currentView = view
  taskStore.currentCategory = null
  router.push('/')
}

const navigateToCategory = (catId) => {
  taskStore.currentView = 'category'
  taskStore.currentCategory = catId
  router.push('/')
}
</script>

<style scoped>
.mobile-cats {
  display: none;
  padding: 4px 16px 12px 16px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border-light);
}

.mobile-cat-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.mobile-cat-scroll::-webkit-scrollbar {
  display: none;
}

.mobile-cat-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
  transition:
    background 0.15s cubic-bezier(0.4, 0, 0.2, 1),
    border-color 0.15s,
    color 0.15s;
}

.mobile-cat-btn:hover {
  background: var(--color-bg-secondary);
}

.mobile-cat-btn:active {
  opacity: 0.8;
}

.mobile-cat-btn.active {
  background: var(--color-primary-surface);
  border-color: var(--color-primary-lighter);
  color: var(--color-primary-dark);
}

.mobile-cat-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-primary-ring);
}

@media (max-width: 767px) {
  .mobile-cats {
    display: block;
  }
}
</style>
