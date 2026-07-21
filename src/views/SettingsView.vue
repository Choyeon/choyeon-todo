<template>
  <div class="settings-view">
    <div class="content-inner">
      <div class="content-header">
        <h1>{{ $t('settings.title') }}</h1>
        <p class="header-subtitle">{{ $t('settings.subtitle') }}</p>
      </div>

      <SettingsAppearance />
      <SettingsCategories ref="categoriesRef" />
      <SettingsPomodoro />
      <SettingsNotifications />
      <SettingsSystem />
      <SettingsShortcuts />
      <SettingsData
        @show-clear="showClearDataModal = true"
        @show-reset="showResetDataModal = true"
      />
      <SettingsAbout />
    </div>

    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showClearDataModal"
          class="modal-backdrop"
          @click.self="showClearDataModal = false"
        >
          <Transition name="slide-up">
            <div
              v-if="showClearDataModal"
              class="category-modal delete-modal"
              @keydown.esc="showClearDataModal = false"
            >
              <div class="delete-icon">
                <AlertTriangle :size="32" />
              </div>
              <h3 class="modal-title">{{ $t('settings.clearAllDataConfirm') }}</h3>
              <p class="delete-desc">
                {{ $t('settings.clearAllDataDesc') }}
              </p>
              <div class="delete-options">
                <button class="delete-option-btn delete" @click="confirmClearAllData">
                  <Trash2 :size="16" />
                  {{ $t('settings.confirmClear') }}
                </button>
              </div>
              <button class="cancel-btn full-width" @click="showClearDataModal = false">
                {{ $t('common.cancel') }}
              </button>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showResetDataModal"
          class="modal-backdrop"
          @click.self="showResetDataModal = false"
        >
          <Transition name="slide-up">
            <div
              v-if="showResetDataModal"
              class="category-modal delete-modal"
              @keydown.esc="showResetDataModal = false"
            >
              <div class="delete-icon" style="background: rgba(245, 158, 11, 0.12); color: #f59e0b">
                <RefreshCw :size="32" />
              </div>
              <h3 class="modal-title">{{ $t('settings.resetDataConfirm') }}</h3>
              <p class="delete-desc">
                {{ $t('settings.resetDataDesc') }}
              </p>
              <div class="delete-options">
                <button
                  class="delete-option-btn"
                  style="background: rgba(245, 158, 11, 0.12); color: #d97706"
                  @click="confirmResetData"
                >
                  <RefreshCw :size="16" />
                  {{ $t('settings.confirmReset') }}
                </button>
              </div>
              <button class="cancel-btn full-width" @click="showResetDataModal = false">
                {{ $t('common.cancel') }}
              </button>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '../stores/settingsStore'
import { useTaskStore } from '../stores/taskStore'
import { useSnackbar } from '../composables/useSnackbar'
import { AlertTriangle, Trash2, RefreshCw } from '@lucide/vue'

const { t } = useI18n()
import SettingsAppearance from '../components/settings/SettingsAppearance.vue'
import SettingsCategories from '../components/settings/SettingsCategories.vue'
import SettingsPomodoro from '../components/settings/SettingsPomodoro.vue'
import SettingsNotifications from '../components/settings/SettingsNotifications.vue'
import SettingsSystem from '../components/settings/SettingsSystem.vue'
import SettingsShortcuts from '../components/settings/SettingsShortcuts.vue'
import SettingsData from '../components/settings/SettingsData.vue'
import SettingsAbout from '../components/settings/SettingsAbout.vue'

const settingsStore = useSettingsStore()
const taskStore = useTaskStore()
const { show: showSnackbar } = useSnackbar()

const showClearDataModal = ref(false)
const showResetDataModal = ref(false)
const categoriesRef = ref(null)

const confirmClearAllData = () => {
  showClearDataModal.value = false
  try {
    taskStore.resetAll()
    settingsStore.resetSettings()
    if (typeof localStorage !== 'undefined') {
      localStorage.clear()
      localStorage.setItem('choyeon_skip_sample', '1')
    }
    showSnackbar(t('settings.dataCleared'), { duration: 2000 })
    setTimeout(() => {
      window.location.reload()
    }, 1500)
  } catch (e) {
    console.error('[SettingsView] Clear data failed:', e)
    showSnackbar(t('settings.clearDataFailed') + e.message, { duration: 4000 })
  }
}

