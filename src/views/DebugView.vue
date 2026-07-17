<template>
  <div class="debug-view">
    <div class="debug-header">
      <div class="debug-header-drag">
        <div class="debug-badge">
          <Bug :size="14" />
        </div>
        <span class="debug-title">{{ $t('debug.title') }}</span>
      </div>
      <button class="debug-close" @click="handleClose">
        <X :size="14" />
      </button>
    </div>

    <div class="debug-menu">
      <div class="debug-menu-section">
        <div class="debug-menu-section-title">
          <Palette :size="14" />
          <span>{{ $t('debug.appearance') }}</span>
        </div>
        <div class="debug-menu-item-group">
          <button
            v-for="style in titlebarStyles"
            :key="style.value"
            class="debug-menu-item"
            :class="{ active: currentTitlebarStyle === style.value }"
            @click="setTitlebarStyle(style.value)"
          >
            <div class="item-icon" :class="`icon-${style.value}`">
              <Type :size="14" v-if="style.value === 'win32'" />
              <Monitor :size="14" v-else-if="style.value === 'darwin'" />
              <Terminal :size="14" v-else />
            </div>
            <span class="item-label">{{ style.label }}</span>
            <span class="item-desc">{{ style.preview }}</span>
          </button>
        </div>
        <button class="debug-menu-item debug-menu-item-secondary" @click="setTitlebarStyle('auto')">
          <RotateCcw :size="14" />
          <span class="item-label">{{ $t('debug.restoreDefault') }}</span>
        </button>
      </div>

      <div class="debug-menu-divider"></div>

      <div class="debug-menu-section">
        <div class="debug-menu-section-title">
          <Terminal :size="14" />
          <span>{{ $t('debug.devTools') }}</span>
        </div>
        <button class="debug-menu-item" @click="handleOpenDevTools">
          <Code :size="14" />
          <span class="item-label">{{ $t('debug.openDevTools') }}</span>
          <span class="item-desc">Chrome DevTools</span>
        </button>
        <button class="debug-menu-item" @click="showErrorMonitor = !showErrorMonitor">
          <AlertTriangle :size="14" />
          <span class="item-label">{{ $t('debug.errorMonitor') }}</span>
          <span class="item-desc">{{ errorTotal }} {{ $t('debug.totalRecords') }}</span>
        </button>
      </div>

      <div v-if="showErrorMonitor" class="error-monitor-panel">
        <div class="error-monitor-stats">
          <div class="err-stat">
            <span class="err-stat-num">{{ errorTotal }}</span>
            <span class="err-stat-label">{{ $t('debug.total') }}</span>
          </div>
          <div class="err-stat">
            <span class="err-stat-num">{{ errorLast24h }}</span>
            <span class="err-stat-label">{{ $t('debug.last24h') }}</span>
          </div>
          <div class="err-stat">
            <span class="err-stat-num">{{ errorTypes }}</span>
            <span class="err-stat-label">{{ $t('debug.types') }}</span>
          </div>
        </div>
        <div class="err-actions">
          <button class="err-action-btn" @click="refreshErrors">
            <RefreshCw :size="12" />
            {{ $t('debug.refresh') }}
          </button>
          <button class="err-action-btn danger" @click="handleClearErrors">
            <Trash2 :size="12" />
            {{ $t('debug.clear') }}
          </button>
          <button class="err-action-btn" @click="handleTestError">
            <Bug :size="12" />
            {{ $t('debug.mockError') }}
          </button>
        </div>
        <div class="err-list" v-if="recentErrors.length > 0">
          <div v-for="err in recentErrors" :key="err.id" class="err-item">
            <div class="err-item-header">
              <span class="err-name">{{ err.name }}</span>
              <span class="err-time">{{ formatErrTime(err.timestamp) }}</span>
            </div>
            <p class="err-msg">{{ err.message }}</p>
            <span class="err-type-tag">{{ err.type }}</span>
          </div>
        </div>
        <div v-else class="err-empty">
          <CheckCircle :size="20" />
          <span>{{ $t('debug.noErrors') }}</span>
        </div>
      </div>

      <div class="debug-menu-divider"></div>

      <div class="debug-menu-section">
        <div class="debug-menu-section-title">
          <Bell :size="14" />
          <span>{{ $t('debug.notification') }}</span>
        </div>
        <button class="debug-menu-item" @click="handleTestNotification">
          <Send :size="14" />
          <span class="item-label">{{ $t('debug.sendTest') }}</span>
          <span class="item-desc">{{ $t('debug.viewToast') }}</span>
        </button>
        <div v-if="notificationStatus" class="debug-status" :class="notificationStatus.type">
          <component :is="notificationStatus.icon" :size="12" />
          <span>{{ notificationStatus.message }}</span>
        </div>
      </div>

      <div class="debug-menu-divider"></div>

      <div class="debug-menu-section">
        <div class="debug-menu-section-title">
          <Info :size="14" />
          <span>{{ $t('debug.systemInfo') }}</span>
        </div>
        <div class="debug-info-grid">
          <div class="debug-info-item">
            <span class="debug-info-label">{{ $t('debug.platform') }}</span>
            <span class="debug-info-value">{{ platform }}</span>
          </div>
          <div class="debug-info-item">
            <span class="debug-info-label">Electron</span>
            <span class="debug-info-value">{{ electronVersion }}</span>
          </div>
          <div class="debug-info-item">
            <span class="debug-info-label">Node.js</span>
            <span class="debug-info-value">{{ nodeVersion }}</span>
          </div>
          <div class="debug-info-item">
            <span class="debug-info-label">Chrome</span>
            <span class="debug-info-value">{{ chromeVersion }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="debug-footer">
      <span class="debug-footer-text">Choyeon To Do v{{ appVersion }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Bug,
  Terminal,
  Bell,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  X,
  Palette,
  Monitor,
  Type,
  Code,
  Send,
  Info,
  AlertTriangle,
  Trash2,
  RefreshCw
} from '@lucide/vue'
import {
  getErrorLogs,
  getErrorStats,
  clearErrorLogs,
  captureError
} from '../utils/errorMonitor'

const { t } = useI18n()

const notificationStatus = ref(null)
let notificationCleanup = null
let statusTimeout = null

const titlebarStyles = computed(() => [
  { value: 'win32', label: t('debug.windows'), preview: t('debug.winGlass') },
  { value: 'darwin', label: t('debug.macos'), preview: t('debug.macTrafficLights') },
  { value: 'linux', label: t('debug.linux'), preview: t('debug.linuxSimple') }
])

const currentTitlebarStyle = ref('auto')
const appVersion = computed(() => window.electronAPI?.versions?.app || '1.0.0')

const platform = computed(() => window.electronAPI?.platform || 'Web')
const electronVersion = computed(() => window.electronAPI?.versions?.electron || 'N/A')
const nodeVersion = computed(() => window.electronAPI?.versions?.node || 'N/A')
const chromeVersion = computed(() => window.electronAPI?.versions?.chrome || 'N/A')

const showErrorMonitor = ref(false)
const errorLogs = ref([])
const errorStats = ref({ total: 0, last24h: 0, typeCount: {} })

const errorTotal = computed(() => errorStats.value.total)
const errorLast24h = computed(() => errorStats.value.last24h)
const errorTypes = computed(() => Object.keys(errorStats.value.typeCount || {}).length)
const recentErrors = computed(() => errorLogs.value.slice(0, 10))

const refreshErrors = () => {
  errorLogs.value = getErrorLogs()
  errorStats.value = getErrorStats()
}

const handleClearErrors = () => {
  if (confirm(t('debug.clearConfirm'))) {
    clearErrorLogs()
    refreshErrors()
  }
}

const handleTestError = () => {
  try {
    throw new Error(t('debug.testError'))
  } catch (e) {
    captureError(e, { type: 'test' })
    refreshErrors()
  }
}

const formatErrTime = (ts) => {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

const setTitlebarStyle = (style) => {
  currentTitlebarStyle.value = style
  if (style === 'auto') {
    localStorage.removeItem('choyeon_debug_titlebar')
  } else {
    localStorage.setItem('choyeon_debug_titlebar', style)
  }
  window.dispatchEvent(new CustomEvent('titlebar-style-change', { detail: style }))
}

const handleClose = () => {
  if (window.electronAPI?.closeDebugWindow) {
    window.electronAPI.closeDebugWindow()
  }
}

const handleOpenDevTools = () => {
  if (window.electronAPI?.openDevTools) {
    window.electronAPI.openDevTools()
  }
}

const cleanupNotificationListener = () => {
  if (notificationCleanup) {
    notificationCleanup()
    notificationCleanup = null
  }
  if (statusTimeout) {
    clearTimeout(statusTimeout)
    statusTimeout = null
  }
}

const handleTestNotification = () => {
  cleanupNotificationListener()
  notificationStatus.value = null

  if (!window.electronAPI?.sendNotification) {
    notificationStatus.value = {
      type: 'error',
      icon: AlertCircle,
      message: t('debug.notificationApiUnavailable')
    }
    return
  }

  notificationStatus.value = {
    type: 'loading',
    icon: Bell,
    message: t('debug.sending')
  }

  window.electronAPI.sendNotification('Choyeon To Do', t('debug.testNotificationContent'))

  notificationCleanup = window.electronAPI.onNotificationResponse((response) => {
    notificationStatus.value = {
      type: 'success',
      icon: CheckCircle,
      message: response.action === 'clicked' ? t('debug.notificationClicked') : t('debug.notificationClosed')
    }
    if (statusTimeout) {
      clearTimeout(statusTimeout)
      statusTimeout = null
    }
  })

  statusTimeout = setTimeout(() => {
    if (notificationStatus.value?.type === 'loading') {
      notificationStatus.value = {
        type: 'success',
        icon: CheckCircle,
        message: t('debug.notificationSent')
      }
    }
    statusTimeout = null
  }, 5000)
}

onMounted(() => {
  currentTitlebarStyle.value = localStorage.getItem('choyeon_debug_titlebar') || 'auto'
  refreshErrors()
})

onUnmounted(() => {
  cleanupNotificationListener()
})
</script>

<style scoped>
.debug-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--color-surface);
  overflow: hidden;
  border-radius: 12px;
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(0, 0, 0, 0.05);
}

