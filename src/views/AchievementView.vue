<template>
  <div class="achievement-view">
    <!-- 打卡成功动画 -->
    <Transition name="check-in">
      <div v-if="showCheckInAnimation" class="check-in-celebration">
        <div class="celebration-content">
          <div class="celebration-icon">
            <Check :size="48" />
          </div>
          <h3 class="celebration-title">{{ $t('achievement.checkInSuccess') }}</h3>
          <p class="celebration-streak">
            {{ $t('achievement.continuousDays', { days: currentStreak }) }}
          </p>
        </div>
      </div>
    </Transition>

    <div class="view-header">
      <div class="header-content">
        <h1>{{ $t('achievement.title') }}</h1>
        <p class="header-subtitle">{{ $t('achievement.subtitle') }}</p>
      </div>
      <button class="close-btn" @click="goBack">
        <X :size="24" />
      </button>
    </div>

    <!-- 统计概览 -->
    <div class="stats-overview">
      <div class="stat-card">
        <div class="stat-icon icon-blue">
          <Trophy :size="24" />
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ unlockedCount }}</div>
          <div class="stat-label">{{ $t('achievement.unlocked') }}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon icon-amber">
          <Flame :size="24" />
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ currentStreak }}</div>
          <div class="stat-label">{{ $t('achievement.currentStreak') }}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon icon-green">
          <Target :size="24" />
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ totalCompleted }}</div>
          <div class="stat-label">{{ $t('achievement.totalCompleted') }}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon icon-purple">
          <Award :size="24" />
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ level }}</div>
          <div class="stat-label">{{ $t('achievement.level') }}</div>
        </div>
      </div>
    </div>

    <!-- 连续打卡日历 -->
    <div class="streak-calendar">
      <h2 class="section-title">
        <Calendar :size="20" />
        {{ $t('achievement.streakCalendar') }}
      </h2>
      <div class="calendar-grid">
        <div
          v-for="day in last30Days"
          :key="day.date"
          class="calendar-day"
          :class="{
            completed: day.hasCompleted,
            today: day.isToday,
            future: day.isFuture
          }"
        >
          <div class="day-label">{{ day.label }}</div>
          <div class="day-indicator">
            <Check v-if="day.hasCompleted" :size="14" />
          </div>
        </div>
      </div>
    </div>

    <!-- 成就列表 -->
    <div class="achievements-section">
      <h2 class="section-title">
        <Award :size="20" />
        {{ $t('achievement.achievements') }}
      </h2>

      <div class="achievements-grid">
        <div
          v-for="achievement in achievements"
          :key="achievement.id"
          class="achievement-card"
          :class="{ unlocked: achievement.unlocked, locked: !achievement.unlocked }"
        >
          <div
            class="achievement-icon"
            :style="{ background: achievement.unlocked ? achievement.color : '#ccc' }"
          >
            <component :is="getIcon(achievement.icon)" :size="32" />
          </div>
          <div class="achievement-info">
            <h3 class="achievement-name">{{ achievement.name }}</h3>
            <p class="achievement-desc">{{ achievement.description }}</p>
            <div class="achievement-progress" v-if="achievement.progress !== undefined">
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  :style="{ width: `${achievement.progress}%`, background: achievement.color }"
                ></div>
              </div>
              <span class="progress-text">{{ achievement.current }}/{{ achievement.target }}</span>
            </div>
          </div>
          <div class="achievement-status">
            <CheckCircle v-if="achievement.unlocked" :size="24" class="unlocked-icon" />
            <Lock v-else :size="24" class="locked-icon" />
          </div>
        </div>
      </div>
    </div>

    <!-- 等级进度 -->
    <div class="level-progress-section">
      <h2 class="section-title">
        <TrendingUp :size="20" />
        {{ $t('achievement.levelProgress') }}
      </h2>
      <div class="level-card">
        <div class="level-header">
          <div class="level-badge">
            <span class="level-number">{{ level }}</span>
          </div>
          <div class="level-info">
            <h3>{{ getLevelName(level) }}</h3>
            <p>{{ $t('achievement.nextLevel') }}: {{ getLevelName(level + 1) }}</p>
          </div>
        </div>
        <div class="level-progress-bar">
          <div class="progress-fill" :style="{ width: `${levelProgress}%` }"></div>
        </div>
        <div class="level-stats">
          <span>{{ currentXP }} XP</span>
          <span>{{ nextLevelXP - currentXP }} XP {{ $t('achievement.toNextLevel') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useTaskStore } from '../stores/taskStore'
import { getTodayStr } from '../utils/date'
import {
  Trophy,
  Flame,
  Target,
  Award,
  Calendar,
  Check,
  CheckCircle,
  Lock,
  TrendingUp,
  X,
  Star,
  Heart,
  BookOpen,
  Briefcase,
  Clock,
  Rocket
} from '@lucide/vue'

const router = useRouter()
const { t } = useI18n()
const taskStore = useTaskStore()

const unlockedAchievements = ref([])
// 打卡记录：{ '2024-01-15': true, ... }
const streakData = ref({})
const showCheckInAnimation = ref(false)
const previousStreak = ref(0)

/**
 * 从 localStorage 加载成就数据
 * 数据结构：{ unlocked: string[], streak: Record<string, boolean> }
 */
const loadAchievementData = () => {
  try {
    const saved = localStorage.getItem('choyeon_achievements')
    if (saved) {
      const data = JSON.parse(saved)
      unlockedAchievements.value = data.unlocked || []
      streakData.value = data.streak || {}
    }
  } catch (e) {
    console.error('Failed to load achievement data:', e)
  }
}

/**
 * 持久化成就数据到 localStorage
 * 在解锁成就或更新打卡记录时调用
 */
const saveAchievementData = () => {
  try {
    localStorage.setItem(
      'choyeon_achievements',
      JSON.stringify({
        unlocked: unlockedAchievements.value,
        streak: streakData.value
      })
    )
  } catch (e) {
    console.error('Failed to save achievement data:', e)
  }
}

/**
 * 计算当前连续打卡天数
 * 从今天开始向前遍历，遇到断档即停止
 * 最多检查 365 天
 */
const currentStreak = computed(() => {
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    if (streakData.value[dateStr]) {
      streak++
    } else if (i > 0) {
      break
    }
  }
  return streak
})

