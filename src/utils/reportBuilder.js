// 周报 / 月报生成器：buildWeeklyReport / buildMonthlyReport
//   输出 markdown 文本 + JSON 数据，支持 zh-CN / en-US / ja-JP 三种语言
//   i18n 文案内联于此工具（避免外部依赖 vue-i18n 导致 vitest 测试复杂）

import { formatDateStr, parseDateStr, addDays, getTodayStr } from './date'
import { buildHeatmapGrid, findBestDay, findMostProductiveHour } from './heatmap'

// ===== i18n 词典 =====
const I18N = {
  'zh-CN': {
    weeklyTitle: '周报',
    monthlyTitle: '月报',
    dateRange: '报告周期',
    completedCount: '完成任务数',
    createdCount: '创建任务数',
    overdueCompletedCount: '逾期完成数',
    onTimeCompletedCount: '按时完成数',
    onTimeRate: '按时完成率',
    overdueRate: '逾期率',
    focusMinutes: '专注时长（分钟）',
    focusSessions: '专注会话数',
    distractionRate: '干扰率',
    deepFocusMinutes: '深度专注时长（分钟）',
    karmaChange: 'Karma 变化',
    karmaStart: '期初 Karma',
    karmaEnd: '期末 Karma',
    bestDay: '最佳日',
    bestHour: '最佳专注时段',
    suggestions: '下周建议',
    nextWeekSuggestions: '下月建议',
    byCategory: '分类分布',
    byPriority: '优先级分布',
    byArea: '区分布',
    byList: '列表分布',
    importantOverdue: '重要任务逾期数',
    yearOverYear: '同比上月',
    q4: '四象限总览',
    completed: '完成',
    created: '创建',
    important: '重要逾期',
    pomodoro: '番茄钟',
    suggestion_highOverdue: '高优先级逾期率超过 30%：建议拆分复杂任务、前置提醒、降低 myDay 加入阈值',
    suggestion_distraction: '番茄干扰率超过 20%：建议使用 AI 自适应时长 + 减少通知打扰',
    suggestion_mondayFocus: '周一下午专注效率偏低：可安排轻量会议/整理工作，把深度工作移到上午',
    suggestion_lowFocus: '平均专注时长不足 60 分钟/天：建议每天固定 2 个番茄时段',
    suggestion_balance: '任务分布不均衡：某些分类零完成，建议为学习/健康类安排固定时间',
    suggestion_repeatMiss: '重复任务跳过率较高：建议降低难度或调整提醒时间',
    month_completed_up: '完成任务数同比上升',
    month_completed_down: '完成任务数同比下降',
    month_focus_up: '专注时长同比上升',
    month_focus_down: '专注时长同比下降',
    from: '从',
    to: '至',
    total: '合计',
    tasks: '个',
    times: '次',
    minutes: '分钟',
    points: '分',
    noData: '暂无数据',
    peak: '峰值'
  },
  'en-US': {
    weeklyTitle: 'Weekly Report',
    monthlyTitle: 'Monthly Report',
    dateRange: 'Period',
    completedCount: 'Completed tasks',
    createdCount: 'Created tasks',
    overdueCompletedCount: 'Overdue completed',
    onTimeCompletedCount: 'On-time completed',
    onTimeRate: 'On-time rate',
    overdueRate: 'Overdue rate',
    focusMinutes: 'Focus duration (min)',
    focusSessions: 'Focus sessions',
    distractionRate: 'Distraction rate',
    deepFocusMinutes: 'Deep focus (min)',
    karmaChange: 'Karma change',
    karmaStart: 'Karma start',
    karmaEnd: 'Karma end',
    bestDay: 'Best day',
    bestHour: 'Peak productive hour',
    suggestions: 'Next-week suggestions',
    nextWeekSuggestions: 'Next-month suggestions',
    byCategory: 'By category',
    byPriority: 'By priority',
    byArea: 'By area',
    byList: 'By list',
    importantOverdue: 'Important overdue',
    yearOverYear: 'MoM change',
    q4: 'Quadrant overview',
    completed: 'Completed',
    created: 'Created',
    important: 'Imp. overdue',
    pomodoro: 'Pomodoro',
    suggestion_highOverdue:
      'High-priority overdue rate >30%: split complex tasks, set earlier reminders, reduce myDay threshold',
    suggestion_distraction:
      'Pomodoro distraction rate >20%: try AI-adaptive duration + mute notifications',
    suggestion_mondayFocus:
      'Monday PM focus is weak: move deep work to AM, schedule light meetings/reviews in the afternoon',
    suggestion_lowFocus:
      'Avg focus < 60 min/day: block 2 fixed pomodoro windows per day',
    suggestion_balance:
      'Unbalanced task distribution: some categories 0 completed, reserve fixed slots for study/health',
    suggestion_repeatMiss:
      'High repeat miss rate: lower repeat difficulty or adjust reminder timing',
    month_completed_up: 'Completed tasks up vs last month',
    month_completed_down: 'Completed tasks down vs last month',
    month_focus_up: 'Focus minutes up vs last month',
    month_focus_down: 'Focus minutes down vs last month',
    from: 'From',
    to: 'To',
    total: 'Total',
    tasks: '',
    times: '',
    minutes: 'min',
    points: 'pts',
    noData: 'No data yet',
    peak: 'Peak'
  },
  'ja-JP': {
    weeklyTitle: '週報',
    monthlyTitle: '月報',
    dateRange: 'レポート期間',
    completedCount: '完了タスク数',
    createdCount: '作成タスク数',
    overdueCompletedCount: '期限超過完了数',
    onTimeCompletedCount: '期限内完了数',
    onTimeRate: '期限内完了率',
    overdueRate: '期限超過率',
    focusMinutes: '集中時間（分）',
    focusSessions: '集中セッション数',
    distractionRate: '妨害率',
    deepFocusMinutes: 'ディープ集中（分）',
    karmaChange: 'Karma 変化',
    karmaStart: '期初 Karma',
    karmaEnd: '期末 Karma',
    bestDay: '最も生産的な日',
    bestHour: '最も生産的な時間帯',
    suggestions: '来週の提案',
    nextWeekSuggestions: '来月の提案',
    byCategory: 'カテゴリ分布',
    byPriority: '優先度分布',
    byArea: 'エリア分布',
    byList: 'リスト分布',
    importantOverdue: '重要期限超過',
    yearOverYear: '前月比',
    q4: '4 象限サマリ',
    completed: '完了',
    created: '作成',
    important: '重要超過',
    pomodoro: 'ポモドーロ',
    suggestion_highOverdue:
      '高優先度期限超過率 >30%：複雑タスクを分割、リマインダー前倒し、myDay 加入閾値を下げる',
    suggestion_distraction:
      'ポモドーロ妨害率 >20%：AI 適応時間 + 通知抑制を試してください',
    suggestion_mondayFocus:
      '月曜午後の集中が低め：軽めの会議/整理に当て、深い作業は午前へ移動',
    suggestion_lowFocus:
      '平均集中時間 < 60 分/日：1 日 2 回の固定ポモドーロ枠を確保',
    suggestion_balance:
      '分布がアンバランス：一部カテゴリが 0 件、学習/健康系も固定枠を設定',
    suggestion_repeatMiss:
      '繰り返しタスクのスキップ率高め：難易度低下 or リマインダー時刻を調整',
    month_completed_up: '完了タスク数 前月比増',
    month_completed_down: '完了タスク数 前月比減',
    month_focus_up: '集中時間 前月比増',
    month_focus_down: '集中時間 前月比減',
    from: '期間',
    to: '〜',
    total: '合計',
    tasks: '件',
    times: '回',
    minutes: '分',
    points: 'pt',
    noData: 'データなし',
    peak: 'ピーク'
  }
}

