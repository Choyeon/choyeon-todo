import { onMounted, onUnmounted } from 'vue'
import { useTaskStore } from '../stores/taskStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useReminderModal } from './useReminderModal'
import { getTodayStr, addDays, isValidDateStr } from '../utils/date'

// ========== 全局模块级状态（共享在多个 useReminderScheduler 调用之间）==========
let checkInterval = null
let instanceCount = 0
// 触发记录：key 为 reminderRunKey（taskId '#' nextReminderAt 或 '#' 规则标签），value 为触发时间戳
const triggeredReminders = new Map()
// Snooze 记录：taskId -> snoozeUntil(ms)
const snoozedReminders = new Map()
// 调度计算记录：taskId -> { nextRunAt, source }（供 smart 调度计算使用，内存态）
const smartScheduledNext = new Map()
// 去抖：key => 上次触发 ms（1 分钟内去抖）
const lastFiredAt = new Map()

const OVERDUE_SUFFIX = '-overdue'
const DEBOUNCE_MS = 60 * 1000 // 1 分钟

// ---------- 内部工具 ----------
const getOverdueReminderKey = (taskId) => `${taskId}${OVERDUE_SUFFIX}`
const getReminderTaskId = (key) =>
  typeof key === 'string' && key.endsWith(OVERDUE_SUFFIX)
    ? key.slice(0, -OVERDUE_SUFFIX.length)
    : key

const runKeyFor = (taskId, tag, nextTs) => {
  // tag 可为 'due' / 'overdue' / 'snooze' / 'first-of-day' / 'before-due-<m>' / 'late' / 'overdue-check'
  if (typeof nextTs === 'number' && nextTs > 0) return `${taskId}#${tag}#${nextTs}`
  return `${taskId}#${tag}`
}

const debouncedRecently = (key, now = Date.now()) => {
  const last = lastFiredAt.get(key)
  if (last && now - last < DEBOUNCE_MS) return true
  lastFiredAt.set(key, now)
  return false
}

// ---------- 智能调度规则 profiles ----------
// strict: 最密集；default: 默认；chill: 最宽松
export const SMART_PROFILES = Object.freeze({
  strict: {
    firstOfDay: { enabled: true, time: '09:00', offsetDays: 0 },
    beforeDue: { enabled: true, mins: [1440, 120, 60, 30, 15, 5] },
    late: { enabled: true, time: '20:00' },
    overdueCheck: { enabled: true, intervalMin: 30 }
  },
  default: {
    firstOfDay: { enabled: true, time: '09:00', offsetDays: 0 },
    beforeDue: { enabled: true, mins: [1440, 60, 15, 5] },
    late: { enabled: true, time: '20:00' },
    overdueCheck: { enabled: true, intervalMin: 60 }
  },
  chill: {
    firstOfDay: { enabled: false, time: '09:00', offsetDays: 0 },
    beforeDue: { enabled: true, mins: [60, 15] },
    late: { enabled: false, time: '21:00' },
    overdueCheck: { enabled: true, intervalMin: 180 }
  }
})

const parseHMS = (timeStr) => {
  if (typeof timeStr !== 'string') return null
  const parts = timeStr.split(':').map(Number)
  if (parts.length < 2 || parts.some((n) => !Number.isFinite(n))) return null
  const [h, m] = parts
  if (h < 0 || h > 23 || m < 0 || m > 59) return null
  return { h, m }
}

// 计算某日期 + timeStr 的时间戳（本地时区）
const makeTs = (dateStr, timeStr) => {
  const hm = parseHMS(timeStr)
  if (!hm || !dateStr) return null
  const [y, mo, d] = dateStr.split('-').map(Number)
  if (!Number.isFinite(y)) return null
  const dt = new Date(y, mo - 1, d, hm.h, hm.m, 0, 0)
  return dt.getTime()
}

const WEEKDAY_CN = ['日', '一', '二', '三', '四', '五', '六']

