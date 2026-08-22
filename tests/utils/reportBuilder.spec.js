// reportBuilder.spec.js — 25+ 条测试
// 覆盖：buildWeeklyReport / buildMonthlyReport 结构、i18n、统计数值、建议、同比上月
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { buildWeeklyReport, buildMonthlyReport } from '@/utils/reportBuilder'
import { formatDateStr, addDays, getTodayStr } from '@/utils/date'

const todayISO = () => getTodayStr()

const mkTask = (opts = {}) => {
  const offsetDays = opts.offsetDays ?? 0
  const completedOffset = opts.completedOffset ?? offsetDays
  const dateStr = addDays(todayISO(), offsetDays)
  const completedAt = new Date(dateStr + 'T14:00:00').getTime()
  const createdAt = new Date(addDays(todayISO(), offsetDays - 1) + 'T10:00:00').getTime()
  return {
    id: 't_' + Math.random().toString(36).slice(2, 8),
    title: 'task',
    category: opts.category ?? 'work',
    priority: opts.priority ?? 4,
    important: opts.important ?? false,
    date: dateStr,
    time: opts.time ?? null,
    repeat: opts.repeat ?? false,
    completed: opts.completed ?? true,
    completedAt,
    createdAt,
    areaId: opts.areaId ?? null,
    listId: opts.listId ?? null,
    ...(opts.extra ?? {})
  }
}

// 获取本周周一 ISO
const getMonday = (iso = todayISO()) => {
  const d = new Date(iso + 'T00:00:00')
  const day = d.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + mondayOffset)
  return formatDateStr(d)
}

const taskInWeek = (weekday, extra = {}) => {
  // weekday: 0=Mon ... 6=Sun
  const monday = getMonday()
  const target = addDays(monday, weekday)
  const diffDays = Math.round(
    (new Date(target + 'T00:00:00').getTime() - new Date(todayISO() + 'T00:00:00').getTime()) /
      86400000
  )
  return mkTask({ offsetDays: diffDays, completedOffset: diffDays, ...extra })
}

const mockStores = ({ tasks = [], sessions = [], categories = [], areas = [], lists = [], karma = 0, karmaLog = [] } = {}) => {
  const taskStore = { tasks, categories, areas, lists }
  const pomodoroStore = { sessionHistory: sessions }
  const karmaStore = { karma, karmaLog }
  return { taskStore, pomodoroStore, karmaStore }
}

describe('buildWeeklyReport — 基础结构', () => {
  test('返回 {data, markdown}', () => {
    const { taskStore, pomodoroStore, karmaStore } = mockStores()
    const r = buildWeeklyReport({ taskStore, pomodoroStore, karmaStore })
    expect(r).toHaveProperty('data')
    expect(r).toHaveProperty('markdown')
    expect(typeof r.markdown).toBe('string')
    expect(r.markdown.length).toBeGreaterThan(0)
  })

  test('data.type=weekly + lang=zh-CN（默认）', () => {
    const { taskStore, pomodoroStore, karmaStore } = mockStores()
    const r = buildWeeklyReport({ taskStore, pomodoroStore, karmaStore })
    expect(r.data.type).toBe('weekly')
    expect(r.data.lang).toBe('zh-CN')
  })

  test('dateRange: start 为周一、end 为周日（7 天）', () => {
    const { taskStore, pomodoroStore, karmaStore } = mockStores()
    const r = buildWeeklyReport({ taskStore, pomodoroStore, karmaStore })
    const monday = getMonday()
    const sunday = addDays(monday, 6)
    expect(r.data.dateRange.start).toBe(monday)
    expect(r.data.dateRange.end).toBe(sunday)
  })

  test('指定 weekStartISO → 返回该周范围', () => {
    const { taskStore, pomodoroStore, karmaStore } = mockStores()
    const r = buildWeeklyReport({
      weekStartISO: '2025-06-11', // 周三 → 取该周周一 2025-06-09
      taskStore,
      pomodoroStore,
      karmaStore
    })
    expect(r.data.dateRange.start).toBe('2025-06-09')
    expect(r.data.dateRange.end).toBe('2025-06-15')
  })

  test('stats 对象具有 required keys', () => {
    const { taskStore, pomodoroStore, karmaStore } = mockStores()
    const r = buildWeeklyReport({ taskStore, pomodoroStore, karmaStore })
    const s = r.data.stats
    for (const k of [
      'completedCount',
      'createdCount',
      'overdueCompletedCount',
      'onTimeCompletedCount',
      'onTimeRate',
      'overdueRate',
      'highOverdueRate',
      'focusMinutes',
      'focusSessions',
      'distractionRate',
      'deepFocusMinutes',
      'byCategory',
      'byPriority'
    ]) {
      expect(s).toHaveProperty(k)
    }
  })

  test('空数据：stats 为 0 / 空数组', () => {
    const { taskStore, pomodoroStore, karmaStore } = mockStores()
    const r = buildWeeklyReport({ taskStore, pomodoroStore, karmaStore })
    expect(r.data.stats.completedCount).toBe(0)
    expect(r.data.stats.createdCount).toBe(0)
    expect(r.data.stats.focusMinutes).toBe(0)
    expect(r.data.stats.byCategory).toEqual([])
  })
})