.debug-header {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  flex-shrink: 0;
  user-select: none;
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border-light);
  -webkit-app-region: drag;
}

.debug-header-drag {
  flex: 1;
  height: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  pointer-events: none;
}

.debug-badge {
  width: 24px;
  height: 24px;
  border-radius: 8px;
  background: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(74, 144, 217, 0.3);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.debug-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.debug-close {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  -webkit-app-region: no-drag;
}

.debug-close:hover {
  background: var(--color-error-surface);
  color: var(--state-error);
}

.debug-menu {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.debug-menu-section {
  padding: 4px 0;
}

.debug-menu-section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 8px 8px 6px;
}

.debug-menu-item-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0 4px;
}

.debug-menu-item {
  width: 100%;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  border: none;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  font-weight: 500;
  font-family: var(--font-body);
  cursor: pointer;
  background: transparent;
  color: var(--color-text-primary);
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: left;
}

.debug-menu-item:hover {
  background: var(--color-bg-secondary);
  transform: translateX(4px);
}

.debug-menu-item.active {
  background: var(--color-primary-surface);
}

.debug-menu-item.active .item-icon {
  background: var(--color-primary);
  color: white;
}

.debug-menu-item-secondary {
  opacity: 0.7;
}

.debug-menu-item-secondary:hover {
  opacity: 1;
}

