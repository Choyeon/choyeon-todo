<template>
  <button class="mobile-fab" aria-label="添加任务" @click="$emit('click')">
    <Plus :size="28" />
  </button>
</template>

<script setup>
import { Plus } from '@lucide/vue'

defineEmits(['click'])
</script>

<style scoped>
.mobile-fab {
  display: none;
  position: fixed;
  bottom: 88px;
  right: 20px;
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: var(--color-primary);
  color: var(--color-text-on-primary);
  border: none;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  box-shadow: 0 3px 5px -1px rgba(60, 64, 67, 0.14), 0 6px 10px 0 rgba(60, 64, 67, 0.08), 0 1px 18px 0 rgba(60, 64, 67, 0.06);
  z-index: var(--z-fab);
  transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.mobile-fab:hover {
  box-shadow: 0 5px 5px -3px rgba(60, 64, 67, 0.18), 0 8px 10px 1px rgba(60, 64, 67, 0.1), 0 3px 14px 2px rgba(60, 64, 67, 0.08);
}

.mobile-fab:active {
  transform: scale(0.96);
  box-shadow: 0 2px 4px -1px rgba(60, 64, 67, 0.2), 0 4px 5px 0 rgba(60, 64, 67, 0.12), 0 1px 10px 0 rgba(60, 64, 67, 0.08);
}

.mobile-fab:focus-visible {
  outline: none;
  box-shadow: 0 3px 5px -1px rgba(60, 64, 67, 0.14), 0 6px 10px 0 rgba(60, 64, 67, 0.08), 0 0 0 2px var(--color-primary-ring);
}

@media (max-width: 767px) {
  .mobile-fab {
    display: flex;
  }
}
</style>
