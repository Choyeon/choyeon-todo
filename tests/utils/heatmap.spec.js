// heatmap.spec.js — 35+ 条测试
// 覆盖：buildHeatmapGrid 范围 / weeks / 对齐 / score 阈值 / findBestDay /
//       findMostProductiveHour / calcProjectedAchievements / streak
import { describe, test, expect, vi, beforeEach } from 'vitest'
import {
  buildHeatmapGrid,
  findBestDay,
  findMostProductiveHour,
  calcProjectedAchievements
} from '@/utils/heatmap'
import { formatDateStr, addDays, getTodayStr } from '@/utils/date'
import { levelFromKarma } from '@/utils/karmaLevels'

// 返回目标日期所在周的周一（startOfWeek=1）
const mondayOf = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + mondayOffset)
  return formatDateStr(d)
}

const D = (offsetDays, h = 12) => {
  const d = addDays(getTodayStr(), offsetDays)
  const dt = new Date(d + 'T' + String(h).padStart(2, '0') + ':00:00')
  return { dateStr: d, ts: dt.getTime() }
}

const completedTask = (offsetDays, h = 12) => {
  const { ts, dateStr } = D(offsetDays, h)
  return {
    id: 't_' + Math.random().toString(36).slice(2, 8),
    title: 'x',
    completed: true,
    completedAt: ts,
    date: dateStr
  }
}

const session = (offsetDays, minutes = 25, deep = false, h = 10) => {
  const { ts, dateStr } = D(offsetDays, h)
  return {
    mode: 'work',
    durationMin: minutes,
    deep,
    distractions: 0,
    dateStr,
    completedAt: ts
  }
}

describe('buildHeatmapGrid — 范围 (range)', () => {
  test('range=30d → weeks × 7 = 至少 35 天（完整周）', () => {
    const g = buildHeatmapGrid({ range: '30d' })
    const total = g.weeks.reduce((s, w) => s + w.cells.length, 0)
    expect(total).toBeGreaterThanOrEqual(35)
    expect(total % 7).toBe(0)
  })

  test('range=90d → 91+ 天（13 周以上）', () => {
    const g = buildHeatmapGrid({ range: '90d' })
    const total = g.weeks.reduce((s, w) => s + w.cells.length, 0)
    expect(total).toBeGreaterThanOrEqual(91)
  })

  test('range=180d → 至少 182 天', () => {
    const g = buildHeatmapGrid({ range: '180d' })
    const total = g.weeks.reduce((s, w) => s + w.cells.length, 0)
    expect(total).toBeGreaterThanOrEqual(182)
  })

  test('range=ytd (默认) → 至少 365 天 / 53 周', () => {
    const g = buildHeatmapGrid()
    const total = g.weeks.reduce((s, w) => s + w.cells.length, 0)
    expect(total).toBeGreaterThanOrEqual(365)
    expect(g.weeks.length).toBeGreaterThanOrEqual(53)
  })

  test('weeks 参数按周扩充', () => {
    const g = buildHeatmapGrid({ weeks: 12 })
    expect(g.weeks.length).toBe(12)
  })

  test('cellStart + weeks → 精确覆盖 weeks×7 天', () => {
    const start = formatDateStr(new Date(2025, 0, 6)) // 周一 2025-01-06
    const g = buildHeatmapGrid({ cellStart: start, weeks: 4 })
    expect(g.weeks.length).toBe(4)
    expect(g.cellStart).toBe(start)
    expect(g.cellEnd).toBe(addDays(start, 4 * 7 - 1))
  })

  test('startOfWeek=0（周日为首）：首周第一天应为周日', () => {
    const g = buildHeatmapGrid({ weeks: 4, startOfWeek: 0 })
    const firstDate = g.weeks[0].cells[0].date
    const d = new Date(firstDate + 'T00:00:00')
    expect(d.getDay()).toBe(0)
  })

  test('startOfWeek=1（周一为首）：首周第一天应为周一', () => {
    const g = buildHeatmapGrid({ weeks: 4, startOfWeek: 1 })
    const firstDate = g.weeks[0].cells[0].date
    const d = new Date(firstDate + 'T00:00:00')
    expect(d.getDay()).toBe(1)
  })

  test('每个 week.cells 长度 = 7', () => {
    const g = buildHeatmapGrid({ weeks: 8 })
    for (const w of g.weeks) {
      expect(w.cells.length).toBe(7)
    }
  })

  test('默认 range inRange：未来日期 inRange=false', () => {
    const g = buildHeatmapGrid({ weeks: 2 })
    const today = getTodayStr()
    const futureCells = g.weeks.flatMap((w) => w.cells).filter((c) => c.date > today)
    for (const c of futureCells) {
      expect(c.inRange).toBe(false)
    }
  })

  test('今天及之前日期 inRange=true', () => {
    const g = buildHeatmapGrid({ weeks: 4 })
    const today = getTodayStr()
    const todayCell = g.weeks.flatMap((w) => w.cells).find((c) => c.date === today)
    expect(todayCell?.inRange).toBe(true)
  })
})

