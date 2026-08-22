import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import {
  SMART_PROFILES,
  _internalResolveSnoozePreset as resolveSnoozePreset,
  _internalBuildToastBody as buildToastBody,
  getScheduledSmartTriggersForTest,
  snoozeTask,
  scheduleSmartReminder,
  handleAction,
  useReminderScheduler,
  destroyReminderScheduler
} from '@/composables/useReminderScheduler'

import { useTaskStore } from '@/stores/taskStore'
import { useSettingsStore } from '@/stores/settingsStore'

const reminderModalMock = {
  show: vi.fn(),
  hide: vi.fn(),
  handleSnooze: vi.fn(),
  handleView: vi.fn(),
  visible: { value: false },
  currentTaskId: { value: null },
  isOverdue: { value: false }
}
vi.mock('@/composables/useReminderModal', () => ({
  useReminderModal: () => reminderModalMock
}))

// ========== 1. SMART_PROFILES 契约 ==========
describe('SMART_PROFILES 契约', () => {
  test('strict/default/chill 三个键存在', () => {
    expect(SMART_PROFILES).toHaveProperty('strict')
    expect(SMART_PROFILES).toHaveProperty('default')
    expect(SMART_PROFILES).toHaveProperty('chill')
  })

  test('每个 profile 都具备四个规则节点', () => {
    for (const key of ['strict', 'default', 'chill']) {
      const p = SMART_PROFILES[key]
      expect(p).toHaveProperty('firstOfDay')
      expect(p).toHaveProperty('beforeDue')
      expect(p).toHaveProperty('late')
      expect(p).toHaveProperty('overdueCheck')
    }
  })

  test('strict 的 beforeDue.mins 数量 >= default >= chill', () => {
    expect(SMART_PROFILES.strict.beforeDue.mins.length).toBeGreaterThanOrEqual(
      SMART_PROFILES.default.beforeDue.mins.length
    )
    expect(SMART_PROFILES.default.beforeDue.mins.length).toBeGreaterThanOrEqual(
      SMART_PROFILES.chill.beforeDue.mins.length
    )
  })

  test('chill 禁用 first-of-day 和 late', () => {
    expect(SMART_PROFILES.chill.firstOfDay.enabled).toBe(false)
    expect(SMART_PROFILES.chill.late.enabled).toBe(false)
  })

  test('default 四个规则都开启', () => {
    expect(SMART_PROFILES.default.firstOfDay.enabled).toBe(true)
    expect(SMART_PROFILES.default.beforeDue.enabled).toBe(true)
    expect(SMART_PROFILES.default.late.enabled).toBe(true)
    expect(SMART_PROFILES.default.overdueCheck.enabled).toBe(true)
  })

  test('SMART_PROFILES 被冻结（不可变）', () => {
    expect(Object.isFrozen(SMART_PROFILES)).toBe(true)
  })

  test('beforeDue default mins 含 1440/60/15/5', () => {
    expect(SMART_PROFILES.default.beforeDue.mins).toEqual(
      expect.arrayContaining([1440, 60, 15, 5])
    )
  })

  test('overdueCheck interval monotonic: strict <= default <= chill', () => {
    const s = SMART_PROFILES.strict.overdueCheck.intervalMin
    const d = SMART_PROFILES.default.overdueCheck.intervalMin
    const c = SMART_PROFILES.chill.overdueCheck.intervalMin
    expect(s).toBeLessThanOrEqual(d)
    expect(d).toBeLessThanOrEqual(c)
  })
})

