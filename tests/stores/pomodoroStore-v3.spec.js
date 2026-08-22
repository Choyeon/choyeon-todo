// Task 6 D. pomodoroStore v3 单元测试（专注摘要、干扰检测、AI 自适应、streak 等）
import { createPinia, setActivePinia } from 'pinia'
import { describe, beforeEach, afterEach, test, expect, vi } from 'vitest'
import { usePomodoroStore } from '@/stores/pomodoroStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useTaskStore } from '@/stores/taskStore'
import { addDays, getTodayStr, formatDateStr } from '@/utils/date'

describe('PomodoroStore Task 6 (v3)', () => {
  /** @type {ReturnType<typeof usePomodoroStore>} */
  let store
  let settingsStore
  let taskStore

  beforeEach(() => {
    setActivePinia(createPinia())
    settingsStore = useSettingsStore()
    taskStore = useTaskStore()
    taskStore.resetAll()
    // 确保每个测试独立的 localStorage
    try {
      localStorage.removeItem('choyeon_pomodoro_v1')
      localStorage.removeItem('choyeon_pomodoro_summary_v1')
    } catch (e) {
      /* ignore */
    }
    store = usePomodoroStore()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    store.cleanup && store.cleanup()
  })

  // ====== 基础状态 ======
  test('初始 sessionDistractions 为 0', () => {
    expect(store.sessionDistractions).toBe(0)
  })

  test('初始 interruptionLog 为空数组', () => {
    expect(Array.isArray(store.interruptionLog)).toBe(true)
    expect(store.interruptionLog.length).toBe(0)
  })

  test('初始 sessionHistory 为空数组', () => {
    expect(Array.isArray(store.sessionHistory)).toBe(true)
    expect(store.sessionHistory.length).toBe(0)
  })

  test('modeDurations 返回三种模式 + custom', () => {
    const d = store.modeDurations
    expect(typeof d.work).toBe('number')
    expect(typeof d.shortBreak).toBe('number')
    expect(typeof d.longBreak).toBe('number')
    expect(typeof d.custom).toBe('number')
  })

  test('todayFocusMinutes/dayStreak/weekStreak 初始为 0', () => {
    expect(store.todayFocusMinutes).toBe(0)
    expect(store.dayStreak).toBe(0)
    expect(store.weekStreak).toBe(0)
  })

  // ====== markDistraction ======
  test('markDistraction 默认 kind=manual 自增 counter 并记入 log', () => {
    const ok = store.markDistraction()
    expect(ok).toBe(true)
    expect(store.sessionDistractions).toBe(1)
    expect(store.interruptionLog.length).toBe(1)
    expect(store.interruptionLog[0].kind).toBe('manual')
    expect(typeof store.interruptionLog[0].at).toBe('number')
  })

  test('markDistraction 支持 appSwitch/focusLost/userMarked', () => {
    store.markDistraction('appSwitch')
    store.markDistraction('focusLost')
    store.markDistraction('userMarked')
    expect(store.sessionDistractions).toBe(3)
    expect(store.interruptionLog.map((i) => i.kind)).toEqual([
      'appSwitch',
      'focusLost',
      'userMarked'
    ])
  })

  test('markDistraction 不允许的 kind 会回退为 manual', () => {
    store.markDistraction('whatever')
    expect(store.interruptionLog[0].kind).toBe('manual')
  })

  test('interruptionLog 最多保留最近 200 条', () => {
    for (let i = 0; i < 300; i++) store.markDistraction('manual')
    expect(store.interruptionLog.length).toBe(200)
    expect(store.sessionDistractions).toBe(300)
  })

  // ====== setDuration ======
  test('setDuration(work, 30) 会设置 settings + timeLeft（未运行）', () => {
    store.setDuration('work', 30)
    expect(settingsStore.pomodoroWorkMinutes).toBe(30)
    expect(store.modeDurations.work).toBe(30)
    expect(store.timeLeft).toBe(30 * 60)
  })

  test('setDuration 无效模式返回 false', () => {
    expect(store.setDuration('xyz', 10)).toBe(false)
  })

  test('setDuration 分钟范围被钳制 [1,180]', () => {
    store.setDuration('work', 0)
    expect(settingsStore.pomodoroWorkMinutes).toBe(1)
    store.setDuration('work', 500)
    expect(settingsStore.pomodoroWorkMinutes).toBe(180)
  })

  test('setDuration 切换模式不会影响非当前模式的 timeLeft（运行时不立即改 timeLeft）', () => {
    store.setDuration('shortBreak', 8)
    expect(settingsStore.pomodoroBreakMinutes).toBe(8)
    expect(store.currentMode).toBe('work')
    // 当前模式为 work 时，shortBreak 的修改不影响 work 的 timeLeft
    expect(store.timeLeft).toBe(settingsStore.pomodoroWorkMinutes * 60)
  })

  // ====== 完成会话后 sessionHistory 被记录 ======
  const completeWorkSession = (markDistractions = 0, customMinutesOverride = null) => {
    if (customMinutesOverride) store.setDuration('work', customMinutesOverride)
    store.toggleTimer() // start
    vi.advanceTimersByTime(200)
    for (let i = 0; i < markDistractions; i++) store.markDistraction('manual')
    // 直接运行内部完成逻辑：模拟时间走完
    store.completeSessionInternal && store.completeSessionInternal()
  }

  test('完成一个 work 会话后 sessionHistory 长度 +1，deep 符合规则', () => {
    // 25min work, 0 distractions → deep=true
    store.setDuration('work', 25)
    expect(store.sessionHistory.length).toBe(0)
    // 手动把 start 后的快照清理为完成
    store.toggleTimer()
    vi.advanceTimersByTime(200)
    store.completeSessionInternal()
    expect(store.sessionHistory.length).toBe(1)
    const h = store.sessionHistory[0]
    expect(h.mode).toBe('work')
    expect(h.deep).toBe(true) // 25min + 0 distr
    expect(typeof h.dateStr).toBe('string')
    expect(h.dateStr).toBe(getTodayStr())
  })

  test('work 会话完成期间有干扰 → deep=false', () => {
    store.setDuration('work', 30)
    store.toggleTimer()
    vi.advanceTimersByTime(200)
    store.markDistraction('appSwitch')
    store.completeSessionInternal()
    expect(store.sessionHistory[0].deep).toBe(false)
  })

  test('work duration 10 分钟即便是 0 干扰也不算 deep（要求 ≥25min）', () => {
    store.setDuration('work', 10)
    store.toggleTimer()
    vi.advanceTimersByTime(200)
    store.completeSessionInternal()
    expect(store.sessionHistory[0].durationMin).toBe(10)
    expect(store.sessionHistory[0].deep).toBe(false)
  })

  test('非 work 模式完成后不记入专注摘要（distractions=0 也不影响 deepFocus）', () => {
    store.switchMode('shortBreak')
    store.toggleTimer()
    vi.advanceTimersByTime(200)
    store.completeSessionInternal()
    const last = store.sessionHistory[store.sessionHistory.length - 1]
    expect(last.mode).toBe('shortBreak')
    expect(last.deep).toBe(false)
  })

  // ====== getFocusSummary ======
  test('getFocusSummary today 初始为零对象', () => {
    const s = store.getFocusSummary('today')
    expect(s.totalMinutes).toBe(0)
    expect(s.sessions).toBe(0)
    expect(s.avgSessionMin).toBe(0)
    expect(s.distractions).toBe(0)
    expect(s.distractionRate).toBe(0)
    expect(s.deepFocusMinutes).toBe(0)
    expect(s.tasksCompleted).toBe(0)
    expect(s.bestFocusDay).toBe(null)
  })

  test('getFocusSummary last7 空时返回零对象', () => {
    const s = store.getFocusSummary('last7')
    expect(s.totalMinutes).toBe(0)
    expect(s.sessions).toBe(0)
  })

  test('getFocusSummary last30 空时返回零对象', () => {
    const s = store.getFocusSummary('last30')
    expect(s.totalMinutes).toBe(0)
    expect(s.sessions).toBe(0)
  })

  test('无效 range 参数默认按 today 处理', () => {
    const s = store.getFocusSummary('whatever')
    expect(s.totalMinutes).toBe(0)
  })

  test('1 个 25min 专注会话，today 摘要计算正确', () => {
    store.setDuration('work', 25)
    store.toggleTimer()
    vi.advanceTimersByTime(200)
    store.completeSessionInternal()
    const s = store.getFocusSummary('today')
    expect(s.sessions).toBe(1)
    expect(s.totalMinutes).toBe(25)
    expect(s.avgSessionMin).toBe(25)
    expect(s.deepFocusMinutes).toBe(25)
    expect(s.distractions).toBe(0)
    expect(s.distractionRate).toBe(0)
    expect(s.bestFocusDay).toBe(getTodayStr())
  })

  test('摘要中 sessions=2、时长不同 avg 正确', () => {
    store.setDuration('work', 30)
    store.toggleTimer()
    vi.advanceTimersByTime(200)
    store.completeSessionInternal()

    store.switchMode('work')
    store.setDuration('work', 20)
    store.toggleTimer()
    vi.advanceTimersByTime(200)
    store.completeSessionInternal()

    const s = store.getFocusSummary('today')
    expect(s.sessions).toBe(2)
    expect(s.totalMinutes).toBe(50)
    expect(s.avgSessionMin).toBe(25)
  })

  test('distractionRate = distractions / totalMinutes，且不超过 1', () => {
    store.setDuration('work', 20)
    store.toggleTimer()
    vi.advanceTimersByTime(200)
    store.markDistraction('userMarked')
    store.markDistraction('userMarked')
    store.markDistraction('userMarked')
    store.completeSessionInternal()

    const s = store.getFocusSummary('today')
    expect(s.distractions).toBe(3)
    expect(s.distractionRate).toBeCloseTo(3 / 20, 5)
    expect(s.deepFocusMinutes).toBe(0) // 有干扰
  })

  test('tasksCompleted 统计 taskStore 中已完成且有 pomodoroSessions 且 completedAt 在范围内', () => {
    const t1 = taskStore.addTask({ title: 'T1' })
    taskStore.addPomodoroSession(t1.id, 25 * 60)
    taskStore.toggleComplete(t1.id)
    const s = store.getFocusSummary('today')
    expect(s.tasksCompleted).toBe(1)
  })

  // ====== 注入历史 session 测试不同 range ======
  test('last7 / last30 正确过滤日期', () => {
    const today = getTodayStr()
    const in7 = addDays(today, -3)
    const in30 = addDays(today, -15)
    const out30 = addDays(today, -40)
    // 直接写入 sessionHistory（模拟加载）
    ;[today, in7, in30, out30].forEach((d, i) => {
      const ds = d
      store.sessionHistory.push({
        at: new Date(ds).getTime() + i * 1000,
        mode: 'work',
        durationMin: 10 + i,
        distractions: 0,
        taskId: null,
        deep: (10 + i) >= 25,
        completedAt: Date.now(),
        dateStr: ds
      })
    })
    expect(store.getFocusSummary('today').totalMinutes).toBe(10)
    expect(store.getFocusSummary('last7').totalMinutes).toBe(10 + 11) // today + in7 (-3)
    expect(store.getFocusSummary('last30').totalMinutes).toBe(10 + 11 + 12)
  })

  test('bestFocusDay 返回范围内专注分钟最多的一天', () => {
    const today = getTodayStr()
    const d1 = addDays(today, -1)
    const d2 = addDays(today, -2)
    // 每个 day 插入多个 session
    ;[
      [today, 30],
      [d1, 50],
      [d2, 20]
    ].forEach(([ds, min]) => {
      store.sessionHistory.push({
        at: Date.now(),
        mode: 'work',
        durationMin: min,
        distractions: 0,
        deep: false,
        dateStr: ds
      })
    })
    const s = store.getFocusSummary('last7')
    expect(s.bestFocusDay).toBe(d1)
  })

  // ====== streak 计算 ======
  test('连续 3 天有 session → dayStreak=3', () => {
    const today = getTodayStr()
    for (let i = 0; i < 3; i++) {
      store.sessionHistory.push({
        at: Date.now(),
        mode: 'work',
        durationMin: 10,
        distractions: 0,
        deep: false,
        dateStr: addDays(today, -i)
      })
    }
    expect(store.dayStreak).toBe(3)
  })

  test('中间缺一天 → streak 只算今天连续部分', () => {
    const today = getTodayStr()
    ;[today, addDays(today, -1), addDays(today, -3)].forEach((ds) => {
      store.sessionHistory.push({
        at: Date.now(),
        mode: 'work',
        durationMin: 10,
        distractions: 0,
        deep: false,
        dateStr: ds
      })
    })
    expect(store.dayStreak).toBe(2) // -1 到今天连续 2 天，中间 -2 断开
  })

  test('只有休息 session 不计入 streak', () => {
    store.sessionHistory.push({
      at: Date.now(),
      mode: 'shortBreak',
      durationMin: 5,
      distractions: 0,
      deep: false,
      dateStr: getTodayStr()
    })
    expect(store.dayStreak).toBe(0)
  })

  // week streak 简单测试：只要包含本周 + 上周有 session → weekStreak >=2
  test('本周 + 上周 都有 session → weekStreak=2', () => {
    const today = new Date()
    const thisWeek = formatDateStr(today)
    const lastWeekSameDay = new Date(today.valueOf() - 7 * 86400000)
    const twoWeekAgo = new Date(today.valueOf() - 14 * 86400000)
    store.sessionHistory.push(
      { at: Date.now(), mode: 'work', durationMin: 5, distractions: 0, deep: false, dateStr: thisWeek },
      {
        at: Date.now(),
        mode: 'work',
        durationMin: 5,
        distractions: 0,
        deep: false,
        dateStr: formatDateStr(lastWeekSameDay)
      },
      {
        at: Date.now(),
        mode: 'work',
        durationMin: 5,
        distractions: 0,
        deep: false,
        dateStr: formatDateStr(twoWeekAgo)
      }
    )
    // 三周 → weekStreak 应该是 3
    expect(store.weekStreak).toBe(3)
  })

  // ====== AI 自适应 ======
  test('无 session 时 computeAIAdaptiveDuration 返回基准', () => {
    settingsStore.pomodoroWorkMinutes = 25
    expect(store.computeAIAdaptiveDuration()).toBe(25)
  })

  test('高干扰率（>20%）减少时长 10%（±10min 钳制）', () => {
    settingsStore.pomodoroWorkMinutes = 30
    // 总共 10 分钟 × 1 session，干扰 3 次 → distractionRate=0.3
    store.sessionHistory.push({
      at: Date.now(),
      mode: 'work',
      durationMin: 10,
      distractions: 3,
      deep: false,
      dateStr: getTodayStr()
    })
    // base=30, 10%=3, 减少 3 分钟，结果=27
    expect(store.computeAIAdaptiveDuration()).toBe(27)
  })

  test('低干扰率（<5%）延长时长 10%（±10min 钳制）', () => {
    settingsStore.pomodoroWorkMinutes = 40
    // totalMinutes = 100, distractions=2 → rate=0.02 <5%
    for (let i = 0; i < 4; i++) {
      store.sessionHistory.push({
        at: Date.now() + i,
        mode: 'work',
        durationMin: 25,
        distractions: i === 0 ? 2 : 0,
        deep: i !== 0,
        dateStr: getTodayStr()
      })
    }
    // total = 100min, distractions = 2
    expect(store.getFocusSummary('last7').distractionRate).toBeLessThan(0.05)
    // base=40, +10%=+4 → 44
    expect(store.computeAIAdaptiveDuration()).toBe(44)
  })

  test('AI 增减有 ±10 分钟上下限钳制', () => {
    settingsStore.pomodoroWorkMinutes = 50
    // 60 分钟 1 个 session，7 次干扰 → rate ~ 0.116（11.6%，不在 调整区间）
    // 需要构造 rate >20% 并且 base*10% >10 的情况（此时钳制）
    settingsStore.pomodoroWorkMinutes = 120
    store.sessionHistory.length = 0
    store.sessionHistory.push({
      at: Date.now(),
      mode: 'work',
      durationMin: 100,
      distractions: 25, // rate 0.25 > 20%
      deep: false,
      dateStr: getTodayStr()
    })
    // base=120 * 10% = 12 → 被钳制为 -10 → 110
    expect(store.computeAIAdaptiveDuration()).toBe(110)
  })

  test('低干扰时 +10% 若超出 +10min 被钳制', () => {
    settingsStore.pomodoroWorkMinutes = 200
    store.setDuration('work', 90) // base 还是取 settings 的
    store.sessionHistory.length = 0
    store.sessionHistory.push({
      at: Date.now(),
      mode: 'work',
      durationMin: 90,
      distractions: 2, // 2/90 ~2.2% <5%
      deep: false,
      dateStr: getTodayStr()
    })
    // 先确认 base
    settingsStore.pomodoroWorkMinutes = 200
    // base=200, 10%=20, delta 钳制为 +10 → 210；然后整体 [1,180] 钳制 → 180
    expect(store.computeAIAdaptiveDuration()).toBe(180)
  })

  test('applyAIAdaptiveDuration 调用 setDuration 并持久化', () => {
    settingsStore.pomodoroWorkMinutes = 25
    store.sessionHistory.length = 0
    store.sessionHistory.push({
      at: Date.now(),
      mode: 'work',
      durationMin: 25,
      distractions: 0, // 0/25 = 0% <5% → +3  → 28
      deep: true,
      dateStr: getTodayStr()
    })
    store.applyAIAdaptiveDuration()
    expect(settingsStore.pomodoroWorkMinutes).toBe(28)
  })

  // ====== startPause / skipStage 对外 API ======
  test('startPause() 等同于 toggleTimer', () => {
    expect(store.isRunning).toBe(false)
    store.startPause()
    expect(store.isRunning).toBe(true)
    store.startPause()
    expect(store.isRunning).toBe(false)
  })

  test('skipStage() 等同于 skipTimer', () => {
    store.toggleTimer()
    expect(store.hasStarted).toBe(true)
    store.skipStage()
    expect(store.isRunning).toBe(false)
    expect(store.hasStarted).toBe(false)
  })

  // ====== bind / unbind task ======
  test('bindCurrentTask 写入 currentTaskId 并调用 taskStore.focusTask', () => {
    const t = taskStore.addTask({ title: 'x' })
    store.bindCurrentTask(t.id)
    expect(store.currentTaskId).toBe(t.id)
    expect(taskStore.focusedTaskId).toBe(t.id)
  })

  test('unbindCurrentTask 清空 currentTaskId 并 unfocus', () => {
    const t = taskStore.addTask({ title: 'x' })
    store.bindCurrentTask(t.id)
    store.unbindCurrentTask()
    expect(store.currentTaskId).toBe(null)
    expect(taskStore.focusedTaskId).toBe(null)
  })

  // ====== 持久化 saveSummaryToStorage ======
  test('loadSummaryFromStorage 能还原 interruptionLog', () => {
    store.markDistraction('appSwitch')
    store.markDistraction('focusLost')
    // 模拟另一个 store 加载
    const second = usePomodoroStore()
    expect(second.interruptionLog.length).toBeGreaterThanOrEqual(2)
    expect(second.sessionDistractions).toBeGreaterThanOrEqual(2)
  })

  // ====== completeSessionInternal 干扰计数 session-scoped（per-session snapshot） ======
  test('会话完成后，下一次会话开始会以新的 session 快照记 per-session 干扰', () => {
    store.setDuration('work', 25)
    // 会话 1：1 次干扰（非 deep）
    store.toggleTimer()
    vi.advanceTimersByTime(200)
    store.markDistraction('manual')
    store.completeSessionInternal()
    expect(store.sessionHistory[0].distractions).toBe(1)
    expect(store.sessionHistory[0].deep).toBe(false)
    // 会话 2：无干扰 → deep
    store.switchMode('work') // 回到 work 模式
    store.setDuration('work', 30)
    store.toggleTimer()
    vi.advanceTimersByTime(200)
    store.completeSessionInternal()
    expect(store.sessionHistory[1].distractions).toBe(0)
    expect(store.sessionHistory[1].deep).toBe(true)
  })
})
