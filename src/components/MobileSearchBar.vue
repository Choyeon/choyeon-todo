<template>
  <div class="mobile-search">
    <Search class="search-icon" />
    <input
      type="text"
      :placeholder="$t('nav.search')"
      v-model="searchValue"
      :aria-label="$t('nav.searchAria')"
      @input="onSearchInput"
    />
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTaskStore } from '../stores/taskStore'
import { Search } from '@lucide/vue'

const router = useRouter()
const taskStore = useTaskStore()
const searchValue = ref(taskStore.searchQuery)
let debounceTimer = null

const onSearchInput = () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    taskStore.searchQuery = searchValue.value
    if (searchValue.value) {
      router.push('/')
    }
  }, 200)
}

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})
</script>

<style scoped>
.mobile-search {
  display: none;
  padding: 12px 16px 8px 16px;
  background: var(--color-surface);
  position: relative;
}

.mobile-search input {
  width: 100%;
  padding: 10px 16px 10px 44px;
  border-radius: var(--radius-full);
  border: 1px solid transparent;
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  font-size: var(--font-size-body);
  font-family: var(--font-body);
  outline: none;
  box-sizing: border-box;
  transition:
    background 0.15s cubic-bezier(0.4, 0, 0.2, 1),
    border-color 0.15s,
    box-shadow 0.15s;
  font-weight: 400;
}

.mobile-search input:focus {
  background: var(--color-surface);
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary-ring);
}

.mobile-search input::placeholder {
  color: var(--color-text-tertiary);
}

.search-icon {
  position: absolute;
  left: 32px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: var(--color-text-tertiary);
  pointer-events: none;
}

@media (max-width: 767px) {
  .mobile-search {
    display: block;
  }
}
</style>
