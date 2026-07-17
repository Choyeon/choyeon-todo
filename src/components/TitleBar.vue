<template>
  <div class="title-bar" :class="[`title-bar-${currentPlatform}`]" @dblclick="handleToggleMaximize">
    <div class="title-bar-left">
      <div v-if="currentPlatform === 'darwin'" class="mac-controls">
        <button class="mac-btn mac-btn-close" @click="handleClose" :title="t('titlebar.close')" :aria-label="t('titlebar.close')">
          <span class="mac-btn-inner"></span>
        </button>
        <button
          class="mac-btn mac-btn-min"
          @click="handleMinimize"
          :title="t('titlebar.minimize')"
          :aria-label="t('titlebar.minimize')"
        >
          <span class="mac-btn-inner"></span>
        </button>
        <button
          class="mac-btn mac-btn-max"
          @click="handleToggleMaximize"
          :title="isMaximized ? t('titlebar.restore') : t('titlebar.maximize')"
          :aria-label="isMaximized ? t('titlebar.restore') : t('titlebar.maximize')"
        >
          <span class="mac-btn-inner"></span>
        </button>
      </div>

      <div v-if="currentPlatform === 'linux'" class="linux-controls-left">
        <button class="linux-btn linux-btn-menu" @click="handleMenu" :title="t('titlebar.menu')" :aria-label="t('titlebar.menu')">
          <svg width="16" height="14" viewBox="0 0 16 14" fill="none">
            <path
              d="M2 3H14M2 7H14M2 11H14"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>

      <div class="title-bar-drag">
        <div class="title-bar-brand">
          <div class="brand-icon">
            <svg width="16" height="16" viewBox="0 0 512 512">
              <rect width="512" height="512" rx="112" fill="#4C8BF5" />
              <text
                x="256"
                y="320"
                font-family="'Segoe UI',Arial,sans-serif"
                font-size="200"
                font-weight="700"
                fill="#ffffff"
                text-anchor="middle"
                letter-spacing="-4"
              >
                ToDo
              </text>
            </svg>
          </div>
          <span class="title-bar-text">Choyeon To Do</span>
        </div>
      </div>
    </div>

    <div class="title-bar-right">
      <div v-if="currentPlatform === 'win32'" class="win-controls">
        <button
          class="win-btn win-btn-min"
          @click="handleMinimize"
          :title="t('titlebar.minimize')"
          :aria-label="t('titlebar.minimize')"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <rect x="1" y="4.5" width="8" height="1" fill="currentColor" />
          </svg>
        </button>
        <button
          class="win-btn win-btn-max"
          @click="handleToggleMaximize"
          :title="isMaximized ? t('titlebar.restore') : t('titlebar.maximize')"
          :aria-label="isMaximized ? t('titlebar.restore') : t('titlebar.maximize')"
        >
          <svg v-if="!isMaximized" width="10" height="10" viewBox="0 0 10 10" fill="none">
            <rect x="1.5" y="1.5" width="7" height="7" stroke="currentColor" stroke-width="1" />
          </svg>
          <svg v-else width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2.5 6.5V2.5H6.5M3.5 7.5H7.5V3.5" stroke="currentColor" stroke-width="1" />
            <rect
              x="3"
              y="3"
              width="5.5"
              height="5.5"
              stroke="currentColor"
              stroke-width="1"
              fill="none"
            />
          </svg>
        </button>
        <button class="win-btn win-btn-close" @click="handleClose" :title="t('titlebar.close')" :aria-label="t('titlebar.close')">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path
              d="M1 1L9 9M9 1L1 9"
              stroke="currentColor"
              stroke-width="1"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>

      <div v-if="currentPlatform === 'linux'" class="linux-controls-right">
        <button
          class="linux-btn linux-btn-min"
          @click="handleMinimize"
          :title="t('titlebar.minimize')"
          :aria-label="t('titlebar.minimize')"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect x="2" y="5" width="8" height="2" rx="1" fill="currentColor" />
          </svg>
        </button>
        <button
          class="linux-btn linux-btn-max"
          @click="handleToggleMaximize"
          :title="isMaximized ? t('titlebar.restore') : t('titlebar.maximize')"
          :aria-label="isMaximized ? t('titlebar.restore') : t('titlebar.maximize')"
        >
          <svg v-if="!isMaximized" width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect x="2" y="2" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1" />
          </svg>
          <svg v-else width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect
              x="1"
              y="1"
              width="5"
              height="5"
              rx="0.5"
              stroke="currentColor"
              stroke-width="1"
            />
            <rect
              x="6"
              y="6"
              width="5"
              height="5"
              rx="0.5"
              stroke="currentColor"
              stroke-width="1"
            />
          </svg>
        </button>
        <button
          class="linux-btn linux-btn-close"
          @click="handleClose"
          :title="t('titlebar.close')"
          :aria-label="t('titlebar.close')"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M3 3L9 9M9 3L3 9"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const isMaximized = ref(false)
