<template>
  <div class="debug-view">
    <div class="debug-header">
      <div class="debug-header-drag">
        <div class="debug-badge">
          <Bug :size="14" />
        </div>
        <span class="debug-title">调试工具</span>
      </div>
      <button class="debug-close" @click="handleClose">
        <X :size="14" />
      </button>
    </div>

    <div class="debug-menu">
      <div class="debug-menu-section">
        <div class="debug-menu-section-title">
          <Palette :size="14" />
          <span>外观</span>
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
          <span class="item-label">恢复系统默认</span>
        </button>
      </div>

      <div class="debug-menu-divider"></div>

      <div class="debug-menu-section">
        <div class="debug-menu-section-title">
          <Terminal :size="14" />
          <span>开发工具</span>
        </div>
        <button class="debug-menu-item" @click="handleOpenDevTools">
          <Code :size="14" />
          <span class="item-label">打开开发者工具</span>
          <span class="item-desc">Chrome DevTools</span>
        </button>
      </div>

      <div class="debug-menu-divider"></div>

      <div class="debug-menu-section">
        <div class="debug-menu-section-title">
          <Bell :size="14" />
          <span>通知测试</span>
        </div>
        <button class="debug-menu-item" @click="handleTestNotification">
          <Send :size="14" />
          <span class="item-label">发送测试通知</span>
          <span class="item-desc">查看右下角弹窗</span>
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
          <span>系统信息</span>
        </div>
        <div class="debug-info-grid">
          <div class="debug-info-item">
            <span class="debug-info-label">平台</span>
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
import { Bug, Terminal, Bell, CheckCircle, AlertCircle, RotateCcw, X, Palette, Monitor, Type, Code, Send, Info } from '@lucide/vue'

const notificationStatus = ref(null)
let notificationCleanup = null
let statusTimeout = null

const titlebarStyles = [
  { value: 'win32', label: 'Windows', preview: '毛玻璃效果' },
  { value: 'darwin', label: 'macOS', preview: '三色按钮' },
  { value: 'linux', label: 'Linux', preview: '简洁风格' }
]

const currentTitlebarStyle = ref('auto')
const appVersion = computed(() => window.electronAPI?.versions?.app || '1.0.0')

const platform = computed(() => window.electronAPI?.platform || 'Web')
const electronVersion = computed(() => window.electronAPI?.versions?.electron || 'N/A')
const nodeVersion = computed(() => window.electronAPI?.versions?.node || 'N/A')
const chromeVersion = computed(() => window.electronAPI?.versions?.chrome || 'N/A')

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
      message: '通知API不可用'
    }
    return
  }

  notificationStatus.value = {
    type: 'loading',
    icon: Bell,
    message: '正在发送...'
  }

  window.electronAPI.sendNotification('Choyeon To Do', '测试通知：请查看右下角toast弹窗')

  notificationCleanup = window.electronAPI.onNotificationResponse((response) => {
    notificationStatus.value = {
      type: 'success',
      icon: CheckCircle,
      message: response.action === 'clicked' ? '通知已点击' : '通知已关闭'
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
        message: '通知已发送'
      }
    }
    statusTimeout = null
  }, 5000)
}

onMounted(() => {
  currentTitlebarStyle.value = localStorage.getItem('choyeon_debug_titlebar') || 'auto'
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
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.05);
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
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
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
</style>