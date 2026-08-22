import { formatDateStr, addDays, getTodayStr } from './date'

const LANG_KEYWORDS = {
  'zh-CN': {
    today: ['今天', '今日', '今天内', '今日内'],
    tomorrow: ['明天', '明日', '明天内', '明日内'],
    dayAfterTomorrow: ['后天'],
    threeDaysLater: ['大后天'],
    yesterday: ['昨天', '昨日', '昨天内', '昨日内'],
    nextWeek: ['下周', '下星期', '下个礼拜'],
    nextNextWeek: ['下下周', '下下星期', '下下个礼拜'],
    inXDays: ['天后', '天之后', '天以后'],
    ordinalXDay: ['第'],
    weekdays: {
      0: ['周日', '周天', '星期天', '星期日', '礼拜天', '礼拜日'],
      1: ['周一', '星期一', '礼拜一'],
      2: ['周二', '星期二', '礼拜二'],
      3: ['周三', '星期三', '礼拜三'],
      4: ['周四', '星期四', '礼拜四'],
      5: ['周五', '星期五', '礼拜五'],
      6: ['周六', '星期六', '礼拜六']
    },
    thisWeekPrefix: ['本', '本周', '这', '这周'],
    nextWeekPrefix: ['下个', '下周', '下', '下星期', '下个礼拜'],
    nextNextWeekPrefix: ['下下', '下下周', '下下个'],
    businessDay: ['工作日', '上班日', '营业日'],
    nextBusinessDay: ['下个工作日', '下一个工作日', '下一工作日'],
    lastDayOfMonth: ['本月最后一天', '月末', '月底', '每月最后一天', '月尾'],
    nthPrefix: ['第'],
    ordinal: { 1: ['一', '1', '1st'], 2: ['二', '2', '2nd'], 3: ['三', '3', '3rd'], 4: ['四', '4', '4th'], 5: ['五', '5', '5th'] },
    morning: ['早上', '上午', '清晨', '凌晨'],
    afternoon: ['下午', '午后'],
    evening: ['晚上', '傍晚', '夜里', '夜间'],
    noon: ['中午', '正午'],
    midnight: ['半夜', '午夜', '深夜'],
    half: ['半'],
    quarter: ['一刻', '一刻钟'],
    now: ['现在', '立刻', '马上', '立即', '当前'],
    monthDay: ['月', '号', '日'],
    priority: {
      0: ['P0', 'p0', '最高', '紧急', '重要紧急', '最高优先级'],
      1: ['P1', 'p1', '高', '高优先级', '很重要', '优先', '优先处理'],
      2: ['P2', 'p2', '中', '中优先级', '一般', '普通'],
      3: ['P3', 'p3', '低', '低优先级', '不重要', '较低'],
      4: ['P4', 'p4', '无', '最低', '最低优先级']
    },
    inlinePriority: {
      0: ['!0', '!紧急', '!最高'],
      1: ['!1', '!高', '!高优先级'],
      2: ['!2', '!中', '!普通'],
      3: ['!3', '!低', '!较低'],
      4: ['!4', '!无', '!最低']
    },
    important: ['重要', '星标', '收藏', '加星', '置顶'],
    reminder: ['提醒', '闹钟', '通知', '提醒我', '记得'],
    repeat: ['重复', '循环', '每天', '每周', '每月', '每年', '次次'],
    every: ['每'],
    stopAfter: ['次后停止', '次之后停止', '次后结束', '次后停'],
    untilKeyword: ['前重复', '之前重复', '前结束', '前停止'],
    pomodoro: ['番茄'],
    area: []
  },
  'en-US': {
    today: ['today', 'tonight', 'this morning', 'this afternoon', 'this evening'],
    tomorrow: ['tomorrow', 'tomorrow morning', 'tomorrow afternoon', 'tomorrow evening', 'tmr'],
    dayAfterTomorrow: ['day after tomorrow', 'the day after tomorrow'],
    threeDaysLater: ['in 3 days', 'three days later'],
    yesterday: ['yesterday', 'yest'],
    nextWeek: ['next week', 'next wk'],
    nextNextWeek: ['week after next', 'the week after next'],
    inXDays: ['days later', 'days from now', 'in '],
    ordinalXDay: ['day '],
    weekdays: {
      0: ['sunday', 'sun', 'sundays'],
      1: ['monday', 'mon', 'mondays'],
      2: ['tuesday', 'tue', 'tues', 'tuesdays'],
      3: ['wednesday', 'wed', 'wednesdays'],
      4: ['thursday', 'thu', 'thur', 'thurs', 'thursdays'],
      5: ['friday', 'fri', 'fridays'],
      6: ['saturday', 'sat', 'saturdays']
    },
    thisWeekPrefix: ['this ', 'coming '],
    nextWeekPrefix: ['next '],
    nextNextWeekPrefix: ['week after next '],
    businessDay: ['business day', 'workday', 'work day'],
    nextBusinessDay: ['next business day', 'next workday', 'next working day'],
    inXBusinessDays: ['business days', 'work days', 'working days'],
    aWeekToday: ['a week today', 'a week from today', 'one week today'],
    lastDayOfMonth: ['last day of the month', 'end of the month', 'eom', 'month end'],
    nthPrefix: [],
    ordinal: { 1: ['1st', 'first', '1'], 2: ['2nd', 'second', '2'], 3: ['3rd', 'third', '3'], 4: ['4th', 'fourth', '4'], 5: ['5th', 'fifth', '5'] },
    morning: ['morning', 'am', 'a.m.', 'in the morning'],
    afternoon: ['afternoon', 'pm', 'p.m.', 'in the afternoon'],
    evening: ['evening', 'night', 'tonight', 'in the evening', 'at night'],
    noon: ['noon', 'midday', '12pm', '12 pm'],
    midnight: ['midnight', '12am', '12 am'],
    half: ['half', ':30'],
    quarter: ['quarter', '15 min', '15 minutes'],
    now: ['now', 'right now', 'immediately', 'asap', 'right away', 'straight away'],
    monthDay: ['/', '-'],
    priority: {
      0: ['P0', 'p0', 'urgent', 'critical', 'highest', 'top priority', 'most important'],
      1: ['P1', 'p1', 'high', 'high priority', 'important', 'priority', 'prioritize'],
      2: ['P2', 'p2', 'medium', 'med', 'normal', 'average', 'standard'],
      3: ['P3', 'p3', 'low', 'low priority', 'less important', 'minor'],
      4: ['P4', 'p4', 'none', 'lowest', 'lowest priority', 'trivial']
    },
    inlinePriority: {
      0: ['!0', '!urgent', '!critical', '!highest'],
      1: ['!1', '!high', '!important'],
      2: ['!2', '!medium', '!normal'],
      3: ['!3', '!low', '!minor'],
      4: ['!4', '!none', '!lowest']
    },
    important: ['important', 'star', 'starred', 'favorite', 'favourite', 'pin', 'pinned'],
    reminder: ['remind', 'reminder', 'alert', 'notify', 'notification', 'alarm', 'bell'],
    repeat: ['repeat', 'recurring', 'daily', 'weekly', 'monthly', 'yearly', 'every day'],
    every: ['every', 'each'],
    stopAfter: ['times then stop', 'occurrences then stop', 'times stop', 'after '],
    untilKeyword: ['until', 'before', 'ending by'],
    pomodoro: ['pomodoro', 'pomo'],
    area: []
  },
  'ja-JP': {
    today: ['今日', '本日', '今日中', '本日中'],
    tomorrow: ['明日', '明日中', 'あした'],
    dayAfterTomorrow: ['明後日', 'あさって'],
    threeDaysLater: ['3日後', '三日後'],
    yesterday: ['昨日', 'きのう'],
    nextWeek: ['来週', 'らいしゅう', '次の週'],
    nextNextWeek: ['再来週', 'さらいしゅう'],
    inXDays: ['日後', '日後に', '日経って'],
    ordinalXDay: ['第'],
    weekdays: {
      0: ['日曜日', '日曜', '日', 'にちようび'],
      1: ['月曜日', '月曜', '月', 'げつようび'],
      2: ['火曜日', '火曜', '火', 'かようび'],
      3: ['水曜日', '水曜', '水', 'すいようび'],
      4: ['木曜日', '木曜', '木', 'もくようび'],
      5: ['金曜日', '金曜', '金', 'きんようび'],
      6: ['土曜日', '土曜', '土', 'どようび']
    },
    thisWeekPrefix: ['今週の', '今度の'],
    nextWeekPrefix: ['来週の', '翌週の', '次の週の'],
    nextNextWeekPrefix: ['再来週の'],
    businessDay: ['営業日', '平日'],
    nextBusinessDay: ['翌営業日', '次の営業日'],
    lastDayOfMonth: ['月末', '今月末', '月の最終日', '最終日'],
    nthPrefix: ['第'],
    ordinal: { 1: ['1', '一', '第1', '最初'], 2: ['2', '二', '第2'], 3: ['3', '三', '第3'], 4: ['4', '四', '第4'], 5: ['5', '五', '第5'] },
    morning: ['朝', '午前', 'あさ', 'ごぜん'],
    afternoon: ['午後', 'ごご', '昼過ぎ'],
    evening: ['夜', '夕方', 'よる', 'ゆうがた', '夜間'],
    noon: ['正午', '昼', 'お昼', 'ちゅうご'],
    midnight: ['深夜', '真夜中', '夜中', 'しんや', 'まよなか'],
    half: ['半', 'はん'],
    quarter: ['15分', '十五分', '一刻'],
    now: ['今', '今すぐ', 'ただちに', '直ちに', '即座に'],
    monthDay: ['月', '日'],
    priority: {
      0: ['P0', 'p0', '緊急', '最重要', '最優先', '最高優先度'],
      1: ['P1', 'p1', '高', '高優先度', '重要', '優先', '優先的'],
      2: ['P2', 'p2', '中', '中優先度', '普通', '通常'],
      3: ['P3', 'p3', '低', '低優先度', '重要でない', '低め'],
      4: ['P4', 'p4', 'なし', '最低', '最低優先度']
    },
    inlinePriority: {
      0: ['!0', '!緊急', '!最優先'],
      1: ['!1', '!高', '!高優先度'],
      2: ['!2', '!中', '!普通'],
      3: ['!3', '!低', '!低優先度'],
      4: ['!4', '!なし', '!最低']
    },
    important: ['重要', 'スター', '星印', 'お気に入り', 'ピン留め'],
    reminder: ['リマインド', 'リマインダー', '通知', 'アラーム', 'アラート', '知らせ'],
    repeat: ['繰り返し', 'リピート', '毎日', '毎週', '毎月', '毎年'],
    every: ['毎', 'ごと'],
    stopAfter: ['回後停止', '回で停止', '回限り'],
    untilKeyword: ['まで繰り返し', 'までに終了', 'まで'],
    pomodoro: ['ポモドーロ', 'ポモ'],
    area: []
  }
}