// 统计"每周X的第n次完成"：基于 activity 中 type==='complete' 的条目 & 星期匹配
const getRepeatCompletionNth = (task) => {
  if (!task?.repeat) return null
  const { frequency, weekdays } = task.repeat
  if (frequency !== 'weekly' || !Array.isArray(weekdays) || weekdays.length === 0) return null
  if (!Array.isArray(task.activity)) return { weekdayNames: [], nth: 1 }
  const weekdayNames = weekdays.map((w) => WEEKDAY_CN[w] ?? String(w)).join('、')
  let nth = 1
  for (const entry of task.activity) {
    if (entry && entry.type === 'complete' && typeof entry.at === 'number') {
      const d = new Date(entry.at)
      if (weekdays.includes(d.getDay())) nth++
    }
  }
  return { weekdayNames, nth }
}

// 获取智能 profile（从 settingsStore 读取，安全回退到 default）
const getSmartProfile = (settingsStore) => {
  const key = settingsStore?.reminderSmartProfile
  if (key && SMART_PROFILES[key]) return SMART_PROFILES[key]
  return SMART_PROFILES.default
}

// ---------- Electron / 浏览器 / Toast 通知路由 ----------
const showNotificationViaChannel = async (payload) => {
  // payload: { title, body, silent, icon, taskId, actions }
  // 1) 优先 window.ct.invoke('notification:show') 新 IPC
  if (typeof window !== 'undefined' && window.ct && typeof window.ct.invoke === 'function') {
    try {
      await window.ct.invoke('notification:show', payload)
      return 'electron-ct'
    } catch (e) {
      if (typeof console !== 'undefined') console.warn('[Reminder] ct.invoke failed:', e)
    }
  }
  // 2) 回退 electronAPI.sendNotification（原有接口，降级无 actions）
  if (typeof window !== 'undefined' && window.electronAPI?.sendNotification) {
    try {
      window.electronAPI.sendNotification(payload.title, payload.body, payload.taskId)
      return 'electron-legacy'
    } catch (e) {
      if (typeof console !== 'undefined') console.warn('[Reminder] electronAPI fallback failed:', e)
    }
  }
  // 3) 浏览器 Notification API
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      const n = new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon,
        silent: !!payload.silent
      })
      if (payload.taskId && typeof n.addEventListener === 'function') {
        n.addEventListener('click', () => {
          try {
            if (typeof window !== 'undefined' && window.focusTask) window.focusTask(payload.taskId)
          } catch {
            /* ignore */
          }
        })
      }
      return 'browser'
    } catch (e) {
      if (typeof console !== 'undefined') console.warn('[Reminder] Notification API failed:', e)
    }
  }
  return 'none'
}

// ---------- Windows Toast 增强（emoji 前缀 + 重复完成信息） ----------
const buildToastBody = (task, kind, baseMsg) => {
  let prefix = ''
  switch (kind) {
    case 'overdue':
      prefix = '⚠️'
      break
    case 'imminent': // 5m 内
      prefix = '🎯'
      break
    case 'planned':
      prefix = '⏰'
      break
    case 'suggest':
    default:
      prefix = '💡'
      break
  }
  let body = `${prefix} ${baseMsg}`
  const rep = getRepeatCompletionNth(task)
  if (rep) {
    body += `\n（这是每周${rep.weekdayNames}的第 ${rep.nth} 次完成）`
  }
  return body
}

const defaultActions = [
  { action: 'done', title: '✓ 标记完成' },
  { action: 'snooze10', title: '💤 稍后 10m' },
  { action: 'snooze1h', title: '💤 稍后 1h' },
  { action: 'snoozeTmr', title: '🌙 明天 9am' },
  { action: 'openTask', title: '📂 打开任务' }
]

