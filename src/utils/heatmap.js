// 热力图工具：构建 GitHub 风格网格 + 辅助统计
//   核心 API：buildHeatmapGrid / findBestDay / findMostProductiveHour / calcProjectedAchievements

import { parseDateStr, formatDateStr, addDays, getTodayStr } from './date'
import { levelFromKarma as _levelFromKarma } from './karmaLevels'

// ===== 内部：日期工具 =====
const rangeDaysCount = (range) => {
  switch (range) {
    case '30d':
      return 30
    case '90d':
      return 90
    case '180d':
      return 180
    case 'ytd':
    default:
      return 365
  }
}

// 根据 weeks 与 cellStart/end 对齐周边界（startOfWeek: 1=周一, 0=周日）
const alignWeekStart = (dateStr, startOfWeek = 1) => {
  const d = parseDateStr(dateStr)
  let day = d.getDay() // 0=Sun...6=Sat
  if (startOfWeek === 1) {
    day = day === 0 ? 6 : day - 1 // 周一为首的偏移
  }
  d.setDate(d.getDate() - day)
  return formatDateStr(d)
}

// 分数档位（0..4）：基于"任务完成当量" + 番茄分钟折算
//   当量 = tasksCompleted + Math.min(pomodoroMinutes / 30, 4)
//   5 档：0, 0-1, 2-5, 6-10, >10
const scoreFromActivity = (tasksCompleted, pomodoroMinutes) => {
  const tc = Math.max(0, Number(tasksCompleted) || 0)
  const pm = Math.max(0, Number(pomodoroMinutes) || 0)
  const eq = tc + Math.min(pm / 30, 4)
  if (eq <= 0) return 0
  if (eq <= 1) return 1
  if (eq <= 5) return 2
  if (eq <= 10) return 3
  return 4
}