const confirmResetData = () => {
  showResetDataModal.value = false
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('choyeon_skip_sample')
    }
    taskStore.resetToDefault()
    showSnackbar(t('settings.resetDataSuccess'), { duration: 2000 })
  } catch (e) {
    console.error('[SettingsView] Reset data failed:', e)
    showSnackbar(t('settings.resetDataFailed') + e.message, { duration: 4000 })
  }
}

const onEditCategory = (e) => {
  if (e.detail && categoriesRef.value) {
    categoriesRef.value.startEditCategory?.(e.detail)
  }
}
const onAddCategory = () => {
  categoriesRef.value?.openAddCategory?.()
}
const onDeleteCategory = (e) => {
  if (e.detail && categoriesRef.value) {
    categoriesRef.value.handleDeleteCategory?.(e.detail)
  }
}

onMounted(() => {
  window.addEventListener('edit-category', onEditCategory)
  window.addEventListener('add-category', onAddCategory)
  window.addEventListener('delete-category', onDeleteCategory)
})

onUnmounted(() => {
  window.removeEventListener('edit-category', onEditCategory)
  window.removeEventListener('add-category', onAddCategory)
  window.removeEventListener('delete-category', onDeleteCategory)
})
</script>
<style>
.settings-view {
  min-height: 100%;
  background: transparent;
}

.content-inner {
  max-width: 640px;
  padding: 0 48px 48px 48px;
  margin: 0 auto;
}

.content-header {
  margin-bottom: 8px;
  padding: 48px 0 24px 0;
  animation: slideDown var(--duration-moderate) var(--ease-out-expo);
}

.content-header h1 {
  font-size: var(--font-size-4xl);
  font-weight: 600;
  margin: 0 0 4px 0;
  color: var(--color-text-primary);
  letter-spacing: -0.5px;
  line-height: 1.2;
  font-family: var(--font-title);
}

.header-subtitle {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: var(--font-size-body);
  color: var(--color-text-secondary);
  margin: 0;
  font-weight: 400;
  letter-spacing: 0.2px;
}

.settings-card {
  background: var(--card-bg);
  backdrop-filter: blur(var(--sidebar-search-blur)) saturate(var(--sidebar-search-saturate));
  -webkit-backdrop-filter: blur(var(--sidebar-search-blur)) saturate(var(--sidebar-search-saturate));
  border-radius: var(--radius-xl);
  border: 1px solid var(--card-border);
  padding: 8px 0;
  margin-bottom: 16px;
  box-shadow: var(--card-shadow);
  transition:
    box-shadow var(--transition-smooth),
    border-color var(--transition-smooth);
  animation: cardEnter var(--duration-moderate) var(--ease-out-quart) backwards;
}

.settings-card:nth-child(2) {
  animation-delay: 0.05s;
}
.settings-card:nth-child(3) {
  animation-delay: 0.1s;
}
.settings-card:nth-child(4) {
  animation-delay: 0.15s;
}
.settings-card:nth-child(5) {
  animation-delay: 0.2s;
}
.settings-card:nth-child(6) {
  animation-delay: 0.25s;
}
.settings-card:nth-child(7) {
  animation-delay: 0.3s;
}
.settings-card:nth-child(8) {
  animation-delay: 0.35s;
}

@keyframes cardEnter {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.settings-section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 16px 24px 12px 24px;
}

.settings-section-icon {
  width: 28px;
  height: 28px;
  min-width: 28px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
}

.settings-section-title {
  font-family: var(--font-body);
  font-size: var(--font-size-body);
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
  letter-spacing: 0.1px;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 16px 24px 12px 24px;
  gap: 12px;
}

.category-header .settings-section-header {
  margin: 0;
  min-width: 0;
}

.batch-delete-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: transparent;
  color: var(--state-error);
  border: none;
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  font-weight: 500;
  font-family: var(--font-body);
  cursor: pointer;
  transition:
    background var(--transition-micro),
    transform var(--transition-micro);
  flex-shrink: 0;
}

.batch-delete-btn:hover {
  background: var(--color-error-surface);
}

.batch-delete-btn:active {
  transform: scale(0.96);
}

.setting-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 20px;
  cursor: pointer;
  transition: background var(--transition-smooth);
  min-height: 52px;
  position: relative;
}

.setting-row:hover {
  background: var(--color-bg-secondary);
}

.setting-row:active {
  background: var(--color-surface-hover);
}

.setting-row.no-hover {
  cursor: default;
}