// ---------- Snooze 预设偏移量计算 ----------
const resolveSnoozePreset = (presets) => {
  // presets: { minutes:number } | { customDate:Date|number }
  if (!presets || typeof presets !== 'object') {
    return { offsetMs: 5 * 60 * 1000, kind: 'preset', minutes: 5 }
  }
  if (presets.customDate !== undefined) {
    const d =
      presets.customDate instanceof Date
        ? presets.customDate.getTime()
        : Number(presets.customDate)
    if (Number.isFinite(d) && d > 0) {
      return { offsetMs: Math.max(0, d - Date.now()), kind: 'custom', customDateTs: d }
    }
  }
  const m = Number(presets.minutes)
  if (Number.isFinite(m) && m >= 0) {
    return { offsetMs: m * 60 * 1000, kind: 'preset', minutes: m }
  }
  // 命名预设：支持字符串别名
  const alias = String(presets.preset || presets.alias || '')
  const aliasMap = {
    '5m': 5,
    '10m': 10,
    '30m': 30,
    '1h': 60,
    tomorrow_9am: -1, // 特殊：稍后处理
    next_week: -2
  }
  if (alias && aliasMap[alias] !== undefined) {
    if (aliasMap[alias] > 0) {
      return { offsetMs: aliasMap[alias] * 60 * 1000, kind: 'preset', minutes: aliasMap[alias] }
    }
    if (aliasMap[alias] === -1) {
      const tmr = addDays(getTodayStr(), 1)
      const ts = makeTs(tmr, '09:00') || Date.now() + 24 * 3600 * 1000
      return { offsetMs: Math.max(0, ts - Date.now()), kind: 'tomorrow9am', customDateTs: ts }
    }
    if (aliasMap[alias] === -2) {
      const nw = addDays(getTodayStr(), 7)
      const ts = makeTs(nw, '09:00') || Date.now() + 7 * 24 * 3600 * 1000
      return { offsetMs: Math.max(0, ts - Date.now()), kind: 'nextWeek', customDateTs: ts }
    }
  }
  return { offsetMs: 5 * 60 * 1000, kind: 'preset', minutes: 5 }
}

