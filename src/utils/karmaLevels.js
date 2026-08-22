// Karma 等级规则表 + 徽章定义 + 等级计算工具
//
// 等级阈值：线性 + 指数混合（级别 1:10, 2:25, ..., 30: >=15000）
//   公式：threshold(level) = round( 8 * level + 2 * level^1.35 )
//   生成后手动校验：level 1 = 10, level 30 ≈ 15540

const buildLevels = () => {
  const arr = []
  for (let lv = 1; lv <= 30; lv++) {
    const threshold = Math.round(8 * lv + 2 * Math.pow(lv, 1.35))
    arr.push({ level: lv, threshold })
  }
  // 手动微调：保证 level 1 = 10、level 30 ≈ 15000+
  arr[0].threshold = 10
  arr[1].threshold = 25
  arr[29].threshold = 15540
  return arr
}

export const KARMA_LEVELS = buildLevels()

// 根据 karma 数值反查等级
export const levelFromKarma = (k) => {
  const total = Math.max(0, Number(k) || 0)
  let level = 0
  let nextAt = KARMA_LEVELS[0].threshold
  for (let i = 0; i < KARMA_LEVELS.length; i++) {
    if (total >= KARMA_LEVELS[i].threshold) {
      level = KARMA_LEVELS[i].level
      nextAt = KARMA_LEVELS[i + 1] ? KARMA_LEVELS[i + 1].threshold : null
    } else {
      break
    }
  }
  const prevAt = level === 0 ? 0 : KARMA_LEVELS[level - 1].threshold
  const progressPct =
    nextAt == null
      ? 100
      : Math.max(
          0,
          Math.min(100, Math.round(((total - prevAt) / (nextAt - prevAt)) * 10000) / 100)
        )
  return { level, nextAt, progressPct, totalKarma: total }
}