describe('buildWeeklyReport — 统计正确性', () => {
  test('5 个本周完成任务 → completedCount=5', () => {
    const tasks = []
    for (let i = 0; i < 5; i++) tasks.push(taskInWeek(i))
    const { taskStore, pomodoroStore, karmaStore } = mockStores({ tasks })
    const r = buildWeeklyReport({ taskStore, pomodoroStore, karmaStore })
    expect(r.data.stats.completedCount).toBe(5)
  })

  test('本周未完成任务不计入 completedCount', () => {
    const tasks = [taskInWeek(0, { completed: false }), taskInWeek(1)]
    const { taskStore, pomodoroStore, karmaStore } = mockStores({ tasks })
    const r = buildWeeklyReport({ taskStore, pomodoroStore, karmaStore })
    expect(r.data.stats.completedCount).toBe(1)
  })

  test('上周完成任务不计入本周 completedCount', () => {
    const tasks = [taskInWeek(-7)] // 上周一
    const { taskStore, pomodoroStore, karmaStore } = mockStores({ tasks })
    const r = buildWeeklyReport({ taskStore, pomodoroStore, karmaStore })
    expect(r.data.stats.completedCount).toBe(0)
  })

  test('逾期完成任务：date 上周，completedAt 本周', () => {
    const t = taskInWeek(2)
    // 把 date 改为上周某日
    const prevWeek = addDays(getMonday(), -2)
    t.date = prevWeek
    const { taskStore, pomodoroStore, karmaStore } = mockStores({ tasks: [t] })
    const r = buildWeeklyReport({ taskStore, pomodoroStore, karmaStore })
    expect(r.data.stats.completedCount).toBe(1)
    expect(r.data.stats.overdueCompletedCount).toBe(1)
    expect(r.data.stats.onTimeCompletedCount).toBe(0)
    expect(r.data.stats.onTimeRate).toBe(0)
  })

  test('按时完成 onTimeRate=100%', () => {
    const tasks = [taskInWeek(1), taskInWeek(2), taskInWeek(3)]
    const { taskStore, pomodoroStore, karmaStore } = mockStores({ tasks })
    const r = buildWeeklyReport({ taskStore, pomodoroStore, karmaStore })
    expect(r.data.stats.onTimeRate).toBe(100)
    expect(r.data.stats.overdueRate).toBe(0)
  })

  test('重要且逾期 → importantOverdueCompleted=1', () => {
    const t = taskInWeek(3, { important: true })
    t.date = addDays(getMonday(), -3) // 延期
    const { taskStore, pomodoroStore, karmaStore } = mockStores({ tasks: [t] })
    const r = buildWeeklyReport({ taskStore, pomodoroStore, karmaStore })
    expect(r.data.stats.importantOverdueCompleted).toBe(1)
  })

  test('番茄统计：3 次 work session，每次 25 分钟，总计 75 min', () => {
    const monday = getMonday()
    const sessions = []
    for (let i = 0; i < 3; i++) {
      const d = addDays(monday, i)
      sessions.push({
        mode: 'work',
        durationMin: 25,
        dateStr: d,
        completedAt: new Date(d + 'T10:00:00').getTime()
      })
    }
    const { taskStore, pomodoroStore, karmaStore } = mockStores({ sessions })
    const r = buildWeeklyReport({ taskStore, pomodoroStore, karmaStore })
    expect(r.data.stats.focusSessions).toBe(3)
    expect(r.data.stats.focusMinutes).toBe(75)
  })

  test('deep session 计入 deepFocusMinutes', () => {
    const monday = getMonday()
    const d = addDays(monday, 1)
    const sessions = [
      { mode: 'work', durationMin: 30, deep: true, dateStr: d, distractions: 0 },
      { mode: 'work', durationMin: 25, deep: false, dateStr: d, distractions: 0 }
    ]
    const { taskStore, pomodoroStore, karmaStore } = mockStores({ sessions })
    const r = buildWeeklyReport({ taskStore, pomodoroStore, karmaStore })
    expect(r.data.stats.deepFocusMinutes).toBe(30)
    expect(r.data.stats.focusMinutes).toBe(55)
  })

  test('distractionRate = distractions/focusMinutes (上限1)', () => {
    const monday = getMonday()
    const sessions = [
      { mode: 'work', durationMin: 100, dateStr: monday, distractions: 30 } // 30/100=0.3
    ]
    const { taskStore, pomodoroStore, karmaStore } = mockStores({ sessions })
    const r = buildWeeklyReport({ taskStore, pomodoroStore, karmaStore })
    expect(r.data.stats.distractionRate).toBeCloseTo(0.3, 3)
  })

  test('byCategory: 两个分类正确分配 completed 数', () => {
    const tasks = [
      taskInWeek(0, { category: 'work' }),
      taskInWeek(1, { category: 'work' }),
      taskInWeek(2, { category: 'study' })
    ]
    const categories = [
      { id: 'work', name: '工作', color: '#111' },
      { id: 'study', name: '学习', color: '#222' }
    ]
    const { taskStore, pomodoroStore, karmaStore } = mockStores({ tasks, categories })
    const r = buildWeeklyReport({ taskStore, pomodoroStore, karmaStore })
    const work = r.data.stats.byCategory.find((c) => c.id === 'work')
    const study = r.data.stats.byCategory.find((c) => c.id === 'study')
    expect(work.completed).toBe(2)
    expect(study.completed).toBe(1)
    expect(work.name).toBe('工作')
  })

  test('byPriority: P0 1, P4 2', () => {
    const tasks = [
      taskInWeek(0, { priority: 0 }),
      taskInWeek(1, { priority: 4 }),
      taskInWeek(2, { priority: 4 })
    ]
    const { taskStore, pomodoroStore, karmaStore } = mockStores({ tasks })
    const r = buildWeeklyReport({ taskStore, pomodoroStore, karmaStore })
    expect(r.data.stats.byPriority.P0).toBe(1)
    expect(r.data.stats.byPriority.P4).toBe(2)
    expect(r.data.stats.byPriority.P1).toBe(0)
  })
})