// ========== 2. resolveSnoozePreset ==========
describe('resolveSnoozePreset', () => {
  test('空/非法输入默认 5 分钟', () => {
    for (const v of [null, undefined, {}, 0, 'abc', [], false]) {
      const r = resolveSnoozePreset(v)
      expect(r.kind).toBe('preset')
      expect(r.minutes).toBe(5)
      expect(r.offsetMs).toBe(5 * 60 * 1000)
    }
  })

  test('{ minutes: 0 } 合法返回 0 偏移', () => {
    const r = resolveSnoozePreset({ minutes: 0 })
    expect(r.kind).toBe('preset')
    expect(r.minutes).toBe(0)
    expect(r.offsetMs).toBe(0)
  })

  test('{ minutes: 30 } 返回 30 分钟', () => {
    const r = resolveSnoozePreset({ minutes: 30 })
    expect(r.minutes).toBe(30)
    expect(r.offsetMs).toBe(30 * 60 * 1000)
  })

  test('预设字符串 5m/10m/30m/1h 正确', () => {
    expect(resolveSnoozePreset({ preset: '5m' }).minutes).toBe(5)
    expect(resolveSnoozePreset({ preset: '10m' }).minutes).toBe(10)
    expect(resolveSnoozePreset({ preset: '30m' }).minutes).toBe(30)
    expect(resolveSnoozePreset({ preset: '1h' }).minutes).toBe(60)
  })

  test('tomorrow_9am 返回 kind === tomorrow9am 且偏移在 18-30 小时之间', () => {
    const r = resolveSnoozePreset({ preset: 'tomorrow_9am' })
    expect(r.kind).toBe('tomorrow9am')
    expect(typeof r.customDateTs).toBe('number')
    expect(r.offsetMs).toBeGreaterThanOrEqual(18 * 3600 * 1000)
    expect(r.offsetMs).toBeLessThanOrEqual(30 * 3600 * 1000)
  })

  test('next_week 返回 kind === nextWeek 且偏移 >= 6.5 天', () => {
    const r = resolveSnoozePreset({ preset: 'next_week' })
    expect(r.kind).toBe('nextWeek')
    expect(r.offsetMs).toBeGreaterThanOrEqual(6.5 * 24 * 3600 * 1000)
    expect(r.offsetMs).toBeLessThanOrEqual(8 * 24 * 3600 * 1000)
  })

  test('customDate 为 Date 实例时按相对时间计算', () => {
    const d = new Date(Date.now() + 120 * 60 * 1000)
    const r = resolveSnoozePreset({ customDate: d })
    expect(r.kind).toBe('custom')
    expect(r.offsetMs).toBeGreaterThanOrEqual(119 * 60 * 1000)
    expect(r.offsetMs).toBeLessThanOrEqual(121 * 60 * 1000)
  })

  test('customDate 为 timestamp 时支持', () => {
    const ts = Date.now() + 45 * 60 * 1000
    const r = resolveSnoozePreset({ customDate: ts })
    expect(r.kind).toBe('custom')
    expect(r.customDateTs).toBe(ts)
  })

  test('过去的 customDate 返回 offset >= 0（不允许负偏移）', () => {
    const r = resolveSnoozePreset({ customDate: Date.now() - 1000 * 60 })
    expect(r.offsetMs).toBe(0)
  })

  test('minutes 为字符串数字也解析', () => {
    const r = resolveSnoozePreset({ minutes: '15' })
    expect(r.minutes).toBe(15)
  })
})