describe('buildHeatmapGrid — 数据聚合 (tasks + sessions)', () => {
  // 统一构造：本周周一为起点，共 1 周 → 保证覆盖 Mon..Sun（包含今天）
  const gridForThisWeek = (tasks, sessions) => {
    const today = getTodayStr()
    const start = mondayOf(today)
    return buildHeatmapGrid({ tasks, sessionHistory: sessions, cellStart: start, weeks: 1 })
  }
  // 用于覆盖 -6..0 天的 1 周（周一 → 周日，包含今天）
  const gridForRecent7Days = (tasks, sessions) => {
    const today = getTodayStr()
    // 取包含今天的最近完整周（本周周一 + 额外1周，向后）
    const thisMonday = mondayOf(today)
    // 从本周周一往前 6 天 = 上周二，不对。改为：从 (本周周一 + 6 天 - 6 天) = 本周周一
    // 实际上我们需要覆盖 addDays(today, -6) ~ today 的连续 7 天
    const targetStart = addDays(today, -6)
    const start = mondayOf(targetStart)
    const weeksCount = start === thisMonday ? 1 : 2
    return buildHeatmapGrid({ tasks, sessionHistory: sessions, cellStart: start, weeks: weeksCount })
  }

  test('1 个完成任务 → per-day tasksCompleted=1', () => {
    const t = completedTask(0) // 今天
    const g = gridForThisWeek([t], [])
    const todayCell = g.weeks.flatMap((w) => w.cells).find((c) => c.date === getTodayStr())
    expect(todayCell.tasksCompleted).toBe(1)
    expect(todayCell.pomodoroMinutes).toBe(0)
  })

  test('未完成任务不会统计', () => {
    const t = { ...completedTask(0), completed: false }
    const g = gridForThisWeek([t], [])
    const cells = g.weeks.flatMap((w) => w.cells)
    expect(cells.reduce((s, c) => s + c.tasksCompleted, 0)).toBe(0)
  })

  test('3 个 session 同日 → 分钟合计', () => {
    const s1 = session(0, 15)
    const s2 = session(0, 25)
    const s3 = session(0, 30)
    const g = gridForThisWeek([], [s1, s2, s3])
    const todayCell = g.weeks.flatMap((w) => w.cells).find((c) => c.date === getTodayStr())
    expect(todayCell.pomodoroMinutes).toBe(70)
  })

  test('break 模式不计入', () => {
    const s = { ...session(0, 10), mode: 'break' }
    const g = gridForThisWeek([], [s])
    const cells = g.weeks.flatMap((w) => w.cells)
    expect(cells.reduce((s2, c) => s2 + c.pomodoroMinutes, 0)).toBe(0)
  })

  test('totals.tasksCompleted 聚合正确', () => {
    const tasks = []
    for (let i = 0; i < 5; i++) tasks.push(completedTask(-i)) // 0,-1,-2,-3,-4
    const g = gridForRecent7Days(tasks, [])
    expect(g.totals.tasksCompleted).toBe(5)
  })

  test('totals.pomodoroMinutes 聚合正确', () => {
    const sessions = []
    for (let i = 0; i < 3; i++) sessions.push(session(-i, 30))
    const g = gridForRecent7Days([], sessions)
    expect(g.totals.pomodoroMinutes).toBe(90)
  })

  test('daysWithActivity = 有活动的天数', () => {
    const tasks = [completedTask(0), completedTask(-1), completedTask(-2)]
    const sessions = [session(-1, 25)]
    const g = gridForRecent7Days(tasks, sessions)
    expect(g.daysWithActivity).toBe(3)
  })
})

