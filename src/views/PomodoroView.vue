<template>
  <div class="pomodoro-view">
    <header class="view-header">
      <h1 class="view-title">番茄钟</h1>
      <p class="view-subtitle">专注工作，高效休息</p>
    </header>
    <div class="view-content">
      <PomodoroTimer />
    </div>
  </div>
</template>

<script setup>
import PomodoroTimer from '../components/PomodoroTimer.vue'
</script>

<style scoped>
.pomodoro-view {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  padding: 32px 24px 24px 24px;
  overflow-y: auto;
  box-sizing: border-box;
  min-width: 0;
}

.view-header {
  margin-bottom: 20px;
  flex-shrink: 0;
  min-width: 0;
  animation: headerEnter var(--duration-moderate) var(--ease-out-expo) both;
}

.view-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
  margin-bottom: 4px;
  word-break: break-word;
  letter-spacing: -0.01em;
  transition: color var(--transition-smooth);
}

.view-subtitle {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0;
  word-break: break-word;
  letter-spacing: 0.01em;
  transition: color var(--transition-smooth);
  animation: subtitleEnter var(--duration-moderate) var(--ease-out-quart) both;
  animation-delay: 0.08s;
}

.view-content {
  flex: 1;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  min-height: 0;
  min-width: 0;
  padding-top: 16px;
  animation: contentEnter var(--duration-slow) var(--ease-out-expo) both;
  animation-delay: 0.12s;
}

@keyframes headerEnter {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes subtitleEnter {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes contentEnter {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .pomodoro-view {
    padding: 20px 16px 16px;
  }

  .view-header {
    margin-bottom: 16px;
    text-align: center;
  }

  .view-title {
    font-size: 20px;
  }

  .view-subtitle {
    font-size: 13px;
  }

  .view-content {
    padding-top: 8px;
    align-items: flex-start;
  }
}

@media (max-width: 380px) {
  .pomodoro-view {
    padding: 16px 12px 12px;
  }

  .view-title {
    font-size: 18px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .view-header,
  .view-subtitle,
  .view-content {
    animation: none;
  }
}
</style>
