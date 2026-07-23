<template>
  <div class="settings-card">
    <div class="settings-section-header">
      <div class="settings-section-icon icon-green">
        <Power :size="18" />
      </div>
      <h3 class="settings-section-title">{{ $t('settings.system') }}</h3>
    </div>

    <div class="setting-row" v-if="isElectron">
      <div class="setting-icon-wrap icon-green">
        <Power :size="20" />
      </div>
      <div class="setting-label-wrap">
        <span class="setting-label">{{ $t('settings.autoStart') }}</span>
        <p class="setting-desc">{{ $t('settings.autoStartDesc') }}</p>
      </div>
      <button
        class="toggle-switch"
        role="switch"
        :aria-checked="settingsStore.autoStart"
        :aria-label="$t('settings.autoStart')"
        @click.stop="toggleAutoStart"
      >
        <span class="toggle-knob"></span>
      </button>
    </div>

    <div class="setting-row" v-if="isElectron">
      <div class="setting-icon-wrap icon-slate">
        <X :size="20" />
      </div>
      <div class="setting-label-wrap">
        <span class="setting-label">{{ $t('settings.closeToQuit') }}</span>
        <p class="setting-desc">{{ $t('settings.closeToQuitDesc') }}</p>
      </div>
      <button
        class="toggle-switch"
        role="switch"
        :aria-checked="settingsStore.closeToQuit"
        :aria-label="$t('settings.closeToQuit')"
        @click.stop="toggleCloseToQuit"
      >
        <span class="toggle-knob"></span>
      </button>
    </div>

    <div class="setting-row" v-if="isElectron">
      <div class="setting-icon-wrap icon-orange">
        <LayoutGrid :size="20" />
      </div>
      <div class="setting-label-wrap">
        <span class="setting-label">{{ $t('settings.miniWindow') }}</span>
        <p class="setting-desc">{{ $t('settings.miniWindowDesc') }}</p>
      </div>
      <button
        class="toggle-switch"
        role="switch"
        :aria-checked="settingsStore.miniWindowEnabled"
        :aria-label="$t('settings.miniWindow')"
        @click.stop="toggleMiniWindow"
      >
        <span class="toggle-knob"></span>
      </button>
    </div>

    <div class="setting-row" v-if="isElectron">
      <div class="setting-icon-wrap icon-blue">
        <Download :size="20" />
      </div>
      <div class="setting-label-wrap">
        <span class="setting-label">{{ $t('settings.checkUpdates') }}</span>
        <p class="setting-desc" v-if="updateStatusText">{{ updateStatusText }}</p>
        <p class="setting-desc" v-else>
          {{ $t('settings.checkUpdatesDesc') }} {{ currentVersion }}
        </p>
      </div>
      <button
        class="btn-secondary btn-small"
        :disabled="isChecking || isDownloading || updateDownloaded"
        @click.stop="handleUpdateAction"
      >
        {{ updateButtonText }}
      </button>
    </div>

    <div class="update-progress" v-if="isDownloading && downloadPercent >= 0">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: downloadPercent + '%' }"></div>
      </div>
      <span class="progress-text">{{ downloadPercent.toFixed(1) }}%</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '../../stores/settingsStore'
import { useSnackbar } from '../../composables/useSnackbar'
import { Power, X, Download, LayoutGrid } from '@lucide/vue'

const { t } = useI18n()
const isElectron = typeof window !== 'undefined' && !!window.electronAPI

const settingsStore = useSettingsStore()
const { show: showSnackbar } = useSnackbar()

const currentVersion = ref(__APP_VERSION__)
const isChecking = ref(false)
const isDownloading = ref(false)
const updateDownloaded = ref(false)
const updateAvailable = ref(false)
const downloadPercent = ref(-1)
const latestVersion = ref('')

const updateStatusText = computed(() => {
  if (updateDownloaded.value) return t('settings.updateReady')
  if (isDownloading.value) return t('settings.downloading')
  if (isChecking.value) return t('settings.checkingUpdates')
  if (updateAvailable.value) return t('settings.updateAvailable') + ' ' + latestVersion.value
  return ''
})

