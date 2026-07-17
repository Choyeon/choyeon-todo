<template>
  <div class="settings-card">
    <div class="settings-section-header">
      <div class="settings-section-icon icon-purple">
        <Keyboard :size="18" />
      </div>
      <h3 class="settings-section-title">{{ $t('settings.shortcuts') }}</h3>
    </div>

    <div class="shortcut-item">
      <div class="shortcut-info">
        <Keyboard :size="18" class="shortcut-icon" />
        <span class="shortcut-label">{{ $t('shortcuts.newTask') }}</span>
      </div>
      <div class="shortcut-keys">
        <kbd class="kbd">Ctrl</kbd>
        <span class="kbd-plus">+</span>
        <kbd class="kbd">N</kbd>
      </div>
    </div>

    <div class="shortcut-item">
      <div class="shortcut-info">
        <Search :size="18" class="shortcut-icon" />
        <span class="shortcut-label">{{ $t('shortcuts.search') }}</span>
      </div>
      <div class="shortcut-keys">
        <kbd class="kbd">Ctrl</kbd>
        <span class="kbd-plus">+</span>
        <kbd class="kbd">K</kbd>
      </div>
    </div>

    <div class="shortcut-item">
      <div class="shortcut-info">
        <ArrowUpDown :size="18" class="shortcut-icon" />
        <span class="shortcut-label">{{ $t('shortcuts.moveUpDown') }}</span>
      </div>
      <div class="shortcut-keys">
        <kbd class="kbd">J</kbd>
        <span class="kbd-slash">/</span>
        <kbd class="kbd">K</kbd>
      </div>
    </div>

    <div class="shortcut-item">
      <div class="shortcut-info">
        <CheckCircle :size="18" class="shortcut-icon" />
        <span class="shortcut-label">{{ $t('shortcuts.complete') }}</span>
      </div>
      <div class="shortcut-keys">
        <kbd class="kbd">Space</kbd>
      </div>
    </div>

    <div class="shortcut-item">
      <div class="shortcut-info">
        <Star :size="18" class="shortcut-icon" />
        <span class="shortcut-label">{{ $t('shortcuts.important') }}</span>
      </div>
      <div class="shortcut-keys">
        <kbd class="kbd">I</kbd>
      </div>
    </div>

    <div class="shortcut-item">
      <div class="shortcut-info">
        <Clock :size="18" class="shortcut-icon" />
        <span class="shortcut-label">{{ $t('shortcuts.setDate') }}</span>
      </div>
      <div class="shortcut-keys">
        <kbd class="kbd">D</kbd>
      </div>
    </div>

    <div class="shortcut-item">
      <div class="shortcut-info">
        <Settings :size="18" class="shortcut-icon" />
        <span class="shortcut-label">{{ $t('shortcuts.openSettings') }}</span>
      </div>
      <div class="shortcut-keys">
        <kbd class="kbd">Ctrl</kbd>
        <span class="kbd-plus">+</span>
        <kbd class="kbd">,</kbd>
      </div>
    </div>

    <div class="shortcut-item">
      <div class="shortcut-info">
        <Timer :size="18" class="shortcut-icon" />
        <span class="shortcut-label">{{ $t('shortcuts.togglePomodoro') }}</span>
      </div>
      <div class="shortcut-keys">
        <kbd class="kbd">Ctrl</kbd>
        <span class="kbd-plus">+</span>
        <kbd class="kbd">Shift</kbd>
        <span class="kbd-plus">+</span>
        <kbd class="kbd">P</kbd>
      </div>
    </div>

    <div class="shortcut-item">
      <div class="shortcut-info">
        <HelpCircle :size="18" class="shortcut-icon" />
        <span class="shortcut-label">{{ $t('shortcuts.help') }}</span>
      </div>
      <div class="shortcut-keys">
        <kbd class="kbd">Ctrl</kbd>
        <span class="kbd-plus">+</span>
        <kbd class="kbd">/</kbd>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Keyboard, Search, ArrowUpDown, CheckCircle, Star, Clock, Settings, Timer, HelpCircle } from '@lucide/vue'
</script>
