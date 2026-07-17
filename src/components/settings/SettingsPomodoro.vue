<template>
  <div class="settings-card">
    <div class="settings-section-header">
      <div class="settings-section-icon icon-red">
        <Timer :size="18" />
      </div>
      <h3 class="settings-section-title">{{ $t('settings.pomodoro') }}</h3>
    </div>

    <div class="setting-row no-hover">
      <div class="setting-icon-wrap icon-red">
        <Timer :size="20" />
      </div>
      <div class="setting-label-wrap">
        <span class="setting-label">{{ $t('settings.workDuration') }}</span>
        <p class="setting-desc">{{ $t('settings.workDurationDesc') }}</p>
      </div>
      <div class="number-input-wrap">
        <input
          type="number"
          class="number-input"
          :value="settingsStore.pomodoroWorkMinutes"
          min="1"
          max="180"
          @change="onPomodoroWorkChange"
          :aria-label="$t('settings.workDuration')"
        />
      </div>
    </div>

    <div class="setting-row no-hover">
      <div class="setting-icon-wrap icon-green">
        <Coffee :size="20" />
      </div>
      <div class="setting-label-wrap">
        <span class="setting-label">{{ $t('settings.shortBreak') }}</span>
        <p class="setting-desc">{{ $t('settings.shortBreakDesc') }}</p>
      </div>
      <div class="number-input-wrap">
        <input
          type="number"
          class="number-input"
          :value="settingsStore.pomodoroBreakMinutes"
          min="1"
          max="60"
          @change="onPomodoroBreakChange"
          :aria-label="$t('settings.shortBreak')"
        />
      </div>
    </div>

    <div class="setting-row no-hover">
      <div class="setting-icon-wrap icon-blue">
        <Sofa :size="20" />
      </div>
      <div class="setting-label-wrap">
        <span class="setting-label">{{ $t('settings.longBreak') }}</span>
        <p class="setting-desc">{{ $t('settings.longBreakDesc') }}</p>
      </div>
      <div class="number-input-wrap">
        <input
          type="number"
          class="number-input"
          :value="settingsStore.pomodoroLongBreakMinutes"
          min="1"
          max="120"
          @change="onPomodoroLongBreakChange"
          :aria-label="$t('settings.longBreak')"
        />
      </div>
    </div>

    <div class="setting-row no-hover">
      <div class="setting-icon-wrap icon-purple">
        <Repeat :size="20" />
      </div>
      <div class="setting-label-wrap">
        <span class="setting-label">{{ $t('settings.longBreakInterval') }}</span>
        <p class="setting-desc">{{ $t('settings.longBreakIntervalDesc') }}</p>
      </div>
      <div class="number-input-wrap">
        <input
          type="number"
          class="number-input"
          :value="settingsStore.pomodoroSessionsBeforeLongBreak"
          min="1"
          max="12"
          @change="onPomodoroSessionsChange"
          :aria-label="$t('settings.longBreakInterval')"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '../../stores/settingsStore'
import { useSnackbar } from '../../composables/useSnackbar'
import { Timer, Coffee, Sofa, Repeat } from '@lucide/vue'

const { t } = useI18n()
const settingsStore = useSettingsStore()
const { show: showSnackbar } = useSnackbar()

const onPomodoroWorkChange = (e) => {
  const value = parseInt(e.target.value, 10)
  if (!isNaN(value) && value >= 1 && value <= 180) {
    settingsStore.pomodoroWorkMinutes = value
    showSnackbar(t('settings.workDurationUpdated'))
  }
}

const onPomodoroBreakChange = (e) => {
  const value = parseInt(e.target.value, 10)
  if (!isNaN(value) && value >= 1 && value <= 60) {
    settingsStore.pomodoroBreakMinutes = value
    showSnackbar(t('settings.shortBreakUpdated'))
  }
}

const onPomodoroLongBreakChange = (e) => {
  const value = parseInt(e.target.value, 10)
  if (!isNaN(value) && value >= 1 && value <= 120) {
    settingsStore.pomodoroLongBreakMinutes = value
    showSnackbar(t('settings.longBreakUpdated'))
  }
}

const onPomodoroSessionsChange = (e) => {
  const value = parseInt(e.target.value, 10)
  if (!isNaN(value) && value >= 1 && value <= 12) {
    settingsStore.pomodoroSessionsBeforeLongBreak = value
    showSnackbar(t('settings.longBreakIntervalUpdated'))
  }
}
</script>