const debugPlatform = ref(null)
let cleanupMaximize = null

const nativePlatform = computed(() => {
  if (window.electronAPI?.platform) {
    return window.electronAPI.platform
  }
  if (navigator.userAgent.includes('Windows')) return 'win32'
  if (navigator.userAgent.includes('Mac')) return 'darwin'
  return 'linux'
})

const currentPlatform = computed(() => {
  return debugPlatform.value || nativePlatform.value
})

const handleMinimize = () => {
  if (window.electronAPI?.minimizeWindow) {
    window.electronAPI.minimizeWindow()
  }
}

const handleToggleMaximize = () => {
  if (window.electronAPI?.toggleMaximizeWindow) {
    window.electronAPI.toggleMaximizeWindow()
  }
}

const handleClose = () => {
  if (window.electronAPI?.closeWindow) {
    window.electronAPI.closeWindow()
  }
}

const handleMenu = () => {
  // Menu button handler - no action needed for now
}

const onStyleChange = (e) => {
  const style = e.detail
  debugPlatform.value = style && style !== 'auto' ? style : null
}

const onStorageChange = (e) => {
  if (e.key === 'choyeon_debug_titlebar') {
    const style = e.newValue
    debugPlatform.value = style && style !== 'auto' ? style : null
  }
}

onMounted(() => {
  // 读取localStorage中保存的调试标题栏风格
  const savedStyle = localStorage.getItem('choyeon_debug_titlebar')
  if (savedStyle && savedStyle !== 'auto') {
    debugPlatform.value = savedStyle
  }

  // 监听同页面自定义事件（浏览器直接访问debug路由时）
  window.addEventListener('titlebar-style-change', onStyleChange)
  // 监听跨窗口storage事件（Electron debug窗口切换时）
  window.addEventListener('storage', onStorageChange)

  let cancelled = false
  if (window.electronAPI?.isMaximized) {
    window.electronAPI
      .isMaximized()
      .then((val) => {
        if (!cancelled) isMaximized.value = val
      })
      .catch(() => {})
  }
  if (window.electronAPI?.onMaximizeChange) {
    const cleanup = window.electronAPI.onMaximizeChange((maximized) => {
      if (!cancelled) isMaximized.value = maximized
    })
    if (typeof cleanup === 'function') {
      cleanupMaximize = cleanup
    }
  }
})

onUnmounted(() => {
  window.removeEventListener('titlebar-style-change', onStyleChange)
  window.removeEventListener('storage', onStorageChange)
  if (cleanupMaximize) {
    cleanupMaximize()
    cleanupMaximize = null
  }
})
</script>

<style scoped>
.title-bar {
  height: var(--title-bar-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  flex-shrink: 0;
  user-select: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: var(--z-titlebar);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  -webkit-app-region: drag;
}

.title-bar-left {
  display: flex;
  align-items: center;
  height: 100%;
  flex: 1;
  min-width: 0;
}

.title-bar-right {
  display: flex;
  align-items: center;
  height: 100%;
  flex-shrink: 0;
}

.title-bar-drag {
  flex: 1;
  height: 100%;
  display: flex;
  align-items: center;
  -webkit-user-select: none;
  padding: 0 12px;
}

.title-bar-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  transition: opacity 0.2s ease;
}

.title-bar-brand:hover {
  opacity: 0.85;
}

.brand-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(74, 144, 217, 0.3);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  -webkit-app-region: no-drag;
}

.brand-icon svg {
  width: 100%;
  height: 100%;
  display: block;
}

.title-bar-brand:hover .brand-icon {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(74, 144, 217, 0.4);
}

