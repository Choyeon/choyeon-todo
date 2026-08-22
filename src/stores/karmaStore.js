import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getTodayStr, parseDateStr, formatDateStr } from '../utils/date'
import { KARMA_LEVELS, levelFromKarma, BADGE_DEFINITIONS } from '../utils/karmaLevels'

const STORAGE_KEY = 'todo_karma_v3'
const LEGACY_STORAGE_KEY_V2 = 'todo_karma_v2'
const KARMA_LOG_LIMIT = 500
const XP_DAILY_CAP = 200

// ===== 基础工具 =====
const dayStrOfTs = (ts) => formatDateStr(new Date(ts))

const priorityBaseScore = (priority) => {
  // priority 越小分越高：0=10, 1=7, 2=3, 3=2, 4=1
  const n = Number(priority)
  const p = Number.isFinite(n)
    ? Math.max(0, Math.min(4, Math.floor(n)))
    : 4
  switch (p) {
    case 0:
      return 10
    case 1:
      return 7
    case 2:
      return 3
    case 3:
      return 2
    default:
      return 1
  }
}

const isTaskOverdueAtComplete = (task, completedAtTs) => {
  if (!task.date) return false
  const completedDay = dayStrOfTs(completedAtTs)
  if (task.date < completedDay) return true
  if (task.date === completedDay && task.time) {
    const [h, m] = task.time.split(':').map(Number)
    const d = new Date(completedAtTs)
    d.setHours(h, m, 0, 0)
    return completedAtTs >= d.getTime()
  }
  return false
}