describe('buildWeeklyReport — 建议建议逻辑 (suggestions)', () => {
  test('默认（空数据）至少 4 条建议', () => {
    const { taskStore, pomodoroStore, karmaStore } = mockStores()
    const r = buildWeeklyReport({ taskStore, pomodoroStore, karmaStore })
    expect(r.data.suggestions.length).toBeGreaterThanOrEqual(4)
  })

  test('highOverdueRate > 30% → 包含 highOverdue 建议', () => {
    const tasks = []
    // 完成 5 条，但 4 条是 high priority overdue（P0 逾期）
    for (let i = 0; i < 5; i++) {
      const t = taskInWeek(i, { priority: 0 })
      t.date = addDays(getMonday(), -3) // 逾期
      tasks.push(t)
    }
    const { taskStore, pomodoroStore, karmaStore } = mockStores({ tasks })
    const r = buildWeeklyReport({ taskStore, pomodoroStore, karmaStore })
    // 高逾期建议会提到 30% → 用数字匹配
    const hasHigh = r.data.suggestions.some((s) => s && s.includes('30'))
    expect(hasHigh).toBe(true)
  })

  test('distractionRate > 0.2 → 含 distraction 建议', () => {
    const monday = getMonday()
    const sessions = [
      { mode: 'work', durationMin: 100, dateStr: monday, distractions: 30 } // 0.3
    ]
    const { taskStore, pomodoroStore, karmaStore } = mockStores({ sessions })
    const r = buildWeeklyReport({ taskStore, pomodoroStore, karmaStore })
    const has = r.data.suggestions.some((s) => s.includes('20'))
    expect(has).toBe(true)
  })

  test('无数据情况：低专注建议触发', () => {
    const { taskStore, pomodoroStore, karmaStore } = mockStores()
    const r = buildWeeklyReport({ taskStore, pomodoroStore, karmaStore })
    // 由于 focusMinutes/7 = 0 < 60，必定包含 lowFocus 建议
    const any60 = r.data.suggestions.some((s) => s.includes('60'))
    expect(any60).toBe(true)
  })
})