// ========== 3. buildToastBody ==========
describe('buildToastBody', () => {
  test('kind=overdue 前缀 ⚠️', () => {
    const s = buildToastBody({}, 'overdue', '任务已逾期')
    expect(s.startsWith('⚠️')).toBe(true)
    expect(s).toContain('任务已逾期')
  })

  test('kind=imminent 前缀 🎯', () => {
    const s = buildToastBody({}, 'imminent', '即将到期')
    expect(s.startsWith('🎯')).toBe(true)
  })

  test('kind=planned 前缀 ⏰', () => {
    const s = buildToastBody({}, 'planned', '提醒')
    expect(s.startsWith('⏰')).toBe(true)
  })

  test('kind=suggest 前缀 💡', () => {
    const s = buildToastBody({}, 'suggest', '建议')
    expect(s.startsWith('💡')).toBe(true)
  })

  test('未知 kind 默认 💡', () => {
    const s = buildToastBody({}, '__nope__', 'base')
    expect(s.startsWith('💡')).toBe(true)
  })

  test('无重复信息时不含"每周"字样', () => {
    const s = buildToastBody({}, 'planned', 'msg')
    expect(s).not.toContain('每周')
    expect(s).not.toContain('第')
  })

  test('weekly repeat + activity 含 complete 记录时追加统计', () => {
    const task = {
      repeat: { frequency: 'weekly', weekdays: [1, 3] },
      activity: [
        { type: 'complete', at: Date.now() - 7 * 86400000 },
        { type: 'complete', at: Date.now() - 3 * 86400000 }
      ]
    }
    const s = buildToastBody(task, 'planned', 'msg')
    expect(s).toContain('每周')
    expect(s).toMatch(/第 \d+ 次完成/)
  })

  test('weekly repeat 但 activity 为空时仍返回 nth=1', () => {
    const task = {
      repeat: { frequency: 'weekly', weekdays: [2, 4] },
      activity: []
    }
    const s = buildToastBody(task, 'planned', 'msg')
    expect(s).toContain('每周')
    expect(s).toContain('第 1 次完成')
  })

  test('非 weekly repeat（daily）不输出统计', () => {
    const task = {
      repeat: { frequency: 'daily' },
      activity: [{ type: 'complete', at: Date.now() }]
    }
    const s = buildToastBody(task, 'planned', 'msg')
    expect(s).not.toContain('每周')
  })
})