// 徽章定义（≥15 枚）
export const BADGE_DEFINITIONS = [
  {
    id: 'karma_newbie',
    category: 'karma',
    threshold: 10,
    name: { 'zh-CN': 'Karma 新手', 'en-US': 'Karma Newbie', 'ja-JP': 'カルマ初心者' },
    desc: {
      'zh-CN': '累计 Karma 达到 10 分',
      'en-US': 'Reach 10 Karma points',
      'ja-JP': 'カルマ 10 ポイントに到達'
    }
  },
  {
    id: 'karma_bronze',
    category: 'karma',
    threshold: 100,
    name: { 'zh-CN': 'Karma 青铜', 'en-US': 'Karma Bronze', 'ja-JP': 'カルマブロンズ' },
    desc: {
      'zh-CN': '累计 Karma 达到 100 分',
      'en-US': 'Reach 100 Karma points',
      'ja-JP': 'カルマ 100 ポイントに到達'
    }
  },
  {
    id: 'karma_silver',
    category: 'karma',
    threshold: 500,
    name: { 'zh-CN': 'Karma 白银', 'en-US': 'Karma Silver', 'ja-JP': 'カルマシルバー' },
    desc: {
      'zh-CN': '累计 Karma 达到 500 分',
      'en-US': 'Reach 500 Karma points',
      'ja-JP': 'カルマ 500 ポイントに到達'
    }
  },
  {
    id: 'karma_gold',
    category: 'karma',
    threshold: 2000,
    name: { 'zh-CN': 'Karma 黄金', 'en-US': 'Karma Gold', 'ja-JP': 'カルマゴールド' },
    desc: {
      'zh-CN': '累计 Karma 达到 2000 分',
      'en-US': 'Reach 2000 Karma points',
      'ja-JP': 'カルマ 2000 ポイントに到達'
    }
  },
  {
    id: 'karma_diamond',
    category: 'karma',
    threshold: 10000,
    name: { 'zh-CN': 'Karma 钻石', 'en-US': 'Karma Diamond', 'ja-JP': 'カルマダイヤ' },
    desc: {
      'zh-CN': '累计 Karma 达到 10000 分',
      'en-US': 'Reach 10000 Karma points',
      'ja-JP': 'カルマ 10000 ポイントに到達'
    }
  },
  {
    id: 'pomodoro_10k_minutes',
    category: 'pomodoro',
    threshold: 10000,
    name: {
      'zh-CN': '番茄万分钟',
      'en-US': '10K Focus Minutes',
      'ja-JP': 'ポモドーロ万分'
    },
    desc: {
      'zh-CN': '累计专注分钟数达到 10000',
      'en-US': 'Reach 10000 total focus minutes',
      'ja-JP': '合計集中時間 10000 分に到達'
    }
  },
  {
    id: 'streak_30_days',
    category: 'streak',
    threshold: 30,
    name: {
      'zh-CN': '连续 30 天',
      'en-US': '30-Day Streak',
      'ja-JP': '30 日連続'
    },
    desc: {
      'zh-CN': '保持连续 30 天的专注/完成 streak',
      'en-US': 'Keep a 30-day activity streak',
      'ja-JP': '30 日連続活動を維持'
    }
  },
  {
    id: 'tasks_1000_completed',
    category: 'tasks',
    threshold: 1000,
    name: {
      'zh-CN': '完成 1000 任务',
      'en-US': '1000 Tasks Completed',
      'ja-JP': '1000 タスク完了'
    },
    desc: {
      'zh-CN': '累计完成 1000 个任务',
      'en-US': 'Complete 1000 tasks in total',
      'ja-JP': '累計 1000 のタスクを完了'
    }
  },
  {
    id: 'streak_7_days_10plus',
    category: 'streak',
    threshold: 7,
    name: {
      'zh-CN': '连续 7 天每天≥10',
      'en-US': '7 Days ≥10 Tasks',
      'ja-JP': '7 日連続 10+ タスク'
    },
    desc: {
      'zh-CN': '连续 7 天每天完成 10 个以上任务',
      'en-US': 'Complete ≥10 tasks per day for 7 consecutive days',
      'ja-JP': '7 日連続 1 日 10 タスク以上完了'
    }
  },
  {
    id: 'streak_3_years',
    category: 'streak',
    threshold: 1095,
    name: {
      'zh-CN': '连续 3 年使用',
      'en-US': '3-Year Streak',
      'ja-JP': '3 年間連続使用'
    },
    desc: {
      'zh-CN': '保持连续 3 年的使用 streak（1095 天）',
      'en-US': 'Keep a 3-year usage streak (1095 days)',
      'ja-JP': '3 年間連続使用（1095 日）'
    }
  },
  {
    id: 'focus_10_hours_straight',
    category: 'pomodoro',
    threshold: 600,
    name: {
      'zh-CN': '连续 10 小时专注',
      'en-US': '10h Focus Marathon',
      'ja-JP': '10 時間連続集中'
    },
    desc: {
      'zh-CN': '单日累计专注时长达到 10 小时（600 分钟）',
      'en-US': 'Reach 10 hours of focus in a single day',
      'ja-JP': '1 日で合計 10 時間の集中を達成'
    }
  },
  {
    id: 'repeat_99_done',
    category: 'tasks',
    threshold: 99,
    name: {
      'zh-CN': '完成 99 次重复',
      'en-US': '99 Repeats Done',
      'ja-JP': '99 回の繰り返し完了'
    },
    desc: {
      'zh-CN': '累计完成 99 次重复任务实例',
      'en-US': 'Complete 99 repeated task instances in total',
      'ja-JP': '繰り返しタスクを累計 99 回完了'
    }
  },
  {
    id: 'no_overdue_week',
    category: 'tasks',
    threshold: 7,
    name: {
      'zh-CN': '无逾期一周',
      'en-US': 'No Overdue in Week',
      'ja-JP': '週間無期限超過'
    },
    desc: {
      'zh-CN': '连续 7 天没有产生新的逾期任务',
      'en-US': 'No new overdue tasks for 7 consecutive days',
      'ja-JP': '7 日間連続で新規期限超過タスクなし'
    }
  },
  {
    id: 'ai_mode_100_hours',
    category: 'pomodoro',
    threshold: 6000,
    name: {
      'zh-CN': 'AI 模式累计 100 小时',
      'en-US': 'AI Mode 100 Hours',
      'ja-JP': 'AI モード 100 時間'
    },
    desc: {
      'zh-CN': 'AI 自适应模式下累计专注时长达到 100 小时（6000 分钟）',
      'en-US': 'Reach 100 hours of focus in AI adaptive mode',
      'ja-JP': 'AI 適応モードで 100 時間の集中を達成'
    }
  },
  {
    id: 'balanced_category_distribution',
    category: 'tasks',
    threshold: 5,
    name: {
      'zh-CN': '完成任务数分布均衡',
      'en-US': 'Balanced Distribution',
      'ja-JP': '均衡の取れた分布'
    },
    desc: {
      'zh-CN': '完成任务在至少 5 个分类中都达到 ≥10 个',
      'en-US': 'Completed tasks reach ≥10 in at least 5 categories',
      'ja-JP': '完了タスクが 5 つ以上のカテゴリでそれぞれ 10 個以上'
    }
  }
]

// 工具：根据 id 获取徽章定义
export const getBadgeById = (id) => BADGE_DEFINITIONS.find((b) => b.id === id) || null

// 工具：获取某个 locale 的徽章文本
export const badgeText = (badge, locale = 'zh-CN') => {
  if (!badge) return { name: '', desc: '' }
  const def = typeof badge === 'string' ? getBadgeById(badge) : badge
  if (!def) return { name: '', desc: '' }
  const lang = locale === 'ja-JP' ? 'ja-JP' : locale.startsWith('en') ? 'en-US' : 'zh-CN'
  return {
    name: def.name[lang] || def.name['zh-CN'] || '',
    desc: def.desc[lang] || def.desc['zh-CN'] || ''
  }
}