describe('buildWeeklyReport — karma 区间变化', () => {
  test('本周 karmaLog +20 → delta=20', () => {
    const monday = getMonday()
    const mid = addDays(monday, 2)
    const log = [
      { at: new Date(mid + 'T10:00:00').getTime(), delta: 20, reason: 'taskComplete' }
    ]
    const { taskStore, pomodoroStore, karmaStore } = mockStores({ karma: 50, karmaLog: log })
    const r = buildWeeklyReport({ taskStore, pomodoroStore, karmaStore })
    expect(r.data.karma.karmaEnd).toBe(50)
    expect(r.data.karma.delta).toBe(20)
    expect(r.data.karma.karmaStart).toBe(30)
  })

  test('karmaLog 无区间条目 → delta=0, start=end', () => {
    const monday = getMonday()
    const far = addDays(monday, -100)
    const log = [{ at: new Date(far + 'T00:00:00').getTime(), delta: 77, reason: 'old' }]
    const { taskStore, pomodoroStore, karmaStore } = mockStores({ karma: 77, karmaLog: log })
    const r = buildWeeklyReport({ taskStore, pomodoroStore, karmaStore })
    expect(r.data.karma.delta).toBe(0)
    expect(r.data.karma.karmaStart).toBe(77)
  })
})

describe('buildWeeklyReport — bestDay + peakHour', () => {
  test('完成 15 个任务都在周三 → bestDay=周三', () => {
    const tasks = []
    for (let i = 0; i < 15; i++) tasks.push(taskInWeek(2)) // 周三
    const { taskStore, pomodoroStore, karmaStore } = mockStores({ tasks })
    const r = buildWeeklyReport({ taskStore, pomodoroStore, karmaStore })
    const wednesday = addDays(getMonday(), 2)
    expect(r.data.bestDay).toBe(wednesday)
  })

  test('6 个任务都在 hour=10 → peakHour=10', () => {
    const tasks = []
    for (let i = 0; i < 6; i++) {
      const t = taskInWeek(i)
      t.completedAt = new Date(addDays(getMonday(), i) + 'T10:15:00').getTime()
      tasks.push(t)
    }
    const { taskStore, pomodoroStore, karmaStore } = mockStores({ tasks })
    const r = buildWeeklyReport({ taskStore, pomodoroStore, karmaStore })
    expect(r.data.peakHour).toBe(10)
    expect(r.data.peakHourCount).toBe(6)
  })
})