.item-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.debug-menu-item:hover .item-icon {
  background: var(--color-primary-light);
  color: var(--color-primary-dark);
}

.item-label {
  flex: 1;
  text-align: left;
}

.item-desc {
  font-size: 11px;
  font-weight: 400;
  color: var(--color-text-tertiary);
}

.debug-menu-divider {
  height: 1px;
  background: var(--color-border-light);
  margin: 8px 0;
}

.debug-status {
  margin: 8px 8px 0;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  animation: statusFadeIn 0.2s ease-out;
}

@keyframes statusFadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.debug-status.success {
  background: var(--color-secondary-lighter);
  color: var(--color-secondary-dark);
}

.debug-status.error {
  background: var(--color-error-surface);
  color: var(--state-error);
}

.debug-status.loading {
  background: var(--color-accent-lighter);
  color: var(--color-primary-dark);
}

.debug-info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px;
  margin: 0 4px;
}

.debug-info-item {
  padding: 8px 10px;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-sm);
  transition: background 0.15s;
}

.debug-info-item:hover {
  background: var(--color-border-light);
}

.debug-info-label {
  font-size: 10px;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  display: block;
  margin-bottom: 2px;
}

.debug-info-value {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-primary);
  font-family: monospace;
}

.debug-footer {
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 12px;
  flex-shrink: 0;
  background: var(--color-bg);
  border-top: 1px solid var(--color-border-light);
}

.debug-footer-text {
  font-size: 11px;
  color: var(--color-text-tertiary);
}

.error-monitor-panel {
  margin: 8px 4px 4px;
  padding: 12px;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  animation: panelSlide 0.2s ease-out;
}

@keyframes panelSlide {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.error-monitor-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 10px;
}

.err-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 4px;
  background: var(--color-surface);
  border-radius: var(--radius-sm);
}

.err-stat-num {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1.2;
}

.err-stat-label {
  font-size: 10px;
  color: var(--color-text-tertiary);
  margin-top: 2px;
}

.err-actions {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
}

.err-action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 8px;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.err-action-btn:hover {
  border-color: var(--color-primary-alpha);
  color: var(--color-primary);
}

.err-action-btn.danger:hover {
  border-color: var(--color-error, #ef4444);
  color: var(--color-error, #ef4444);
}

.err-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 200px;
  overflow-y: auto;
}

.err-item {
  padding: 8px 10px;
  background: var(--color-surface);
  border-radius: var(--radius-sm);
  border-left: 2px solid var(--color-error, #ef4444);
}

.err-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.err-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.err-time {
  font-size: 10px;
  color: var(--color-text-tertiary);
  flex-shrink: 0;
  margin-left: 8px;
}

.err-msg {
  font-size: 11px;
  color: var(--color-text-secondary);
  margin: 0 0 6px 0;
  line-height: 1.4;
  word-break: break-all;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.err-type-tag {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
}

.err-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px;
  color: var(--color-text-tertiary);
  font-size: 12px;
}
</style>