// ============= helpers for v3 extensions =============
const _copyDate = (d) => (d instanceof Date ? new Date(d.getTime()) : new Date())

const _addDaysRaw = (date, n) => {
  const d = _copyDate(date)
  d.setDate(d.getDate() + n)
  return d
}

const _isWeekend = (date) => {
  const day = date.getDay()
  return day === 0 || day === 6
}

const _addBusinessDays = (date, n) => {
  let d = _copyDate(date)
  let remaining = Math.abs(n)
  const step = n >= 0 ? 1 : -1
  while (remaining > 0) {
    d = _addDaysRaw(d, step)
    if (!_isWeekend(d)) remaining--
  }
  return d
}

const _lastDayOfMonth = (date, monthOffset = 0) => {
  const d = _copyDate(date)
  d.setDate(1)
  d.setMonth(d.getMonth() + 1 + monthOffset)
  d.setDate(0)
  return d
}

// Find the Nth occurrence of a weekday in a given month (month 0-based, nth is 1-5)
const _nthWeekdayOfMonth = (year, month, nth, targetWeekday) => {
  let cursor = new Date(year, month, 1)
  // First day with targetWeekday
  const diff = (targetWeekday - cursor.getDay() + 7) % 7
  cursor.setDate(1 + diff)
  // go to nth
  cursor.setDate(cursor.getDate() + (nth - 1) * 7)
  if (cursor.getMonth() !== month) return null // went past the month
  return cursor
}

const _weekdayFromKeyword = (text, kw, allowLongest = '') => {
  // returns {weekday:number, matched:string} or null
  let best = null
  for (const [idxStr, words] of Object.entries(kw.weekdays)) {
    for (const w of words) {
      if (text.includes(w) && w.length > (best ? best.length : -1) && w.length > allowLongest.length) {
        best = { weekday: parseInt(idxStr), matched: w }
      }
    }
  }
  return best
}

const detectLanguage = (text) => {
  const zhPattern = /[\u4e00-\u9fa5]/
  const jaPattern = /[\u3040-\u309f\u30a0-\u30ff]/

  let zhCount = 0
  let jaCount = 0
  let enCount = 0

  for (const char of text) {
    if (zhPattern.test(char)) zhCount++
    else if (jaPattern.test(char)) jaCount++
    else if (/[a-zA-Z]/.test(char)) enCount++
  }

  if (jaCount > zhCount && jaCount > enCount / 2) return 'ja-JP'
  if (zhCount > 0) return 'zh-CN'
  if (enCount > 0) return 'en-US'
  return 'zh-CN'
}

const getKeywords = (lang) => {
  return LANG_KEYWORDS[lang] || LANG_KEYWORDS['zh-CN']
}

