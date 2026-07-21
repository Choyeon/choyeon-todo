<template>
  <div class="settings-card">
    <div class="settings-section-header">
      <div class="settings-section-icon icon-primary-tint">
        <Palette :size="18" />
      </div>
      <h3 class="settings-section-title">{{ $t('settings.appearance') }}</h3>
    </div>

    <div class="setting-row no-hover">
      <div class="setting-icon-wrap icon-primary-tint">
        <component :is="settingsStore.isDark ? Moon : Sun" :size="20" />
      </div>
      <div class="setting-label-wrap">
        <span class="setting-label">{{ $t('settings.theme') }}</span>
        <p class="setting-desc">{{ $t('settings.themeDesc') }}</p>
      </div>
    </div>

    <div class="segmented-control">
      <button
        class="segment-btn"
        :class="{ active: settingsStore.themeMode === 'light' }"
        @click="setThemeMode('light')"
        :aria-label="$t('settings.light')"
      >
        <Sun :size="16" />
        <span>{{ $t('settings.light') }}</span>
      </button>
      <button
        class="segment-btn"
        :class="{ active: settingsStore.themeMode === 'dark' }"
        @click="setThemeMode('dark')"
        :aria-label="$t('settings.dark')"
      >
        <Moon :size="16" />
        <span>{{ $t('settings.dark') }}</span>
      </button>
      <button
        class="segment-btn"
        :class="{ active: settingsStore.themeMode === 'system' }"
        @click="setThemeMode('system')"
        :aria-label="$t('settings.system')"
      >
        <Monitor :size="16" />
        <span>{{ $t('settings.system') }}</span>
      </button>
    </div>

    <div class="setting-row no-hover">
      <div class="setting-icon-wrap icon-blue">
        <Type :size="20" />
      </div>
      <div class="setting-label-wrap">
        <span class="setting-label">{{ $t('settings.fontSize') }}</span>
        <p class="setting-desc">{{ $t('settings.fontSizeDesc') }}</p>
      </div>
    </div>

    <div class="segmented-control">
      <button
        class="segment-btn"
        :class="{ active: settingsStore.fontSize === 'small' }"
        @click="setFontSize('small')"
        :aria-label="$t('settings.small')"
      >
        <span>{{ $t('settings.small') }}</span>
      </button>
      <button
        class="segment-btn"
        :class="{ active: settingsStore.fontSize === 'medium' }"
        @click="setFontSize('medium')"
        :aria-label="$t('settings.medium')"
      >
        <span>{{ $t('settings.medium') }}</span>
      </button>
      <button
        class="segment-btn"
        :class="{ active: settingsStore.fontSize === 'large' }"
        @click="setFontSize('large')"
        :aria-label="$t('settings.large')"
      >
        <span>{{ $t('settings.large') }}</span>
      </button>
    </div>

    <div class="setting-row">
      <div class="setting-icon-wrap icon-orange">
        <PanelLeft :size="20" />
      </div>
      <div class="setting-label-wrap">
        <span class="setting-label">{{ $t('settings.sidebarCollapsed') }}</span>
        <p class="setting-desc">{{ $t('settings.sidebarCollapsedDesc') }}</p>
      </div>
      <button
        class="toggle-switch"
        role="switch"
        :aria-checked="settingsStore.sidebarCollapsed"
        @click.stop="toggleSidebar"
      >
        <span class="toggle-knob"></span>
      </button>
    </div>

    <div class="setting-row">
      <div class="setting-icon-wrap icon-cyan">
        <Layers :size="20" />
      </div>
      <div class="setting-label-wrap">
        <span class="setting-label">{{ $t('settings.glassEffect') }}</span>
        <p class="setting-desc">{{ $t('settings.glassEffectDesc') }}</p>
      </div>
      <button
        class="toggle-switch"
        role="switch"
        :aria-checked="settingsStore.glassEffectEnabled"
        :aria-label="$t('settings.glassEffect')"
        @click.stop="toggleGlassEffect"
      >
        <span class="toggle-knob"></span>
      </button>
    </div>

    <div class="setting-row">
      <div class="setting-icon-wrap icon-purple">
        <Image :size="20" />
      </div>
      <div class="setting-label-wrap">
        <span class="setting-label">{{ $t('settings.bingWallpaper') }}</span>
        <p class="setting-desc">{{ $t('settings.bingWallpaperDesc') }}</p>
      </div>
      <button
        class="toggle-switch"
        role="switch"
        :aria-checked="settingsStore.bingWallpaperEnabled"
        :aria-label="$t('settings.bingWallpaper')"
        @click.stop="toggleBingWallpaper"
      >
        <span class="toggle-knob"></span>
      </button>
    </div>

    <div class="color-picker-row">
      <div class="setting-icon-wrap icon-primary-tint">
        <Palette :size="20" />
      </div>
      <div class="setting-label-wrap">
        <span class="setting-label">{{ $t('settings.themeColor') }}</span>
        <p class="setting-desc">{{ $t('settings.themeColorDesc') }}</p>
      </div>
    </div>

    <div class="color-options">
      <button
        v-for="color in settingsStore.themeColors"
        :key="color.value"
        class="color-option"
        :class="{ active: settingsStore.primaryColor === color.value }"
        :style="{ background: color.value }"
        :title="color.name"
        :aria-label="`${$t('settings.themeColor')} ${color.name}`"
        @click="setThemeColor(color.value)"
      >
        <Check v-if="settingsStore.primaryColor === color.value" :size="16" />
      </button>
    </div>

    <div class="setting-row">
      <div class="setting-icon-wrap icon-green">
        <Globe :size="20" />
      </div>
      <div class="setting-label-wrap">
        <span class="setting-label">{{ $t('settings.language') }}</span>
        <p class="setting-desc">{{ $t('settings.languageDesc') }}</p>
      </div>
    </div>

    <div class="language-options">
      <button
        v-for="loc in supportedLocales"
        :key="loc"
        class="language-option"
        :class="{ active: locale === loc }"
        @click="changeLanguage(loc)"
      >
        <span class="lang-label">{{ getLocaleLabel(loc) }}</span>
        <Check v-if="locale === loc" :size="14" class="lang-check" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '../../stores/settingsStore'