const resolveLang = (locale) => {
  if (!locale) return 'zh-CN'
  if (locale.startsWith('en')) return 'en-US'
  if (locale.startsWith('ja')) return 'ja-JP'
  return 'zh-CN'
}

const t = (lang, key) => {
  const dict = I18N[lang] || I18N['zh-CN']
  return dict[key] || I18N['zh-CN'][key] || key
}

// ===== 内部：周边界计算（周一开始） =====
const getWeekRange = (weekStartISO) => {
  // weekStartISO: 期望为 YYYY-MM-DD，以该天所在周的周一为起点
  const d = parseDateStr(weekStartISO || getTodayStr())
  const day = d.getDay() // 0 Sun - 6 Sat
  const mondayOffset = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + mondayOffset)
  const start = formatDateStr(d)
  const end = addDays(start, 6)
  return { start, end }
}

const getMonthRange = (monthISO) => {
  // monthISO: YYYY-MM 或任意日期
  let y, m
  const today = new Date()
  if (monthISO && /^\d{4}-\d{2}$/.test(monthISO)) {
    ;[y, m] = monthISO.split('-').map(Number)
  } else if (monthISO) {
    const d = parseDateStr(monthISO)
    y = d.getFullYear()
    m = d.getMonth() + 1
  } else {
    y = today.getFullYear()
    m = today.getMonth() + 1
  }
  const start = formatDateStr(new Date(y, m - 1, 1))
  const end = formatDateStr(new Date(y, m, 0))
  return { start, end, year: y, month: m }
}

