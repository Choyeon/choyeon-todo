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
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '../../stores/settingsStore'
import { useSnackbar } from '../../composables/useSnackbar'
import { Power, X } from '@lucide/vue'

const { t } = useI18n()
const isElectron = typeof window !== 'undefined' && !!window.electronAPI

const settingsStore = useSettingsStore()
const { show: showSnackbar } = useSnackbar()

const toggleAutoStart = () => {
  settingsStore.toggleAutoStart()
  showSnackbar(settingsStore.autoStart ? t('settings.autoStartEnabled') : t('settings.autoStartDisabled'))
}

const toggleCloseToQuit = () => {
  settingsStore.toggleCloseToQuit()
  showSnackbar(settingsStore.closeToQuit ? t('settings.closeToQuitEnabled') : t('settings.closeToQuitDisabled'))
}
</script>
