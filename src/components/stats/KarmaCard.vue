<template>
  <div class="karma-card">
    <div class="karma-head">
      <div class="karma-icon">
        <Sparkles :size="22" />
      </div>
      <div class="karma-head-info">
        <div class="karma-head-label">{{ t('karma.title') || 'Karma' }}</div>
        <div class="karma-head-sub">
          {{ recentBadgeText }}
        </div>
      </div>
    </div>

    <div class="karma-level-row">
      <div class="level-avatar">
        <span class="level-num">{{ stats.level || 0 }}</span>
        <span class="level-text">Lv</span>
      </div>

      <div class="karma-main">
        <div class="karma-score">
          <span class="score-num">{{ stats.totalKarma }}</span>
          <span class="score-unit">pts</span>
        </div>
        <div class="karma-progress">
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: Math.min(100, stats.progressPct) + '%' }"
            ></div>
          </div>
          <div class="progress-meta">
            <span v-if="stats.nextAt != null" class="progress-next">
              {{ t('karma.nextLevel') || 'Next' }} Lv{{ stats.nextLevel }} 还差
              <b>{{ stats.remaining }}</b>
            </span>
            <span v-else class="progress-next">{{ t('karma.max') || 'MAX' }}</span>
            <span class="progress-pct">{{ stats.progressPct }}%</span>
          </div>
        </div>
      </div>
    </div>

    <div class="karma-meta">
      <div class="meta-item">
        <div class="meta-label">{{ t('karma.today') || 'Today' }}</div>
        <div class="meta-value positive" v-if="stats.xpToday >= 0">+{{ stats.xpToday }}</div>
        <div class="meta-value negative" v-else>{{ stats.xpToday }}</div>
        <div class="meta-cap">
          / {{ stats.xpTodayCap }}
          <div class="mini-bar">
            <div
              class="mini-fill"
              :style="{ width: Math.min(100, (stats.xpToday / stats.xpTodayCap) * 100) + '%' }"
            ></div>
          </div>
        </div>
      </div>
      <div class="meta-item">
        <div class="meta-label">{{ t('karma.badges') || 'Badges' }}</div>
        <div class="meta-value"><b>{{ stats.badgeCount }}</b></div>
        <div class="meta-cap">{{ t('karma.totalBadges') || 'total' }}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">{{ t('karma.streak') || 'Streak' }}</div>
        <div class="meta-value"><b>{{ streakDay }}</b> {{ t('stats.dayUnit') || 'd' }}</div>
        <div class="meta-cap">{{ longestStreak }} {{ t('karma.longest') || 'longest' }}</div>
      </div>
    </div>

    <div v-if="stats.recentBadges && stats.recentBadges.length > 0" class="recent-badges">
      <div class="badges-title">{{ t('karma.recentBadges') || 'Recent badges' }}</div>
      <div class="badges-list">
        <div
          v-for="b in stats.recentBadges"
          :key="b.id"
          class="badge-chip"
          :title="badgeDescText(b)"
        >
          <Award :size="14" />
          <span>{{ badgeNameText(b) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Sparkles, Award } from '@lucide/vue'
import { useKarmaStore } from '../../stores/karmaStore'
import { badgeText } from '../../utils/karmaLevels'

const props = defineProps({
  streakDay: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  locale: { type: String, default: null }
})

const { t, locale } = useI18n()
const karmaStore = useKarmaStore()

const stats = computed(() => karmaStore.getKarmaStats())
const effectiveLocale = computed(() => props.locale || locale.value)

const recentBadgeText = computed(() => {
  const list = stats.value.recentBadges || []
  if (list.length === 0) return t('karma.noBadge') || 'No badges yet — keep going!'
  const last = list[0]
  return `${t('karma.latest') || 'Latest'}: ${badgeNameText(last)}`
})

const badgeNameText = (b) => badgeText(b, effectiveLocale.value).name
const badgeDescText = (b) => badgeText(b, effectiveLocale.value).desc
</script>

<style scoped>
.karma-card {
  background: #fde68a;
  color: #1f2937;
  border-radius: var(--radius-xl);
  padding: 20px;
  box-shadow: var(--shadow-md);
  position: relative;
  overflow: hidden;
  min-width: 0;
}
:global([data-theme='dark']) .karma-card {
  background: #4338ca;
  color: #f5f3ff;
}

.karma-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.karma-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.35);
  color: inherit;
  flex-shrink: 0;
}
:global([data-theme='dark']) .karma-icon {
  background: rgba(255, 255, 255, 0.12);
}