/** 已完成任务总数 */
const totalCompleted = computed(() => {
  return taskStore.tasks.filter((t) => t.completed).length
})

/**
 * 等级计算
 * 经验值 = 完成任务数 × 10 + 连续打卡天数 × 5
 * 每 100 经验值升一级
 */
const level = computed(() => {
  const xp = totalCompleted.value * 10 + currentStreak.value * 5
  return Math.floor(xp / 100) + 1
})

/** 当前经验值 */
const currentXP = computed(() => {
  return totalCompleted.value * 10 + currentStreak.value * 5
})

/** 升到下一级所需总经验值 */
const nextLevelXP = computed(() => {
  return level.value * 100
})

/** 当前等级进度百分比 (0-100) */
const levelProgress = computed(() => {
  const currentLevelXP = (level.value - 1) * 100
  const progress = currentXP.value - currentLevelXP
  const needed = nextLevelXP.value - currentLevelXP
  return Math.min(100, Math.max(0, (progress / needed) * 100))
})

/** 已解锁成就数量 */
const unlockedCount = computed(() => {
  return achievements.value.filter((a) => a.unlocked).length
})

/**
 * 生成最近 30 天的日期数组
 * 用于热力图展示，标记每天是否有完成任务
 */
const last30Days = computed(() => {
  const days = []
  const today = new Date()
  const todayStr = getTodayStr()

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    // 检查当天是否有已完成的任务
    const hasCompleted = taskStore.tasks.some((t) => {
      if (!t.completed || !t.completedAt) return false
      const completedDate = new Date(t.completedAt).toISOString().split('T')[0]
      return completedDate === dateStr
    })

    days.push({
      date: dateStr,
      label: date.getDate(),
      hasCompleted,
      isToday: dateStr === todayStr,
      isFuture: date > today
    })
  }
  return days
})

/**
 * 成就列表定义
 * 每个成就包含解锁条件和进度计算
 */