export const useKarmaStore = defineStore('karma', () => {
  // ===== State =====
  const karma = ref(0)
  const level = ref(0)
  const xpToday = ref(0)
  const xpTodayDate = ref(getTodayStr())
  const badges = ref([]) // {id,name,desc,achievedAt}
  const karmaLog = ref([]) // {at,delta,reason,taskId?}
  // 小数累积（子任务 0.5 等暂存，下次整分奖励时结算）
  const fractionalKarma = ref(0)
  // 徽章自动触发：用于"连续 N 天"等状态缓存
  const _badgeState = ref({
    dayStreakSnapshot: 0,
    lastNoOverdueDay: null,
    noOverdueStreak: 0,
    aiModeMinutes: 0,
    repeatCompletedCount: 0,
    lastDaily10PlusStreak: 0,
    completedPerCategory: {}
  })

  // ===== 持久化 =====
  const serializeState = () => ({
    karma: karma.value,
    level: level.value,
    xpToday: xpToday.value,
    xpTodayDate: xpTodayDate.value,
    badges: badges.value,
    karmaLog: karmaLog.value,
    fractionalKarma: fractionalKarma.value,
    _badgeState: _badgeState.value,
    _version: 3,
    _savedAt: Date.now()
  })

  const saveToStorage = () => {
    try {
      if (typeof localStorage === 'undefined') return
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeState()))
    } catch (e) {
      console.warn('[KarmaStore] save failed:', e)
    }
  }

  let saveTimer = null
  const debouncedSave = () => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(saveToStorage, 250)
  }

  const loadFromStorage = () => {
    try {
      if (typeof localStorage === 'undefined') return false
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        // 迁移 v2
        const rawV2 = localStorage.getItem(LEGACY_STORAGE_KEY_V2)
        if (rawV2) {
          try {
            const v2 = JSON.parse(rawV2)
            const v2Karma = Number(v2 && (v2.karma ?? v2.score ?? v2.total)) || 0
            if (v2Karma > 0) {
              karma.value = v2Karma
              karmaLog.value.unshift({
                at: Date.now(),
                delta: v2Karma,
                reason: 'migrateFromV2'
              })
            }
          } catch {
            /* ignore v2 parse errors */
          }
        }
        return true
      }
      const data = JSON.parse(raw)
      if (typeof data.karma === 'number') karma.value = Math.max(0, data.karma)
      if (typeof data.level === 'number') level.value = Math.max(0, data.level)
      if (typeof data.xpToday === 'number') xpToday.value = Math.max(0, data.xpToday)
      if (typeof data.xpTodayDate === 'string') xpTodayDate.value = data.xpTodayDate
      if (Array.isArray(data.badges)) badges.value = data.badges.slice(0, 100)
      if (Array.isArray(data.karmaLog)) karmaLog.value = data.karmaLog.slice(-KARMA_LOG_LIMIT)
      if (typeof data.fractionalKarma === 'number') {
        fractionalKarma.value = Math.max(0, data.fractionalKarma)
      }
      if (data._badgeState && typeof data._badgeState === 'object') {
        _badgeState.value = { ..._badgeState.value, ...data._badgeState }
      }
      return true
    } catch (e) {
      console.warn('[KarmaStore] load failed:', e)
      return false
    }
  }

  // 加载后刷新等级（确保一致性）
  const refreshLevelFromKarma = () => {
    const info = levelFromKarma(karma.value)
    level.value = info.level
  }

  // ===== 每日上限检查 =====
  const ensureXpTodayFresh = () => {
    const today = getTodayStr()
    if (xpTodayDate.value !== today) {
      xpTodayDate.value = today
      xpToday.value = 0
    }
  }

  // ===== 日志 + 分数写入（核心内部方法） =====
  const _pushLog = (entry) => {
    karmaLog.value.push(entry)
    if (karmaLog.value.length > KARMA_LOG_LIMIT) {
      karmaLog.value.splice(0, karmaLog.value.length - KARMA_LOG_LIMIT)
    }
  }

  const _applyDelta = (rawDelta, reason, taskId = null) => {
    if (typeof rawDelta !== 'number' || !Number.isFinite(rawDelta) || rawDelta === 0) return 0
    ensureXpTodayFresh()

    let delta = rawDelta
    // 正向加分：考虑每日上限 + 小数累积
    if (delta > 0) {
      // 合并上次小数部分
      const total = delta + fractionalKarma.value
      const whole = Math.floor(total)
      const frac = total - whole
      fractionalKarma.value = frac
      delta = whole
      if (delta <= 0) {
        // 小数累加不够整分，直接记日志但不计入（保持 karma 不变）
        _pushLog({ at: Date.now(), delta: 0, fractional: total, reason, taskId })
        return 0
      }
      // 每日上限：剩余可加额度
      const allowed = Math.max(0, XP_DAILY_CAP - xpToday.value)
      if (delta > allowed) {
        delta = allowed
        if (delta <= 0) {
          _pushLog({ at: Date.now(), delta: 0, capped: true, reason, taskId })
          return 0
        }
      }
      xpToday.value += delta
    } else {
      // 扣分：不受每日上限限制；也不碰小数累积
      delta = Math.floor(delta)
    }

    const prevLevel = level.value
    karma.value = Math.max(0, karma.value + delta)
    const info = levelFromKarma(karma.value)
    level.value = info.level

    _pushLog({
      at: Date.now(),
      delta,
      reason,
      taskId: taskId || null,
      levelAfter: level.value,
      levelUp: level.value > prevLevel
    })

    // 徽章：Karma 阶梯
    _tryKarmaBadges()
    debouncedSave()
    return delta
  }

  // ===== 徽章：Karma 阶梯 =====
  const _tryKarmaBadges = () => {
    const achievedIds = new Set(badges.value.map((b) => b.id))
    const karmas = BADGE_DEFINITIONS.filter((b) => b.category === 'karma')
    for (const def of karmas) {
      if (!achievedIds.has(def.id) && karma.value >= def.threshold) {
        badges.value.push({
          id: def.id,
          name: def.name,
          desc: def.desc,
          achievedAt: Date.now()
        })
      }
    }
  }

  // ===== 统一加分入口 award(type, payload) =====
  const award = (type, payload = {}) => {
    switch (type) {
      case 'taskComplete': {
        const { task } = payload
        if (!task) return 0
        const completedAt = task.completedAt || payload.completedAt || Date.now()
        // 1) 基础分
        let base = priorityBaseScore(task.priority)
        // 2) 重复任务 ×1.2 向上取整（先乘再加法前统一取整）
        if (task.repeat) {
          base = Math.ceil(base * 1.2)
        }
        // 3) 重要 ×1.5
        if (task.important) {
          base = Math.ceil(base * 1.5)
        }
        // 4) 逾期完成 ×0.2（大幅惩罚，先乘后续再按时×1.3 不生效）
        const overdue = isTaskOverdueAtComplete(task, completedAt)
        if (overdue) {
          base = Math.ceil(base * 0.2)
        } else if (task.date) {
          // 按时（有日期且未逾期）×1.3
          base = Math.ceil(base * 1.3)
        }
        const delta = _applyDelta(base, 'taskComplete', task.id)
        // 徽章：累计完成任务数
        _badgeState.value.repeatCompletedCount =
          (Number(_badgeState.value.repeatCompletedCount) || 0) + (task.repeat ? 1 : 0)
        _tryRepeatBadge()
        _tryCategoryBalance(task)
        return delta
      }
      case 'subTaskComplete': {
        const { taskId } = payload
        return _applyDelta(0.5, 'subTaskComplete', taskId || null)
      }
      case 'pomodoroComplete': {
        const { deep, taskId } = payload
        const base = deep ? 5 : 3
        return _applyDelta(base, deep ? 'pomodoroDeep' : 'pomodoroComplete', taskId || null)
      }
      case 'taskCreate': {
        const { taskId } = payload
        return _applyDelta(0.2, 'taskCreate', taskId || null)
      }
      case 'streakBonus': {
        const { dayStreak } = payload
        const ds = Math.max(0, Math.floor(Number(dayStreak) || 0))
        // 规则：每 7 天发一次奖励，奖励值 min(30, ds)，≥30 时封顶（即连续 ≥30 天都可获 +30）
        if (ds < 7) return 0
        if (ds < 30 && ds % 7 !== 0) return 0
        const bonus = Math.min(30, ds) // 最多 +30
        return _applyDelta(bonus, `streakBonus:${ds}`)
      }
      case 'manualPenalty':
      case 'deleteIncompleteTask': {
        const { taskId, reason } = payload
        return _applyDelta(-2, reason || 'deleteIncompleteTask', taskId || null)
      }
      case 'overdueImportantEndOfDay': {
        const { taskId } = payload
        return _applyDelta(-3, 'overdueImportantEndOfDay', taskId || null)
      }
      case 'custom': {
        const { delta, reason, taskId } = payload
        return _applyDelta(Number(delta) || 0, reason || 'custom', taskId || null)
      }
      default:
        return 0
    }
  }

  // ===== 徽章：其他条件 =====
  const _tryRepeatBadge = () => {
    const achieved = new Set(badges.value.map((b) => b.id))
    const def = BADGE_DEFINITIONS.find((b) => b.id === 'repeat_99_done')
    if (def && !achieved.has(def.id) && _badgeState.value.repeatCompletedCount >= def.threshold) {
      badges.value.push({
        id: def.id,
        name: def.name,
        desc: def.desc,
        achievedAt: Date.now()
      })
    }
  }

  const _tryCategoryBalance = (task) => {
    if (!task || !task.category) return
    const counter = _badgeState.value.completedPerCategory || {}
    counter[task.category] = (counter[task.category] || 0) + 1
    _badgeState.value.completedPerCategory = counter
    const countAtLeast10 = Object.values(counter).filter((c) => c >= 10).length
    const achieved = new Set(badges.value.map((b) => b.id))
    const def = BADGE_DEFINITIONS.find((b) => b.id === 'balanced_category_distribution')
    if (def && !achieved.has(def.id) && countAtLeast10 >= def.threshold) {
      badges.value.push({
        id: def.id,
        name: def.name,
        desc: def.desc,
        achievedAt: Date.now()
      })
    }
  }

  const syncBadgesByStoreState = ({
    completedCount = 0,
    pomodoroMinutes = 0,
    dayStreak = 0,
    todayFocusMinutes = 0,
    noOverdueStreak = 0,
    aiModeMinutes = 0,
    daily10PlusStreak = 0
  } = {}) => {
    const achieved = new Set(badges.value.map((b) => b.id))
    const check = (id, flag) => {
      if (!flag) return
      const def = BADGE_DEFINITIONS.find((b) => b.id === id)
      if (!def || achieved.has(def.id)) return
      badges.value.push({
        id: def.id,
        name: def.name,
        desc: def.desc,
        achievedAt: Date.now()
      })
    }
    check('pomodoro_10k_minutes', pomodoroMinutes >= 10000)
    check('streak_30_days', dayStreak >= 30)
    check('tasks_1000_completed', completedCount >= 1000)
    check('streak_3_years', dayStreak >= 1095)
    check('focus_10_hours_straight', todayFocusMinutes >= 600)
    check('no_overdue_week', noOverdueStreak >= 7)
    check('ai_mode_100_hours', aiModeMinutes >= 6000)
    check('streak_7_days_10plus', daily10PlusStreak >= 7)
    debouncedSave()
    return badges.value.length
  }

  // ===== 钩子：订阅 taskStore / pomodoroStore 事件 =====
  // 兼容"软钩子"：若 store 没有暴露订阅接口，就用 watch 模式对比 diff
  const hookToStores = (taskStore, pomodoroStore, watchFn = null) => {
    if (!taskStore) return { ok: false }
    // ---- taskStore 钩子 ----
    // 1) 任务完成：如果任务有 activity，扫描新增 complete 条目；否则用 watch 对比
    let lastCompletedCount = -1
    const scanTaskCompletions = () => {
      if (!Array.isArray(taskStore.tasks)) return
      const completed = taskStore.tasks.filter((t) => t.completed)
      if (lastCompletedCount === -1) {
        lastCompletedCount = completed.length
        return
      }
      // 基于 activity.complete 记录的最新 at 精确匹配
      for (const task of taskStore.tasks) {
        if (!task.completed || !Array.isArray(task.activity)) continue
        const lastComplete = task.activity
          .filter((a) => a.type === 'complete')
          .sort((a, b) => b.at - a.at)[0]
        if (!lastComplete) continue
        // 如果日志中还没有该 taskId+reason+at≈ 则判定为新完成
        const keyMatch = karmaLog.value.find(
          (l) =>
            l.reason === 'taskComplete' &&
            l.taskId === task.id &&
            Math.abs((l.at || 0) - (lastComplete.at || 0)) < 5000
        )
        if (!keyMatch) {
          award('taskComplete', { task, completedAt: lastComplete.at })
        }
      }
      lastCompletedCount = completed.length
    }

    // 2) 子任务完成：基于每个任务 subTasks 状态 diff
    const subTaskSnapshot = new Map() // taskId -> Set(completedSubIds)
    const scanSubTaskCompletions = () => {
      if (!Array.isArray(taskStore.tasks)) return
      for (const task of taskStore.tasks) {
        if (!Array.isArray(task.subTasks)) continue
        const prev = subTaskSnapshot.get(task.id) || new Set()
        const curr = new Set(task.subTasks.filter((s) => s.completed).map((s) => s.id))
        for (const id of curr) {
          if (!prev.has(id)) {
            award('subTaskComplete', { taskId: task.id })
          }
        }
        subTaskSnapshot.set(task.id, curr)
      }
    }

    // 3) 删除未完成任务：用 tasks.length 粗差 + activity.delete 确认
    let lastDeleteSeenAt = 0
    const scanDeletions = () => {
      if (!Array.isArray(taskStore.tasks)) return
      for (const task of taskStore.tasks) {
        if (!Array.isArray(task.activity)) continue
        const lastDelete = task.activity
          .filter((a) => a.type === 'delete')
          .sort((a, b) => b.at - a.at)[0]
        if (
          lastDelete &&
          lastDelete.at > lastDeleteSeenAt &&
          !task.completed
        ) {
          lastDeleteSeenAt = lastDelete.at
          // 注意：任务还没被真正 splice，这里按约定触发扣分
          award('manualPenalty', { taskId: task.id, reason: 'deleteIncompleteTask' })
        }
      }
    }

    // ---- pomodoroStore 钩子 ----
    let lastSessionCount = -1
    const scanPomodoroSessions = () => {
      if (!pomodoroStore || !Array.isArray(pomodoroStore.sessionHistory)) return
      if (lastSessionCount === -1) {
        lastSessionCount = pomodoroStore.sessionHistory.length
        return
      }
      const history = pomodoroStore.sessionHistory
      for (let i = lastSessionCount; i < history.length; i++) {
        const h = history[i]
        if (h && h.mode === 'work') {
          award('pomodoroComplete', { deep: !!h.deep, taskId: h.taskId || null })
        }
      }
      lastSessionCount = history.length
    }

    const runAllScans = () => {
      try {
        scanTaskCompletions()
        scanSubTaskCompletions()
        scanDeletions()
        scanPomodoroSessions()
      } catch (e) {
        console.warn('[KarmaStore] hook scan error:', e)
      }
    }

    // 初次建立快照
    scanSubTaskCompletions()
    if (taskStore.tasks) {
      lastCompletedCount = taskStore.tasks.filter((t) => t.completed).length
    }
    if (pomodoroStore?.sessionHistory) {
      lastSessionCount = pomodoroStore.sessionHistory.length
    }

    // 绑定 watch：优先外部 watchFn，否则若 store 提供 watch 也 OK；退化到轮询（10s）
    let pollTimer = null
    if (typeof watchFn === 'function') {
      try {
        watchFn(
          () => [
            taskStore.tasks,
            pomodoroStore ? pomodoroStore.sessionHistory : [],
            pomodoroStore ? pomodoroStore.completedPomodoros : 0
          ],
          runAllScans,
          { deep: true }
        )
      } catch (e) {
        console.warn('[KarmaStore] watchFn failed, fallback to poll:', e)
      }
    }
    if (typeof window !== 'undefined' && !pollTimer) {
      pollTimer = setInterval(runAllScans, 10000)
    }

    return {
      ok: true,
      runAllScans,
      cleanup: () => {
        if (pollTimer) clearInterval(pollTimer)
      }
    }
  }

  // ===== 统计信息 =====
  const getKarmaStats = () => {
    refreshLevelFromKarma()
    const info = levelFromKarma(karma.value)
    const nextInfo =
      info.nextAt != null
        ? {
            nextLevel: info.level + 1,
            nextAt: info.nextAt,
            remaining: Math.max(0, info.nextAt - info.totalKarma)
          }
        : { nextLevel: null, nextAt: null, remaining: 0 }
    return {
      totalKarma: info.totalKarma,
      level: info.level,
      progressPct: info.progressPct,
      ...nextInfo,
      xpToday: xpToday.value,
      xpTodayCap: XP_DAILY_CAP,
      xpTodayRemaining: Math.max(0, XP_DAILY_CAP - xpToday.value),
      badgeCount: badges.value.length,
      recentBadges: badges.value.slice(-5).reverse(),
      recentLog: karmaLog.value.slice(-20).reverse(),
      levels: KARMA_LEVELS
    }
  }

  // 最近徽章（computed 暴露）
  const recentBadges = computed(() => badges.value.slice(-5).reverse())

  // ===== 初始化 =====
  const init = () => {
    loadFromStorage()
    refreshLevelFromKarma()
    ensureXpTodayFresh()
  }

  return {
    // state
    karma,
    level,
    xpToday,
    xpTodayDate,
    badges,
    karmaLog,
    fractionalKarma,
    recentBadges,
    // actions
    init,
    award,
    hookToStores,
    getKarmaStats,
    syncBadgesByStoreState,
    saveToStorage,
    debouncedSave,
    loadFromStorage,
    refreshLevelFromKarma,
    ensureXpTodayFresh
  }
})