const getPrevMonthRange = (year, month) => {
  const pm = month === 1 ? 12 : month - 1
  const py = month === 1 ? year - 1 : year
  const start = formatDateStr(new Date(py, pm - 1, 1))
  const end = formatDateStr(new Date(py, pm, 0))
  return { start, end, year: py, month: pm }
}

// ===== 内部：通用范围统计 =====
const statsInRange = (start, end, taskStore, pomodoroStore) => {
  const tasks = Array.isArray(taskStore?.tasks) ? taskStore.tasks : []
  const sessions = Array.isArray(pomodoroStore?.sessionHistory)
    ? pomodoroStore.sessionHistory
    : []

  // 完成 / 创建分桶
  let completedCount = 0
  let createdCount = 0
  let overdueCompletedCount = 0
  let onTimeCompletedCount = 0
  let highPriorityOverdueCount = 0
  let importantOverdueCompleted = 0
  const byCategory = new Map() // id -> {id,name,color,completed,created}
  const byPriority = { P0: 0, P1: 0, P2: 0, P3: 0, P4: 0 }
  const byArea = new Map()
  const byList = new Map()
  // 分类字典
  const catMap = new Map()
  if (Array.isArray(taskStore?.categories)) {
    for (const c of taskStore.categories) catMap.set(c.id, c)
  }
  const areaMap = new Map()
  if (Array.isArray(taskStore?.areas)) {
    for (const a of taskStore.areas) areaMap.set(a.id, a)
  } else {
    try {
      // 兼容：尝试用 areaStore 动态引入（测试环境可 undefined）
    } catch {
      /* ignore */
    }
  }
  const listMap = new Map()
  if (Array.isArray(taskStore?.lists)) {
    for (const l of taskStore.lists) listMap.set(l.id, l)
  }

  const incrementMap = (map, id, name, color, field) => {
    if (!map.has(id)) map.set(id, { id, name: name || id, color: color || '#999', completed: 0, created: 0 })
    const rec = map.get(id)
    rec[field] = (rec[field] || 0) + 1
  }

  for (const task of tasks) {
    if (!task) continue
    // 完成
    if (task.completed) {
      const ts = task.completedAt || task.updatedAt || 0
      const day = ts ? formatDateStr(new Date(ts)) : null
      if (day && day >= start && day <= end) {
        completedCount++
        // 按时 / 逾期
        let overdue = false
        if (task.date) {
          if (task.date < day) overdue = true
          else if (task.date === day && task.time) {
            const [h, mm] = task.time.split(':').map(Number)
            const dd = new Date(ts)
            overdue = dd.getHours() * 60 + dd.getMinutes() > h * 60 + mm
          }
        }
        if (overdue) overdueCompletedCount++
        else onTimeCompletedCount++
        if (overdue && task.important) importantOverdueCompleted++
        if (overdue && (task.priority === 0 || task.priority === 1)) highPriorityOverdueCount++
        const cat = catMap.get(task.category) || {}
        incrementMap(byCategory, task.category, cat.name, cat.color, 'completed')
        const prNum = Number(task.priority)
        const prKey =
          'P' +
          Math.max(
            0,
            Math.min(4, Math.floor(Number.isFinite(prNum) && task.priority !== undefined && task.priority !== null ? prNum : 4))
          )
        byPriority[prKey] = (byPriority[prKey] || 0) + 1
        if (task.areaId) {
          const a = areaMap.get(task.areaId) || {}
          incrementMap(byArea, task.areaId, a.name || task.areaId, a.color, 'completed')
        }
        if (task.listId) {
          const l = listMap.get(task.listId) || {}
          incrementMap(byList, task.listId, l.name || task.listId, l.color, 'completed')
        }
      }
    }
    // 创建
    const createdTs = task.createdAt || 0
    const createdDay = createdTs ? formatDateStr(new Date(createdTs)) : null
    if (createdDay && createdDay >= start && createdDay <= end) {
      createdCount++
      const cat = catMap.get(task.category) || {}
      incrementMap(byCategory, task.category, cat.name, cat.color, 'created')
    }
  }

  // 专注数据
  let focusMinutes = 0
  let focusSessions = 0
  let distractions = 0
  let deepFocusMinutes = 0
  for (const h of sessions) {
    if (!h || h.mode !== 'work') continue
    const d = h.dateStr || (h.at ? formatDateStr(new Date(h.at)) : null)
    if (!d || d < start || d > end) continue
    focusSessions++
    const m = Number(h.durationMin) || 0
    focusMinutes += m
    distractions += Number(h.distractions) || 0
    if (h.deep) deepFocusMinutes += m
  }
  const distractionRate = focusMinutes > 0 ? Math.min(1, distractions / focusMinutes) : 0
  const onTimeRate =
    completedCount > 0
      ? Math.round((onTimeCompletedCount / completedCount) * 10000) / 100
      : 0
  const overdueRate =
    completedCount > 0
      ? Math.round((overdueCompletedCount / completedCount) * 10000) / 100
      : 0
  const highOverdueRate =
    completedCount > 0
      ? Math.round((highPriorityOverdueCount / completedCount) * 10000) / 100
      : 0

  return {
    completedCount,
    createdCount,
    overdueCompletedCount,
    onTimeCompletedCount,
    onTimeRate,
    overdueRate,
    highOverdueRate,
    highPriorityOverdueCount,
    importantOverdueCompleted,
    focusMinutes,
    focusSessions,
    distractions,
    distractionRate,
    deepFocusMinutes,
    byCategory: [...byCategory.values()],
    byPriority,
    byArea: [...byArea.values()],
    byList: [...byList.values()]
  }
}