.karma-head-label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  opacity: 0.9;
}
.karma-head-sub {
  font-size: var(--font-size-2xs);
  opacity: 0.75;
}

.karma-level-row {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 16px;
}

.level-avatar {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
  display: grid;
  place-items: center;
  flex-shrink: 0;
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.5);
}
:global([data-theme='dark']) .level-avatar {
  background: rgba(255, 255, 255, 0.08);
}

.level-num {
  font-size: 28px;
  font-weight: 700;
  font-family: var(--font-title);
}
.level-text {
  position: absolute;
  font-size: 9px;
  opacity: 0.75;
  top: 8px;
  right: 10px;
  text-transform: uppercase;
}

.karma-main {
  flex: 1;
  min-width: 0;
}

.karma-score {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 6px;
}
.score-num {
  font-size: 30px;
  font-weight: 700;
  line-height: 1;
  font-family: var(--font-title);
}
.score-unit {
  font-size: var(--font-size-xs);
  opacity: 0.75;
}

.karma-progress {
  min-width: 0;
}
.progress-bar {
  height: 8px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 999px;
  overflow: hidden;
}
:global([data-theme='dark']) .progress-bar {
  background: rgba(255, 255, 255, 0.12);
}
.progress-fill {
  height: 100%;
  background: currentColor;
  border-radius: 999px;
  transition: width var(--duration-slow) var(--ease-out-expo);
  color: rgba(180, 83, 9, 0.9);
}
:global([data-theme='dark']) .progress-fill {
  color: rgba(221, 214, 254, 0.95);
}

.progress-meta {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-2xs);
  margin-top: 4px;
  opacity: 0.8;
}
.progress-next b {
  font-weight: 600;
}

.karma-meta {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 14px;
}
.meta-item {
  background: rgba(255, 255, 255, 0.28);
  border-radius: var(--radius-md);
  padding: 8px 10px;
  min-width: 0;
}
:global([data-theme='dark']) .meta-item {
  background: rgba(255, 255, 255, 0.08);
}
.meta-label {
  font-size: 10px;
  opacity: 0.8;
  margin-bottom: 2px;
}
.meta-value {
  font-size: var(--font-size-lg);
  font-weight: 700;
  font-family: var(--font-title);
}
.meta-value.positive {
  color: #065f46;
}
.meta-value.negative {
  color: #991b1b;
}
:global([data-theme='dark']) .meta-value.positive {
  color: #6ee7b7;
}
:global([data-theme='dark']) .meta-value.negative {
  color: #fca5a5;
}
.meta-cap {
  font-size: 10px;
  opacity: 0.75;
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
}
.mini-bar {
  flex: 1;
  height: 3px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 999px;
  overflow: hidden;
}
.mini-fill {
  height: 100%;
  background: currentColor;
}

.recent-badges {
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  padding-top: 10px;
}
:global([data-theme='dark']) .recent-badges {
  border-top-color: rgba(255, 255, 255, 0.1);
}
.badges-title {
  font-size: var(--font-size-2xs);
  opacity: 0.75;
  margin-bottom: 6px;
}
.badges-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.badge-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.45);
  border-radius: 999px;
  font-size: 11px;
  font-weight: 500;
  cursor: help;
}
:global([data-theme='dark']) .badge-chip {
  background: rgba(255, 255, 255, 0.14);
}
</style>