const achievements = computed(() => {
  const allAchievements = [
    {
      id: 'first_task',
      name: t('achievement.firstTask'),
      description: t('achievement.firstTaskDesc'),
      icon: 'star',
      color: '#F59E0B',
      unlocked: totalCompleted.value >= 1,
      progress: Math.min(100, totalCompleted.value * 100)
    },
    {
      id: 'ten_tasks',
      name: t('achievement.tenTasks'),
      description: t('achievement.tenTasksDesc'),
      icon: 'target',
      color: '#3B82F6',
      unlocked: totalCompleted.value >= 10,
      current: totalCompleted.value,
      target: 10,
      progress: Math.min(100, (totalCompleted.value / 10) * 100)
    },
    {
      id: 'fifty_tasks',
      name: t('achievement.fiftyTasks'),
      description: t('achievement.fiftyTasksDesc'),
      icon: 'trophy',
      color: '#8B5CF6',
      unlocked: totalCompleted.value >= 50,
      current: totalCompleted.value,
      target: 50,
      progress: Math.min(100, (totalCompleted.value / 50) * 100)
    },
    {
      id: 'hundred_tasks',
      name: t('achievement.hundredTasks'),
      description: t('achievement.hundredTasksDesc'),
      icon: 'award',
      color: '#EC4899',
      unlocked: totalCompleted.value >= 100,
      current: totalCompleted.value,
      target: 100,
      progress: Math.min(100, (totalCompleted.value / 100) * 100)
    },
    {
      id: 'week_streak',
      name: t('achievement.weekStreak'),
      description: t('achievement.weekStreakDesc'),
      icon: 'flame',
      color: '#EF4444',
      unlocked: currentStreak.value >= 7,
      current: currentStreak.value,
      target: 7,
      progress: Math.min(100, (currentStreak.value / 7) * 100)
    },
    {
      id: 'month_streak',
      name: t('achievement.monthStreak'),
      description: t('achievement.monthStreakDesc'),
      icon: 'rocket',
      color: '#14B8A6',
      unlocked: currentStreak.value >= 30,
      current: currentStreak.value,
      target: 30,
      progress: Math.min(100, (currentStreak.value / 30) * 100)
    },
    {
      id: 'early_bird',
      name: t('achievement.earlyBird'),
      description: t('achievement.earlyBirdDesc'),
      icon: 'clock',
      color: '#F97316',
      unlocked: checkEarlyBird()
    },
    {
      id: 'night_owl',
      name: t('achievement.nightOwl'),
      description: t('achievement.nightOwlDesc'),
      icon: 'heart',
      color: '#6366F1',
      unlocked: checkNightOwl()
    },
    {
      id: 'work_master',
      name: t('achievement.workMaster'),
      description: t('achievement.workMasterDesc'),
      icon: 'briefcase',
      color: '#4A90D9',
      unlocked: checkCategoryMaster('work')
    },
    {
      id: 'study_master',
      name: t('achievement.studyMaster'),
      description: t('achievement.studyMasterDesc'),
      icon: 'book',
      color: '#A855F7',
      unlocked: checkCategoryMaster('study')
    }
  ]

  return allAchievements
})

const checkEarlyBird = () => {
  return taskStore.tasks.some((t) => {
    if (!t.completed || !t.completedAt) return false
    const hour = new Date(t.completedAt).getHours()
    return hour >= 5 && hour < 9
  })
}

const checkNightOwl = () => {
  return taskStore.tasks.some((t) => {
    if (!t.completed || !t.completedAt) return false
    const hour = new Date(t.completedAt).getHours()
    return hour >= 22 || hour < 2
  })
}

const checkCategoryMaster = (categoryId) => {
  return taskStore.tasks.filter((t) => t.completed && t.category === categoryId).length >= 20
}

/**
 * 根据等级返回对应称号
 * 等级体系：新手(1-4) → 中级(5-9) → 高级(10-19) → 专家(20-49) → 大师(50+)
 */
const getLevelName = (level) => {
  if (level < 5) return t('achievement.levelBeginner')
  if (level < 10) return t('achievement.levelIntermediate')
  if (level < 20) return t('achievement.levelAdvanced')
  if (level < 50) return t('achievement.levelExpert')
  return t('achievement.levelMaster')
}

/** 成就图标映射 */
const iconMap = {
  star: Star,
  target: Target,
  trophy: Trophy,
  award: Award,
  flame: Flame,
  rocket: Rocket,
  clock: Clock,
  heart: Heart,
  briefcase: Briefcase,
  book: BookOpen
}

/** 获取成就图标组件 */
const getIcon = (iconName) => {
  return iconMap[iconName] || Star
}

/** 返回首页 */
const goBack = () => {
  router.push('/')
}

/**
 * 更新打卡记录
 * 如果今天有已完成任务且未打卡，则记录打卡并触发动画
 */
const updateStreakData = (triggerAnimation = false) => {
  const today = getTodayStr()
  const hasCompletedToday = taskStore.tasks.some((t) => {
    if (!t.completed || !t.completedAt) return false
    const completedDate = new Date(t.completedAt).toISOString().split('T')[0]
    return completedDate === today
  })

  if (hasCompletedToday && !streakData.value[today]) {
    streakData.value[today] = true
    saveAchievementData()

    // 触发打卡动画
    if (triggerAnimation) {
      showCheckInAnimation.value = true
      setTimeout(() => {
        showCheckInAnimation.value = false
      }, 2000)
    }
  }
}