// ========== 4. computeSmartTriggers / getScheduledSmartTriggersForTest ==========
describe('getScheduledSmartTriggersForTest (computeSmartTriggers)', () => {
  // 固定系统时间 -> 2025-03-05 周三 10:00:00
  const fixedNow = new Date(2025, 2, 5, 10, 0, 0, 0).getTime()
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(fixedNow)
  })
  afterEach(() => {
    vi.useRealTimers()
  })
  const makeNow = () => fixedNow

  test('任务没有 date 返回空', () => {
    const t = { id: 'x' }
    expect(getScheduledSmartTriggersForTest(t, makeNow(), 'default')).toEqual([])
  })

  test('date 非法返回空', () => {
    const t = { id: 'x', date: 'not-a-date' }
    expect(getScheduledSmartTriggersForTest(t, makeNow(), 'default')).toEqual([])
  })

  test('今日到期任务 default: first-of-day 在 09:00 已过，不包含', () => {
    const t = { id: 'x', date: '2025-03-05' }
    const res = getScheduledSmartTriggersForTest(t, makeNow(), 'default')
    expect(res.every((r) => r.tag !== 'first-of-day')).toBe(true)
  })

  test('今日到期任务 default: late 在 20:00，应存在', () => {
    const t = { id: 'x', date: '2025-03-05' }
    const res = getScheduledSmartTriggersForTest(t, makeNow(), 'default')
    const late = res.find((r) => r.source === 'late')
    expect(late).toBeTruthy()
    expect(late.ts).toBeGreaterThan(makeNow())
  })

  test('before-due 需要 time 字段', () => {
    const withoutTime = { id: 'x', date: '2025-03-05' }
    const r1 = getScheduledSmartTriggersForTest(withoutTime, makeNow(), 'default')
    expect(r1.some((r) => r.source === 'before-due')).toBe(false)

    const withTime = { id: 'x', date: '2025-03-05', time: '15:00' }
    const r2 = getScheduledSmartTriggersForTest(withTime, makeNow(), 'default')
    expect(r2.some((r) => r.source === 'before-due')).toBe(true)
  })

  test('before-due 精确：15:00 task + 13:59 now => 含 before-due-60/15/5', () => {
    const t = { id: 'x', date: '2025-03-05', time: '15:00' }
    const now = new Date(2025, 2, 5, 13, 59, 0, 0).getTime()
    const res = getScheduledSmartTriggersForTest(t, now, 'default')
    const tags = res.filter((r) => r.source === 'before-due').map((r) => r.tag)
    expect(tags).toEqual(expect.arrayContaining(['before-due-60', 'before-due-15', 'before-due-5']))
  })

  test('before-due 全部已过时不返回', () => {
    const t = { id: 'x', date: '2025-03-05', time: '10:05' }
    const now = new Date(2025, 2, 5, 11, 0, 0, 0).getTime()
    const res = getScheduledSmartTriggersForTest(t, now, 'default')
    expect(res.some((r) => r.source === 'before-due')).toBe(false)
  })

  test('strict profile 比 default 产生更多 before-due 触发', () => {
    const t = { id: 'x', date: '2025-03-06', time: '15:00' }
    const now = new Date(2025, 2, 5, 10, 0, 0, 0).getTime()
    const a = getScheduledSmartTriggersForTest(t, now, 'default')
    const b = getScheduledSmartTriggersForTest(t, now, 'strict')
    const aCount = a.filter((r) => r.source === 'before-due').length
    const bCount = b.filter((r) => r.source === 'before-due').length
    expect(bCount).toBeGreaterThanOrEqual(aCount)
  })

  test('chill profile: 无 first-of-day、无 late', () => {
    const t = { id: 'x', date: '2025-03-06' }
    const res = getScheduledSmartTriggersForTest(t, makeNow(), 'chill')
    expect(res.some((r) => r.source === 'first-of-day')).toBe(false)
    expect(res.some((r) => r.source === 'late')).toBe(false)
  })

  test('overdue-check：过期任务产生 1 条 overdue-check', () => {
    const t = { id: 'x', date: '2025-02-28' }
    const res = getScheduledSmartTriggersForTest(t, makeNow(), 'default')
    const o = res.filter((r) => r.source === 'overdue-check')
    expect(o.length).toBe(1)
    expect(o[0].ts).toBeGreaterThanOrEqual(makeNow())
  })

  test('overdue-check strict interval <= chill interval', () => {
    const t = { id: 'x', date: '2025-02-28' }
    const a = getScheduledSmartTriggersForTest(t, makeNow(), 'strict')[0]
    const b = getScheduledSmartTriggersForTest(t, makeNow(), 'chill')[0]
    expect(a.intervalMin).toBeLessThanOrEqual(b.intervalMin)
  })

  test('输出结果按 ts 升序', () => {
    const t = { id: 'x', date: '2025-03-06', time: '15:00' }
    const now = new Date(2025, 2, 5, 0, 0, 0, 0).getTime()
    const res = getScheduledSmartTriggersForTest(t, now, 'strict')
    for (let i = 1; i < res.length; i++) {
      expect(res[i].ts).toBeGreaterThanOrEqual(res[i - 1].ts)
    }
  })

  test('未知 profileKey 回退到 default（不会抛错）', () => {
    const t = { id: 'x', date: '2025-03-06' }
    expect(() =>
      getScheduledSmartTriggersForTest(t, makeNow(), '__nope__')
    ).not.toThrow()
  })

  test('chill 的 overdue-check 仍然生成一条', () => {
    const t = { id: 'x', date: '2025-02-28' }
    const res = getScheduledSmartTriggersForTest(t, makeNow(), 'chill')
    expect(res.filter((r) => r.source === 'overdue-check').length).toBe(1)
  })
})