export const parseDateKeyword = (text, now, lang = 'zh-CN') => {
  let date = null
  let matched = ''
  const kw = getKeywords(lang)

  for (const word of kw.today) {
    if (text.includes(word) && word.length > matched.length) {
      date = now
      matched = word
    }
  }

  for (const word of kw.tomorrow) {
    if (text.includes(word) && word.length > matched.length) {
      date = addDays(now, 1)
      matched = word
    }
  }

  for (const word of kw.dayAfterTomorrow) {
    if (text.includes(word) && word.length > matched.length) {
      date = addDays(now, 2)
      matched = word
    }
  }

  for (const word of kw.threeDaysLater) {
    if (text.includes(word) && word.length > matched.length) {
      date = addDays(now, 3)
      matched = word
    }
  }

  for (const word of kw.yesterday) {
    if (text.includes(word) && word.length > matched.length) {
      date = addDays(now, -1)
      matched = word
    }
  }

  for (const word of kw.nextWeek) {
    if (text.includes(word) && word.length > matched.length) {
      date = addDays(now, 7)
      matched = word
    }
  }

  for (const word of kw.nextNextWeek) {
    if (text.includes(word) && word.length > matched.length) {
      date = addDays(now, 14)
      matched = word
    }
  }

  const inXDaysPatterns = [
    { regex: /a\s+week\s+(?:today|from\s+today|hence)/i, fixed: 7 },
    { regex: /two\s+weeks\s+(?:today|from\s+today|hence)/i, fixed: 14 },
    { regex: /three\s+weeks\s+(?:today|from\s+today|hence)/i, fixed: 21 },
    { regex: /a\s+month\s+(?:today|from\s+today|hence)/i, fixed: 30 },
    { regex: /a\s+year\s+(?:today|from\s+today|hence)/i, fixed: 365 },
    { regex: /(\d+)\s*days?\s*(later|from now)/i, offset: 1 },
    { regex: /in\s*(\d+)\s*days?/i, offset: 1 },
    { regex: /(\d+)\s*日後/, offset: 1 },
    { regex: /(\d+)\s*天后/, offset: 1 }
  ]

  for (const pattern of inXDaysPatterns) {
    const match = text.match(pattern.regex)
    if (match) {
      let days
      if (pattern.fixed !== undefined) {
        days = pattern.fixed
      } else {
        days = parseInt(match[1]) * pattern.offset
      }
      if (!isNaN(days) && days > 0 && days <= 730 && match[0].length > matched.length) {
        date = addDays(now, days)
        matched = match[0]
      }
    }
  }

  for (const [weekdayIdx, keywords] of Object.entries(kw.weekdays)) {
    for (const keyword of keywords) {
      if (text.includes(keyword) && keyword.length > matched.length) {
        const targetWeekday = parseInt(weekdayIdx)
        const currentWeekday = now.getDay()
        let diff = targetWeekday - currentWeekday
        if (diff <= 0) diff += 7
        date = addDays(now, diff)
        matched = keyword
      }
    }
  }

  const monthDayMatchZh = text.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]?/)
  const monthDayMatchEn = text.match(/(\d{1,2})[/-](\d{1,2})([/-]\d{2,4})?/)
  const monthDayMatchJa = text.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日?/)

  let monthDayMatch
  if (lang === 'zh-CN') {
    monthDayMatch = monthDayMatchZh || monthDayMatchEn
  } else if (lang === 'ja-JP') {
    monthDayMatch = monthDayMatchJa || monthDayMatchEn
  } else {
    monthDayMatch = monthDayMatchEn
  }

  if (monthDayMatch && monthDayMatch !== monthDayMatchEn) {
    const month = parseInt(monthDayMatch[1]) - 1
    const day = parseInt(monthDayMatch[2])
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      let year = now.getFullYear()
      if (month < now.getMonth() || (month === now.getMonth() && day < now.getDate())) {
        year++
      }
      date = new Date(year, month, day)
      matched = monthDayMatch[0]
    }
  } else if (monthDayMatchEn) {
    const month = parseInt(monthDayMatchEn[1]) - 1
    const day = parseInt(monthDayMatchEn[2])
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      let year = now.getFullYear()
      if (monthDayMatchEn[3]) {
        const yearMatch = monthDayMatchEn[3].replace(/[/-]/, '')
        if (yearMatch.length === 2) {
          year = 2000 + parseInt(yearMatch)
        } else if (yearMatch.length === 4) {
          year = parseInt(yearMatch)
        }
      } else if (month < now.getMonth() || (month === now.getMonth() && day < now.getDate())) {
        year++
      }
      date = new Date(year, month, day)
      matched = monthDayMatchEn[0]
    }
  }

  const fullDateMatch = text.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (fullDateMatch) {
    const year = parseInt(fullDateMatch[1])
    const month = parseInt(fullDateMatch[2]) - 1
    const day = parseInt(fullDateMatch[3])
    if (year >= 2000 && year <= 2100 && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      date = new Date(year, month, day)
      matched = fullDateMatch[0]
    }
  }

  // ========== v3: 序数日（第N天） ==========
  const ordinalDayMatch = text.match(/第\s*(\d+)\s*天?/)
  if (ordinalDayMatch && !matched) {
    const n = parseInt(ordinalDayMatch[1])
    if (!isNaN(n) && n > 0 && n <= 365 && ordinalDayMatch[0].length > matched.length) {
      date = addDays(now, n)
      matched = ordinalDayMatch[0]
    }
  }

  // ========== v3: "a week today" 等英文特殊日期 ==========
  if (kw.aWeekToday && !matched) {
    for (const word of kw.aWeekToday) {
      const lower = text.toLowerCase()
      if (lower.includes(word) && word.length > matched.length) {
        date = addDays(now, 7)
        matched = word
      }
    }
  }

  // ========== v3: 下周一 / next Monday / 来週の水曜日 (prefixed weekday) ==========
  // 先检测 "本周/下周/下下周" 前缀 + weekday 组合
  const _tryPrefixWeekday = (prefixes, weekOffset) => {
    for (const p of prefixes) {
      for (const [idxStr, words] of Object.entries(kw.weekdays)) {
        for (const w of words) {
          const comboEN = new RegExp(`(?:^|[\\s,，。])${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i')
          // Simpler: text contains p immediately followed by w
          const comboPattern = p + w
          if (text.includes(comboPattern) && comboPattern.length > matched.length) {
            const tw = parseInt(idxStr)
            const cw = now.getDay()
            let diff = tw - cw + weekOffset * 7
            if (weekOffset === 0 && diff < 0) diff += 0 // 本周，即使已过也算这周 (e.g. 本周三)
            // for "本", interpret as: if weekday passed, still use that weekday (same week)
            let startDiff = cw === 0 ? -6 : 1 - cw // Monday of this week
            const mondayOfThisWeek = _addDaysRaw(now, startDiff)
            const target = _addDaysRaw(mondayOfThisWeek, (tw === 0 ? 6 : tw - 1) + weekOffset * 7)
            date = target
            matched = comboPattern
          } else {
            // Try loose for English: "next Monday" (space between)
            const pTrim = p.trim()
            const re = new RegExp('(^|\\s)' + pTrim.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
            const mm = text.match(re)
            if (mm && mm[0].trim().length > matched.length) {
              const tw = parseInt(idxStr)
              const cw = now.getDay()
              const startDiff = cw === 0 ? -6 : 1 - cw
              const mondayOfThisWeek = _addDaysRaw(now, startDiff)
              const target = _addDaysRaw(mondayOfThisWeek, (tw === 0 ? 6 : tw - 1) + weekOffset * 7)
              date = target
              matched = mm[0].trim()
            }
          }
        }
      }
    }
  }
  if (kw.nextNextWeekPrefix) _tryPrefixWeekday(kw.nextNextWeekPrefix, 2)
  if (kw.nextWeekPrefix) _tryPrefixWeekday(kw.nextWeekPrefix, 1)
  if (kw.thisWeekPrefix) _tryPrefixWeekday(kw.thisWeekPrefix, 0)

  // ========== v3: 下个工作日 / next business day / 翌営業日 ==========
  for (const word of kw.nextBusinessDay || []) {
    const lower = text.toLowerCase()
    if (lower.includes(word.toLowerCase()) && word.length > matched.length) {
      date = _addBusinessDays(now, 1)
      matched = word
    }
  }

  // ========== v3: in 3 business days ==========
  const bizDayPatterns = [
    /in\s+(\d+)\s*business\s+days?/i,
    /in\s+(\d+)\s*working\s+days?/i,
    /(\d+)\s*business\s+days?\s*(later|from now)/i,
    /(\d+)\s*个?\s*(?:工作日|上班日|营业日)\s*(?:后|之后|以后)/,
    /(\d+)\s*営業日\s*(?:後|後に)?/
  ]
  for (const pat of bizDayPatterns) {
    const m = text.match(pat)
    if (m) {
      const n = parseInt(m[1])
      if (!isNaN(n) && n > 0 && n <= 365 && m[0].length > matched.length) {
        date = _addBusinessDays(now, n)
        matched = m[0]
      }
    }
  }

  // ========== v3: 本月最后一天 / last day of the month / 月末 ==========
  for (const word of kw.lastDayOfMonth || []) {
    const lower = text.toLowerCase()
    if (lower.includes(word.toLowerCase()) && word.length > matched.length) {
      date = _lastDayOfMonth(now, 0)
      matched = word
    }
  }

  // ========== v3: X月第N个周W ==========
  // 中文: 5月第二个星期一
  const zhNthMatch = text.match(/(\d{1,2})\s*月\s*(?:第)?\s*([一二三四五12345])\s*个?\s*(周[一二三四五六日天]|星期[一二三四五六日天]|礼拜[一二三四五六日天])/)
  if (zhNthMatch && zhNthMatch[0].length > matched.length) {
    const month = parseInt(zhNthMatch[1]) - 1
    const cnOrd = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5 }
    const nth = cnOrd[zhNthMatch[2]] || 1
    let wkStr = zhNthMatch[3]
    const wkMap = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 0, '天': 0 }
    let tw = null
    for (const ch of wkStr) {
      if (wkMap[ch] !== undefined) { tw = wkMap[ch]; break }
    }
    if (month >= 0 && month <= 11 && nth >= 1 && nth <= 5 && tw !== null) {
      let year = now.getFullYear()
      if (month < now.getMonth()) year++
      const d = _nthWeekdayOfMonth(year, month, nth, tw)
      if (d) {
        date = d
        matched = zhNthMatch[0]
      }
    }
  }
  // 英文: 2nd Monday of May
  const enNthMatch = text.match(/(\d+(?:st|nd|rd|th)?)\s*(monday|mon|tuesday|tue|wednesday|wed|thursday|thu|friday|fri|saturday|sat|sunday|sun)\s*of\s*(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i)
  if (enNthMatch && enNthMatch[0].length > matched.length) {
    const nth = parseInt(enNthMatch[1].replace(/[^0-9]/g, ''))
    const wdLower = enNthMatch[2].toLowerCase()
    const moLower = enNthMatch[3].toLowerCase()
    const wdMap = { sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tue: 2, wednesday: 3, wed: 3, thursday: 4, thu: 4, friday: 5, fri: 5, saturday: 6, sat: 6 }
    const moMap = { january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2, april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6, august: 7, aug: 7, september: 8, sep: 8, october: 9, oct: 9, november: 10, nov: 10, december: 11, dec: 11 }
    const tw = wdMap[wdLower]
    const month = moMap[moLower]
    if (nth >= 1 && nth <= 5 && tw !== undefined && month !== undefined) {
      let year = now.getFullYear()
      if (month < now.getMonth()) year++
      const d = _nthWeekdayOfMonth(year, month, nth, tw)
      if (d) {
        date = d
        matched = enNthMatch[0]
      }
    }
  }
  // 日文: 5月第2月曜日
  const jaNthMatch = text.match(/(\d{1,2})\s*月\s*第?\s*([1-5一二三四五])\s*(月|火|水|木|金|土|日)\s*曜日?/)
  if (jaNthMatch && jaNthMatch[0].length > matched.length) {
    const month = parseInt(jaNthMatch[1]) - 1
    const cnOrd = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5 }
    const nth = cnOrd[jaNthMatch[2]] || 1
    const jaWd = { '月': 1, '火': 2, '水': 3, '木': 4, '金': 5, '土': 6, '日': 0 }
    const tw = jaWd[jaNthMatch[3]]
    if (month >= 0 && month <= 11 && nth >= 1 && nth <= 5 && tw !== undefined) {
      let year = now.getFullYear()
      if (month < now.getMonth()) year++
      const d = _nthWeekdayOfMonth(year, month, nth, tw)
      if (d) {
        date = d
        matched = jaNthMatch[0]
      }
    }
  }

  return { date, matched }
}

const parseTimeKeyword = (text, lang = 'zh-CN') => {
  let time = null
  let matched = ''
  const kw = getKeywords(lang)

  const timePatterns = [
    {
      regex: /(\d{1,2})\s*[:：]\s*(\d{1,2})(?:\s*[:：]\s*(\d{1,2}))?/,
      hourGroup: 1,
      minuteGroup: 2
    },
    {
      regex: /(\d{1,2})\s*時\s*(\d{1,2})\s*分?/,
      hourGroup: 1,
      minuteGroup: 2
    },
    {
      regex: /(\d{1,2})\s*点(?:半|一刻|\s*(\d{1,2})\s*分?)?/,
      hourGroup: 1,
      minuteGroup: null,
      special: 'chinese'
    }
  ]

  for (const pattern of timePatterns) {
    const match = text.match(pattern.regex)
    if (match) {
      let hour = parseInt(match[pattern.hourGroup])
      let minute = 0

      if (pattern.minuteGroup && match[pattern.minuteGroup]) {
        minute = parseInt(match[pattern.minuteGroup])
      } else if (pattern.special === 'chinese') {
        if (match[0].includes('半')) {
          minute = 30
        } else if (match[0].includes('一刻')) {
          minute = 15
        } else if (match[2]) {
          minute = parseInt(match[2])
        }
      }

      let period = null
      if (
        /am|a\.m\.|午前|あさ|ごぜん|morning|早上|上午|清晨|凌晨/.test(text.toLowerCase()) ||
        text.includes('午前')
      ) {
        period = 'morning'
      } else if (
        /pm|p\.m\.|午後|ごご|afternoon|下午|午后/.test(text.toLowerCase()) ||
        text.includes('午後')
      ) {
        period = 'afternoon'
      } else if (
        /evening|night|tonight|晚上|傍晚|夜里|夜间|よる|ゆうがた|夜/.test(text.toLowerCase())
      ) {
        period = 'evening'
      } else if (/noon|midday|中午|正午|お昼|ちゅうご/.test(text.toLowerCase())) {
        period = 'noon'
      } else if (/midnight|深夜|真夜中|夜中|しんや|まよなか/.test(text.toLowerCase())) {
        period = 'midnight'
      }

      if (period === 'afternoon' || period === 'evening') {
        if (hour < 12) hour += 12
      } else if (period === 'morning' || period === 'midnight') {
        if (hour === 12) hour = 0
      } else if (period === 'noon') {
        if (hour < 10) hour += 12
      }

      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
        matched = match[0].trim()
        break
      }
    }
  }

  if (!time) {
    const singleHourPatterns = [
      /(\d{1,2})\s*点/,
      /(\d{1,2})\s*時/,
      /(\d{1,2})\s*o'clock/i,
      /at\s+(\d{1,2})/i
    ]

    for (const pattern of singleHourPatterns) {
      const match = text.match(pattern)
      if (match) {
        let hour = parseInt(match[1])
        let minute = 0

        let period = null
        const lowerText = text.toLowerCase()
        if (/am|a\.m\.|午前|morning|早上|上午|清晨|凌晨/.test(lowerText) || text.includes('午前')) {
          period = 'morning'
        } else if (/pm|p\.m\.|午後|afternoon|下午|午后/.test(lowerText) || text.includes('午後')) {
          period = 'afternoon'
        } else if (/evening|night|tonight|晚上|傍晚|夜里|夜间/.test(lowerText)) {
          period = 'evening'
        }

        if (period === 'afternoon' || period === 'evening') {
          if (hour < 12) hour += 12
        } else if (period === 'morning') {
          if (hour === 12) hour = 0
        }

        if (hour >= 0 && hour <= 23) {
          time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
          matched = match[0].trim()
          break
        }
      }
    }
  }

  if (!time) {
    for (const word of kw.now) {
      if (text.toLowerCase().includes(word.toLowerCase())) {
        const now = new Date()
        time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
        matched = word
        break
      }
    }
  }

  if (!time) {
    const breakfastPattern = /breakfast|朝ご飯|朝食|早餐|早饭/i
    const lunchPattern = /lunch|昼ご飯|昼食|午餐|午饭|お昼/i
    const dinnerPattern = /dinner|晩ご飯|夕食|晚餐|晚饭|夜ご飯/i

    if (breakfastPattern.test(text)) {
      time = '08:00'
      matched = text.match(breakfastPattern)[0]
    } else if (lunchPattern.test(text)) {
      time = '12:00'
      matched = text.match(lunchPattern)[0]
    } else if (dinnerPattern.test(text)) {
      time = '19:00'
      matched = text.match(dinnerPattern)[0]
    }
  }

  return { time, matched }
}

const parsePriority = (text, lang = 'zh-CN') => {
  let priority = null
  let matched = ''
  const kw = getKeywords(lang)

  for (const [priorityLevel, keywords] of Object.entries(kw.priority)) {
    for (const keyword of keywords) {
      const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      if (regex.test(text) && keyword.length > matched.length) {
        priority = parseInt(priorityLevel)
        matched = keyword
      }
    }
  }

  if (priority === null) {
    for (const word of kw.important) {
      if (text.toLowerCase().includes(word.toLowerCase()) && word.length > matched.length) {
        priority = 1
        matched = word
      }
    }
  }

  return { priority, matched }
}

const parseTags = (text, allTags) => {
  const tags = []
  const matchedParts = []

  const tagMatches = text.match(/[#＃]\s*(\S+)/g)
  if (tagMatches) {
    for (const match of tagMatches) {
      const tagName = match.replace(/^[#＃]\s*/, '')
      const existingTag = allTags.find((t) => t.name.toLowerCase() === tagName.toLowerCase())
      if (existingTag) {
        tags.push(existingTag.id)
      }
      matchedParts.push(match)
    }
  }

  if (allTags) {
    for (const tag of allTags) {
      if (text.toLowerCase().includes(tag.name.toLowerCase()) && !tags.includes(tag.id)) {
        const tagIndex = tags.indexOf(tag.id)
        if (tagIndex === -1) {
          tags.push(tag.id)
          matchedParts.push(tag.name)
        }
      }
    }
  }

  return { tags, matched: matchedParts }
}

const parseCategory = (text, allCategories, lang = 'zh-CN') => {
  let categoryId = null
  let matched = ''

  const defaultCategories = {
    'zh-CN': {
      work: ['工作', '上班'],
      personal: ['个人', '私人'],
      study: ['学习', '读书'],
      shopping: ['购物', '买'],
      health: ['健康', '运动', '健身'],
      other: ['其他', '别的']
    },
    'en-US': {
      work: ['work', 'job', 'office'],
      personal: ['personal', 'private'],
      study: ['study', 'learn', 'reading'],
      shopping: ['shopping', 'buy', 'purchase'],
      health: ['health', 'exercise', 'fitness', 'workout'],
      other: ['other', 'misc']
    },
    'ja-JP': {
      work: ['仕事', '業務', '出社'],
      personal: ['個人', 'プライベート'],
      study: ['勉強', '学習', '読書'],
      shopping: ['買い物', '購入'],
      health: ['健康', '運動', 'フィットネス'],
      other: ['その他', '他']
    }
  }

  if (allCategories) {
    for (const cat of allCategories) {
      if (text.toLowerCase().includes(cat.name.toLowerCase()) && cat.name.length > matched.length) {
        categoryId = cat.id
        matched = cat.name
      }
    }
  }

  if (!categoryId) {
    const langCats = defaultCategories[lang] || defaultCategories['zh-CN']
    for (const [catKey, keywords] of Object.entries(langCats)) {
      for (const keyword of keywords) {
        if (text.toLowerCase().includes(keyword.toLowerCase()) && keyword.length > matched.length) {
          const existingCat = allCategories?.find(
            (c) => c.name.toLowerCase() === catKey.toLowerCase() || c.id === catKey
          )
          if (existingCat) {
            categoryId = existingCat.id
            matched = keyword
          }
        }
      }
    }
  }

  return { categoryId, matched }
}

const parseReminder = (text, lang = 'zh-CN') => {
  let reminder = false
  let matched = ''
  const kw = getKeywords(lang)

  for (const word of kw.reminder) {
    if (text.toLowerCase().includes(word.toLowerCase())) {
      reminder = true
      if (word.length > matched.length) {
        matched = word
      }
    }
  }

  return { reminder, matched }
}

const parseImportant = (text, lang = 'zh-CN') => {
  let important = false
  let matched = ''
  const kw = getKeywords(lang)

  for (const word of kw.important) {
    if (text.toLowerCase().includes(word.toLowerCase())) {
      important = true
      if (word.length > matched.length) {
        matched = word
      }
    }
  }

  return { important, matched }
}

const parseRepeat = (text, lang = 'zh-CN') => {
  let repeat = null
  let matched = ''

  const repeatPatterns = {
    'zh-CN': [
      { pattern: /每天|每日|天天/, type: 'daily' },
      { pattern: /每周|每星期|每个礼拜/, type: 'weekly' },
      { pattern: /每月|每个月/, type: 'monthly' },
      { pattern: /每年|每一年/, type: 'yearly' },
      { pattern: /工作日|上班日/, type: 'weekdays' },
      { pattern: /周末|双休日/, type: 'weekends' }
    ],
    'en-US': [
      { pattern: /daily|every day|each day/i, type: 'daily' },
      { pattern: /weekly|every week|each week/i, type: 'weekly' },
      { pattern: /monthly|every month|each month/i, type: 'monthly' },
      { pattern: /yearly|every year|each year|annually/i, type: 'yearly' },
      { pattern: /weekdays|work days|business days/i, type: 'weekdays' },
      { pattern: /weekends|on weekends/i, type: 'weekends' }
    ],
    'ja-JP': [
      { pattern: /毎日|まいにち/, type: 'daily' },
      { pattern: /毎週|まいしゅう|週に/, type: 'weekly' },
      { pattern: /毎月|まいつき|月に/, type: 'monthly' },
      { pattern: /毎年|まいとし|年に/, type: 'yearly' },
      { pattern: /平日|へいじつ/, type: 'weekdays' },
      { pattern: /週末|しゅうまつ/, type: 'weekends' }
    ]
  }

  const patterns = repeatPatterns[lang] || repeatPatterns['zh-CN']
  for (const { pattern, type } of patterns) {
    const match = text.match(pattern)
    if (match && match[0].length > matched.length) {
      repeat = type
      matched = match[0]
    }
  }

  return { repeat, matched }
}

// ========== v3 parseRepeatExtended ==========
// RepeatConfig:
// { type: 'daily'|'weekly'|'monthly'|'yearly', weekdays?:number[], everyNWeeks?:number,
//   everyNMonths?:number, everyNYears?:number, stopAfter?:number, until?:dateStr,
//   dayOfMonth?:number, nthWeekday?:{n:number,weekday:number}, isLastWorkday?:boolean }
// Helper: 解析中文或阿拉伯数字为整数
const _parseNum = (s) => {
  if (s === undefined || s === null) return NaN
  if (typeof s === 'number') return s
  const str = String(s).trim()
  if (!str) return NaN
  // Arabic digits
  if (/^\d+$/.test(str)) return parseInt(str, 10)
  // Chinese numerals (1-99)
  const cnDigits = { '零': 0, '〇': 0, '一': 1, '二': 2, '两': 2, '兩': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '壹': 1, '貳': 2, '參': 3, '肆': 4, '伍': 5, '陸': 6, '柒': 7, '捌': 8, '玖': 9 }
  if (str === '十') return 10
  if (/^十[一二三四五六七八九]$/.test(str)) return 10 + cnDigits[str.charAt(1)]
  if (/^[二三四五六七八九]十$/.test(str)) return cnDigits[str.charAt(0)] * 10
  if (/^[二三四五六七八九]十[一二三四五六七八九]$/.test(str)) return cnDigits[str.charAt(0)] * 10 + cnDigits[str.charAt(2)]
  if (/^[零〇一二两兩三四五六七八九壹貳參肆伍陸柒捌玖]$/.test(str)) return cnDigits[str]
  return NaN
}

export const parseRepeatExtended = (text, lang = 'zh-CN') => {
  const kw = getKeywords(lang)
  const lower = text.toLowerCase()
  /** @type {any} */
  const cfg = { matched: '', type: null }

  const _updateMatchIfLonger = (matchStr) => {
    if (matchStr && matchStr.length > cfg.matched.length) cfg.matched = matchStr
  }

  // --- 1. Daily patterns ---
  const dailyPatterns = [
    { re: /(每天|每日|天天|日々|毎日|まいにち)/, type: 'daily' },
    { re: /(every\s+day|each\s+day|daily)/i, type: 'daily' }
  ]
  for (const p of dailyPatterns) {
    const m = text.match(p.re)
    if (m) {
      cfg.type = 'daily'
      _updateMatchIfLonger(m[0])
    }
  }

  // --- 2. Weekly patterns with weekdays ---
  // 中文: 每周一三五 / 每两周周三 / 每两周一三五 / 每周周一周三
  const zhWeeklyMulti = text.match(/每([一二三四五六七八九十两\d]+)?周(?:周)?([一二三四五六日天][一二三四五六日天]*(?:周[一二三四五六日天])*)/)
  if (zhWeeklyMulti) {
    cfg.type = 'weekly'
    const everyN = zhWeeklyMulti[1] ? _parseNum(zhWeeklyMulti[1]) : 1
    if (!isNaN(everyN) && everyN > 1) cfg.everyNWeeks = everyN
    const wkMap = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 0, '天': 0 }
    const raw = zhWeeklyMulti[2] || ''
    const wds = []
    for (const ch of raw) {
      if (wkMap[ch] !== undefined && !wds.includes(wkMap[ch])) wds.push(wkMap[ch])
    }
    if (wds.length > 0) cfg.weekdays = wds
    _updateMatchIfLonger(zhWeeklyMulti[0])
  }
  // 英文: every Mon Wed Fri / every 2 weeks on Thursday
  const enWeekMulti = text.match(/every\s+((?:mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s*(?:,|\s)\s*(?:mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday))*)/i)
  if (enWeekMulti) {
    cfg.type = 'weekly'
    const wdMap = { sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tue: 2, tues: 2, wednesday: 3, wed: 3, thursday: 4, thu: 4, thur: 4, thurs: 4, friday: 5, fri: 5, saturday: 6, sat: 6 }
    const tokens = enWeekMulti[1].split(/\s*(?:,|\s)\s*/).filter(Boolean)
    const wds = []
    for (const t of tokens) {
      const k = t.toLowerCase()
      if (wdMap[k] !== undefined && !wds.includes(wdMap[k])) wds.push(wdMap[k])
    }
    if (wds.length > 0) cfg.weekdays = wds
    _updateMatchIfLonger(enWeekMulti[0])
  }
  // every 2 weeks on Thursday
  const enEveryNWeekOnW = text.match(/every\s+(\d+)\s+weeks?\s+on\s+(mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i)
  if (enEveryNWeekOnW) {
    cfg.type = 'weekly'
    cfg.everyNWeeks = parseInt(enEveryNWeekOnW[1])
    const wdMap = { sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tue: 2, tues: 2, wednesday: 3, wed: 3, thursday: 4, thu: 4, thur: 4, thurs: 4, friday: 5, fri: 5, saturday: 6, sat: 6 }
    cfg.weekdays = [wdMap[enEveryNWeekOnW[2].toLowerCase()] || 1]
    _updateMatchIfLonger(enEveryNWeekOnW[0])
  }
  // 日文: 毎週月水金 / 2週間ごとの木曜日
  const jaWeekly = text.match(/毎週([月火水木金土日]+)/)
  if (jaWeekly) {
    cfg.type = 'weekly'
    const jaWd = { '月': 1, '火': 2, '水': 3, '木': 4, '金': 5, '土': 6, '日': 0 }
    const wds = []
    for (const ch of jaWeekly[1]) {
      if (jaWd[ch] !== undefined && !wds.includes(jaWd[ch])) wds.push(jaWd[ch])
    }
    if (wds.length > 0) cfg.weekdays = wds
    _updateMatchIfLonger(jaWeekly[0])
  }
  // 週に1度、毎週月曜日 (週間)
  const jaWeeklySingle = text.match(/毎週\s*([月火水木金土日])\s*曜日?/)
  if (jaWeeklySingle) {
    cfg.type = 'weekly'
    const jaWd = { '月': 1, '火': 2, '水': 3, '木': 4, '金': 5, '土': 6, '日': 0 }
    cfg.weekdays = [jaWd[jaWeeklySingle[1]]]
    _updateMatchIfLonger(jaWeeklySingle[0])
  }

  // default weekly fallback (parseRepeat):
  if (!cfg.type) {
    const { repeat, matched } = parseRepeat(text, lang)
    if (repeat === 'daily' || repeat === 'weekly' || repeat === 'monthly' || repeat === 'yearly') {
      cfg.type = repeat
      _updateMatchIfLonger(matched)
    } else if (repeat === 'weekdays') {
      cfg.type = 'weekly'
      cfg.weekdays = [1, 2, 3, 4, 5]
      _updateMatchIfLonger(matched)
    } else if (repeat === 'weekends') {
      cfg.type = 'weekly'
      cfg.weekdays = [0, 6]
      _updateMatchIfLonger(matched)
    }
  }

  // --- 3. Monthly patterns ---
  // 中文: 每月15号
  const zhMonthDay = text.match(/每月\s*(\d{1,2})\s*[日号]/)
  if (zhMonthDay) {
    cfg.type = 'monthly'
    cfg.dayOfMonth = parseInt(zhMonthDay[1])
    _updateMatchIfLonger(zhMonthDay[0])
  }
  // 英文: monthly on the 15th / every month on the 15th
  const enMonthDay = text.match(/(?:monthly|every\s*month)\s*on\s*the\s*(\d{1,2})(?:st|nd|rd|th)?/i)
  if (enMonthDay) {
    cfg.type = 'monthly'
    cfg.dayOfMonth = parseInt(enMonthDay[1])
    _updateMatchIfLonger(enMonthDay[0])
  }
  // 中文: 每月最后一个工作日
  const zhLastWorkday = text.match(/每月最后一个工作日|每月最后工作日|每个月最后一个工作日/)
  if (zhLastWorkday) {
    cfg.type = 'monthly'
    cfg.isLastWorkday = true
    _updateMatchIfLonger(zhLastWorkday[0])
  }
  // 日文: 毎月15日
  const jaMonthDay = text.match(/毎月\s*(\d{1,2})\s*日/)
  if (jaMonthDay) {
    cfg.type = 'monthly'
    cfg.dayOfMonth = parseInt(jaMonthDay[1])
    _updateMatchIfLonger(jaMonthDay[0])
  }

  // every 2 months
  const enEveryNMonths = text.match(/every\s+(\d+)\s+months?/i)
  if (enEveryNMonths) {
    cfg.type = 'monthly'
    cfg.everyNMonths = parseInt(enEveryNMonths[1])
    _updateMatchIfLonger(enEveryNMonths[0])
  }

  // --- 4. Yearly patterns ---
  // every year / annually / 每年 / 毎年
  const yearlyFallback = lower.includes('annually') || /(每年|每一年)/.test(text) || /(毎年|まいとし)/.test(text)
  if (yearlyFallback && !cfg.type) {
    cfg.type = 'yearly'
    if (!cfg.matched) _updateMatchIfLonger('yearly')
  }

  // --- 5. stopAfter: 7 次后停止 ---
  // 中文: 从今天起 7 次后停止 (抓次数)
  const stopZH = text.match(/(\d+)\s*次\s*(?:后|之后)?\s*(?:停止|结束|停)/)
  if (stopZH) {
    cfg.stopAfter = parseInt(stopZH[1])
    _updateMatchIfLonger(stopZH[0])
  }
  // 英文: after 7 times then stop / 7 occurrences then stop
  const stopEN = text.match(/(?:after\s+)?(\d+)\s*(?:times|occurrences)\s*(?:\s*then\s*)?(?:stop|end)/i)
  if (stopEN) {
    cfg.stopAfter = parseInt(stopEN[1])
    _updateMatchIfLonger(stopEN[0])
  }
  // 日文: 7回後停止
  const stopJA = text.match(/(\d+)\s*回\s*(?:後|で)?\s*(?:停止|終了)/)
  if (stopJA) {
    cfg.stopAfter = parseInt(stopJA[1])
    _updateMatchIfLonger(stopJA[0])
  }

  // --- 6. until: 日期前重复 ---
  // 从 "2026-12-31 前重复" / "until 2026-12-31"
  const untilDateMatch = text.match(/(?:until\s+|before\s+)?(\d{4})[-/](\d{1,2})[-/](\d{1,2})\s*(?:前重复|前停止|之前重复|前结束)?/i)
  if (untilDateMatch) {
    const y = parseInt(untilDateMatch[1])
    const mo = parseInt(untilDateMatch[2]) - 1
    const d = parseInt(untilDateMatch[3])
    if (y >= 2000 && y <= 2100 && mo >= 0 && mo <= 11 && d >= 1 && d <= 31) {
      const dt = new Date(y, mo, d)
      cfg.until = formatDateStr(dt)
      _updateMatchIfLonger(untilDateMatch[0])
    }
  }
  // "本月末 前重复" / until end of month
  if (/月末前重复|月末前停止|月底前|月尾前/.test(text)) {
    cfg.until = formatDateStr(_lastDayOfMonth(new Date(), 0))
    _updateMatchIfLonger('月末前重复')
  }

  const result = { matched: cfg.matched }
  if (cfg.type) result.type = cfg.type
  if (cfg.weekdays) result.weekdays = cfg.weekdays
  if (cfg.everyNWeeks) result.everyNWeeks = cfg.everyNWeeks
  if (cfg.everyNMonths) result.everyNMonths = cfg.everyNMonths
  if (cfg.stopAfter !== undefined) result.stopAfter = cfg.stopAfter
  if (cfg.until) result.until = cfg.until
  if (cfg.dayOfMonth !== undefined) result.dayOfMonth = cfg.dayOfMonth
  if (cfg.nthWeekday) result.nthWeekday = cfg.nthWeekday
  if (cfg.isLastWorkday) result.isLastWorkday = cfg.isLastWorkday

  return result
}

// ========== v3: parseInlineSyntax ==========
// Returns { parsedFields, toRemove: string[], tagNames:string[], hints:string[] }
// parsedFields includes: priority, categoryId, listId, tags, areaId, reminder, time, date, dueUntil, pomodoroEstimateMinutes, notes, isLink
export const parseInlineSyntax = (text, ctx = {}, lang = 'zh-CN') => {
  const { categories = [], tags = [], areas = [] } = ctx
  const kw = getKeywords(lang)
  const result = {
    priority: null,
    priorityMatched: '',
    categoryId: null,
    listId: null,
    categoryMatched: '',
    tagIds: [],
    tagNames: [], // new tag suggestions
    tagsMatched: [],
    areaId: null,
    areaName: null,
    areaMatched: '',
    reminder: false,
    reminderTime: null,
    reminderDate: null,
    reminderMatched: '',
    dueUntil: null,
    dueUntilMatched: '',
    pomodoroEstimateMinutes: null,
    pomodoroMatched: '',
    toRemove: [],
    hints: []
  }

  // --- A. Inline Priority: !0..!4 or !紧急/!high  (longer match wins) ---
  for (const [lvlStr, words] of Object.entries(kw.inlinePriority || {})) {
    for (const w of words) {
      const pattern = new RegExp('(^|\\s)' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=\\s|$|[，,。.！!？?、；;:：])', 'i')
      const m = text.match(pattern)
      if (m && w.length > result.priorityMatched.length) {
        result.priority = parseInt(lvlStr)
        result.priorityMatched = w
      }
    }
  }
  // Short forms: !0 / !1 anywhere
  const shortPri = text.match(/!([0-4])(?=\s|$|[^a-zA-Z0-9])/g)
  if (shortPri && shortPri.length > 0) {
    for (const tok of shortPri) {
      if (tok.length > result.priorityMatched.length || result.priorityMatched === '') {
        const n = parseInt(tok[1])
        result.priority = n
        result.priorityMatched = tok
      }
    }
  }

  // --- B. @分类名 category (最近名称匹配，若未匹配则存 hints) ---
  const atMention = text.match(/@([^\s@#$!~>⏱]+?)(?=[\s，,。.！!？?、；;:：]|$)/g)
  if (atMention) {
    for (const tok of atMention) {
      const name = tok.slice(1).trim()
      if (!name) continue
      // find in categories by name (fuzzy)
      let best = null
      let bestScore = -1
      for (const c of categories || []) {
        const n1 = (c.name || '').toLowerCase()
        const n2 = name.toLowerCase()
        let score = -1
        if (n1 === n2) score = 1000 + n1.length * 10
        else if (n1.startsWith(n2)) score = 500 + n2.length * 5
        else if (n1.includes(n2) || n2.includes(n1)) score = 200 + Math.min(n1.length, n2.length)
        if (score > bestScore) {
          bestScore = score
          best = c
        }
      }
      if (best && bestScore > 0) {
        result.categoryId = best.id
        result.listId = best.listId || best.id
        result.categoryMatched = tok
      }
    }
  }

  // --- C. #标签 (merge w/ parseTags; new tag -> tagNames suggestion) ---
  const hashTags = text.match(/#([^\s#@$!~>⏱]+?)(?=[\s，,。.！!？?、；;:：]|$)/g)
  if (hashTags) {
    for (const tok of hashTags) {
      const name = tok.slice(1).trim()
      if (!name) continue
      const existing = (tags || []).find((t) => (t.name || '').toLowerCase() === name.toLowerCase())
      if (existing) {
        if (!result.tagIds.includes(existing.id)) result.tagIds.push(existing.id)
      } else {
        if (!result.tagNames.includes(name)) result.tagNames.push(name)
      }
      result.tagsMatched.push(tok)
    }
  }

  // --- D. $area -> areaId ---
  const areaTok = text.match(/\$([^\s#@$!~>⏱]+?)(?=[\s，,。.！!？?、；;:：]|$)/g)
  if (areaTok) {
    for (const tok of areaTok) {
      const name = tok.slice(1).trim()
      if (!name) continue
      let best = null
      for (const a of areas || []) {
        const n1 = (a.name || '').toLowerCase()
        const n2 = name.toLowerCase()
        if (n1 === n2 || n1.includes(n2) || n2.includes(n1)) { best = a; break }
      }
      if (best) {
        result.areaId = best.id
        result.areaName = best.name
        result.areaMatched = tok
      } else {
        if (!result.hints.includes('area')) result.hints.push('area')
        result.areaMatched = tok
      }
    }
  }

  // --- E. ~时间/提醒: ~17:30 / ~下午5点半 / ~tomorrow 9am / ~提醒 9:00 ---
  const tildeTokens = text.match(/~([^\s~]+(?:\s+\S{0,12}){0,2})/g)
  if (tildeTokens) {
    for (const tok of tildeTokens) {
      const after = tok.slice(1).trim()
      if (!after) continue
      // Try parse time
      const t1 = parseTimeKeyword(after, lang)
      if (t1.time) {
        result.reminder = true
        result.reminderTime = t1.time
        result.reminderMatched = tok
      }
      // Try parse date
      const now = new Date()
      const d1 = parseDateKeyword(after, now, lang)
      if (d1.date) {
        result.reminder = true
        result.reminderDate = formatDateStr(d1.date instanceof Date ? d1.date : new Date(d1.date))
        result.reminderMatched = result.reminderMatched || tok
      }
      // has keyword 提醒/remind
      if (kw.reminder.some((w) => after.toLowerCase().includes(w.toLowerCase()))) {
        result.reminder = true
        if (!result.reminderMatched) result.reminderMatched = tok
      }
    }
  }

  // --- F. > dueUntil: >12/31 >2026-12-31 >本月末 ---
  const untilToks = text.match(/>[^\s>]+(?:\s+\S{0,12}){0,2}/g)
  if (untilToks) {
    for (const tok of untilToks) {
      const after = tok.slice(1).trim()
      if (!after) continue
      let got = null
      // full date
      const fd = after.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
      if (fd) {
        const y = parseInt(fd[1]), mo = parseInt(fd[2]) - 1, d = parseInt(fd[3])
        if (y >= 2000 && y <= 2100 && mo >= 0 && mo <= 11 && d >= 1 && d <= 31) {
          got = formatDateStr(new Date(y, mo, d))
        }
      }
      // mm/dd
      if (!got) {
        const md = after.match(/(\d{1,2})[\/\-](\d{1,2})/)
        if (md) {
          let mo = parseInt(md[1]) - 1
          let d = parseInt(md[2])
          if (mo >= 0 && mo <= 11 && d >= 1 && d <= 31) {
            let y = new Date().getFullYear()
            if (mo < new Date().getMonth()) y++
            got = formatDateStr(new Date(y, mo, d))
          }
        }
      }
      // last day keywords
      if (!got) {
        for (const w of kw.lastDayOfMonth || []) {
          if (after.toLowerCase().includes(w.toLowerCase())) {
            got = formatDateStr(_lastDayOfMonth(new Date(), 0))
            break
          }
        }
      }
      if (got) {
        result.dueUntil = got
        result.dueUntilMatched = tok
        break
      }
    }
  }

  // --- G. Pomodoro: ⏱25m / ⏱1h30m / 番茄45分钟 ---
  const pomoPatterns = [
    /⏱\s*(\d+)\s*h\s*(\d+)\s*m/i,
    /⏱\s*(\d+)\s*h(?:our)?s?/i,
    /⏱\s*(\d+)\s*m(?:in)?(?:ute)?s?/i,
    /番茄\s*(\d+)\s*分(?:钟)?/,
    /ポモドーロ\s*(\d+)\s*分/,
    /pomodoro\s*(\d+)\s*min/i,
    /pomo\s*(\d+)\s*min/i
  ]
  for (const pat of pomoPatterns) {
    const m = text.match(pat)
    if (m) {
      let total = 0
      if (m[0].toLowerCase().includes('h') && m[2]) {
        total = parseInt(m[1]) * 60 + parseInt(m[2])
      } else if (/h|hour/i.test(m[0])) {
        total = parseInt(m[1]) * 60
      } else {
        total = parseInt(m[1])
      }
      if (total > 0 && total < 480) {
        result.pomodoroEstimateMinutes = total
        result.pomodoroMatched = m[0]
        break
      }
    }
  }

  // --- build toRemove ---
  if (result.priorityMatched) result.toRemove.push(result.priorityMatched)
  if (result.categoryMatched) result.toRemove.push(result.categoryMatched)
  for (const t of result.tagsMatched) result.toRemove.push(t)
  if (result.areaMatched) result.toRemove.push(result.areaMatched)
  if (result.reminderMatched) result.toRemove.push(result.reminderMatched)
  if (result.dueUntilMatched) result.toRemove.push(result.dueUntilMatched)
  if (result.pomodoroMatched) result.toRemove.push(result.pomodoroMatched)

  if (result.pomodoroEstimateMinutes !== null && !result.hints.includes('pomodoroEstimate')) result.hints.push('pomodoroEstimate')
  if (result.dueUntil && !result.hints.includes('dueUntil')) result.hints.push('dueUntil')

  return result
}

// URL check helper
const _isPureURL = (str) => {
  const s = str.trim()
  // if contains any whitespace besides trim parts, skip
  if (/\s/.test(s)) return false
  return /^(https?:\/\/|mailto:|tel:|ftp:\/\/|file:\/\/)/i.test(s) || /^[\w-]+\.[\w.-]+(?:\/[^\s]*)?$/i.test(s) && !s.includes(' ')
}

export const smartParseTask = (inputText, options = {}) => {
  const { categories = [], tags = [], language, areas = [] } = options
  let text = inputText.trim()

  const detectedLang = language || detectLanguage(text)

  // v3: URL 检测 — 在标题清洗之前进行，避免标点正则破坏 URL
  const originalTrim = inputText.trim()
  const pureURL = _isPureURL(originalTrim)

  const parsed = {
    title: text,
    date: null,
    time: null,
    priority: null,
    tags: [],
    categoryId: null,
    reminder: false,
    important: false,
    repeat: null,
    repeatConfig: null,
    detectedLanguage: detectedLang,
    // v3 new fields
    listId: null,
    tagNames: [], // new tag name suggestions
    areaId: null,
    areaName: null,
    dueUntil: null,
    pomodoroEstimateMinutes: null,
    notes: pureURL ? originalTrim : null,
    isLink: !!pureURL,
    hints: pureURL ? ['link'] : [],
    // Task 1: 新增 DAG / 子任务占位（语法解析留 Task2）
    parentId: null,
    blockedBy: []
  }

  const toRemove = new Set()
  const now = new Date()

  const dateResult = parseDateKeyword(text, now, detectedLang)
  if (dateResult.date) {
    parsed.date = formatDateStr(dateResult.date)
    toRemove.add(dateResult.matched)
  }

  const timeResult = parseTimeKeyword(text, detectedLang)
  if (timeResult.time) {
    parsed.time = timeResult.time
    toRemove.add(timeResult.matched)
  }

  const priorityResult = parsePriority(text, detectedLang)
  if (priorityResult.priority !== null) {
    parsed.priority = priorityResult.priority
    toRemove.add(priorityResult.matched)
  }

  const tagsResult = parseTags(text, tags)
  if (tagsResult.tags.length > 0) {
    parsed.tags = tagsResult.tags
    for (const m of tagsResult.matched) {
      toRemove.add(m)
    }
  }

  const catResult = parseCategory(text, categories, detectedLang)
  if (catResult.categoryId) {
    parsed.categoryId = catResult.categoryId
    toRemove.add(catResult.matched)
  }

  const reminderResult = parseReminder(text, detectedLang)
  if (reminderResult.reminder) {
    parsed.reminder = true
    toRemove.add(reminderResult.matched)
  }

  const importantResult = parseImportant(text, detectedLang)
  if (importantResult.important) {
    parsed.important = true
    toRemove.add(importantResult.matched)
  }

  const repeatResult = parseRepeat(text, detectedLang)
  if (repeatResult.repeat) {
    parsed.repeat = repeatResult.repeat
    toRemove.add(repeatResult.matched)
  }
  // v3: repeatExtended -> repeatConfig
  const extRepeat = parseRepeatExtended(text, detectedLang)
  if (extRepeat.type) {
    const cfg = Object.assign({}, extRepeat)
    delete cfg.matched
    parsed.repeatConfig = cfg
    if (extRepeat.matched) toRemove.add(extRepeat.matched)
  }

  let cleanTitle = text
  for (const part of toRemove) {
    if (!part) continue
    const regex = new RegExp(part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
    cleanTitle = cleanTitle.replace(regex, '')
  }

  cleanTitle = cleanTitle
    .replace(/[，,。.！!？?、；;：:\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!cleanTitle) {
    cleanTitle = text
  }

  // ============ v3: call parseInlineSyntax on original text (for ! @ # $ ~ > ⏱ tokens) ============
  const inline = parseInlineSyntax(text, { categories, tags, areas }, detectedLang)
  // Longer priority match wins between parsePriority and inline syntax
  if (inline.priority !== null) {
    const inlineLen = inline.priorityMatched.length
    const oldLen = priorityResult.matched.length
    if (inlineLen >= oldLen) {
      parsed.priority = inline.priority
    }
  }
  if (inline.categoryId) {
    parsed.categoryId = inline.categoryId
    parsed.listId = inline.listId
  }
  if (inline.tagIds && inline.tagIds.length > 0) {
    const merged = Array.from(new Set([...(parsed.tags || []), ...inline.tagIds]))
    parsed.tags = merged
  }
  if (inline.tagNames && inline.tagNames.length > 0) {
    parsed.tagNames = inline.tagNames
  }
  if (inline.areaId) {
    parsed.areaId = inline.areaId
    parsed.areaName = inline.areaName
  }
  if (inline.reminder) {
    parsed.reminder = true
    if (inline.reminderTime) parsed.time = inline.reminderTime
    if (inline.reminderDate) parsed.date = inline.reminderDate
  }
  if (inline.dueUntil) {
    parsed.dueUntil = inline.dueUntil
  }
  if (inline.pomodoroEstimateMinutes !== null) {
    parsed.pomodoroEstimateMinutes = inline.pomodoroEstimateMinutes
  }
  if (inline.hints) parsed.hints = [...new Set([...(parsed.hints || []), ...inline.hints])]

  // clean up inline tokens from title
  for (const part of inline.toRemove) {
    if (!part) continue
    const regex = new RegExp(part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
    cleanTitle = cleanTitle.replace(regex, '')
  }
  cleanTitle = cleanTitle.replace(/\s+/g, ' ').trim()
  if (!cleanTitle) cleanTitle = text

  if (parsed.time && !parsed.date) {
    const nowDate = new Date()
    const [hours, minutes] = parsed.time.split(':').map(Number)
    if (
      hours < nowDate.getHours() ||
      (hours === nowDate.getHours() && minutes < nowDate.getMinutes())
    ) {
      parsed.date = formatDateStr(addDays(nowDate, 1))
    } else {
      parsed.date = getTodayStr()
    }
  }

  if (parsed.reminder && !parsed.time && parsed.date) {
    parsed.time = '09:00'
  }

  // 纯链接：标题为占位；否则使用清洗后的标题
  // 如果 cleanTitle 只是 originalTrim 的去标点版本，说明用户只粘贴了 URL，使用占位标题
  const isJustURLCleaned = pureURL && originalTrim && (() => {
    const strippedClean = cleanTitle.replace(/[\s，,。.！!？?、；;:：\/]+/g, '')
    const strippedOrig = originalTrim.replace(/[\s，,。.！!？?、；;:：\/]+/g, '')
    return strippedClean === strippedOrig || strippedClean.length === strippedOrig.length
  })()
  if (pureURL) {
    if (!isJustURLCleaned && cleanTitle && cleanTitle !== originalTrim) {
      parsed.title = cleanTitle
    } else {
      parsed.title = '待命名链接任务'
    }
    parsed.notes = originalTrim
    parsed.isLink = true
    if (!parsed.hints.includes('link')) parsed.hints.push('link')
  } else {
    parsed.title = cleanTitle
  }

  return parsed
}

export const getSmartHint = (text, lang = 'zh-CN') => {
  const hints = []
  const kw = getKeywords(lang)
  const lowerText = text.toLowerCase()

  const hasDateKeyword =
    kw.today.some((w) => lowerText.includes(w.toLowerCase())) ||
    kw.tomorrow.some((w) => lowerText.includes(w.toLowerCase())) ||
    kw.dayAfterTomorrow.some((w) => lowerText.includes(w.toLowerCase())) ||
    Object.values(kw.weekdays).some((arr) =>
      arr.some((w) => lowerText.includes(w.toLowerCase()))
    ) ||
    /\d{1,2}[月/-]\d{1,2}/.test(text) ||
    /\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(text) ||
    /\d+\s*(days later|天后|日後)/i.test(text) ||
    // v3 new
    (kw.nextBusinessDay || []).some((w) => lowerText.includes(w.toLowerCase())) ||
    (kw.lastDayOfMonth || []).some((w) => lowerText.includes(w.toLowerCase()))

  if (hasDateKeyword) hints.push('date')

  const hasTimeKeyword =
    /\d{1,2}\s*[:：時点]/.test(text) ||
    kw.morning.some((w) => lowerText.includes(w.toLowerCase())) ||
    kw.afternoon.some((w) => lowerText.includes(w.toLowerCase())) ||
    kw.evening.some((w) => lowerText.includes(w.toLowerCase())) ||
    kw.now.some((w) => lowerText.includes(w.toLowerCase()))

  if (hasTimeKeyword) hints.push('time')

  const hasPriorityKeyword =
    Object.values(kw.priority).some((arr) =>
      arr.some((w) => lowerText.includes(w.toLowerCase()))
    ) ||
    kw.important.some((w) => lowerText.includes(w.toLowerCase())) ||
    // v3 inline priority syntax
    /(^|\s)![0-4](\s|$)/.test(text)

  if (hasPriorityKeyword) hints.push('priority')

  const hasReminderKeyword = kw.reminder.some((w) => lowerText.includes(w.toLowerCase()))
  if (hasReminderKeyword) hints.push('reminder')

  if (/#/.test(text)) hints.push('tags')

  const hasRepeatKeyword =
    /每天|每日|every day|毎日|weekly|毎週|monthly|毎月|annually|yearly|每(周|月|年)|繰り返し/i.test(
      text
    ) || /(every|each)\s+(day|week|month|year)/i.test(text)
  if (hasRepeatKeyword) hints.push('repeat')

  // --- v3 new hints ---
  // syntax hint: has any inline syntax marker
  const hasInlineSyntax =
    /(^|\s)![0-4紧急高中低无urgentcrit]/.test(text) ||
    /@[^\s@#$!~>⏱]/.test(text) ||
    /\$[^\s@#$!~>⏱]/.test(text) ||
    /~[^\s~]/.test(text) ||
    />[^>\s]/.test(text) ||
    /⏱/.test(text)
  if (hasInlineSyntax) hints.push('syntax')

  // dueUntil: >12/31 etc
  if (/>[^\s>]/.test(text)) hints.push('dueUntil')

  // pomodoro: ⏱ or 番茄/pomodoro + minutes
  const hasPomo =
    /⏱\s*\d/.test(text) ||
    /番茄\s*\d+\s*分/.test(text) ||
    /ポモドーロ\s*\d+\s*分/.test(text) ||
    /pomodoro\s*\d+\s*min/i.test(text)
  if (hasPomo) hints.push('pomodoroEstimate')

  // link (pure URL)
  const trimmed = text.trim()
  if (!/\s/.test(trimmed) && /^(https?:\/\/|mailto:|ftp:)/i.test(trimmed)) {
    hints.push('link')
  }

  return hints
}