const updateButtonText = computed(() => {
  if (updateDownloaded.value) return t('settings.restartAndUpdate')
  if (isDownloading.value) return t('settings.downloading')
  if (isChecking.value) return t('settings.checking')
  if (updateAvailable.value) return t('settings.downloadUpdate')
  return t('settings.checkNow')
})

let cleanupListeners = []

const handleUpdateAction = () => {
  if (updateDownloaded.value) {
    if (window.electronAPI?.quitAndInstallUpdate) {
      window.electronAPI.quitAndInstallUpdate()
    }
    return
  }
  if (updateAvailable.value) {
    downloadUpdate()
    return
  }
  checkForUpdates()
}

const checkForUpdates = () => {
  if (!window.electronAPI?.checkForUpdates) return
  isChecking.value = true
  window.electronAPI.checkForUpdates()
}

const downloadUpdate = () => {
  if (!window.electronAPI?.downloadUpdate) return
  isDownloading.value = true
  downloadPercent.value = 0
  window.electronAPI.downloadUpdate()
}

const toggleAutoStart = () => {
  settingsStore.toggleAutoStart()
  showSnackbar(
    settingsStore.autoStart ? t('settings.autoStartEnabled') : t('settings.autoStartDisabled')
  )
}

const toggleCloseToQuit = () => {
  settingsStore.toggleCloseToQuit()
  showSnackbar(
    settingsStore.closeToQuit ? t('settings.closeToQuitEnabled') : t('settings.closeToQuitDisabled')
  )
}

const toggleMiniWindow = () => {
  settingsStore.toggleMiniWindow()
}

onMounted(async () => {
  if (window.electronAPI?.getAppVersion) {
    try {
      const ver = await window.electronAPI.getAppVersion()
      if (ver) currentVersion.value = ver
    } catch {
      // ignore errors when getting app version
    }
  }

  if (window.electronAPI) {
    if (window.electronAPI.onUpdateChecking) {
      cleanupListeners.push(
        window.electronAPI.onUpdateChecking(() => {
          isChecking.value = true
        })
      )
    }
    if (window.electronAPI.onUpdateAvailable) {
      cleanupListeners.push(
        window.electronAPI.onUpdateAvailable((info) => {
          isChecking.value = false
          updateAvailable.value = true
          latestVersion.value = info.version
        })
      )
    }
    if (window.electronAPI.onUpdateNotAvailable) {
      cleanupListeners.push(
        window.electronAPI.onUpdateNotAvailable(() => {
          isChecking.value = false
          updateAvailable.value = false
          showSnackbar(t('settings.upToDate'))
        })
      )
    }
    if (window.electronAPI.onUpdateDownloadProgress) {
      cleanupListeners.push(
        window.electronAPI.onUpdateDownloadProgress((progress) => {
          downloadPercent.value = progress.percent
        })
      )
    }
    if (window.electronAPI.onUpdateDownloaded) {
      cleanupListeners.push(
        window.electronAPI.onUpdateDownloaded(() => {
          isDownloading.value = false
          updateDownloaded.value = true
          downloadPercent.value = 100
        })
      )
    }
    if (window.electronAPI.onUpdateError) {
      cleanupListeners.push(
        window.electronAPI.onUpdateError((err) => {
          isChecking.value = false
          isDownloading.value = false
          downloadPercent.value = -1
          showSnackbar(t('settings.updateError') + ': ' + err.message)
        })
      )
    }
  }
})

onUnmounted(() => {
  cleanupListeners.forEach((fn) => {
    if (typeof fn === 'function') fn()
  })
  cleanupListeners = []
})
</script>

<style scoped>
.update-progress {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px 16px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: var(--color-bg-secondary);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: 3px;
  transition: width 0.2s ease;
}

.progress-text {
  font-size: 12px;
  color: var(--color-text-secondary);
  min-width: 50px;
  text-align: right;
}
</style>