// ========== 5. settingsStore reminderSmartProfile ==========
describe('settingsStore.reminderSmartProfile', () => {
  let settingsStore = null
  beforeEach(() => {
    setActivePinia(createPinia())
    settingsStore = useSettingsStore()
    settingsStore.resetSettings()
  })

  test('默认值 default', () => {
    expect(settingsStore.reminderSmartProfile).toBe('default')
  })

  test('setReminderSmartProfile 接受 strict/default/chill', () => {
    settingsStore.setReminderSmartProfile('strict')
    expect(settingsStore.reminderSmartProfile).toBe('strict')
    settingsStore.setReminderSmartProfile('chill')
    expect(settingsStore.reminderSmartProfile).toBe('chill')
    settingsStore.setReminderSmartProfile('default')
    expect(settingsStore.reminderSmartProfile).toBe('default')
  })

  test('setReminderSmartProfile 忽略非法值', () => {
    settingsStore.setReminderSmartProfile('nope')
    expect(settingsStore.reminderSmartProfile).toBe('default')
    settingsStore.setReminderSmartProfile(null)
    expect(settingsStore.reminderSmartProfile).toBe('default')
  })

  test('toggleReminderSmartProfile 在 default<->strict<->chill 循环', () => {
    settingsStore.reminderSmartProfile = 'default'
    settingsStore.toggleReminderSmartProfile()
    expect(settingsStore.reminderSmartProfile).toBe('strict')
    settingsStore.toggleReminderSmartProfile()
    expect(settingsStore.reminderSmartProfile).toBe('chill')
    settingsStore.toggleReminderSmartProfile()
    expect(settingsStore.reminderSmartProfile).toBe('default')
  })

  test('resetSettings 回到 default', () => {
    settingsStore.setReminderSmartProfile('strict')
    settingsStore.resetSettings()
    expect(settingsStore.reminderSmartProfile).toBe('default')
  })
})

