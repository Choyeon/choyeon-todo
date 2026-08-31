<template>
  <div class="report-card">
    <div class="report-head">
      <div class="report-head-info">
        <div class="report-title">{{ reportTypeText }}</div>
        <div class="report-sub">{{ rangeText }}</div>
      </div>
      <div class="report-tabs">
        <button
          class="tab-btn"
          :class="{ active: mode === 'weekly' }"
          :aria-label="t('report.weekly') || 'Weekly'"
          :aria-pressed="mode === 'weekly'"
          @click="mode = 'weekly'"
        >
          {{ t('report.weekly') || 'Weekly' }}
        </button>
        <button
          class="tab-btn"
          :class="{ active: mode === 'monthly' }"
          :aria-label="t('report.monthly') || 'Monthly'"
          :aria-pressed="mode === 'monthly'"
          @click="mode = 'monthly'"
        >
          {{ t('report.monthly') || 'Monthly' }}
        </button>
      </div>
    </div>

    <div class="report-body">
      <div class="report-grid">
        <div class="metric big">
          <div class="metric-label">{{ t('stats.completedTasks') || 'Completed' }}</div>
          <div class="metric-value">{{ data.stats.completedCount }}</div>
          <div class="metric-sub">{{ onTimeRateText }}</div>
        </div>
        <div class="metric">
          <div class="metric-label">{{ t('stats.focusDuration') || 'Focus' }}</div>
          <div class="metric-value">{{ hours }}<span class="unit">h</span>{{ mins }}<span
              class="unit"
              v-if="mins > 0"
              >m</span
            ></div>
          <div class="metric-sub">{{ deepFocusText }}</div>
        </div>
        <div class="metric">
          <div class="metric-label">{{ t('karma.karmaChange') || 'Karma Δ' }}</div>
          <div class="metric-value" :class="{ pos: data.karma.delta >= 0, neg: data.karma.delta < 0 }">
            {{ data.karma.delta >= 0 ? '+' : '' }}{{ data.karma.delta }}
          </div>
          <div class="metric-sub">
            {{ t('karma.karmaEnd') || 'Now' }}: {{ data.karma.karmaEnd }}
          </div>
        </div>
        <div class="metric" v-if="mode === 'monthly'">
          <div class="metric-label">{{ t('report.mom') || 'MoM' }}</div>
          <div class="metric-value">
            <span v-for="c in data.momCompare" :key="c.key" class="mom-pill" :class="{
                pos: c.delta >= 0,
                neg: c.delta < 0
              }">
              {{ c.delta >= 0 ? '↑' : '↓' }} {{ Math.abs(c.delta) }}
            </span>
          </div>
          <div class="metric-sub">{{ firstCompareText }}</div>
        </div>
        <div class="metric" v-else>
          <div class="metric-label">{{ t('report.bestDay') || 'Best day' }}</div>
          <div class="metric-value small">{{ bestDayText }}</div>
          <div class="metric-sub">{{ peakHourText }}</div>
        </div>
      </div>

      <div class="suggestions">
        <div class="section-title">{{ suggestionsLabel }}</div>
        <ul class="sg-list">
          <li v-for="(s, i) in data.suggestions.slice(0, 4)" :key="i">{{ s }}</li>
        </ul>
      </div>
    </div>

    <div class="report-footer">
      <button class="download-btn" :aria-label="t('report.download') || 'Download Markdown'" @click="downloadMarkdown">
        <Download :size="16" aria-hidden="true" />
        <span>{{ t('report.download') || 'Download Markdown' }}</span>
      </button>
      <button class="copy-btn" :aria-label="copyBtnText" @click="copyMarkdown">
        <Copy :size="14" aria-hidden="true" />
        <span>{{ copyBtnText }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Download, Copy } from '@lucide/vue'
import { buildWeeklyReport, buildMonthlyReport } from '../../utils/reportBuilder'

const props = defineProps({
  taskStore: { type: Object, required: true },
  pomodoroStore: { type: Object, required: true },
  karmaStore: { type: Object, required: true },
  initialMode: { type: String, default: 'weekly' }, // 'weekly' | 'monthly'
  weekStartISO: { type: String, default: null },
  monthISO: { type: String, default: null }
})

const { t, locale } = useI18n()
const mode = ref(props.initialMode === 'monthly' ? 'monthly' : 'weekly')
const copyBtnText = ref(t('report.copy') || 'Copy MD')

const report = computed(() => {
  const opts = {
    taskStore: props.taskStore,
    pomodoroStore: props.pomodoroStore,
    karmaStore: props.karmaStore,
    locale: locale.value
  }
  if (mode.value === 'monthly') {
    return buildMonthlyReport({ ...opts, monthISO: props.monthISO })
  }
  return buildWeeklyReport({ ...opts, weekStartISO: props.weekStartISO })
})

const data = computed(() => report.value.data)
const markdown = computed(() => report.value.markdown)