// ===== 主 API：buildHeatmapGrid =====
export const buildHeatmapGrid = ({
  tasks = [],
  sessionHistory = [],
  range = 'ytd',
  cellStart = null,
  weeks = null,
  startOfWeek = 1
} = {}) => {
  // 1) 确定天数范围
  const today = getTodayStr()
  let endDate = today
  let dayCount
  if (cellStart) {
    // 使用显式起始 + weeks 优先
    if (weeks && weeks > 0) {
      dayCount = weeks * 7
      endDate = addDays(cellStart, dayCount - 1)
    } else {
      const delta = Math.round((parseDateStr(today) - parseDateStr(cellStart)) / 86400000)
      dayCount = Math.max(7, Math.min(365 * 3, delta + 1))
    }
  } else {
    // 若显式传了 weeks，则以"本周最后一天（按 startOfWeek）"作为 end 锚点向前对齐，
    // 保证今天永远落在 grid 最后一周内；否则走 range 默认天数
    if (weeks && weeks > 0) {
      dayCount = weeks * 7
      // endDate 对齐到 startOfWeek 的"周末"：
      // startOfWeek=1 (Mon首) → 周日为末；startOfWeek=0 (Sun首) → 周六为末
      const endD = parseDateStr(endDate) // today
      const dow = endD.getDay()
      const offsetToWeekend = startOfWeek === 1
        ? (dow === 0 ? 0 : 7 - dow)          // Mon首: 到下一个周六/周日
        : (6 - dow + 7) % 7                 // Sun首: 到下一个周六
      endDate = formatDateStr(new Date(endD.valueOf() + offsetToWeekend * 86400000))
      cellStart = addDays(endDate, -(dayCount - 1))
      // 再把 cellStart 对齐到 startOfWeek
      cellStart = alignWeekStart(cellStart, startOfWeek)
      // 重新根据对齐后的 cellStart 计算 dayCount
      dayCount = weeks * 7
      endDate = addDays(cellStart, dayCount - 1)
    } else {
      dayCount = rangeDaysCount(range)
      const weeksComputed = Math.ceil(dayCount / 7)
      dayCount = weeksComputed * 7
      const rawStart = addDays(endDate, -(dayCount - 1))
      cellStart = alignWeekStart(rawStart, startOfWeek)
      endDate = addDays(cellStart, dayCount - 1)
    }
  }
  // 重新按 cellStart→endDate 计算实际周数
  const totalDays = Math.max(
    1,
    Math.round((parseDateStr(endDate) - parseDateStr(cellStart)) / 86400000) + 1
  )
  const totalWeeks = Math.ceil(totalDays / 7)

  // 2) 聚合 tasks 每日完成数
  const perDayTasks = new Map() // dateStr -> count
  if (Array.isArray(tasks)) {
    for (const t of tasks) {
      if (!t || !t.completed) continue
      const ts = t.completedAt || t.updatedAt || t.createdAt
      if (!ts) continue
      const dStr = formatDateStr(new Date(ts))
      if (dStr < cellStart || dStr > endDate) continue
      perDayTasks.set(dStr, (perDayTasks.get(dStr) || 0) + 1)
    }
  }

  // 3) 聚合 sessionHistory 每日 work 专注分钟
  const perDayMinutes = new Map()
  if (Array.isArray(sessionHistory)) {
    for (const h of sessionHistory) {
      if (!h || h.mode !== 'work') continue
      const dStr =
        h.dateStr ||
        (h.at ? formatDateStr(new Date(h.at)) : null) ||
        (h.completedAt ? formatDateStr(new Date(h.completedAt)) : null)
      if (!dStr || dStr < cellStart || dStr > endDate) continue
      perDayMinutes.set(dStr, (perDayMinutes.get(dStr) || 0) + (Number(h.durationMin) || 0))
    }
  }

  // 4) 生成 cells：按 totalWeeks × 7 遍历
  const weeksArr = []
  let daysWithActivity = 0
  let totalTasks = 0
  let totalMinutes = 0
  const activitySet = [] // 标记是否有活动（用于 streak 计算）

  for (let w = 0; w < totalWeeks; w++) {
    const weekStart = addDays(cellStart, w * 7)
    const cells = []
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i)
      // 超出范围（可能 totalDays 不能整除 7 之前已扩充，此段保持完整周）
      const tc = perDayTasks.get(d) || 0
      const pm = perDayMinutes.get(d) || 0
      const score = scoreFromActivity(tc, pm)
      const hasActivity = tc > 0 || pm > 0
      if (hasActivity) {
        daysWithActivity++
        activitySet.push(d)
      }
      totalTasks += tc
      totalMinutes += pm
      cells.push({
        date: d,
        tasksCompleted: tc,
        pomodoroMinutes: pm,
        score,
        inRange: d <= today
      })
    }
    weeksArr.push({ weekStart, cells })
  }

  // 5) Streak：当前连续天 + 历史最长连续天（去重，避免同日多条记录打散 streak）
  const uniqueDays = Array.from(new Set(activitySet)).sort()
  let currentStreakDays = 0
  let longestStreakDays = 0
  if (uniqueDays.length > 0) {
    // 最长 streak
    let streak = 1
    longestStreakDays = 1
    for (let i = 1; i < uniqueDays.length; i++) {
      if (addDays(uniqueDays[i - 1], 1) === uniqueDays[i]) {
        streak++
        if (streak > longestStreakDays) longestStreakDays = streak
      } else {
        streak = 1
      }
    }
    // 当前 streak：从今天往回数
    let cursor = today
    while (uniqueDays.includes(cursor)) {
      currentStreakDays++
      cursor = addDays(cursor, -1)
    }
  }

  return {
    weeks: weeksArr,
    cellStart,
    cellEnd: endDate,
    range,
    startOfWeek,
    totals: {
      tasksCompleted: totalTasks,
      pomodoroMinutes: totalMinutes,
      daysTotal: totalWeeks * 7,
      daysWithActivity
    },
    daysWithActivity,
    currentStreakDays,
    longestStreakDays
  }
}