// ===== 建议规则 =====
const buildSuggestions = (stats, lang) => {
  const sgs = []
  if (stats.highOverdueRate > 30) sgs.push(t(lang, 'suggestion_highOverdue'))
  if (stats.distractionRate > 0.2) sgs.push(t(lang, 'suggestion_distraction'))
  if (sgs.length < 3 && stats.focusMinutes / 7 < 60) sgs.push(t(lang, 'suggestion_lowFocus'))
  if (sgs.length < 3) sgs.push(t(lang, 'suggestion_mondayFocus'))
  if (sgs.length < 4) sgs.push(t(lang, 'suggestion_balance'))
  if (sgs.length < 5) sgs.push(t(lang, 'suggestion_repeatMiss'))
  return sgs.slice(0, 5)
}

// ===== Karma 在范围内变化 =====
const karmaInRange = (karmaStore, start, end) => {
  if (!karmaStore || !Array.isArray(karmaStore.karmaLog)) {
    return { karmaStart: 0, karmaEnd: Number(karmaStore?.karma) || 0, delta: 0 }
  }
  const startTs = parseDateStr(start).getTime()
  const endTs = parseDateStr(end).getTime() + 86399999
  // 将日志按时间聚合（delta<0 视为期末时发生），计算出起始值 = 期末值 - 区间内净增量
  let deltaInRange = 0
  for (const l of karmaStore.karmaLog) {
    if (!l || typeof l.at !== 'number') continue
    if (l.at >= startTs && l.at <= endTs) deltaInRange += Number(l.delta) || 0
  }
  const karmaEnd = Number(karmaStore.karma) || 0
  const karmaStart = Math.max(0, karmaEnd - deltaInRange)
  return { karmaStart, karmaEnd, delta: karmaEnd - karmaStart }
}

// ===== Markdown 渲染工具 =====
const mdHeader = (text, level = 2) => `${'#'.repeat(level)} ${text}\n\n`
const mdKv = (k, v) => `- **${k}**: ${v}\n`
const mdTable = (headers, rows) => {
  const head = `| ${headers.join(' | ')} |\n| ${headers.map(() => '---').join(' | ')} |\n`
  const body = rows.map((r) => `| ${r.join(' | ')} |`).join('\n')
  return head + body + '\n\n'
}

