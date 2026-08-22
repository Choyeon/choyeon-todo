// useCommandRegistry.js — 纯 JS 命令注册表（不依赖 Vue/Pinia），支持 MRU + 模糊搜索 + 批量默认命令。
// 通过 opts.bridges 与宿主应用解耦：桥未提供则对应命令无副作用但仍可枚举/搜索/执行。

/**
 * @typedef {{
 *   id: string,
 *   title: string,
 *   description?: string,
 *   keywords?: string[],
 *   shortcut?: string,
 *   section?: 'nav'|'action'|'pomodoro'|'settings'|'data'|'help'|string,
 *   action: (ctx?: any) => any|Promise<any>
 * }} Command
 */

const DEFAULT_SECTION_ORDER = ['nav', 'action', 'pomodoro', 'settings', 'data', 'help']

// -------- fuzzy search helpers --------
const _longestCommonSubstring = (a, b) => {
  const s1 = a.toLowerCase()
  const s2 = b.toLowerCase()
  const m = s1.length
  const n = s2.length
  if (!m || !n) return 0
  let maxLen = 0
  // Use simple 2-row DP table to avoid O(n*m) memory
  let prev = new Array(n + 1).fill(0)
  let curr = new Array(n + 1).fill(0)
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        curr[j] = prev[j - 1] + 1
        if (curr[j] > maxLen) maxLen = curr[j]
      } else {
        curr[j] = 0
      }
    }
    ;[prev, curr] = [curr, prev]
    curr.fill(0)
  }
  return maxLen
}

const _isPrefix = (query, text) => {
  const q = query.trim().toLowerCase()
  if (!q) return false
  const t = text.toLowerCase()
  return t.startsWith(q)
}

const _score = (query, cmd) => {
  if (!query) return 1000 // neutral score for MRU ordering
  const q = query.trim().toLowerCase()
  if (!q) return 0
  const hayfields = [
    cmd.id,
    cmd.title,
    cmd.description || '',
    ...(cmd.keywords || [])
  ]
  let best = 0
  for (const field of hayfields) {
    if (!field) continue
    const f = String(field).toLowerCase()
    // 1. Exact equality of any token
    if (f === q) best = Math.max(best, 1000)
    // 2. Prefix match on whole field
    if (_isPrefix(q, field)) best = Math.max(best, 600 + Math.min(q.length * 5, 200))
    // 3. Prefix on any word
    const words = f.split(/[\s._\-/]/)
    for (const w of words) {
      if (w.startsWith(q)) best = Math.max(best, 500 + Math.min(q.length * 4, 180))
    }
    // 4. Longest common substring
    const lcs = _longestCommonSubstring(q, field)
    const ratio = lcs / Math.max(q.length, 1)
    best = Math.max(best, Math.floor(ratio * 350))
    // 5. Contains the whole query (bonus for length proportion)
    if (f.includes(q)) {
      best = Math.max(best, 200 + Math.floor((q.length / Math.max(f.length, 1)) * 200))
    }
  }
  return best
}

// -------- undo/redo stacks (in-process, per-registry memory) --------
const _noop = () => {}