// ========== 6. snoozeTask + scheduleSmartReminder + handleAction 集成 ==========
describe('集成：snoozeTask / scheduleSmartReminder / handleAction', () => {
  let taskStore, settingsStore

  beforeEach(() => {
    setActivePinia(createPinia())
    taskStore = useTaskStore()
    settingsStore = useSettingsStore()
    taskStore.resetAll()
    settingsStore.resetSettings()
    settingsStore.notificationsEnabled = true
    settingsStore.doNotDisturb = false
    Object.defineProperty(window, 'electronAPI', {
      value: { sendNotification: vi.fn() },
      configurable: true,
      writable: true
    })
  })

  afterEach(() => {
    destroyReminderScheduler()
    delete window.electronAPI
  })

  test('snoozeTask 设置 nextReminderAt + snoozeCount++', () => {
    const task = taskStore.addTask({
      title: 't1',
      date: '2099-01-01',
      time: '10:00',
      reminder: true
    })
    const id = task.id
    const before = taskStore.getTaskById(id)
    const beforeCount = Number(before.snoozeCount) || 0
    const until = snoozeTask(id, { minutes: 15 })
    const after = taskStore.getTaskById(id)
    expect(after.nextReminderAt).toBe(until)
    expect(after.snoozeCount).toBe(beforeCount + 1)
    expect(until - Date.now()).toBeGreaterThanOrEqual(14 * 60 * 1000)
    expect(until - Date.now()).toBeLessThanOrEqual(16 * 60 * 1000)
  })

  test('snoozeTask 写 reminderSnooze activity', () => {
    const id = taskStore.addTask({
      title: 't2',
      date: '2099-01-01',
      time: '10:00',
      reminder: true
    }).id
    snoozeTask(id, { minutes: 30 })
    const t = taskStore.getTaskById(id)
    const last = [...t.activity].reverse().find((a) => a.type === 'reminderSnooze')
    expect(last).toBeTruthy()
    // logActivity 直接展开 extra: { until, minutes }
    expect(last.minutes).toBe(30)
    expect(typeof last.until).toBe('number')
  })

  test('scheduleSmartReminder 根据 profile 写入最早触发时间', () => {
    const id = taskStore.addTask({
      title: 't3',
      date: '2099-01-01',
      time: '10:00',
      reminder: true
    }).id
    const list = scheduleSmartReminder(id)
    expect(Array.isArray(list)).toBe(true)
    expect(list.length).toBeGreaterThan(0)
    const t = taskStore.getTaskById(id)
    expect(t.nextReminderAt).toBe(list[0].ts)
  })

  test('scheduleSmartReminder 允许传自定义 before-due rules（距离 due 3h 时 before-due-120/10 均出现）', () => {
    // due = 2099-01-01 10:00；fake now via system time
    const savedNow = Date
    try {
      // 将"现在"设定到 due 前 3 小时（07:00），这样 before-due-120（2h 前 => 08:00）、10（09:50）都在之后
      const fakeNow = new Date(2099, 0, 1, 7, 0, 0, 0).getTime()
      vi.useFakeTimers()
      vi.setSystemTime(fakeNow)

      const id = taskStore.addTask({
        title: 't4',
        date: '2099-01-01',
        time: '10:00',
        reminder: true
      }).id
      const list = scheduleSmartReminder(id, [
        { when: 'before-due', mins: [120, 10] }
      ])
      const tags = list.map((x) => x.tag)
      expect(tags).toEqual(expect.arrayContaining(['before-due-120', 'before-due-10']))
      expect(tags).not.toContain('before-due-10080')
    } finally {
      vi.useRealTimers()
      void savedNow
    }
  })

  test('handleAction("done") 切换完成', () => {
    const id = taskStore.addTask({
      title: 't5',
      reminder: true,
      date: '2099-01-01',
      time: '10:00'
    }).id
    handleAction({ taskId: id, action: 'done' })
    expect(taskStore.getTaskById(id).completed).toBe(true)
  })

  test.each([
    ['snooze5', 5],
    ['snooze10', 10],
    ['snooze30', 30],
    ['snooze1h', 60],
    ['snooze60', 60]
  ])('handleAction("%s") => 约 %d 分钟后', (act, mins) => {
    const id = taskStore.addTask({
      title: 't6',
      date: '2099-01-01',
      time: '10:00',
      reminder: true
    }).id
    const ret = handleAction({ taskId: id, action: act })
    expect(ret).toBe(true)
    const t = taskStore.getTaskById(id)
    expect(t.nextReminderAt - Date.now()).toBeGreaterThanOrEqual((mins - 1) * 60 * 1000)
    expect(t.nextReminderAt - Date.now()).toBeLessThanOrEqual((mins + 1) * 60 * 1000)
  })

  test('handleAction("snoozeTmr") 使用明天 9am', () => {
    const id = taskStore.addTask({
      title: 't7',
      date: '2099-01-01',
      time: '10:00',
      reminder: true
    }).id
    const ret = handleAction({ taskId: id, action: 'snoozeTmr' })
    expect(ret).toBe(true)
    const off = taskStore.getTaskById(id).nextReminderAt - Date.now()
    expect(off).toBeGreaterThanOrEqual(18 * 3600 * 1000)
  })

  test('handleAction("snoozeCustom", snoozeMinutes=42) 生效', () => {
    const id = taskStore.addTask({
      title: 't8',
      date: '2099-01-01',
      time: '10:00',
      reminder: true
    }).id
    const ret = handleAction({ taskId: id, action: 'snoozeCustom', snoozeMinutes: 42 })
    expect(ret).toBe(true)
    const off = taskStore.getTaskById(id).nextReminderAt - Date.now()
    expect(off).toBeGreaterThanOrEqual(41 * 60 * 1000)
    expect(off).toBeLessThanOrEqual(43 * 60 * 1000)
  })

  test('handleAction("snooze999") 通用 snooze<数字> 也生效', () => {
    const id = taskStore.addTask({
      title: 't9',
      date: '2099-01-01',
      time: '10:00',
      reminder: true
    }).id
    expect(handleAction({ taskId: id, action: 'snooze999' })).toBe(true)
    const t = taskStore.getTaskById(id)
    expect(t.nextReminderAt - Date.now()).toBeGreaterThan(998 * 60 * 1000)
  })

  test('handleAction 未知 action 返回 false', () => {
    const id = taskStore.addTask({
      title: 'tx',
      reminder: true,
      date: '2099-01-01'
    }).id
    expect(handleAction({ taskId: id, action: 'nonexistent' })).toBe(false)
  })

  test('handleAction 缺少 taskId 安全返回 false', () => {
    expect(handleAction({ taskId: null, action: 'done' })).toBe(false)
  })

  test('useReminderScheduler 返回 API 契约', () => {
    const s = useReminderScheduler()
    expect(typeof s.start).toBe('function')
    expect(typeof s.stop).toBe('function')
    expect(typeof s.snoozeTask).toBe('function')
    expect(typeof s.scheduleSmartReminder).toBe('function')
    expect(typeof s.handleAction).toBe('function')
    expect(typeof s.destroy).toBe('function')
  })
})