const reportTypeText = computed(() =>
  mode.value === 'monthly'
    ? t('report.monthlyTitle') || 'Monthly Report'
    : t('report.weeklyTitle') || 'Weekly Report'
)

const rangeText = computed(() => {
  const r = data.value.dateRange
  return `${r.start} ~ ${r.end}`
})

const hours = computed(() => Math.floor(data.value.stats.focusMinutes / 60))
const mins = computed(() => data.value.stats.focusMinutes % 60)

const deepFocusText = computed(() =>
  `${t('stats.deepFocusMinutes') || 'Deep'}: ${data.value.stats.deepFocusMinutes}m`
)

const onTimeRateText = computed(() => {
  const s = data.value.stats
  return `${t('stats.onTimeRate') || 'On-time'} ${s.onTimeRate}% (${s.onTimeCompletedCount}/${s.completedCount})`
})

const bestDayText = computed(() => data.value.bestDay || t('stats.noData') || '-')
const peakHourText = computed(() =>
  `${t('report.peakHour') || 'Peak'} ${data.value.peakHour}:00 × ${data.value.peakHourCount}`
)

const firstCompareText = computed(() => {
  const c = data.value.momCompare?.[0]
  return c ? c.text : ''
})

const suggestionsLabel = computed(() =>
  mode.value === 'monthly'
    ? t('report.nextMonthSg') || 'Next-month suggestions'
    : t('report.nextWeekSg') || 'Next-week suggestions'
)

const triggerDownload = (filename, content) => {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const downloadMarkdown = () => {
  const r = data.value.dateRange
  const prefix = mode.value === 'monthly' ? `monthly-${r.year}-${String(r.month).padStart(2, '0')}` : `weekly-${r.start}`
  triggerDownload(`${prefix}-report.md`, markdown.value)
}

const copyMarkdown = async () => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(markdown.value)
      copyBtnText.value = t('report.copied') || 'Copied ✓'
      setTimeout(() => {
        copyBtnText.value = t('report.copy') || 'Copy MD'
      }, 1800)
    }
  } catch (e) {
    console.warn('copy failed', e)
  }
}

// 暴露 markdown + data 给父组件
defineExpose({ report, markdown, data, mode })
</script>

<style scoped>
.report-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--card-shadow);
  overflow: hidden;
  min-width: 0;
}

.report-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border-light);
  gap: 10px;
  flex-wrap: wrap;
}

.report-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text-primary);
  font-family: var(--font-title);
}
.report-sub {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: 2px;
}

.report-tabs {
  display: inline-flex;
  padding: 3px;
  background: var(--color-bg-secondary);
  border-radius: 999px;
}
.tab-btn {
  padding: 6px 14px;
  border-radius: 999px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: var(--font-size-sm);
  transition: all var(--transition-smooth);
}
.tab-btn:hover {
  color: var(--color-text-primary);
}
.tab-btn.active {
  background: var(--color-surface);
  color: var(--color-primary);
  box-shadow: var(--shadow-xs);
  font-weight: 600;
}

.report-body {
  padding: 16px 20px;
}

.report-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr 1fr;
  gap: 14px;
  margin-bottom: 14px;
}

.metric {
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  padding: 12px;
  min-width: 0;
}
.metric.big {
  background: var(--color-primary-lightest);
  border: 1px solid var(--color-primary-lighter);
}
:global([data-theme='dark']) .metric.big {
  background: rgba(59, 130, 246, 0.12);
}
.metric-label {
  font-size: 11px;
  color: var(--color-text-tertiary);
  margin-bottom: 4px;
}
.metric-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1.1;
  font-family: var(--font-title);
}
.metric-value.small {
  font-size: 18px;
}
.metric-value .unit {
  font-size: 12px;
  font-weight: 500;
  opacity: 0.6;
  margin-left: 2px;
  margin-right: 4px;
}
.metric-value.pos {
  color: #059669;
}
.metric-value.neg {
  color: #dc2626;
}
.metric-sub {
  font-size: 11px;
  color: var(--color-text-tertiary);
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mom-pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  margin-right: 4px;
  background: rgba(5, 150, 105, 0.12);
  color: #059669;
}
.mom-pill.neg {
  background: rgba(220, 38, 38, 0.12);
  color: #dc2626;
}

.section-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 6px;
}
.sg-list {
  list-style: decimal inside;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.sg-list li {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  line-height: 1.5;
  padding-left: 2px;
}

.report-footer {
  padding: 12px 20px;
  border-top: 1px solid var(--color-border-light);
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  flex-wrap: wrap;
}
.download-btn,
.copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-smooth);
}
.download-btn:hover,
.copy-btn:hover {
  background: var(--color-bg-secondary);
  transform: translateY(-1px);
}
.download-btn {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}
.download-btn:hover {
  background: var(--color-primary-dark);
  border-color: var(--color-primary-dark);
}

@media (max-width: 768px) {
  .report-grid {
    grid-template-columns: 1fr 1fr;
  }
  .metric.big {
    grid-column: span 2;
  }
}
</style>