// -------- default commands (20+) --------
const buildDefaultCommands = (bridges = {}) => {
  const {
    router,
    taskStore,
    settingsStore,
    pomodoroStore,
    snackbar,
    dataBridge,
    quickAdd,
    helpBridge
  } = bridges

  const _go = (routeName) => {
    if (router && typeof router.push === 'function') {
      try { router.push({ name: routeName }).catch(_noop) } catch (_e) { /* ignore */ }
    }
  }

  const navMap = [
    ['home', 'HomeView', '主页', '首页 主页面'],
    ['inbox', 'InboxView', '收件箱', '收件箱 收集箱 inbox'],
    ['myday', 'MyDayView', '我的一天', '今日 today 今日待办'],
    ['planned', 'PlannedView', '计划', '规划 planned 计划中'],
    ['important', 'ImportantView', '重要', '重要任务 星标 starred'],
    ['completed', 'CompletedView', '已完成', '完成 completed done'],
    ['calendar', 'CalendarView', '日历', 'calendar 日程'],
    ['stats', 'StatsView', '统计', '统计 数据 报表 stats'],
    ['review', 'DailyReviewView', '回顾', '回顾 复盘 日回顾 review'],
    ['habits', 'HabitTrackerView', '习惯追踪', '习惯 习惯打卡 habits'],
    ['quickadd', 'QuickAddView', '快速添加', '快速添加 quick add 新任务'],
    ['pomodoro', 'PomodoroView', '番茄钟', '番茄 专注 pomodoro focus'],
    ['settings', 'SettingsView', '设置', '设置 配置 preferences'],
    ['achievements', 'AchievementView', '成就', '成就 achievements 徽章'],
    ['quadrant', 'QuadrantView', '四象限', '四象限 艾森豪威尔矩阵 eisenhower']
  ]
  const navs = navMap.map(([id, routeName, title, kw]) => ({
    id: `app.go.${id}`,
    title: `导航到「${title}」`,
    description: `跳转到${title}页面 (${routeName})`,
    keywords: kw.split(/\s+/),
    section: 'nav',
    action: () => _go(routeName)
  }))

  const actions = [
    {
      id: 'task.addQuick',
      title: '快速新建任务',
      description: '使用快速添加面板新建一个任务',
      keywords: ['新建', '创建', 'add', 'new', 'new task', '创建任务'],
      section: 'action',
      action: (ctx) => {
        const title = (ctx && ctx.title) || (ctx && ctx !== undefined ? String(ctx) : '')
        if (quickAdd && typeof quickAdd.add === 'function') return quickAdd.add(title)
        if (taskStore && typeof taskStore.addQuick === 'function') return taskStore.addQuick(title)
        if (taskStore && typeof taskStore.addTask === 'function' && title) return taskStore.addTask({ title })
        return undefined
      }
    },
    {
      id: 'task.toggleFocus',
      title: '切换任务专注状态',
      description: '为当前任务切换聚焦/专注模式',
      keywords: ['focus', '专注', '聚焦', 'toggle focus'],
      section: 'action',
      action: (ctx) => {
        const id = (ctx && ctx.id) || ctx
        if (taskStore && typeof taskStore.toggleFocus === 'function') {
          if (id) return taskStore.toggleFocus(id)
          return taskStore.toggleFocus()
        }
      }
    },
    {
      id: 'task.markAllComplete',
      title: '标记全部任务为已完成',
      description: '将当前视窗/列表中全部任务标记为已完成',
      keywords: ['mark all', '全部完成', '完成所有', 'complete all'],
      section: 'action',
      action: () => {
        if (taskStore && typeof taskStore.markAllComplete === 'function') return taskStore.markAllComplete()
      }
    },
    {
      id: 'task.undo',
      title: '撤销最近一次操作',
      description: '回滚上一次对任务数据的修改',
      keywords: ['undo', '撤销', '回退', 'ctrl+z'],
      section: 'action',
      action: () => {
        if (taskStore && typeof taskStore.undo === 'function') return taskStore.undo()
        if (dataBridge && typeof dataBridge.undo === 'function') return dataBridge.undo()
      }
    },
    {
      id: 'task.redo',
      title: '重做',
      description: '重复之前撤销的操作',
      keywords: ['redo', '重做', '恢复', 'ctrl+y'],
      section: 'action',
      action: () => {
        if (taskStore && typeof taskStore.redo === 'function') return taskStore.redo()
        if (dataBridge && typeof dataBridge.redo === 'function') return dataBridge.redo()
      }
    }
  ]

  const themes = ['auto', 'light', 'dark']
  const themeCmds = themes.map((t) => ({
    id: `view.switchTheme.${t}`,
    title: `切换主题为${t === 'auto' ? '自动' : t === 'light' ? '浅色' : '深色'}`,
    description: `设置 UI 主题：${t}`,
    keywords: [`theme ${t}`, `主题${t === 'auto' ? '自动' : t === 'light' ? '浅色' : '深色'}`, t, '外观', 'appearance'],
    section: 'settings',
    action: () => {
      if (settingsStore && typeof settingsStore.setTheme === 'function') return settingsStore.setTheme(t)
      if (settingsStore && typeof settingsStore.switchTheme === 'function') return settingsStore.switchTheme(t)
    }
  }))
  // generic switchTheme shortcut (accepts ctx param)
  themeCmds.push({
    id: 'view.switchTheme',
    title: '切换主题',
    description: '通过参数切换主题：auto/light/dark',
    keywords: ['theme', '主题', '切换主题', 'appearance'],
    section: 'settings',
    action: (ctx) => {
      const t = (typeof ctx === 'string' ? ctx : (ctx && ctx.theme)) || 'auto'
      const valid = themes.includes(t) ? t : 'auto'
      if (settingsStore && typeof settingsStore.setTheme === 'function') return settingsStore.setTheme(valid)
      if (settingsStore && typeof settingsStore.switchTheme === 'function') return settingsStore.switchTheme(valid)
    }
  })

  const pomodoroCmds = [
    {
      id: 'pomodoro.startPause',
      title: '番茄钟：开始/暂停',
      description: '开始或暂停当前番茄钟计时',
      keywords: ['start', 'pause', '开始', '暂停', '番茄'],
      section: 'pomodoro',
      action: () => {
        if (pomodoroStore && typeof pomodoroStore.toggle === 'function') return pomodoroStore.toggle()
        if (pomodoroStore && typeof pomodoroStore.startPause === 'function') return pomodoroStore.startPause()
        if (pomodoroStore && typeof pomodoroStore.isRunning === 'boolean') {
          if (pomodoroStore.isRunning) {
            if (typeof pomodoroStore.pause === 'function') return pomodoroStore.pause()
          } else if (typeof pomodoroStore.start === 'function') {
            return pomodoroStore.start()
          }
        }
      }
    },
    {
      id: 'pomodoro.skip',
      title: '番茄钟：跳过当前阶段',
      description: '跳过当前番茄/休息阶段，进入下一阶段',
      keywords: ['skip', '跳过', 'next', '下一个'],
      section: 'pomodoro',
      action: () => {
        if (pomodoroStore && typeof pomodoroStore.skip === 'function') return pomodoroStore.skip()
      }
    },
    {
      id: 'pomodoro.switchWork',
      title: '番茄钟：切换到工作阶段',
      description: '立刻将番茄钟模式切换为工作计时',
      keywords: ['work', '工作', 'focus', '专注'],
      section: 'pomodoro',
      action: () => {
        if (pomodoroStore && typeof pomodoroStore.switchWork === 'function') return pomodoroStore.switchWork()
        if (pomodoroStore && typeof pomodoroStore.setMode === 'function') return pomodoroStore.setMode('work')
      }
    },
    {
      id: 'pomodoro.switchShortBreak',
      title: '番茄钟：切换到短休息',
      description: '立刻进入短休息阶段',
      keywords: ['short break', 'short', '短休', '休息'],
      section: 'pomodoro',
      action: () => {
        if (pomodoroStore && typeof pomodoroStore.switchShortBreak === 'function') return pomodoroStore.switchShortBreak()
        if (pomodoroStore && typeof pomodoroStore.setMode === 'function') return pomodoroStore.setMode('shortBreak')
      }
    }
  ]

  const settingsCmds = [
    {
      id: 'settings.openShortcuts',
      title: '打开快捷键设置',
      description: '进入快捷键配置视图，查看/修改按键绑定',
      keywords: ['shortcuts', 'hotkeys', '快捷键', '键位', '键位绑定'],
      section: 'settings',
      action: () => {
        if (router && typeof router.push === 'function') {
          try { router.push({ name: 'SettingsView', params: { tab: 'shortcuts' } }).catch(_noop) } catch (_e) { _noop() }
          try { router.push({ path: '/settings/shortcuts' }).catch(_noop) } catch (_e) { _noop() }
        }
        if (settingsStore && typeof settingsStore.openTab === 'function') return settingsStore.openTab('shortcuts')
      }
    }
  ]

  const dataCmds = [
    {
      id: 'data.exportAll',
      title: '导出全部数据',
      description: '将任务、设置、番茄钟数据等导出为 JSON/备份文件',
      keywords: ['export', '导出', '备份', 'backup', 'download'],
      section: 'data',
      action: async () => {
        if (dataBridge && typeof dataBridge.exportAll === 'function') return dataBridge.exportAll()
        if (settingsStore && typeof settingsStore.exportAll === 'function') return settingsStore.exportAll()
        if (snackbar && typeof snackbar.show === 'function') snackbar.show({ text: '数据导出桥不可用', type: 'warning' })
      }
    },
    {
      id: 'data.importAll',
      title: '导入数据',
      description: '从备份文件恢复数据（覆盖或合并）',
      keywords: ['import', '导入', 'restore', '恢复', 'load'],
      section: 'data',
      action: async () => {
        if (dataBridge && typeof dataBridge.importAll === 'function') return dataBridge.importAll()
        if (settingsStore && typeof settingsStore.importAll === 'function') return settingsStore.importAll()
        if (snackbar && typeof snackbar.show === 'function') snackbar.show({ text: '数据导入桥不可用', type: 'warning' })
      }
    }
  ]

  const helpCmds = [
    {
      id: 'help.welcome',
      title: '打开欢迎/新手引导',
      description: '显示第一次使用的欢迎界面与功能概览',
      keywords: ['help', 'welcome', 'guide', 'tour', '帮助', '欢迎', '引导', '新手'],
      section: 'help',
      action: () => {
        if (helpBridge && typeof helpBridge.showWelcome === 'function') return helpBridge.showWelcome()
        if (router && typeof router.push === 'function') {
          try { router.push({ name: 'WelcomeView' }).catch(_noop) } catch (_e) { /* ignore */ }
        }
      }
    }
  ]

  return [
    ...navs,
    ...actions,
    ...themeCmds,
    ...pomodoroCmds,
    ...settingsCmds,
    ...dataCmds,
    ...helpCmds
  ]
}