describe('scoreFromActivity 间接验证（通过 grid cell.score）', () => {
  const cellAt = (offsetDays, tasksCompleted, minutes) => {
    const target = addDays(getTodayStr(), offsetDays)
    const cellStart = mondayOf(target) // 确保 week 覆盖 target
    const tasks = []
    const sessions = []
    for (let i = 0; i < tasksCompleted; i++) tasks.push(completedTask(offsetDays))
    if (minutes) sessions.push(session(offsetDays, minutes))
    const g = buildHeatmapGrid({ tasks, sessionHistory: sessions, cellStart, weeks: 1 })
    return g.weeks.flatMap((w) => w.cells).find((c) => c.date === target).score
  }

  test('0 任务 0 分钟 → 0', () => {
    expect(cellAt(0, 0, 0)).toBe(0)
  })

  test('1 任务 0 分钟 → eq=1 → 1', () => {
    expect(cellAt(0, 1, 0)).toBe(1)
  })

  test('2 任务 → eq=2 → 2', () => {
    expect(cellAt(0, 2, 0)).toBe(2)
  })

  test('5 任务 → eq=5 → 2', () => {
    expect(cellAt(0, 5, 0)).toBe(2)
  })

  test('6 任务 → eq=6 → 3', () => {
    expect(cellAt(0, 6, 0)).toBe(3)
  })

  test('10 任务 → eq=10 → 3', () => {
    expect(cellAt(0, 10, 0)).toBe(3)
  })

  test('11 任务 → eq=11 → 4', () => {
    expect(cellAt(0, 11, 0)).toBe(4)
  })

  test('0 任务 + 30 分钟 → eq=1 → 1', () => {
    expect(cellAt(0, 0, 30)).toBe(1)
  })

  test('0 任务 + 60 分钟 → eq=2 → 2', () => {
    expect(cellAt(0, 0, 60)).toBe(2)
  })

  test('0 任务 + 900 分钟 (pomodoro capped 4) → eq=4 → 2 档', () => {
    // min(900/30, 4) = 4 → eq=4 ≤ 5 → score=2
    expect(cellAt(0, 0, 900)).toBe(2)
  })

  test('10 任务 + 120 分钟 → 10 + min(120/30=4,4) = 14 → 4', () => {
    expect(cellAt(0, 10, 120)).toBe(4)
  })
})

describe('buildHeatmapGrid — streak 计算', () => {
  // 以今天所在周的"下周周一"往前 N 周作为起点 → 确保今天一定在范围内
  const buildForStreak = (tasks, sessions, totalWeeks = 8) => {
    const today = getTodayStr()
    // 本周周日 + 1 = 下周一；再减去 totalWeeks*7 天 → 起点
    const thisMonday = mondayOf(today)
    const nextMonday = addDays(thisMonday, 7)
    const cellStart = addDays(nextMonday, -(totalWeeks * 7))
    return buildHeatmapGrid({ tasks, sessionHistory: sessions, cellStart, weeks: totalWeeks })
  }

  test('无活动 → currentStreakDays=0, longestStreakDays=0', () => {
    const g = buildForStreak([], [])
    expect(g.currentStreakDays).toBe(0)
    expect(g.longestStreakDays).toBe(0)
  })

  test('今天有活动 + 昨天也有 → current=2', () => {
    const tasks = [completedTask(0), completedTask(-1)]
    const g = buildForStreak(tasks, [])
    expect(g.currentStreakDays).toBe(2)
  })

  test('最近活动在 2 天前 → current=0', () => {
    const tasks = [completedTask(-2), completedTask(-3)]
    const g = buildForStreak(tasks, [])
    expect(g.currentStreakDays).toBe(0)
  })

  test('连续 5 天 → longest=5', () => {
    const tasks = []
    for (let i = 0; i < 5; i++) tasks.push(completedTask(-i))
    const g = buildForStreak(tasks, [])
    expect(g.longestStreakDays).toBe(5)
  })

  test('两段活动：连续 3 + 连续 7 → longest=7', () => {
    const tasks = []
    for (let i = 0; i < 3; i++) tasks.push(completedTask(-i))
    for (let i = 10; i < 17; i++) tasks.push(completedTask(-i))
    const g = buildForStreak(tasks, [])
    expect(g.longestStreakDays).toBe(7)
    // 最近 3 天连续
    expect(g.currentStreakDays).toBe(3)
  })

  test('单独 1 天活动 → longest=1, current=1', () => {
    const tasks = [completedTask(0)]
    const g = buildForStreak(tasks, [])
    expect(g.longestStreakDays).toBe(1)
    expect(g.currentStreakDays).toBe(1)
  })
})