.title-bar-text {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
  font-family: var(--font-body);
  letter-spacing: 0.3px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  pointer-events: none;
}

.title-bar-win32 {
  background: var(--titlebar-bg);
  backdrop-filter: blur(var(--titlebar-blur)) saturate(var(--titlebar-saturate));
  -webkit-backdrop-filter: blur(var(--titlebar-blur)) saturate(var(--titlebar-saturate));
  border-bottom: 1px solid var(--titlebar-border);
}

.title-bar-win32 .title-bar-drag {
  padding-left: 16px;
}

.win-controls {
  display: flex;
  align-items: center;
  gap: 0;
  -webkit-app-region: no-drag;
}

.win-btn {
  width: 46px;
  height: var(--title-bar-height);
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  -webkit-app-region: no-drag;
  padding: 0;
  margin: 0;
  position: relative;
  overflow: hidden;
}

.win-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.05);
  opacity: 0;
  transition: opacity 0.15s ease;
}

.win-btn:hover::before {
  opacity: 1;
}

.win-btn:hover {
  color: var(--color-text-primary);
}

.win-btn:active {
  transform: scale(0.98);
}

.win-btn svg {
  flex-shrink: 0;
  transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.win-btn:hover svg {
  transform: scale(1.1);
}

.win-btn-close:hover {
  background: #e81123;
  color: #ffffff;
}

.win-btn-close:hover::before {
  opacity: 0;
}

.win-btn-close:active {
  background: #c10c1c;
  color: #ffffff;
}

.win-btn-close:hover svg {
  transform: rotate(90deg);
}

.title-bar-darwin {
  background: var(--titlebar-bg);
  backdrop-filter: blur(var(--titlebar-blur)) saturate(var(--titlebar-saturate));
  -webkit-backdrop-filter: blur(var(--titlebar-blur)) saturate(var(--titlebar-saturate));
  border-bottom: 1px solid var(--titlebar-border);
}

.title-bar-darwin .title-bar-drag {
  padding: 0 16px;
  justify-content: center;
}

.title-bar-darwin .title-bar-text {
  font-weight: 500;
  letter-spacing: 0.5px;
}

.mac-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 10px;
  -webkit-app-region: no-drag;
}

.mac-btn {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
  -webkit-app-region: no-drag;
  position: relative;
}

.mac-btn-inner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  opacity: 0;
  transition: opacity 0.15s ease;
}

.mac-btn-close {
  background: #ff5f57;
}

.mac-btn-close:hover {
  background: #ff3b30;
}

.mac-btn-close:hover .mac-btn-inner {
  opacity: 1;
  width: 6px;
  height: 6px;
  background: url("data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' fill='none'%3E%3Cpath d='M1 1L5 5M5 1L1 5' stroke='white' stroke-width='1' stroke-linecap='round'/%3E%3C/svg%3E")
    center/cover no-repeat;
}

.mac-btn-min {
  background: #febc2e;
}

.mac-btn-min:hover {
  background: #ffc107;
}

.mac-btn-min:hover .mac-btn-inner {
  opacity: 1;
  width: 4px;
  height: 1px;
  background: white;
  border-radius: 1px;
}

.mac-btn-max {
  background: #28c840;
}

.mac-btn-max:hover {
  background: #34a853;
}

.mac-btn-max:hover .mac-btn-inner {
  opacity: 1;
  width: 4px;
  height: 4px;
  border: 1px solid white;
  border-radius: 1px;
}

.title-bar-linux {
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border-light);
}

.title-bar-linux .title-bar-drag {
  padding-left: 8px;
}

.linux-controls-left {
  display: flex;
  align-items: center;
  -webkit-app-region: no-drag;
}

.linux-controls-right {
  display: flex;
  align-items: center;
  gap: 0;
  -webkit-app-region: no-drag;
}

.linux-btn {
  width: 44px;
  height: var(--title-bar-height);
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  -webkit-app-region: no-drag;
}

.linux-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: var(--color-text-primary);
}

.linux-btn:active {
  background: rgba(0, 0, 0, 0.1);
}

.linux-btn-close:hover {
  background: #e81123;
  color: white;
}

.linux-btn-menu {
  width: 40px;
}

@media (max-width: 767px) {
  .title-bar {
    display: none;
  }
}
</style>