// ========== 7. taskStore 新 API (setNextReminder / snoozeTaskById) ==========
describe('taskStore: setNextReminder / snoozeTaskById / logActivity', () => {
  let taskStore
  beforeEach(() => {
    setActivePinia(createPinia())
    taskStore = useTaskStore()
    taskStore.resetAll()
  })

  test('setNextReminder 直接写入 nextReminderAt 字段', () => {
    const id = taskStore.addTask({ title: 'x', date: '2099-01-01' }).id
    const ts = Date.now() + 3600_000
    taskStore.setNextReminder(id, ts)
    expect(taskStore.getTaskById(id).nextReminderAt).toBe(ts)
  })

  test('setNextReminder 传入 null 清除', () => {
    const id = taskStore.addTask({ title: 'x', date: '2099-01-01', nextReminderAt: 1 }).id
    taskStore.setNextReminder(id, null)
    expect(taskStore.getTaskById(id).nextReminderAt).toBeNull()
  })

  test('snoozeTaskById(数字分钟) 生效', () => {
    const id = taskStore.addTask({ title: 'x', date: '2099-01-01' }).id
    taskStore.snoozeTaskById(id, 42)
    const t = taskStore.getTaskById(id)
    const off = t.nextReminderAt - Date.now()
    expect(off).toBeGreaterThanOrEqual(41 * 60 * 1000)
    expect(off).toBeLessThanOrEqual(43 * 60 * 1000)
    expect(t.snoozeCount).toBe(1)
  })

  test('snoozeTaskById(Date) 生效', () => {
    const id = taskStore.addTask({ title: 'x', date: '2099-01-01' }).id
    const d = new Date(Date.now() + 90 * 60 * 1000)
    taskStore.snoozeTaskById(id, d)
    const t = taskStore.getTaskById(id)
    expect(Math.abs(t.nextReminderAt - d.getTime())).toBeLessThan(1000)
    expect(t.snoozeCount).toBe(1)
  })

  test('snoozeTaskById 多次累加 snoozeCount', () => {
    const id = taskStore.addTask({ title: 'x', date: '2099-01-01' }).id
    taskStore.snoozeTaskById(id, 5)
    taskStore.snoozeTaskById(id, 5)
    taskStore.snoozeTaskById(id, 5)
    expect(taskStore.getTaskById(id).snoozeCount).toBe(3)
  })

  test('snoozeTaskById 非合法参数安全（保底设置偏移）', () => {
    const id = taskStore.addTask({ title: 'x', date: '2099-01-01' }).id
    taskStore.snoozeTaskById(id, 'abc')
    const t = taskStore.getTaskById(id)
    expect(typeof t.nextReminderAt).toBe('number')
    expect(t.nextReminderAt - Date.now()).toBeGreaterThanOrEqual(-60_000)
  })

  test('logActivity 支持 reminderSnooze', () => {
    const id = taskStore.addTask({ title: 'x', date: '2099-01-01' }).id
    taskStore.snoozeTaskById(id, 10)
    const t = taskStore.getTaskById(id)
    const acts = t.activity.filter((a) => a.type === 'reminderSnooze')
    expect(acts.length).toBeGreaterThanOrEqual(1)
  })

  test('logActivity 支持 reminderTrigger', () => {
    const id = taskStore.addTask({ title: 'x', date: '2099-01-01' }).id
    taskStore.logActivity(id, 'reminderTrigger', { tag: 'due' })
    const a = taskStore.getTaskById(id).activity
    expect(a[a.length - 1].type).toBe('reminderTrigger')
    expect(a[a.length - 1].tag).toBe('due')
  })

  test('ACTIVITY_TYPES 含 reminderTrigger 与 reminderSnooze', () => {
    // 间接：调用 logActivity 若不支持会返回 false
    const id = taskStore.addTask({ title: 'x', date: '2099-01-01' }).id
    const a = taskStore.logActivity(id, 'reminderSnooze', { foo: 1 })
    const b = taskStore.logActivity(id, 'reminderTrigger', { foo: 2 })
    expect(a).toBe(true)
    expect(b).toBe(true)
  })
})

