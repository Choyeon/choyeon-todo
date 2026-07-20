<template>
  <Teleport to="body">
    <Transition name="update-fade">
      <div v-if="visible" class="update-backdrop" @click.self="handleLater">
        <Transition name="update-pop">
          <div
            v-if="visible"
            class="update-dialog"
            role="alertdialog"
            aria-modal="true"
            :aria-label="title"
            @keydown.esc="handleLater"
            tabindex="-1"
            ref="dialogRef"
          >
            <div class="update-icon">
              <RefreshCw :size="32" />
            </div>
            <h3 class="update-title">{{ title }}</h3>
            <p class="update-message">{{ message }}</p>
            <div v-if="releaseNotes" class="update-release-notes">
            <p class="release-notes-label">{{ $t('update.releaseNotes') }}</p>
            <div class="release-notes-content" v-html="sanitizedReleaseNotes"></div>
          </div>
            <div class="update-version-info">
              <span class="current-version">{{ $t('update.currentVersion') }} {{ currentVersion }}</span>
              <span class="latest-version">{{ $t('update.latestVersion') }} {{ latestVersion }}</span>
            </div>
            <div class="update-actions">
              <button class="update-btn later-btn" @click="handleLater">
                {{ $t('update.later') }}
              </button>
              <button
                class="update-btn update-btn-primary"
                :disabled="isDownloading"
                @click="handleUpdate"
              >
                <template v-if="isDownloading">
                  <span class="spinner"></span>
                  {{ $t('update.downloading') }}
                </template>
                <template v-else>{{ $t('update.updateNow') }}</template>
              </button>
            </div>
            <div v-if="isDownloading && downloadPercent >= 0" class="update-progress">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: downloadPercent + '%' }"></div>
              </div>
              <span class="progress-text">{{ downloadPercent.toFixed(0) }}%</span>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RefreshCw } from '@lucide/vue'

const { t } = useI18n()

const visible = ref(false)
const currentVersion = ref('')
const latestVersion = ref('')
const releaseNotes = ref('')
const isDownloading = ref(false)
const downloadPercent = ref(-1)
const dialogRef = ref(null)

const title = computed(() => t('update.title'))
const message = computed(() => t('update.message'))

const sanitizedReleaseNotes = computed(() => {
  let notes = releaseNotes.value || ''
  notes = notes.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  notes = notes.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  notes = notes.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
  return notes
})

const show = (info) => {
  if (info) {
    currentVersion.value = info.currentVersion || ''
    latestVersion.value = info.version || ''
    releaseNotes.value = info.releaseNotes || ''
  }
  visible.value = true
}

const hide = () => {
  visible.value = false
}

const handleLater = () => {
  hide()
}

const handleUpdate = () => {
  if (isDownloading.value) return
  isDownloading.value = true
  downloadPercent.value = 0
  window.electronAPI?.downloadUpdate?.()
}

const setDownloadProgress = (progress) => {
  downloadPercent.value = progress.percent
}

const onDownloadComplete = () => {
  isDownloading.value = false
  downloadPercent.value = 100
}

const onDownloadError = () => {
  isDownloading.value = false
  downloadPercent.value = -1
}

watch(visible, (val) => {
  if (val) {
    nextTick(() => {
      if (dialogRef.value) {
        dialogRef.value.focus()
      }
    })
  }
})

defineExpose({
  show,
  hide,
  setDownloadProgress,
  onDownloadComplete,
  onDownloadError
})
</script>

<style scoped>
.update-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: rgba(60, 64, 67, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: updateFadeIn var(--duration-normal) var(--ease-out-quart);
}

@keyframes updateFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.update-dialog {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-float);
  padding: 24px;
  width: 380px;
  max-width: calc(100vw - 32px);
  display: flex;
  flex-direction: column;
  gap: 16px;
  outline: none;
}

.update-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  margin: 0 auto;
  background: var(--color-primary);
  border-radius: 50%;
  color: #ffffff;
}

.update-title {
  font-size: var(--font-size-xl);
  font-weight: 500;
  color: var(--color-text-primary);
  margin: 0;
  text-align: center;
  line-height: 1.3;
  font-family: var(--font-title);
  letter-spacing: -0.2px;
}

.update-message {
  font-size: var(--font-size-body);
  color: var(--color-text-secondary);
  margin: 0;
  text-align: center;
  line-height: 1.5;
  font-family: var(--font-body);
}

.update-release-notes {
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  padding: 12px;
}

.release-notes-label {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-tertiary);
  margin: 0 0 8px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.release-notes-content {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: 1.5;
  font-family: var(--font-body);
  white-space: pre-line;
  max-height: 100px;
  overflow-y: auto;
}

.update-version-info {
  display: flex;
  justify-content: center;
  gap: 16px;
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.current-version {
  opacity: 0.7;
}

.latest-version {
  color: var(--color-primary);
  font-weight: 500;
}

.update-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 8px;
}

.update-btn {
  padding: 10px 24px;
  border-radius: var(--radius-md);
  font-size: var(--font-size-body);
  font-weight: 500;
  font-family: var(--font-body);
  cursor: pointer;
  border: none;
  transition:
    background var(--transition-smooth),
    color var(--transition-smooth),
    box-shadow var(--transition-smooth);
  min-width: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.later-btn {
  background: transparent;
  color: var(--color-text-secondary);
}

.later-btn:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
}

.update-btn-primary {
  background: var(--color-primary);
  color: #ffffff;
}

.update-btn-primary:hover:not(:disabled) {
  background: var(--color-primary-hover, var(--color-primary));
  box-shadow: var(--shadow-sm);
}

.update-btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.update-progress {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 8px;
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
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  min-width: 40px;
  text-align: right;
}

.update-fade-enter-active,
.update-fade-leave-active {
  transition: opacity var(--duration-normal) var(--ease-out-quart);
}

.update-fade-enter-from,
.update-fade-leave-to {
  opacity: 0;
}

.update-pop-enter-active {
  transition:
    transform var(--duration-moderate) var(--ease-spring-soft),
    opacity var(--duration-normal) var(--ease-out-quart);
}

.update-pop-leave-active {
  transition:
    transform var(--duration-normal) var(--ease-out-quart),
    opacity var(--duration-fast) var(--ease-out-quart);
}

.update-pop-enter-from {
  transform: scale(0.92);
  opacity: 0;
}

.update-pop-leave-to {
  transform: scale(0.96);
  opacity: 0;
}

@media (max-width: 767px) {
  .update-dialog {
    width: calc(100vw - 32px);
    padding: 20px;
  }
}
</style>