// 监听任务完成状态变化
watch(
  () => taskStore.tasks.filter((t) => t.completed).length,
  () => {
    const oldStreak = currentStreak.value
    updateStreakData(true)
    const newStreak = currentStreak.value

    if (newStreak > oldStreak) {
      previousStreak.value = oldStreak
    }
  }
)

onMounted(() => {
  loadAchievementData()
  updateStreakData(false)
})
</script>

<style scoped>
.achievement-view {
  min-height: 100%;
  padding: 32px;
  background: var(--color-bg);
  position: relative;
}

/* 打卡成功动画 */
.check-in-celebration {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease-out;
}

.celebration-content {
  text-align: center;
  animation: bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.celebration-icon {
  width: 120px;
  height: 120px;
  margin: 0 auto 24px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 20px 60px rgba(16, 185, 129, 0.4);
  animation: pulse 1s ease-in-out infinite;
}

.celebration-title {
  font-size: 32px;
  font-weight: 700;
  color: white;
  margin: 0 0 12px 0;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

.celebration-streak {
  font-size: 20px;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  font-weight: 500;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes bounceIn {
  0% {
    transform: scale(0.3);
    opacity: 0;
  }
  50% {
    transform: scale(1.05);
  }
  70% {
    transform: scale(0.9);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 20px 60px rgba(16, 185, 129, 0.4);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 25px 70px rgba(16, 185, 129, 0.6);
  }
}
.check-in-enter-active,
.check-in-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.check-in-enter-from {
  opacity: 0;
  transform: scale(0.8);
}

.check-in-leave-to {
  opacity: 0;
  transform: scale(1.1);
}

.view-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 32px;
}

.header-content h1 {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 8px 0;
}

.header-subtitle {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0;
}

.close-btn {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: none;
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--color-border);
  color: var(--color-text-primary);
}

.stats-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card {
  background: var(--color-surface);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid var(--color-border-light);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon.icon-blue {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.stat-icon.icon-amber {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.stat-icon.icon-green {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.stat-icon.icon-purple {
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.streak-calendar {
  background: var(--color-surface);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 32px;
  border: 1px solid var(--color-border-light);
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 20px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(30, 1fr);
  gap: 4px;
}

.calendar-day {
  aspect-ratio: 1;
  border-radius: 6px;
  background: var(--color-bg-secondary);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all 0.2s;
}

.calendar-day.completed {
  background: var(--color-primary);
  color: white;
}

.calendar-day.today {
  border: 2px solid var(--color-primary);
}

.calendar-day.future {
  opacity: 0.3;
}

.day-label {
  font-size: 10px;
  font-weight: 500;
}

.day-indicator {
  position: absolute;
  bottom: 2px;
  right: 2px;
}

.achievements-section {
  margin-bottom: 32px;
}

.achievements-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.achievement-card {
  background: var(--color-surface);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid var(--color-border-light);
  transition: all 0.2s;
}

.achievement-card.unlocked {
  border-color: var(--color-primary);
}

.achievement-card.locked {
  opacity: 0.6;
}

.achievement-icon {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.achievement-info {
  flex: 1;
  min-width: 0;
}

.achievement-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 4px 0;
}

.achievement-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 0 0 12px 0;
}

.achievement-progress {
  display: flex;
  align-items: center;
  gap: 8px;
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
  border-radius: 3px;
  transition: width 0.3s;
}

.progress-text {
  font-size: 12px;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.achievement-status {
  flex-shrink: 0;
}

.unlocked-icon {
  color: var(--color-primary);
}

.locked-icon {
  color: var(--color-text-tertiary);
}

.level-progress-section {
  background: var(--color-surface);
  border-radius: 16px;
  padding: 24px;
  border: 1px solid var(--color-border-light);
}

.level-card {
  margin-top: 20px;
}

.level-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.level-badge {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.level-number {
  font-size: 28px;
  font-weight: 700;
}

.level-info h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 4px 0;
}

.level-info p {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 0;
}

.level-progress-bar {
  height: 12px;
  background: var(--color-bg-secondary);
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 12px;
}

.level-progress-bar .progress-fill {
  background: linear-gradient(90deg, var(--color-primary), var(--color-primary-dark));
}

.level-stats {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--color-text-secondary);
}

@media (max-width: 768px) {
  .achievement-view {
    padding: 16px;
  }

  .stats-overview {
    grid-template-columns: repeat(2, 1fr);
  }

  .calendar-grid {
    grid-template-columns: repeat(15, 1fr);
  }

  .achievements-grid {
    grid-template-columns: 1fr;
  }
}
</style>