// ========== 8. 排程：do-not-disturb / 非 enabled 不触发 ==========
describe('useReminderScheduler 触发控制', () => {
  let taskStore, settingsStore, scheduler

  beforeEach(() => {
    vi.useFakeTimers()
    setActivePinia(createPinia())
    taskStore = useTaskStore()
    settingsStore = useSettingsStore()
    taskStore.resetAll()
    settingsStore.resetSettings()
    settingsStore.notificationsEnabled = true
    settingsStore.doNotDisturb = false
    reminderModalMock.show.mockClear()
    Object.defineProperty(window, 'electronAPI', {
      value: { sendNotification: vi.fn() },
      configurable: true,
      writable: true
    })
    scheduler = useReminderScheduler()
  })

  afterEach(() => {
    try { scheduler.stop() } catch { /* ignore */ }
    destroyReminderScheduler()
    vi.useRealTimers()
    delete window.electronAPI
  })

  test('notificationsEnabled=false 下不触发', () => {
    settingsStore.notificationsEnabled = false
    taskStore.addTask({
      title: '过期1',
      date: '2000-01-01',
      time: '10:00',
      reminder: true
    })
    scheduler.start()
    expect(window.electronAPI.sendNotification).not.toHaveBeenCalled()
  })

  test('doNotDisturb=true 下不触发', () => {
    settingsStore.doNotDisturb = true
    taskStore.addTask({
      title: '过期2',
      date: '2000-01-01',
      time: '10:00',
      reminder: true
    })
    scheduler.start()
    expect(window.electronAPI.sendNotification).not.toHaveBeenCalled()
  })

  test('completed=true 的任务不触发提醒（添加后再完成）', () => {
    const id = taskStore.addTask({
      title: '已完成',
      date: '2000-01-01',
      time: '10:00',
      reminder: true
    }).id
    // 注意：部分 taskStore 实现 toggleComplete 会删除或移动任务；这里先 toggle 再 start
    taskStore.toggleComplete(id)
    // 先清空任何可能由 toggleComplete 触发的副作用调用（不应该）
    window.electronAPI.sendNotification.mockClear()
    scheduler.start()
    expect(window.electronAPI.sendNotification).not.toHaveBeenCalled()
  })

  test('reminder=false 的任务不触发', () => {
    taskStore.addTask({
      title: '未开启提醒',
      date: '2000-01-01',
      time: '10:00',
      reminder: false
    })
    scheduler.start()
    expect(window.electronAPI.sendNotification).not.toHaveBeenCalled()
  })

  test('reminder=true 的过期任务 exactly once', () => {
    taskStore.addTask({
      title: '过期3',
      date: '2000-01-01',
      time: '10:00',
      reminder: true
    })
    scheduler.start()
    const n1 = window.electronAPI.sendNotification.mock.calls.length
    expect(n1).toBe(1)
    vi.advanceTimersByTime(60_000)
    const n2 = window.electronAPI.sendNotification.mock.calls.length
    expect(n2).toBe(1)
  })
})