.setting-row.no-hover:hover {
  background: transparent;
}

.setting-row.danger .setting-label {
  color: var(--state-error);
}

.setting-icon-wrap {
  width: 40px;
  height: 40px;
  min-width: 40px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
  transition: transform var(--transition-spring-soft);
}

.setting-row:hover .setting-icon-wrap {
  transform: scale(1.08);
}

.icon-primary-tint {
  background: var(--color-primary-surface);
  color: var(--color-primary);
}

.icon-green {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.icon-blue {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.icon-red {
  background: var(--color-error-surface);
  color: var(--state-error);
}

.icon-amber {
  background: rgba(251, 191, 36, 0.12);
  color: #f59e0b;
}

.icon-orange {
  background: rgba(249, 115, 22, 0.12);
  color: #f97316;
}

.icon-purple {
  background: rgba(139, 92, 246, 0.12);
  color: #8b5cf6;
}

.icon-slate {
  background: rgba(148, 163, 184, 0.15);
  color: #94a3b8;
}

.setting-label-wrap {
  flex: 1;
  min-width: 0;
}

.setting-label {
  font-size: var(--font-size-body);
  font-weight: 500;
  color: var(--color-text-primary);
  display: block;
  letter-spacing: 0.1px;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.setting-desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin: 2px 0 0 0;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chevron {
  color: var(--color-text-tertiary);
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  transition:
    transform var(--transition-smooth),
    color var(--transition-smooth);
}

.setting-row:hover .chevron {
  color: var(--color-text-secondary);
  transform: translateX(2px);
}

.toggle-switch {
  position: relative;
  width: 48px;
  height: 28px;
  min-width: 48px;
  border-radius: 9999px;
  border: none;
  cursor: pointer;
  transition: background var(--transition-smooth);
  padding: 0;
  outline: none;
  background: var(--color-border);
  flex-shrink: 0;
}

.toggle-switch:focus-visible {
  box-shadow: 0 0 0 3px var(--color-primary-ring);
}

.toggle-switch[aria-checked='true'] {
  background: var(--color-primary);
}

.toggle-knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--color-surface);
  transition:
    left var(--transition-spring-soft),
    box-shadow var(--transition-smooth);
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.2),
    0 1px 1px rgba(0, 0, 0, 0.1);
}

.toggle-switch[aria-checked='true'] .toggle-knob {
  left: 23px;
  box-shadow:
    0 2px 6px rgba(0, 0, 0, 0.25),
    0 1px 2px rgba(0, 0, 0, 0.1);
}

.toggle-switch:active .toggle-knob {
  width: 24px;
}

.reminder-select {
  padding: 6px 32px 6px 12px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  font-family: var(--font-body);
  cursor: pointer;
  outline: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 16px;
  transition:
    border-color var(--transition-smooth),
    box-shadow var(--transition-spring-soft);
}

.reminder-select:hover {
  border-color: var(--color-text-tertiary);
}

.reminder-select:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-ring);
}

.color-picker-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--color-border-light);
  min-height: 52px;
}

.color-options {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 16px 24px 20px 24px;
}

.color-option {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-on-primary);
  transition:
    transform var(--transition-spring-soft),
    box-shadow var(--transition-smooth);
  box-sizing: border-box;
  position: relative;
}

.color-option:hover {
  transform: scale(1.12) rotate(-5deg);
}

.color-option.active {
  box-shadow:
    0 0 0 3px var(--color-surface),
    0 0 0 5px currentColor;
}

.color-option.active::after {
  content: '';
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  border: 1px solid currentColor;
  opacity: 0.2;
  animation: pulseRing 2s var(--ease-out-expo) infinite;
}

.color-option:focus-visible {
  box-shadow: 0 0 0 2px var(--color-primary-ring);
  outline: none;
}

.segmented-control {
  display: flex;
  gap: 4px;
  padding: 4px;
  margin: 0 24px 16px 24px;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
}

.segment-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 12px;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: 500;
  font-family: var(--font-body);
  cursor: pointer;
  transition:
    color var(--transition-smooth),
    background var(--transition-smooth),
    box-shadow var(--transition-smooth),
    transform var(--transition-spring-soft);
  position: relative;
  overflow: hidden;
}

.segment-btn:hover {
  color: var(--color-text-primary);
}

.segment-btn:active {
  transform: scale(0.96);
}

.segment-btn.active {
  background: var(--color-surface);
  color: var(--color-primary);
  box-shadow: var(--shadow-sm);
}