describe('buildWeeklyReport — markdown 输出', () => {
  test('markdown 含有中文标题', () => {
    const { taskStore, pomodoroStore, karmaStore } = mockStores()
    const r = buildWeeklyReport({ taskStore, pomodoroStore, karmaStore })
    expect(r.markdown).toContain('# 周报')
    expect(r.markdown).toContain('报告周期')
  })

  test('markdown 含有合计数据', () => {
    const tasks = [taskInWeek(0), taskInWeek(1)]
    const { taskStore, pomodoroStore, karmaStore } = mockStores({ tasks })
    const r = buildWeeklyReport({ taskStore, pomodoroStore, karmaStore })
    expect(r.markdown).toContain('完成任务数')
    expect(r.markdown).toContain('2 个')
  })

  test('byCategory 数据 → markdown 有分类表格', () => {
    const tasks = [taskInWeek(0, { category: 'work' }), taskInWeek(1, { category: 'study' })]
    const categories = [
      { id: 'work', name: '工作' },
      { id: 'study', name: '学习' }
    ]
    const { taskStore, pomodoroStore, karmaStore } = mockStores({ tasks, categories })
    const r = buildWeeklyReport({ taskStore, pomodoroStore, karmaStore })
    expect(r.markdown).toContain('分类分布')
    expect(r.markdown).toContain('工作')
    expect(r.markdown).toContain('学习')
  })
})

describe('buildWeeklyReport / buildMonthlyReport — i18n', () => {
  test('en-US locale 输出英文标题', () => {
    const { taskStore, pomodoroStore, karmaStore } = mockStores()
    const r = buildWeeklyReport({ taskStore, pomodoroStore, karmaStore, locale: 'en-US' })
    expect(r.data.lang).toBe('en-US')
    expect(r.markdown).toContain('# Weekly Report')
    expect(r.markdown).toContain('Completed tasks')
  })

  test('ja-JP locale 输出日文标题', () => {
    const { taskStore, pomodoroStore, karmaStore } = mockStores()
    const r = buildWeeklyReport({ taskStore, pomodoroStore, karmaStore, locale: 'ja-JP' })
    expect(r.data.lang).toBe('ja-JP')
    expect(r.markdown).toContain('# 週報')
    expect(r.markdown).toContain('レポート期間')
  })

  test('en 前缀（如 en-GB）→ en-US', () => {
    const { taskStore, pomodoroStore, karmaStore } = mockStores()
    const r = buildWeeklyReport({ taskStore, pomodoroStore, karmaStore, locale: 'en-GB' })
    expect(r.data.lang).toBe('en-US')
  })

  test('未知 locale → 回退 zh-CN', () => {
    const { taskStore, pomodoroStore, karmaStore } = mockStores()
    const r = buildWeeklyReport({ taskStore, pomodoroStore, karmaStore, locale: 'xx-XX' })
    expect(r.data.lang).toBe('zh-CN')
    expect(r.markdown).toContain('# 周报')
  })
})

