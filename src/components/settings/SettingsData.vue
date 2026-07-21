<template>
  <div class="settings-card">
    <div class="settings-section-header">
      <div class="settings-section-icon icon-slate">
        <Database :size="18" />
      </div>
      <h3 class="settings-section-title">{{ $t('settings.data') }}</h3>
    </div>

    <div class="setting-row" @click="exportData">
      <div class="setting-icon-wrap icon-green">
        <Download :size="20" />
      </div>
      <div class="setting-label-wrap">
        <span class="setting-label">{{ $t('settings.exportData') }}</span>
        <p class="setting-desc">{{ $t('settings.exportDataDesc') }}</p>
      </div>
      <ChevronRight :size="20" class="chevron" />
    </div>

    <div class="setting-row" @click="triggerImport">
      <div class="setting-icon-wrap icon-blue">
        <Upload :size="20" />
      </div>
      <div class="setting-label-wrap">
        <span class="setting-label">{{ $t('settings.importData') }}</span>
        <p class="setting-desc">{{ $t('settings.importDataDesc') }}</p>
      </div>
      <ChevronRight :size="20" class="chevron" />
    </div>
    <input
      ref="fileInputRef"
      type="file"
      accept=".json"
      style="display: none"
      @change="handleFileImport"
    />

    <div class="setting-row" @click="$emit('show-reset')">
      <div class="setting-icon-wrap icon-amber">
        <RefreshCw :size="20" />
      </div>
      <div class="setting-label-wrap">
        <span class="setting-label">{{ $t('settings.resetData') }}</span>
        <p class="setting-desc">{{ $t('settings.resetDataDesc') }}</p>
      </div>
      <ChevronRight :size="20" class="chevron" />
    </div>

    <div class="setting-row danger" @click="$emit('show-clear')">
      <div class="setting-icon-wrap icon-red">
        <AlertTriangle :size="20" />
      </div>
      <div class="setting-label-wrap">
        <span class="setting-label">{{ $t('settings.clearData') }}</span>
        <p class="setting-desc">{{ $t('settings.clearDataDesc') }}</p>
      </div>
      <ChevronRight :size="20" class="chevron" />
    </div>

    <div class="setting-row" @click="testNotification">
      <div class="setting-icon-wrap icon-blue">
        <Bell :size="20" />
      </div>
      <div class="setting-label-wrap">
        <span class="setting-label">{{ $t('settings.testNotification') }}</span>
        <p class="setting-desc">{{ $t('settings.testNotificationDesc') }}</p>
      </div>
      <ChevronRight :size="20" class="chevron" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTaskStore } from '../../stores/taskStore'
import { useSnackbar } from '../../composables/useSnackbar'
import {
  Database,
  Download,
  Upload,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  Bell
} from '@lucide/vue'

const { t } = useI18n()
const emit = defineEmits(['show-reset', 'show-clear'])

const taskStore = useTaskStore()
const { show: showSnackbar } = useSnackbar()
const fileInputRef = ref(null)

const exportData = () => {
  const data = taskStore.exportData()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `choyeon-todo-backup-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  showSnackbar(t('settings.dataExported'))
}

const triggerImport = () => {
  fileInputRef.value?.click()
}

const handleFileImport = (e) => {
  const file = e.target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result)
      taskStore.importData(data)
      showSnackbar(t('settings.dataImported'))
    } catch (err) {
      showSnackbar(t('settings.importFailed'), { type: 'error', duration: 3000 })
    }
  }
  reader.readAsText(file)
  e.target.value = ''
}

const testNotification = () => {
  if (!('Notification' in window)) {
    showSnackbar(t('settings.notificationNotSupported'))
    return
  }
  if (Notification.permission === 'granted') {
    new Notification('Choyeon To Do', {
      body: t('settings.testNotificationBody'),
      icon: '/icon.png'
    })
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        new Notification('Choyeon To Do', {
          body: t('settings.testNotificationBody'),
          icon: '/icon.png'
        })
      }
    })
  }
  showSnackbar(t('settings.testNotificationSent'))
}
</script>