.segment-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-primary-ring);
}

.number-input-wrap {
  flex-shrink: 0;
}

.number-input {
  width: 70px;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-size: var(--font-size-body);
  font-weight: 600;
  font-family: var(--font-body);
  text-align: center;
  outline: none;
  transition:
    border-color var(--transition-smooth),
    box-shadow var(--transition-spring-soft);
}

.number-input:hover {
  border-color: var(--color-text-tertiary);
}

.number-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-ring);
}

.number-input::-webkit-outer-spin-button,
.number-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.number-input[type='number'] {
  -moz-appearance: textfield;
}

.shortcut-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  transition: background var(--transition-smooth);
}

.shortcut-item:hover {
  background: var(--color-bg-secondary);
}

.shortcut-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.shortcut-icon {
  color: var(--color-text-secondary);
  flex-shrink: 0;
  transition: color var(--transition-smooth);
}

.shortcut-item:hover .shortcut-icon {
  color: var(--color-primary);
}

.shortcut-label {
  font-size: var(--font-size-body);
  font-weight: 500;
  color: var(--color-text-primary);
  font-family: var(--font-body);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.shortcut-keys {
  display: flex;
  align-items: center;
  gap: 6px;
}

.kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 8px;
  background: var(--color-bg-secondary);
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-primary);
  font-family: var(--font-mono, var(--font-body));
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.08),
    inset 0 -1.5px 0 rgba(0, 0, 0, 0.06);
  transition: transform var(--transition-micro);
}

.shortcut-item:hover .kbd {
  transform: translateY(-1px);
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.1),
    inset 0 -1.5px 0 rgba(0, 0, 0, 0.06);
}

.kbd-plus,
.kbd-slash {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  font-weight: 500;
}

.category-list {
  margin: 4px 0 8px 0;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 24px;
  border-bottom: 1px solid var(--color-border-light);
  transition: background var(--transition-smooth);
}

.category-item:hover {
  background: var(--color-bg-secondary);
}

.category-item:last-of-type {
  border-bottom: none;
}

.category-checkbox {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.category-checkbox input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
}

.category-checkbox .checkmark {
  width: 18px;
  height: 18px;
  border: 2px solid var(--color-border);
  border-radius: 4px;
  transition:
    border-color var(--transition-smooth),
    background var(--transition-spring-soft);
}

.category-checkbox:hover .checkmark {
  border-color: var(--color-primary);
}

.category-checkbox input:checked + .checkmark {
  background: var(--color-primary);
  border-color: var(--color-primary);
  animation: checkPop var(--transition-spring);
}

@keyframes checkPop {
  0% {
    transform: scale(0.8);
  }
  50% {
    transform: scale(1.15);
  }
  100% {
    transform: scale(1);
  }
}

.category-checkbox input:checked + .checkmark::after {
  content: '';
  position: absolute;
  left: 6px;
  top: 2px;
  width: 5px;
  height: 10px;
  border: solid var(--color-text-on-primary);
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.category-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 3px transparent;
  transition: box-shadow var(--transition-smooth);
}

.category-item:hover .category-dot {
  box-shadow: 0 0 0 3px var(--color-bg-secondary);
}

.category-name {
  flex: 1;
  font-size: var(--font-size-body);
  font-weight: 500;
  color: var(--color-text-primary);
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.category-count {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  font-weight: 600;
  padding: 2px 10px;
  min-width: 28px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  background: var(--color-bg-secondary);
  transition:
    background var(--transition-smooth),
    color var(--transition-smooth);
}

.category-item:hover .category-count {
  background: var(--color-surface-hover);
  color: var(--color-text-primary);
}

.category-actions {
  display: flex;
  gap: 4px;
  margin-left: 8px;
}

.cat-action-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    background var(--transition-micro),
    color var(--transition-micro),
    transform var(--transition-spring-soft);
  opacity: 0;
}

.category-item:hover .cat-action-btn {
  opacity: 1;
}

.cat-action-btn:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  transform: scale(1.08);
}

.cat-action-btn:active {
  transform: scale(0.92);
}

.cat-action-btn.delete:hover {
  background: var(--color-error-surface);
  color: var(--state-error);
}

.cat-action-btn:focus-visible {
  box-shadow: 0 0 0 2px var(--color-primary-ring);
  outline: none;
  opacity: 1;
}