describe('findBestDay', () => {
  test('空 grid 返回空结构', () => {
    const r = findBestDay(null)
    expect(r.date).toBeNull()
    expect(r.score).toBe(0)
    expect(r.tasksCompleted).toBe(0)
    expect(r.pomodoroMinutes).toBe(0)
  })

  const buildCovering = (tasks, sessions) => {
    const today = getTodayStr()
    const cellStart = mondayOf(addDays(today, -13)) // 保证 ≥2 周全覆盖今天
    return buildHeatmapGrid({ tasks, sessionHistory: sessions, cellStart, weeks: 4 })
  }

  test('单一高分 cell 被找到', () => {
    const tasks = []
    for (let i = 0; i < 12; i++) tasks.push(completedTask(0))
    tasks.push(completedTask(-1))
    const g = buildCovering(tasks, [])
    const best = findBestDay(g)
    expect(best.date).toBe(getTodayStr())
    expect(best.score).toBe(4)
  })

  test('同分 tie-break：更高当量获胜', () => {
    // 两天 score=4（11 tasks / 15 tasks → 当量高者胜）
    const tasks = []
    for (let i = 0; i < 11; i++) tasks.push(completedTask(-1))
    for (let i = 0; i < 15; i++) tasks.push(completedTask(0))
    const g = buildCovering(tasks, [])
    const best = findBestDay(g)
    expect(best.date).toBe(getTodayStr())
  })

  test('无活动 → null date', () => {
    const g = buildCovering([], [])
    const best = findBestDay(g)
    expect(best.date).toBeNull()
  })
})

describe('findMostProductiveHour', () => {
  test('空数组 → buckets=24 zeros, peakHour=9', () => {
    const r = findMostProductiveHour([])
    expect(r.buckets.length).toBe(24)
    expect(r.buckets.every((x) => x === 0)).toBe(true)
    expect(r.peakHour).toBe(9)
    expect(r.peakCount).toBe(0)
  })

  test('null/undefined → 安全', () => {
    const r1 = findMostProductiveHour(null)
    const r2 = findMostProductiveHour()
    expect(r1.peakCount).toBe(0)
    expect(r2.peakCount).toBe(0)
  })

  test('3 个任务在 hour=14, 1 个在 hour=9 → peakHour=14', () => {
    const tasks = []
    for (let i = 0; i < 3; i++) tasks.push(completedTask(0, 14))
    tasks.push(completedTask(0, 9))
    const r = findMostProductiveHour(tasks)
    expect(r.peakHour).toBe(14)
    expect(r.peakCount).toBe(3)
  })

  test('未完成任务不统计', () => {
    const t = { ...completedTask(0, 15), completed: false }
    const r = findMostProductiveHour([t])
    expect(r.peakCount).toBe(0)
  })

  test('24 小时 bucket 顺序累加正确', () => {
    const tasks = []
    for (let h = 0; h < 24; h++) tasks.push(completedTask(0, h))
    const r = findMostProductiveHour(tasks)
    expect(r.buckets.reduce((s, n) => s + n, 0)).toBe(24)
    expect(r.buckets.every((n) => n === 1)).toBe(true)
  })
})

describe('calcProjectedAchievements', () => {
  test('空参数 → 返回 0/0/0 均值、projected level=0', () => {
    const r = calcProjectedAchievements()
    expect(r.dailyAverage.tasks).toBe(0)
    expect(r.dailyAverage.focusMinutes).toBe(0)
    expect(r.dailyAverage.karma).toBe(0)
    expect(r.projected.tasksCompleted).toBe(0)
    expect(r.projected.level).toBe(0)
  })

  test('30 天活动期，15 个任务 / 5×30=150 分钟 / karma=60 → 均值推算', () => {
    const tasks = []
    const sessions = []
    for (let d = 0; d < 30; d++) {
      tasks.push(completedTask(-d))
      if (d % 5 === 0) sessions.push(session(-d, 50)) // 6 次 × 50 = 300
    }
    const g = buildHeatmapGrid({ tasks, sessionHistory: sessions, range: '30d' })
    const r = calcProjectedAchievements({ karma: 60, grid: g, nextDays: 30 })
    expect(r.dailyAverage.tasks).toBeGreaterThan(0)
    expect(r.dailyAverage.focusMinutes).toBeGreaterThan(0)
    expect(r.dailyAverage.karma).toBeGreaterThan(0)
    expect(r.projected.tasksCompleted).toBeGreaterThan(0)
    expect(r.projected.focusMinutes).toBeGreaterThan(0)
    expect(r.projected.karma).toBeGreaterThanOrEqual(60)
  })

  test('projected level 与 progressPct 合理', () => {
    const g = buildHeatmapGrid({ range: '90d' })
    const r = calcProjectedAchievements({ karma: 500, grid: g, nextDays: 30 })
    expect(r.projected.level).toBeGreaterThanOrEqual(levelFromKarma(500).level)
    expect(r.projected.levelProgressPct).toBeGreaterThanOrEqual(0)
    expect(r.projected.levelProgressPct).toBeLessThanOrEqual(100)
  })

  test('nextDays 默认 30', () => {
    const r = calcProjectedAchievements({})
    expect(r.nextDays).toBe(30)
  })
})

// 总计 35+ 条