describe('buildMonthlyReport — 结构 + 同比', () => {
  test('返回 data + markdown，type=monthly', () => {
    const { taskStore, pomodoroStore, karmaStore } = mockStores()
    const r = buildMonthlyReport({ taskStore, pomodoroStore, karmaStore })
    expect(r.data.type).toBe('monthly')
    expect(typeof r.markdown).toBe('string')
    expect(r.markdown.length).toBeGreaterThan(0)
  })

  test('dateRange start 为当月 1 号，end 为当月最后一天', () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const { taskStore, pomodoroStore, karmaStore } = mockStores()
    const r = buildMonthlyReport({ taskStore, pomodoroStore, karmaStore })
    expect(r.data.dateRange.start).toBe(formatDateStr(new Date(year, month - 1, 1)))
    expect(r.data.dateRange.end).toBe(formatDateStr(new Date(year, month, 0)))
  })

  test('指定 monthISO="2024-02" → 2024-02-01 ~ 2024-02-29 (闰年)', () => {
    const { taskStore, pomodoroStore, karmaStore } = mockStores()
    const r = buildMonthlyReport({
      monthISO: '2024-02',
      taskStore,
      pomodoroStore,
      karmaStore
    })
    expect(r.data.dateRange.start).toBe('2024-02-01')
    expect(r.data.dateRange.end).toBe('2024-02-29')
    expect(r.data.dateRange.year).toBe(2024)
    expect(r.data.dateRange.month).toBe(2)
  })

  test('prevDateRange 为上个月', () => {
    const { taskStore, pomodoroStore, karmaStore } = mockStores()
    const r = buildMonthlyReport({
      monthISO: '2025-03',
      taskStore,
      pomodoroStore,
      karmaStore
    })
    expect(r.data.prevDateRange.start).toBe('2025-02-01')
    expect(r.data.prevDateRange.end).toBe('2025-02-28')
    expect(r.data.prevDateRange.month).toBe(2)
  })

  test('2025-01 → prev 为 2024-12', () => {
    const { taskStore, pomodoroStore, karmaStore } = mockStores()
    const r = buildMonthlyReport({
      monthISO: '2025-01',
      taskStore,
      pomodoroStore,
      karmaStore
    })
    expect(r.data.prevDateRange.year).toBe(2024)
    expect(r.data.prevDateRange.month).toBe(12)
  })

  test('momCompare 有 completed 和 focus 两项', () => {
    const { taskStore, pomodoroStore, karmaStore } = mockStores()
    const r = buildMonthlyReport({ taskStore, pomodoroStore, karmaStore })
    const keys = r.data.momCompare.map((c) => c.key)
    expect(keys).toEqual(['completed', 'focus'])
  })

  test('本月完成 12，上月 5 → deltaTasks +7', () => {
    const tasks = []
    // 本月 2025-04
    const monthStart = new Date(2025, 3, 1) // April 2025
    const prevStart = new Date(2025, 2, 1)
    for (let i = 0; i < 12; i++) {
      const d = formatDateStr(new Date(2025, 3, (i % 28) + 1))
      const t = mkTask({ offsetDays: 0 })
      t.date = d
      t.completedAt = new Date(d + 'T12:00:00').getTime()
      tasks.push(t)
    }
    for (let i = 0; i < 5; i++) {
      const d = formatDateStr(new Date(2025, 2, (i % 28) + 1))
      const t = mkTask({ offsetDays: 0 })
      t.date = d
      t.completedAt = new Date(d + 'T12:00:00').getTime()
      tasks.push(t)
    }
    const { taskStore, pomodoroStore, karmaStore } = mockStores({ tasks })
    const r = buildMonthlyReport({
      monthISO: '2025-04',
      taskStore,
      pomodoroStore,
      karmaStore
    })
    const c = r.data.momCompare.find((x) => x.key === 'completed')
    expect(c.delta).toBe(7)
  })

  test('quadrant 结构完整', () => {
    const { taskStore, pomodoroStore, karmaStore } = mockStores()
    const r = buildMonthlyReport({ taskStore, pomodoroStore, karmaStore })
    for (const k of ['completed', 'created', 'importantOverdue', 'pomodoroMinutes']) {
      expect(r.data.quadrant).toHaveProperty(k)
    }
  })

  test('markdown 含月报标题 + 同比 + 四象限表格', () => {
    const { taskStore, pomodoroStore, karmaStore } = mockStores()
    const r = buildMonthlyReport({ taskStore, pomodoroStore, karmaStore })
    expect(r.markdown).toContain('# 月报')
    expect(r.markdown).toContain('同比上月')
    expect(r.markdown).toContain('四象限总览')
  })

  test('suggestions 为 5 条以内', () => {
    const { taskStore, pomodoroStore, karmaStore } = mockStores()
    const r = buildMonthlyReport({ taskStore, pomodoroStore, karmaStore })
    expect(r.data.suggestions.length).toBeGreaterThanOrEqual(4)
    expect(r.data.suggestions.length).toBeLessThanOrEqual(5)
  })

  test('peakHour / peakHourCount 结构正确', () => {
    const tasks = []
    for (let i = 0; i < 5; i++) {
      const d = formatDateStr(new Date(2025, 3, 10))
      const t = mkTask({ offsetDays: 0 })
      t.completedAt = new Date(2025, 3, 10, 16, 30).getTime()
      t.date = d
      tasks.push(t)
    }
    const { taskStore, pomodoroStore, karmaStore } = mockStores({ tasks })
    const r = buildMonthlyReport({ monthISO: '2025-04', taskStore, pomodoroStore, karmaStore })
    expect(r.data.peakHour).toBe(16)
    expect(r.data.peakHourCount).toBe(5)
  })
})

// 总计 25+ 条