.add-category-btn {
  width: calc(100% - 48px);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px;
  margin: 12px 24px 20px 24px;
  background: transparent;
  color: var(--color-primary);
  border: 1.5px dashed var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-body);
  font-weight: 500;
  font-family: var(--font-body);
  cursor: pointer;
  transition:
    background var(--transition-smooth),
    border-color var(--transition-smooth),
    transform var(--transition-spring-soft);
}

.add-category-btn:hover {
  background: var(--color-primary-surface);
  border-color: var(--color-primary-lighter);
}

.add-category-btn:active {
  transform: scale(0.98);
}

.version-card {
  display: flex;
  justify-content: center;
  padding: 32px 24px;
  border: none;
  box-shadow: none;
  background: transparent;
  cursor: pointer;
  user-select: none;
  transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.version-card:active {
  transform: scale(0.98);
}

.version-info {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.version-logo {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(76, 139, 245, 0.3);
}

.version-logo svg {
  width: 100%;
  height: 100%;
  display: block;
}

.version-title {
  font-family: var(--font-title);
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text-secondary);
  margin: 0;
}

.version-desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin: 0;
}

.links-card {
  padding: 0;
  overflow: hidden;
}

.link-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  text-decoration: none;
  color: inherit;
  transition: background 0.15s ease;
  cursor: pointer;
}

.link-row + .link-row {
  border-top: 1px solid var(--color-border-light);
}

.link-row:hover {
  background: var(--color-bg-secondary);
}

.link-icon {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(76, 139, 245, 0.1);
  color: var(--color-primary);
  flex-shrink: 0;
}

.link-icon-globe {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.link-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.link-label {
  font-size: var(--font-size-body);
  font-weight: 500;
  color: var(--color-text-primary);
}

.link-desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.link-arrow {
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: rgba(60, 64, 67, 0.6);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn var(--duration-normal) var(--ease-out-quart);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.category-modal {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: 24px;
  width: 90%;
  max-width: 400px;
  box-shadow: var(--shadow-float);
  animation: modalScaleIn var(--duration-moderate) var(--ease-spring-soft);
}

@keyframes modalScaleIn {
  from {
    transform: scale(0.9) translateY(12px);
    opacity: 0;
  }
  to {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

.delete-modal {
  text-align: center;
}

.delete-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 16px auto;
  border-radius: 50%;
  background: var(--color-error-surface);
  color: var(--state-error);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: iconBounce var(--duration-moderate) var(--ease-spring);
}

@keyframes iconBounce {
  0% {
    transform: scale(0);
  }
  60% {
    transform: scale(1.15);
  }
  100% {
    transform: scale(1);
  }
}

.delete-desc {
  font-size: var(--font-size-body);
  color: var(--color-text-secondary);
  margin: 0 0 20px 0;
  line-height: 1.5;
  font-weight: 400;
}

.delete-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.delete-option-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-body);
  font-weight: 500;
  font-family: var(--font-body);
  cursor: pointer;
  border: none;
  transition:
    background var(--transition-smooth),
    transform var(--transition-spring-soft);
}

.delete-option-btn:active {
  transform: scale(0.97);
}

.delete-option-btn.move {
  background: var(--color-primary-surface);
  color: var(--color-primary-dark);
}

.delete-option-btn.move:hover {
  background: var(--color-primary-lighter);
}

.delete-option-btn.delete {
  background: var(--color-error-surface);
  color: var(--state-error);
}

.delete-option-btn.delete:hover {
  background: var(--color-error-surface-hover);
}

.cancel-btn.full-width {
  width: 100%;
}

.modal-title {
  font-family: var(--font-title);
  font-size: var(--font-size-h3);
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 20px 0;
  letter-spacing: -0.3px;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-family: var(--font-body);
  font-size: var(--font-size-body);
  outline: none;
  transition:
    border-color var(--transition-smooth),
    box-shadow var(--transition-spring-soft);
  box-sizing: border-box;
  margin-bottom: 16px;
}

.form-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-ring);
}

.modal-colors-label {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}

.modal-colors {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 24px;
}

.modal-actions {
  display: flex;
  flex-direction: row-reverse;
  gap: 8px;
}

.save-btn,
.cancel-btn {
  padding: 0 24px;
  height: 40px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-body);
  font-weight: 600;
  font-family: var(--font-body);
  cursor: pointer;
  border: none;
  transition:
    background var(--transition-smooth),
    box-shadow var(--transition-smooth),
    transform var(--transition-micro);
  letter-spacing: 0.5px;
}