// ---------- Smart 调度：计算下一个要触发的所有时间戳列表 ----------
// 返回 [{ ts, tag, source }]  均为未来时间
const computeSmartTriggers = (task, nowMs, profile) => {
  const result = []
  const today = getTodayStr()
  const todayTs = makeTs(today, '00:00')
  const taskDate = task.date
  if (!taskDate || !isValidDateStr(taskDate)) return result

  // 1) first-of-day：当日到期任务早 9 点
  if (profile.firstOfDay?.enabled && taskDate === today) {
    const t = makeTs(today, profile.firstOfDay.time)
    if (t && t > nowMs) result.push({ ts: t, tag: 'first-of-day', source: 'first-of-day' })
  }

  // 2) before-due：仅对有具体时间的非全天任务
  if (profile.beforeDue?.enabled && Array.isArray(profile.beforeDue.mins) && task.time) {
    const dueTs = makeTs(taskDate, task.time)
    if (dueTs) {
      for (const m of profile.beforeDue.mins) {
        if (typeof m !== 'number') continue
        const t = dueTs - m * 60 * 1000
        if (t > nowMs) result.push({ ts: t, tag: `before-due-${m}`, source: 'before-due' })
      }
    }
  }

  // 3) late：到期日 20:00 还没完成的任务
  if (profile.late?.enabled && taskDate === today) {
    const t = makeTs(today, profile.late.time)
    if (t && t > nowMs) result.push({ ts: t, tag: 'late', source: 'late' })
  }

  // 4) overdue-check：过期任务每 intervalMin 分钟再提醒一次
  if (profile.overdueCheck?.enabled && taskDate < today) {
    const interval = Number(profile.overdueCheck.intervalMin) || 60
    // 基于 last overdue 触发记录决定下次：若之前未触发过，立即在下一个 interval 拍点；否则按 interval 推进
    let base = null
    for (const [k, v] of triggeredReminders) {
      if (k.startsWith(`${task.id}#overdue-check`)) base = Math.max(base || 0, v)
    }
    const startAt = base && base > nowMs ? base : nowMs
    const next = Math.ceil(startAt / (interval * 60000)) * (interval * 60000)
    result.push({
      ts: next,
      tag: `overdue-check-${interval}`,
      source: 'overdue-check',
      intervalMin: interval
    })
  }

  // 去重 & 升序
  const seen = new Set()
  const sorted = result
    .filter((x) => Number.isFinite(x.ts) && x.ts > 0)
    .filter((x) => {
      const k = `${x.tag}@${x.ts}`
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
    .sort((a, b) => a.ts - b.ts)
  return sorted
}

// ---------- 核心调度检查 ----------
let boundCheckReminders = null

const triggerReminderForTask = (task, kind, tag, dueTsOrNull) => {
  const taskStore = useTaskStore()
  const settingsStore = useSettingsStore()
  const reminderModal = useReminderModal()

  const taskId = task.id
  const nowMs = Date.now()
  const dedupeKey = runKeyFor(taskId, tag, task.nextReminderAt ?? null)
  if (debouncedRecently(dedupeKey, nowMs)) return false
  if (triggeredReminders.has(dedupeKey)) return false
  triggeredReminders.set(dedupeKey, nowMs)

  // 写 reminderTrigger 活动（taskStore.logActivity 已支持）
  try {
    if (taskStore && typeof taskStore.logActivity === 'function') {
      taskStore.logActivity(taskId, 'reminderTrigger', { kind, tag })
    }
  } catch (e) {
    if (typeof console !== 'undefined') console.warn('[Reminder] logActivity error:', e)
  }

  // 根据 kind 计算标题与正文
  let title = '任务提醒'
  let baseBody = `"${task.title}"`
  let bodyKind = 'planned'
  if (kind === 'overdue') {
    title = '任务已逾期'
    baseBody = `"${task.title}" 已逾期，请尽快处理`
    bodyKind = 'overdue'
  } else if (kind === 'due') {
    title = '任务到期提醒'
    baseBody = `"${task.title}" 已到期`
    bodyKind = 'planned'
  } else if (kind === 'imminent') {
    title = '任务即将到期'
    baseBody = `"${task.title}" 将在 5 分钟内到期`
    bodyKind = 'imminent'
  } else if (kind === 'upcoming') {
    if (Number.isFinite(dueTsOrNull)) {
      const minsLeft = Math.max(0, Math.round((dueTsOrNull - nowMs) / 60000))
      if (minsLeft <= 5) bodyKind = 'imminent'
      if (minsLeft >= 60) {
        const h = Math.floor(minsLeft / 60)
        const m = minsLeft % 60
        const hm = m > 0 ? `${h}小时${m}分` : `${h}小时`
        baseBody = `"${task.title}" 将在 ${hm} 后到期`
      } else {
        baseBody = `"${task.title}" 将在 ${minsLeft} 分钟后到期`
      }
    } else {
      baseBody = `"${task.title}" 即将到期`
    }
    title = '任务即将到期'
  } else if (kind === 'first-of-day') {
    title = '今日任务提醒'
    baseBody = `"${task.title}" 是今日待办，别忘了处理`
    bodyKind = 'suggest'
  } else if (kind === 'late') {
    title = '晚间待办补提醒'
    baseBody = `"${task.title}" 今日未完成，请处理`
    bodyKind = 'suggest'
  } else if (kind === 'overdue-check') {
    title = '过期任务再提醒'
    baseBody = `"${task.title}" 仍未完成`
    bodyKind = 'overdue'
  } else if (kind === 'snooze') {
    title = '稍后提醒'
    baseBody = `"${task.title}" 的稍后提醒`
    bodyKind = 'planned'
  }

  const body = buildToastBody(task, bodyKind, baseBody)

  const payload = {
    title,
    body,
    silent: !!settingsStore.soundsEnabled ? false : true,
    taskId,
    actions: defaultActions
  }

  showNotificationViaChannel(payload).catch(() => {})

  // 兼容旧的 reminderModal 调用（可选 actions）
  try {
    if (reminderModal && typeof reminderModal.show === 'function') {
      reminderModal.show(taskId, {
        overdue: kind === 'overdue' || kind === 'overdue-check',
        onView: (id) => {
          if (typeof window !== 'undefined' && window.focusTask) window.focusTask(id)
        },
        onSnooze: (id) => snoozeTask(id, { minutes: 10 })
      })
    }
  } catch (e) {
    if (typeof console !== 'undefined') console.warn('[Reminder] modal error:', e)
  }

  // 若非 Electron（通知通道无），使用 Toast 呈现（允许 actions）
  if (
    typeof window !== 'undefined' &&
    !window.electronAPI &&
    !window.ct &&
    typeof window.useToast === 'function'
  ) {
    try {
      const toast = window.useToast()
      if (toast && typeof toast.show === 'function') {
        toast.show(body, {
          title,
          actions: defaultActions.map((a) => ({
            label: a.title,
            click: () => handleAction({ taskId, action: a.action })
          }))
        })
      }
    } catch {
      /* ignore */
    }
  }

  return true
}

const checkReminders = () => {
  let taskStore
  let settingsStore
  try {
    taskStore = useTaskStore()
    settingsStore = useSettingsStore()
  } catch (e) {
    if (typeof console !== 'undefined') console.warn('[Reminder] stores unavailable:', e)
    return
  }
  if (settingsStore.doNotDisturb || !settingsStore.notificationsEnabled) return

  const now = new Date()
  const today = getTodayStr()
  const nowMs = Date.now()
  const reminderLeadMinutes = settingsStore.defaultReminderTime || 0
  const profile = getSmartProfile(settingsStore)

  const validTaskIds = new Set()

  // 清理 1 小时前的去抖记录，避免内存增长
  for (const [k, t] of lastFiredAt) {
    if (nowMs - t > 2 * 60 * 60 * 1000) lastFiredAt.delete(k)
  }
  for (const [k, t] of triggeredReminders) {
    if (typeof t === 'number' && nowMs - t > 30 * 24 * 60 * 60 * 1000) triggeredReminders.delete(k)
  }

  for (const rawTask of taskStore.tasks) {
    try {
      if (!rawTask || rawTask.completed) continue
      if (!rawTask.reminder) continue
      validTaskIds.add(rawTask.id)
      const task = rawTask

      // Snooze 生效期间跳过
      if (snoozedReminders.has(task.id)) {
        if (nowMs < snoozedReminders.get(task.id)) continue
        snoozedReminders.delete(task.id)
      }

      // A) 若 nextReminderAt 已设置且到达：触发 snooze 类提醒
      if (typeof task.nextReminderAt === 'number' && task.nextReminderAt > 0) {
        const key = runKeyFor(task.id, 'snooze', task.nextReminderAt)
        if (task.nextReminderAt <= nowMs + 59 * 1000 && !triggeredReminders.has(key)) {
          const ts = task.nextReminderAt
          triggerReminderForTask(task, 'snooze', 'snooze', ts)
          // 触发后立即清空 nextReminderAt，避免重复
          try {
            taskStore.updateTask(task.id, { nextReminderAt: null })
          } catch {
            /* ignore */
          }
          continue
        } else if (task.nextReminderAt > nowMs) {
          // nextReminderAt 之前不再触发同一 task 的其他类型提醒（去重 by nextReminderAt）
          continue
        }
      }

      // B) 逾期
      if (task.date && task.date < today) {
        const triggerKey = getOverdueReminderKey(task.id)
        if (!triggeredReminders.has(triggerKey)) {
          triggerReminderForTask(task, 'overdue', 'overdue', null)
          triggeredReminders.set(triggerKey, nowMs)
        }
        // smart: overdue-check 已在 computeSmartTriggers 中处理
        continue
      }

      // C) 智能调度规则扫描
      const smartTriggers = computeSmartTriggers(task, nowMs, profile)
      for (const trig of smartTriggers) {
        // 若该触发时间已到达（允许 59s 提前窗口，匹配每分钟轮询）
        if (trig.ts <= nowMs + 59 * 1000) {
          const tagKey = runKeyFor(task.id, trig.tag, trig.ts)
          if (!triggeredReminders.has(tagKey)) {
            let kind = 'upcoming'
            if (trig.source === 'first-of-day') kind = 'first-of-day'
            else if (trig.source === 'late') kind = 'late'
            else if (trig.source === 'overdue-check') kind = 'overdue-check'
            else if (trig.source === 'before-due') {
              const mins = Number(String(trig.tag).replace('before-due-', '')) || 0
              kind = mins <= 5 ? 'imminent' : 'upcoming'
            }
            triggerReminderForTask(task, kind, trig.tag, trig.ts)
          }
        }
      }

      // D) 原有 "今日/明日 + 具体时间 + reminderLead" 的到期/即将到期逻辑（保留兼容）
      if (task.date && (task.date === today || task.date === addDays(today, 1))) {
        if (!task.time) continue
        const timeParts = task.time.split(':').map(Number)
        if (timeParts.length !== 2 || timeParts.some(isNaN)) continue
        const [taskHour, taskMin] = timeParts
        const taskMinutes = taskHour * 60 + taskMin
        const nowMinutes = now.getHours() * 60 + now.getMinutes()
        let minutesUntilTrigger = 0
        if (task.date === today) {
          minutesUntilTrigger = taskMinutes - reminderLeadMinutes - nowMinutes
        } else {
          const minutesUntilMidnight = 1440 - nowMinutes
          minutesUntilTrigger = minutesUntilMidnight + taskMinutes - reminderLeadMinutes
        }
        if (minutesUntilTrigger <= 0) {
          const runKey = runKeyFor(task.id, 'due', task.nextReminderAt ?? null)
          if (!triggeredReminders.has(runKey)) {
            const isDue = task.date === today && nowMinutes >= taskMinutes
            const kind = isDue ? 'due' : 'upcoming'
            const minutesLeft = Math.max(
              0,
              taskMinutes - nowMinutes + (task.date !== today ? 1440 - nowMinutes : 0)
            )
            const ts = makeTs(task.date, task.time)
            triggerReminderForTask(task, kind, isDue ? 'due' : 'upcoming-lead', ts)
            // 保留 minutesLeft 在触发记录中便于阅读（此处用 triggeredReminders 值存时间）
            void minutesLeft
          }
        }
      }
    } catch (e) {
      // 单个 task 出错隔离，不影响其它
      if (typeof console !== 'undefined') console.warn('[Reminder] Task error:', rawTask?.id, e)
    }
  }

  // 清理失效 task 的触发/暂挂记录
  for (const key of [...triggeredReminders.keys()]) {
    const taskId = getReminderTaskId(key.split('#')[0])
    if (!validTaskIds.has(taskId)) triggeredReminders.delete(key)
  }
  for (const [taskId] of [...snoozedReminders.entries()]) {
    if (!validTaskIds.has(taskId)) snoozedReminders.delete(taskId)
  }
}

// ---------- Public: Snooze ----------
/**
 * @param {string} taskId
 * @param {{minutes?:number}|{customDate?:Date|number}|{preset?:string}} presets
 */
export const snoozeTask = (taskId, presets) => {
  const resolved = resolveSnoozePreset(presets)
  const nowMs = Date.now()
  const nextReminderAt = nowMs + resolved.offsetMs
  let taskStore
  try {
    taskStore = useTaskStore()
  } catch {
    taskStore = null
  }
  if (taskStore) {
    const task = taskStore.getTaskById(taskId)
    if (task) {
      const prevCount = Number(task.snoozeCount) || 0
      taskStore.updateTask(taskId, {
        nextReminderAt,
        snoozeCount: prevCount + 1
      })
      taskStore.logActivity(taskId, 'reminderSnooze', {
        kind: resolved.kind,
        until: nextReminderAt,
        minutes: Math.round(resolved.offsetMs / 60000)
      })
    }
  }
  snoozedReminders.set(taskId, nextReminderAt)
  // 移除该 task 的触发记录，保证 snooze 到期后可以再次触发
  for (const k of [...triggeredReminders.keys()]) {
    if (k.startsWith(`${taskId}#`)) triggeredReminders.delete(k)
  }
  triggeredReminders.delete(taskId)
  triggeredReminders.delete(getOverdueReminderKey(taskId))
  return nextReminderAt
}

// ---------- Public: Smart Reminder ----------
/**
 * 根据 rules 计算下次提醒并设置 task.nextReminderAt（可由外部手动调用排程）
 * rules 可为数组或单对象；若省略则使用 settingsStore.reminderSmartProfile 的 profile。
 * 返回计算出的下次触发时间戳列表。
 */
export const scheduleSmartReminder = (taskId, rules) => {
  let taskStore
  let settingsStore
  try {
    taskStore = useTaskStore()
    settingsStore = useSettingsStore()
  } catch {
    return []
  }
  const task = taskStore.getTaskById(taskId)
  if (!task) return []
  const ruleList = Array.isArray(rules) ? rules : rules ? [rules] : null
  let triggers
  if (ruleList && ruleList.length) {
    // 按给定 rules 合并出临时 profile
    const tmpProfile = {
      firstOfDay: { enabled: false, time: '09:00', offsetDays: 0 },
      beforeDue: { enabled: false, mins: [] },
      late: { enabled: false, time: '20:00' },
      overdueCheck: { enabled: false, intervalMin: 60 }
    }
    for (const r of ruleList) {
      if (!r || typeof r !== 'object') continue
      if (r.when === 'first-of-day') {
        tmpProfile.firstOfDay = {
          enabled: true,
          time: r.time || '09:00',
          offsetDays: Number(r.offsetDays) || 0
        }
      } else if (r.when === 'before-due') {
        tmpProfile.beforeDue = {
          enabled: true,
          mins: Array.isArray(r.mins) ? r.mins.filter((n) => typeof n === 'number') : []
        }
      } else if (r.when === 'late') {
        tmpProfile.late = { enabled: true, time: r.time || '20:00' }
      } else if (r.when === 'overdue-check') {
        tmpProfile.overdueCheck = {
          enabled: true,
          intervalMin: Number(r.intervalMin) || 60
        }
      }
    }
    triggers = computeSmartTriggers(task, Date.now(), tmpProfile)
  } else {
    const profile = getSmartProfile(settingsStore)
    triggers = computeSmartTriggers(task, Date.now(), profile)
  }
  // 写入最早的 nextReminderAt
  if (triggers.length > 0) {
    const earliest = triggers[0].ts
    taskStore.updateTask(taskId, { nextReminderAt: earliest })
  }
  return triggers
}

// ---------- Public: Actions handler（用于 UI / Toast / IPC 回调） ----------
export const handleAction = ({ taskId, action, snoozeMinutes }) => {
  let taskStore
  try {
    taskStore = useTaskStore()
  } catch {
    taskStore = null
  }
  if (!taskStore || !taskId) return false

  switch (action) {
    case 'done':
      taskStore.toggleComplete(taskId)
      return true
    case 'snooze5':
      snoozeTask(taskId, { minutes: 5 })
      return true
    case 'snooze10':
      snoozeTask(taskId, { minutes: 10 })
      return true
    case 'snooze30':
      snoozeTask(taskId, { minutes: 30 })
      return true
    case 'snooze1h':
    case 'snooze60':
      snoozeTask(taskId, { minutes: 60 })
      return true
    case 'snoozeTmr':
      snoozeTask(taskId, { preset: 'tomorrow_9am' })
      return true
    case 'openTask':
    case 'view':
      try {
        taskStore.focusTask(taskId)
        if (typeof window !== 'undefined' && typeof window.focusTask === 'function') {
          window.focusTask(taskId)
        }
        if (typeof window !== 'undefined' && window.electronAPI?.showWindow) {
          try {
            window.electronAPI.showWindow()
          } catch {
            /* ignore */
          }
        }
      } catch {
        /* ignore */
      }
      return true
    case 'snoozeCustom': {
      const m = Number(snoozeMinutes)
      if (Number.isFinite(m) && m >= 0) snoozeTask(taskId, { minutes: m })
      return true
    }
    default:
      if (typeof action === 'string' && action.startsWith('snooze')) {
        const m = Number(action.slice(6))
        if (Number.isFinite(m) && m >= 0) {
          snoozeTask(taskId, { minutes: m })
          return true
        }
      }
      return false
  }
}

// ---------- IPC / 全局事件订阅（onMounted 时绑定） ----------
let ipcCleanupFns = []
const bindGlobalListeners = () => {
  if (typeof window === 'undefined') return
  // Electron: reminder:action 通道（主进程 actions 回调）
  if (window.electronAPI && typeof window.electronAPI.onReminderAction === 'function') {
    try {
      const off = window.electronAPI.onReminderAction((payload) => {
        if (!payload || !payload.taskId) return
        handleAction({
          taskId: payload.taskId,
          action: payload.action,
          snoozeMinutes: payload.snoozeMinutes
        })
      })
      ipcCleanupFns.push(off)
    } catch {
      /* ignore */
    }
  }
  // 兼容旧 notification:taskClick -> 打开任务
  if (window.electronAPI && typeof window.electronAPI.onNotificationTaskClick === 'function') {
    try {
      const off = window.electronAPI.onNotificationTaskClick((data) => {
        if (data && data.taskId) handleAction({ taskId: data.taskId, action: 'openTask' })
      })
      ipcCleanupFns.push(off)
    } catch {
      /* ignore */
    }
  }
}

const unbindGlobalListeners = () => {
  while (ipcCleanupFns.length) {
    const fn = ipcCleanupFns.pop()
    try {
      if (typeof fn === 'function') fn()
    } catch {
      /* ignore */
    }
  }
}

// ---------- Public: destroy ----------
export const destroyReminderScheduler = () => {
  instanceCount = Math.max(0, instanceCount - 1)
  if (instanceCount > 0) return
  if (checkInterval) {
    clearInterval(checkInterval)
    checkInterval = null
  }
  boundCheckReminders = null
  triggeredReminders.clear()
  snoozedReminders.clear()
  smartScheduledNext.clear()
  lastFiredAt.clear()
  unbindGlobalListeners()
}

// ---------- 主 composable ----------
export const useReminderScheduler = () => {
  const start = () => {
    instanceCount++
    if (!checkInterval) {
      boundCheckReminders = () => checkReminders()
      checkInterval = setInterval(boundCheckReminders, 60000)
      bindGlobalListeners()
      try {
        checkReminders()
      } catch (e) {
        if (typeof console !== 'undefined') console.warn('[Reminder] initial check error:', e)
      }
    }
  }

  const stop = () => {
    destroyReminderScheduler()
  }

  // 生命周期自动绑定
  if (typeof onMounted === 'function') {
    try {
      onMounted(() => {
        start()
      })
    } catch {
      /* ignore: 非 setup 上下文跳过 */
    }
  }
  if (typeof onUnmounted === 'function') {
    try {
      onUnmounted(() => {
        stop()
      })
    } catch {
      /* ignore */
    }
  }

  return {
    start,
    stop,
    snoozeTask,
    scheduleSmartReminder,
    handleAction,
    destroy: destroyReminderScheduler
  }
}

// 额外导出模块级函数，便于在非 setup 上下文中使用
export const getScheduledSmartTriggersForTest = (task, nowMs, profileKey) => {
  const profile = SMART_PROFILES[profileKey] || SMART_PROFILES.default
  return computeSmartTriggers(task, nowMs, profile)
}
export const _internalResolveSnoozePreset = resolveSnoozePreset
export const _internalBuildToastBody = buildToastBody
export const _internalSMART_PROFILES = SMART_PROFILES