// -------- factory: createCommandRegistry --------
export const createCommandRegistry = (opts = {}) => {
  const bridges = opts.bridges || {}
  /** @type {Map<string, Command>} */
  const commands = new Map()
  // MRU: id -> count (incremented on each run)
  const mru = new Map()

  const _registerOne = (cmd) => {
    if (!cmd || typeof cmd !== 'object') throw new TypeError('[commandRegistry] register expects an object')
    if (typeof cmd.id !== 'string' || !cmd.id) throw new TypeError('[commandRegistry] register requires string id')
    if (typeof cmd.action !== 'function') throw new TypeError(`[commandRegistry] command ${cmd.id} requires function action`)
    const title = cmd.title || cmd.id
    const normalized = Object.assign(
      { description: '', keywords: [], shortcut: '', section: 'action' },
      cmd,
      { title }
    )
    commands.set(normalized.id, normalized)
  }

  // register default commands (if enabled)
  if (opts.includeDefaults !== false) {
    const defs = buildDefaultCommands(bridges)
    for (const c of defs) _registerOne(c)
  }

  const register = (cmdOrArray) => {
    const arr = Array.isArray(cmdOrArray) ? cmdOrArray : [cmdOrArray]
    for (const c of arr) _registerOne(c)
  }

  const unregister = (id) => {
    if (typeof id !== 'string') return false
    const had = commands.has(id)
    commands.delete(id)
    mru.delete(id)
    return had
  }

  const listAll = () => Array.from(commands.values())

  const search = (query = '', options = {}) => {
    const { limit = 20, sections, onlyFavorites = false, recentLimit = 5 } = options
    let pool = Array.from(commands.values())
    if (sections && Array.isArray(sections) && sections.length > 0) {
      const s = new Set(sections)
      pool = pool.filter((c) => s.has(c.section || ''))
    }
    if (onlyFavorites) {
      // favorites is tracked via MRU (top used considered favorites for now)
      pool = pool.filter((c) => (mru.get(c.id) || 0) > 0)
    }

    const result = []
    const added = new Set()

    // 1. MRU (recently executed) first, up to recentLimit, respecting limit
    if (recentLimit > 0) {
      const recent = pool
        .map((c) => ({ c, count: mru.get(c.id) || 0 }))
        .filter((x) => x.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, recentLimit)
      for (const r of recent) {
        if (result.length >= limit) break
        result.push(r.c)
        added.add(r.c.id)
      }
    }

    // 2. If no query, fill remaining with section-ordered list
    const q = (query || '').trim()
    let scored
    if (!q) {
      scored = pool
        .filter((c) => !added.has(c.id))
        .sort((a, b) => {
          const aIdx = DEFAULT_SECTION_ORDER.indexOf(a.section || '')
          const bIdx = DEFAULT_SECTION_ORDER.indexOf(b.section || '')
          if (aIdx !== bIdx) return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx)
          return a.title.localeCompare(b.title)
        })
    } else {
      scored = pool
        .map((c) => ({ c, score: _score(q, c) }))
        .filter((x) => x.score > 0 && !added.has(x.c.id))
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score
          // tie-break: prefer section order then title length
          const aIdx = DEFAULT_SECTION_ORDER.indexOf(a.c.section || '')
          const bIdx = DEFAULT_SECTION_ORDER.indexOf(b.c.section || '')
          if (aIdx !== bIdx) return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx)
          return a.c.title.length - b.c.title.length
        })
        .map((x) => x.c)
    }

    for (const c of scored) {
      if (result.length >= limit) break
      if (added.has(c.id)) continue
      result.push(c)
      added.add(c.id)
    }

    return result
  }

  const run = (id, ctx) => {
    const cmd = commands.get(id)
    if (!cmd) return { ok: false, error: `command not found: ${id}` }
    try {
      const result = cmd.action(ctx)
      // increment MRU count only if synchronous OR Promise resolves successfully
      mru.set(id, (mru.get(id) || 0) + 1)
      if (result && typeof result.then === 'function') {
        return { ok: true, promise: result, value: undefined }
      }
      return { ok: true, value: result }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  // helper: get/clear MRU counts (useful for testing/persistence)
  const _getMruCounts = () => Object.fromEntries(mru.entries())
  const _clearMru = () => { mru.clear() }

  return {
    register,
    unregister,
    search,
    run,
    listAll,
    _getMruCounts,
    _clearMru,
    _internals: { commands, mru }
  }
}

// For convenience, a singleton-like default (lazily created on demand)
let _defaultRegistry = null
export const getDefaultCommandRegistry = (opts) => {
  if (!_defaultRegistry) _defaultRegistry = createCommandRegistry(opts)
  return _defaultRegistry
}

export default createCommandRegistry
