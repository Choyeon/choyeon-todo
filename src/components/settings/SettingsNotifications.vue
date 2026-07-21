<template>
  <div class="settings-card">
    <div class="settings-section-header">
      <div class="settings-section-icon icon-blue">
        <Bell :size="18" />
      </div>
      <h3 class="settings-section-title">{{ $t('settings.notifications') }}</h3>
    </div>

    <div class="setting-row">
      <div class="setting-icon-wrap icon-blue">
        <Bell :size="20" />
      </div>
      <div class="setting-label-wrap">
        <span class="setting-label">{{ $t('settings.notificationReminder') }}</span>
        <p class="setting-desc">{{ $t('settings.notificationReminderDesc') }}</p>
      </div>
      <button
        class="toggle-switch"
        role="switch"
        :aria-checked="settingsStore.notificationsEnabled"
        :aria-label="$t('settings.notificationReminder')"
        @click.stop="toggleNotifications"
      >
        <span class="toggle-knob"></span>
      </button>
    </div>

    <div class="setting-row">
      <div class="setting-icon-wrap icon-purple">
        <Moon :size="20" />
      </div>
      <div class="setting-label-wrap">
        <span class="setting-label">{{ $t('settings.doNotDisturb') }}</span>
        <p class="setting-desc">{{ $t('settings.doNotDisturbDesc') }}</p>
      </div>
      <button
        class="toggle-switch"
        role="switch"
        :aria-checked="settingsStore.doNotDisturb"
        :aria-label="$t('settings.doNotDisturb')"
        @click.stop="toggleDoNotDisturb"
      >
        <span class="toggle-knob"></span>
      </button>
    </div>

    <div class="setting-row no-hover">
      <div class="setting-icon-wrap icon-orange">
        <Clock :size="20" />
      </div>
      <div class="setting-label-wrap">
        <span class="setting-label">{{ $t('settings.defaultReminderTime') }}</span>
        <p class="setting-desc">{{ $t('settings.defaultReminderTimeDesc') }}</p>
      </div>
      <select
        class="reminder-select"
        :value="settingsStore.defaultReminderTime"
        :aria-label="$t('settings.defaultReminderTime')"
        @change="onReminderTimeChange"
      >
        <option :value="5">{{ $t('settings.minutes', { count: 5 }) }}</option>
        <option :value="10">{{ $t('settings.minutes', { count: 10 }) }}</option>
        <option :value="15">{{ $t('settings.minutes', { count: 15 }) }}</option>
        <option :value="30">{{ $t('settings.minutes', { count: 30 }) }}</option>
        <option :value="60">{{ $t('settings.hours', { count: 1 }) }}</option>
        <option :value="1440">{{ $t('settings.days', { count: 1 }) }}</option>
      </select>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '../../stores/settingsStore'
import { useSnackbar } from '../../composables/useSnackbar'
import { Bell, Moon, Clock } from '@lucide/vue'

const { t } = useI18n()
const settingsStore = useSettingsStore()
const { show: showSnackbar } = useSnackbar()

const toggleNotifications = () => {
  settingsStore.notificationsEnabled = !settingsStore.notificationsEnabled
  showSnackbar(
    settingsStore.notificationsEnabled
      ? t('settings.notificationEnabled')
      : t('settings.notificationDisabled')
  )
}

const toggleDoNotDisturb = () => {
  settingsStore.toggleDoNotDisturb()
  showSnackbar(
    settingsStore.doNotDisturb
      ? t('settings.doNotDisturbEnabled')
      : t('settings.doNotDisturbDisabled')
  )
}

const onReminderTimeChange = (e) => {
  const value = parseInt(e.target.value, 10)
  if (!isNaN(value)) {
    settingsStore.defaultReminderTime = value
    showSnackbar(t('settings.defaultReminderTimeUpdated'))
  }
}
</script>