import { useSnackbar } from '../../composables/useSnackbar'
import {
  Sun,
  Moon,
  Palette,
  Check,
  Monitor,
  Type,
  PanelLeft,
  Layers,
  Globe,
  Image
} from '@lucide/vue'
import { setLocale, SUPPORTED_LOCALES } from '../../i18n'

const { locale, t } = useI18n()
const supportedLocales = SUPPORTED_LOCALES
const settingsStore = useSettingsStore()
const { show: showSnackbar } = useSnackbar()
const triggerThemeTransition = inject('triggerThemeTransition')

const getLocaleLabel = (loc) => {
  const labelMap = {
    'zh-CN': t('settings.chinese'),
    'en-US': t('settings.english'),
    'ja-JP': t('settings.japanese')
  }
  return labelMap[loc] || loc
}

const toggleTheme = (e) => {
  const targetTheme = settingsStore.themeMode === 'light' ? 'dark' : 'light'
  if (e && triggerThemeTransition) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    triggerThemeTransition(x, y, targetTheme)
  }
  settingsStore.toggleTheme()
}

const setThemeMode = (mode) => {
  settingsStore.setThemeMode(mode)
  showSnackbar(t('settings.themeUpdated'))
}

const setFontSize = (size) => {
  settingsStore.setFontSize(size)
  showSnackbar(t('settings.fontSizeUpdated'))
}

const toggleSidebar = () => {
  settingsStore.toggleSidebar()
  showSnackbar(
    settingsStore.sidebarCollapsed ? t('settings.sidebarCollapsed') : t('settings.sidebarExpanded')
  )
}

const toggleGlassEffect = () => {
  settingsStore.toggleGlassEffect()
  showSnackbar(
    settingsStore.glassEffectEnabled
      ? t('settings.glassEffectEnabled')
      : t('settings.glassEffectDisabled')
  )
}

const toggleBingWallpaper = () => {
  settingsStore.toggleBingWallpaper()
}

const setThemeColor = (color) => {
  settingsStore.setPrimaryColor(color)
}

const changeLanguage = (loc) => {
  setLocale(loc)
  showSnackbar(getLocaleLabel(loc))
}
</script>

<style scoped>
.language-options {
  display: flex;
  gap: 10px;
  padding: 0 20px 20px 72px;
}

.language-option {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 14px;
  border: 1.5px solid var(--color-border-light);
  border-radius: 10px;
  background: var(--color-surface-2);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.language-option:hover {
  border-color: var(--color-primary-alpha);
  color: var(--color-text-primary);
}

.language-option.active {
  border-color: var(--color-primary);
  background: var(--color-primary-tint);
  color: var(--color-primary);
}

.lang-label {
  line-height: 1;
}

.lang-check {
  flex-shrink: 0;
}
</style>