// ===== 周报 =====
export const buildWeeklyReport = ({
  weekStartISO = null,
  taskStore = null,
  pomodoroStore = null,
  karmaStore = null,
  locale = 'zh-CN'
} = {}) => {
  const lang = resolveLang(locale)
  const { start, end } = getWeekRange(weekStartISO)

  const stats = statsInRange(start, end, taskStore, pomodoroStore)
  const karma = karmaInRange(karmaStore, start, end)

  // 最佳日 & 最佳时段
  const grid = buildHeatmapGrid({
    tasks: taskStore?.tasks || [],
    sessionHistory: pomodoroStore?.sessionHistory || [],
    cellStart: start,
    weeks: 1
  })
  const bestDay = findBestDay(grid)
  const hour = findMostProductiveHour(taskStore?.tasks || [])

  const suggestions = buildSuggestions(stats, lang)

  const data = {
    type: 'weekly',
    lang,
    dateRange: { start, end },
    stats,
    karma,
    bestDay: bestDay.date || null,
    bestDayDetail: bestDay,
    peakHour: hour.peakHour,
    peakHourCount: hour.peakCount,
    hourBuckets: hour.buckets,
    suggestions
  }

  // markdown
  let md = mdHeader(t(lang, 'weeklyTitle'), 1)
  md += mdKv(
    t(lang, 'dateRange'),
    `${t(lang, 'from')} ${start} ${t(lang, 'to')} ${end}`
  )
  md += '\n'
  md += mdHeader(t(lang, 'total'), 2)
  md += mdKv(t(lang, 'completedCount'), `${stats.completedCount} ${t(lang, 'tasks')}`)
  md += mdKv(t(lang, 'createdCount'), `${stats.createdCount} ${t(lang, 'tasks')}`)
  md += mdKv(t(lang, 'onTimeRate'), `${stats.onTimeRate}%`)
  md += mdKv(t(lang, 'overdueRate'), `${stats.overdueRate}%`)
  md += mdKv(t(lang, 'importantOverdue'), `${stats.importantOverdueCompleted} ${t(lang, 'tasks')}`)
  md += '\n'
  md += mdHeader(t(lang, 'focusMinutes'), 2)
  md += mdKv(t(lang, 'focusMinutes'), `${stats.focusMinutes} ${t(lang, 'minutes')}`)
  md += mdKv(t(lang, 'focusSessions'), `${stats.focusSessions} ${t(lang, 'times')}`)
  md += mdKv(t(lang, 'deepFocusMinutes'), `${stats.deepFocusMinutes} ${t(lang, 'minutes')}`)
  md += mdKv(
    t(lang, 'distractionRate'),
    `${Math.round(stats.distractionRate * 10000) / 100}%`
  )
  md += '\n'
  md += mdHeader(t(lang, 'karmaChange'), 2)
  md += mdKv(t(lang, 'karmaStart'), `${karma.karmaStart} ${t(lang, 'points')}`)
  md += mdKv(t(lang, 'karmaEnd'), `${karma.karmaEnd} ${t(lang, 'points')}`)
  md += mdKv(
    t(lang, 'karmaChange'),
    `${karma.delta >= 0 ? '+' : ''}${karma.delta} ${t(lang, 'points')}`
  )
  md += '\n'
  md += mdHeader(`${t(lang, 'bestDay')} & ${t(lang, 'bestHour')}`, 2)
  md += mdKv(t(lang, 'bestDay'), bestDay.date || t(lang, 'noData'))
  md += mdKv(
    t(lang, 'bestHour'),
    `${hour.peakHour}:00 (${t(lang, 'peak')} ${hour.peakCount})`
  )
  md += '\n'
  if (stats.byCategory.length > 0) {
    md += mdHeader(t(lang, 'byCategory'), 2)
    md += mdTable(
      ['ID', 'Name', 'Completed', 'Created'],
      stats.byCategory.map((c) => [
        c.id,
        c.name || c.id,
        String(c.completed || 0),
        String(c.created || 0)
      ])
    )
  }
  md += mdHeader(t(lang, 'suggestions'), 2)
  suggestions.forEach((s, i) => {
    md += `${i + 1}. ${s}\n`
  })

  return { data, markdown: md }
}