// ===== findBestDay(grid)：返回最高活动量的一天（无活动时返回 null）=====
export const findBestDay = (grid) => {
  if (!grid || !Array.isArray(grid.weeks)) {
    return { date: null, tasksCompleted: 0, pomodoroMinutes: 0, score: 0 }
  }
  let best = null
  let bestScore = -1
  let bestEquivalent = -1
  for (const week of grid.weeks) {
    for (const cell of week.cells) {
      if (!cell.inRange) continue
      const eq = cell.tasksCompleted + (Number(cell.pomodoroMinutes) || 0) / 30
      if (cell.score > bestScore) {
        bestScore = cell.score
        bestEquivalent = eq
        best = cell
      } else if (cell.score === bestScore && eq > bestEquivalent) {
        bestEquivalent = eq
        best = cell
      }
    }
  }
  // 无活动：score 全为 0 且 当量为 0 → 返回 null
  if (!best || (bestScore === 0 && bestEquivalent <= 0)) {
    return { date: null, tasksCompleted: 0, pomodoroMinutes: 0, score: 0 }
  }
  return { ...best }
}

// ===== findMostProductiveHour(tasks)：24 小时 bucket 直方图 =====
export const findMostProductiveHour = (tasks = []) => {
  const buckets = new Array(24).fill(0)
  if (!Array.isArray(tasks)) return { buckets, peakHour: 9, peakCount: 0 }
  for (const t of tasks) {
    if (!t || !t.completed) continue
    const ts = t.completedAt || t.updatedAt || t.createdAt
    if (!ts) continue
    const d = new Date(ts)
    const h = d.getHours()
    if (h >= 0 && h <= 23) buckets[h]++
  }
  let peakHour = 9
  let peakCount = 0
  for (let h = 0; h < 24; h++) {
    if (buckets[h] > peakCount) {
      peakCount = buckets[h]
      peakHour = h
    }
  }
  return { buckets, peakHour, peakCount }
}

// ===== calcProjectedAchievements：简单线性回归预测 =====
export const calcProjectedAchievements = ({
  karma = 0,
  grid = null,
  focusSummary = null,
  nextDays = 30
} = {}) => {
  // 1) 从 grid 的 totals 反推出历史每日均值
  let dailyTasksAvg = 0
  let dailyMinutesAvg = 0
  let daysObserved = 1
  if (grid && grid.totals) {
    // 只按有活动的天数 + 最少 7 天做分母，避免全空时 0
    daysObserved = Math.max(1, grid.daysWithActivity || 7)
    dailyTasksAvg = grid.totals.tasksCompleted / daysObserved
    dailyMinutesAvg = grid.totals.pomodoroMinutes / daysObserved
  }
  // focusSummary 如果提供，优先更精确：
  if (focusSummary && typeof focusSummary.totalMinutes === 'number') {
    // last7 / last30 分别取对应天数
    let days = 1
    if (focusSummary && typeof focusSummary.tasksCompleted === 'number') {
      // 不直接依赖，保持 grid 优先
    }
  }

  // 2) Karma 每任务 + 番茄平均估算分：取历史 karma / 活动日
  const dailyKarmaAvg = (Number(karma) || 0) / Math.max(1, daysObserved)

  // 3) 下月预测 = 均值 × nextDays
  const projectedTasks = Math.round(dailyTasksAvg * nextDays)
  const projectedFocusMinutes = Math.round(dailyMinutesAvg * nextDays)
  const projectedKarma = Math.round(dailyKarmaAvg * nextDays) + (Number(karma) || 0)

  // 4) 等级预测
  let projectedLevel = 0
  let projectedProgressPct = 0
  const info = _levelFromKarma(projectedKarma)
  projectedLevel = info.level
  projectedProgressPct = info.progressPct

  return {
    nextDays,
    dailyAverage: {
      tasks: Math.round(dailyTasksAvg * 100) / 100,
      focusMinutes: Math.round(dailyMinutesAvg * 100) / 100,
      karma: Math.round(dailyKarmaAvg * 100) / 100
    },
    projected: {
      tasksCompleted: projectedTasks,
      focusMinutes: projectedFocusMinutes,
      karma: projectedKarma,
      level: projectedLevel,
      levelProgressPct: projectedProgressPct
    }
  }
}
