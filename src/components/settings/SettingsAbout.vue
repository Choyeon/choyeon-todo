<template>
  <div class="about-container">
    <div class="about-hero" @click="handleVersionClick">
      <div class="about-logo">
        <svg width="64" height="64" viewBox="0 0 512 512">
          <defs>
            <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color: #6ba3ff; stop-opacity: 1" />
              <stop offset="100%" style="stop-color: #4c8bf5; stop-opacity: 1" />
            </linearGradient>
          </defs>
          <rect width="512" height="512" rx="112" fill="url(#logoGrad)" />
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
            ✓
          </text>
        </svg>
      </div>
      <h2 class="about-app-name">Choyeon To Do</h2>
      <p class="about-tagline">{{ $t('about.tagline') }}</p>
      <p class="about-version">{{ $t('settings.version') }} {{ appVersion }}</p>
    </div>

    <div class="about-highlights">
      <div class="highlight-item">
        <div class="highlight-icon highlight-icon-task">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        </div>
        <div class="highlight-text">
          <span class="highlight-title">{{ $t('about.smartTask') }}</span>
          <span class="highlight-desc">{{ $t('about.smartTaskDesc') }}</span>
        </div>
      </div>
      <div class="highlight-item">
        <div class="highlight-icon highlight-icon-calendar">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
        <div class="highlight-text">
          <span class="highlight-title">{{ $t('about.calendarView') }}</span>
          <span class="highlight-desc">{{ $t('about.calendarViewDesc') }}</span>
        </div>
      </div>
      <div class="highlight-item">
        <div class="highlight-icon highlight-icon-tomato">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="13" r="8" />
            <path d="M12 9v4l2 2" />
            <path d="M9 2h6" />
            <path d="M12 2v2" />
          </svg>
        </div>
        <div class="highlight-text">
          <span class="highlight-title">{{ $t('about.pomodoro') }}</span>
          <span class="highlight-desc">{{ $t('about.pomodoroDesc') }}</span>
        </div>
      </div>
      <div class="highlight-item">
        <div class="highlight-icon highlight-icon-stats">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        </div>
        <div class="highlight-text">
          <span class="highlight-title">{{ $t('about.analytics') }}</span>
          <span class="highlight-desc">{{ $t('about.analyticsDesc') }}</span>
        </div>
      </div>
    </div>

    <div class="settings-card links-card">
      <a
        href="https://github.com/Choyeon/choyeon-todo"
        target="_blank"
        rel="noopener noreferrer"
        class="link-row"
        @click.stop
      >
        <div class="link-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
            />
          </svg>
        </div>
        <div class="link-text">
          <span class="link-label">{{ $t('settings.githubRepo') }}</span>
          <span class="link-desc">github.com/Choyeon/choyeon-todo</span>
        </div>
        <svg
          class="link-arrow"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </a>
      <a
        href="https://chuyuchoyeon.github.io/choyeon-todo/"
        target="_blank"
        rel="noopener noreferrer"
        class="link-row"
        @click.stop
      >
        <div class="link-icon link-icon-globe">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <path
              d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
            ></path>
          </svg>
        </div>
        <div class="link-text">
          <span class="link-label">{{ $t('settings.onlineDemo') }}</span>
          <span class="link-desc">chuyuchoyeon.github.io/choyeon-todo</span>
        </div>
        <svg
          class="link-arrow"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </a>
    </div>

    <p class="about-footer">
      <span>{{ $t('about.madeWith') }}</span>
      <span class="heart">♥</span>
      <span>Choyeon</span>
    </p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const appVersion = ref(__APP_VERSION__)

onMounted(async () => {
  if (window.electronAPI?.getAppVersion) {
    try {
      const ver = await window.electronAPI.getAppVersion()
      if (ver) appVersion.value = ver
    } catch (e) {
      // ignore, fallback to build-time version
    }
  }
})

let versionClickCount = 0
let versionClickTimer = null

const handleVersionClick = () => {
  versionClickCount++
  if (versionClickTimer) clearTimeout(versionClickTimer)
  versionClickTimer = setTimeout(() => {
    versionClickCount = 0
  }, 2000)
  if (versionClickCount >= 5) {
    versionClickCount = 0
    if (versionClickTimer) {
      clearTimeout(versionClickTimer)
      versionClickTimer = null
    }
    if (window.electronAPI?.openDebugWindow) {
      window.electronAPI.openDebugWindow()
    }
  }
}
</script>

<style scoped>
.about-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 4px 0;
}

.about-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 20px 24px;
  background: var(--card-bg);
  border: var(--border-width) var(--border-style) var(--color-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition:
    transform var(--transition-smooth),
    border-color var(--transition-smooth);
}

.about-hero:hover {
  border-color: var(--color-border-hover);
  transform: translateY(-1px);
}

.about-logo {
  margin-bottom: 16px;
  filter: drop-shadow(0 4px 12px rgba(76, 139, 245, 0.3));
}

.about-app-name {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 6px 0;
  letter-spacing: -0.3px;
}

.about-tagline {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: 0 0 12px 0;
  text-align: center;
  line-height: 1.5;
  max-width: 280px;
}

.about-version {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin: 0;
}

.about-highlights {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.highlight-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  background: var(--card-bg);
  border: var(--border-width) var(--border-style) var(--color-border);
  border-radius: var(--radius-md);
  transition:
    border-color var(--transition-smooth),
    transform var(--transition-smooth);
}

.highlight-item:hover {
  border-color: var(--color-border-hover);
  transform: translateY(-1px);
}

.highlight-icon {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}

.highlight-icon-task {
  background: rgba(76, 139, 245, 0.12);
  color: #4c8bf5;
}

.highlight-icon-calendar {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
}

.highlight-icon-tomato {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
}

.highlight-icon-stats {
  background: rgba(168, 85, 247, 0.12);
  color: #a855f7;
}

.highlight-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.highlight-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.highlight-desc {
  font-size: var(--font-size-2xs);
  color: var(--color-text-tertiary);
  line-height: 1.4;
}

.about-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin: 8px 0 0 0;
}

.about-footer .heart {
  color: #ef4444;
  font-size: var(--font-size-sm);
  animation: heartbeat 2s ease-in-out infinite;
}

@keyframes heartbeat {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.15);
  }
}

.links-card {
  margin-top: 4px;
}

@media (max-width: 480px) {
  .about-highlights {
    grid-template-columns: 1fr;
  }
}
</style>