// ===== 月报 =====
export const buildMonthlyReport = ({
  monthISO = null,
  taskStore = null,
  pomodoroStore = null,
  karmaStore = null,
  locale = 'zh-CN'
} = {}) => {
  const lang = resolveLang(locale)
  const cur = getMonthRange(monthISO)
  const prev = getPrevMonthRange(cur.year, cur.month)

  const curStats = statsInRange(cur.start, cur.end, taskStore, pomodoroStore)
  const prevStats = statsInRange(prev.start, prev.end, taskStore, pomodoroStore)
  const curKarma = karmaInRange(karmaStore, cur.start, cur.end)

  // 同比上月
  const deltaTasks = curStats.completedCount - prevStats.completedCount
  const deltaFocus = curStats.focusMinutes - prevStats.focusMinutes
  const momCompare = [
    {
      key: 'completed',
      delta: deltaTasks,
      text:
        (deltaTasks >= 0 ? t(lang, 'month_completed_up') : t(lang, 'month_completed_down')) +
        ` ${deltaTasks >= 0 ? '+' : ''}${deltaTasks}`
    },
    {
      key: 'focus',
      delta: deltaFocus,
      text:
        (deltaFocus >= 0 ? t(lang, 'month_focus_up') : t(lang, 'month_focus_down')) +
        ` ${deltaFocus >= 0 ? '+' : ''}${deltaFocus}`
    }
  ]

  const hour = findMostProductiveHour(taskStore?.tasks || [])
  const suggestions = buildSuggestions(curStats, lang)
  // 月报用 nextWeekSuggestions 键不同
  const suggestionsLabel = t(lang, 'nextWeekSuggestions') || t(lang, 'suggestions')

  // 四象限：完成 / 创建 / 重要逾期 / 番茄（综合数值，归一化 0..100 展示）
  const q4 = {
    completed: curStats.completedCount,
    created: curStats.createdCount,
    importantOverdue: curStats.importantOverdueCompleted,
    pomodoroMinutes: curStats.focusMinutes
  }

  const data = {
    type: 'monthly',
    lang,
    dateRange: { start: cur.start, end: cur.end, year: cur.year, month: cur.month },
    prevDateRange: { start: prev.start, end: prev.end, year: prev.year, month: prev.month },
    stats: curStats,
    prevStats,
    momCompare,
    karma: curKarma,
    peakHour: hour.peakHour,
    peakHourCount: hour.peakCount,
    hourBuckets: hour.buckets,
    quadrant: q4,
    suggestions
  }

  let md = mdHeader(t(lang, 'monthlyTitle'), 1)
  md += mdKv(
    t(lang, 'dateRange'),
    `${t(lang, 'from')} ${cur.start} ${t(lang, 'to')} ${cur.end}`
  )
  md += '\n'
  md += mdHeader(t(lang, 'q4'), 2)
  md += mdTable(
    [t(lang, 'completed'), t(lang, 'created'), t(lang, 'important'), t(lang, 'pomodoro')],
    [
      [
        String(q4.completed),
        String(q4.created),
        String(q4.importantOverdue),
        `${q4.pomodoroMinutes}${t(lang, 'minutes')}`
      ]
    ]
  )
  md += mdHeader(t(lang, 'yearOverYear'), 2)
  for (const c of momCompare) md += mdKv(c.key, c.text)
  md += '\n'
  md += mdHeader(t(lang, 'focusMinutes'), 2)
  md += mdKv(t(lang, 'focusMinutes'), `${curStats.focusMinutes} ${t(lang, 'minutes')}`)
  md += mdKv(t(lang, 'focusSessions'), `${curStats.focusSessions} ${t(lang, 'times')}`)
  md += mdKv(
    t(lang, 'distractionRate'),
    `${Math.round(curStats.distractionRate * 10000) / 100}%`
  )
  md += '\n'
  md += mdHeader(t(lang, 'karmaChange'), 2)
  md += mdKv(
    t(lang, 'karmaChange'),
    `${curKarma.delta >= 0 ? '+' : ''}${curKarma.delta} ${t(lang, 'points')}`
  )
  md += mdKv(t(lang, 'karmaEnd'), `${curKarma.karmaEnd} ${t(lang, 'points')}`)
  md += '\n'
  if (curStats.byCategory.length > 0) {
    md += mdHeader(t(lang, 'byCategory'), 2)
    md += mdTable(
      ['ID', 'Name', 'Completed', 'Created'],
      curStats.byCategory.map((c) => [
        c.id,
        c.name || c.id,
        String(c.completed || 0),
        String(c.created || 0)
      ])
    )
  }
  md += mdHeader(suggestionsLabel, 2)
  suggestions.forEach((s, i) => {
    md += `${i + 1}. ${s}\n`
  })

  return { data, markdown: md }
}