.save-btn {
  background: var(--color-primary);
  color: var(--color-text-on-primary);
  box-shadow: var(--shadow-xs);
}

.save-btn:hover {
  background: var(--color-primary-dark);
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.save-btn:active {
  transform: scale(0.97);
}

.cancel-btn {
  background: transparent;
  color: var(--color-primary);
}

.cancel-btn:hover {
  background: var(--color-primary-surface);
}

.cancel-btn:active {
  transform: scale(0.97);
}

@media (min-width: 768px) and (max-width: 1023px) {
  .content-inner {
    padding: 0 32px 40px 32px;
  }

  .content-header {
    padding: 36px 0 20px 0;
  }

  .content-header h1 {
    font-size: var(--font-size-h2);
  }
}

@media (max-width: 767px) {
  .content-inner {
    padding: 0 16px 120px 16px;
  }

  .content-header {
    padding: 24px 0 16px 0;
  }

  .content-header h1 {
    font-size: 22px;
  }

  .batch-delete-btn {
    padding: 6px 12px;
    font-size: var(--font-size-xs);
    min-height: 44px;
    min-width: 44px;
  }

  .setting-row,
  .color-picker-row,
  .category-item {
    padding-left: 16px;
    padding-right: 16px;
    min-height: 56px;
  }

  .settings-section-title,
  .category-header {
    margin-left: 16px;
    margin-right: 16px;
  }

  .color-options {
    padding-left: 16px;
    padding-right: 16px;
    gap: 12px;
  }

  .color-option {
    width: 44px;
    height: 44px;
  }

  .color-option.small {
    width: 40px;
    height: 40px;
  }

  .add-category-btn {
    width: calc(100% - 32px);
    margin-left: 16px;
    margin-right: 16px;
    min-height: 48px;
    font-size: var(--font-size-base);
  }

  .segmented-control {
    margin: 0 16px 16px 16px;
  }

  .segment-btn {
    min-height: 44px;
    font-size: var(--font-size-body);
  }

  .number-input {
    font-size: var(--font-size-lg);
    min-height: 44px;
    min-width: 64px;
  }

  .reminder-select {
    font-size: var(--font-size-lg);
    min-height: 44px;
    padding: 10px 40px 10px 16px;
    background-position: right 12px center;
  }

  .cat-action-btn {
    width: 44px;
    height: 44px;
  }

  .category-checkbox {
    width: 24px;
    height: 24px;
    min-width: 24px;
  }

  .category-checkbox .checkmark {
    width: 22px;
    height: 22px;
  }

  .category-checkbox input:checked + .checkmark::after {
    left: 8px;
    top: 3px;
    width: 6px;
    height: 12px;
  }

  .toggle-switch {
    width: 52px;
    height: 32px;
    min-width: 52px;
  }

  .toggle-knob {
    width: 26px;
    height: 26px;
    top: 3px;
    left: 3px;
  }

  .toggle-switch[aria-checked='true'] .toggle-knob {
    left: 23px;
  }

  .setting-icon-wrap {
    width: 44px;
    height: 44px;
    min-width: 44px;
  }

  .shortcut-item {
    padding: 12px 16px;
    min-height: 52px;
  }

  .modal-backdrop {
    align-items: flex-end;
  }

  .category-modal {
    width: 100%;
    max-width: none;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    padding: 20px 20px 28px 20px;
    max-height: 85vh;
    overflow-y: auto;
    animation: slideUp 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }

  @keyframes slideUp {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .form-input {
    font-size: var(--font-size-lg);
    min-height: 48px;
    padding: 14px 16px;
  }

  .modal-title {
    font-size: var(--font-size-xl);
    margin-bottom: 16px;
  }

  .modal-colors {
    gap: 10px;
    margin-bottom: 20px;
  }

  .modal-actions {
    flex-direction: column-reverse;
  }

  .save-btn,
  .cancel-btn {
    width: 100%;
    height: 48px;
    font-size: var(--font-size-base);
  }

  .delete-desc {
    font-size: var(--font-size-base);
    line-height: 1.6;
  }

  .delete-option-btn {
    min-height: 48px;
    font-size: var(--font-size-base);
  }

  .cancel-btn.full-width {
    min-height: 48px;
    font-size: var(--font-size-base);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition:
    transform 0.25s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(20px);
  opacity: 0;
}
</style>
