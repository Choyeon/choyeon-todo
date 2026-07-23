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
    weekdays: {
      0: ['周日', '周天', '星期天', '星期日', '礼拜天', '礼拜日'],
      1: ['周一', '星期一', '礼拜一'],
      2: ['周二', '星期二', '礼拜二'],
      3: ['周三', '星期三', '礼拜三'],
      4: ['周四', '星期四', '礼拜四'],
      5: ['周五', '星期五', '礼拜五'],
      6: ['周六', '星期六', '礼拜六']
    },
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
    important: ['重要', '星标', '收藏', '加星', '置顶'],
    reminder: ['提醒', '闹钟', '通知', '提醒我', '记得'],
    repeat: ['重复', '循环', '每天', '每周', '每月', '每年', '次次'],
    every: ['每']
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
    weekdays: {
      0: ['sunday', 'sun', 'sundays'],
      1: ['monday', 'mon', 'mondays'],
      2: ['tuesday', 'tue', 'tues', 'tuesdays'],
      3: ['wednesday', 'wed', 'wednesdays'],
      4: ['thursday', 'thu', 'thur', 'thurs', 'thursdays'],
      5: ['friday', 'fri', 'fridays'],
      6: ['saturday', 'sat', 'saturdays']
    },
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
    important: ['important', 'star', 'starred', 'favorite', 'favourite', 'pin', 'pinned'],
    reminder: ['remind', 'reminder', 'alert', 'notify', 'notification', 'alarm', 'bell'],
    repeat: ['repeat', 'recurring', 'daily', 'weekly', 'monthly', 'yearly', 'every day'],
    every: ['every', 'each']
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
    weekdays: {
      0: ['日曜日', '日曜', '日', 'にちようび'],
      1: ['月曜日', '月曜', '月', 'げつようび'],
      2: ['火曜日', '火曜', '火', 'かようび'],
      3: ['水曜日', '水曜', '水', 'すいようび'],
      4: ['木曜日', '木曜', '木', 'もくようび'],
      5: ['金曜日', '金曜', '金', 'きんようび'],
      6: ['土曜日', '土曜', '土', 'どようび']
    },
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
    important: ['重要', 'スター', '星印', 'お気に入り', 'ピン留め'],
    reminder: ['リマインド', 'リマインダー', '通知', 'アラーム', 'アラート', '知らせ'],
    repeat: ['繰り返し', 'リピート', '毎日', '毎週', '毎月', '毎年'],
    every: ['毎', 'ごと']
  }
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

const parseDateKeyword = (text, now, lang = 'zh-CN') => {
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
    { regex: /(\d+)\s*days?\s*(later|from now)/i, offset: 1 },
    { regex: /in\s*(\d+)\s*days?/i, offset: 1 },
    { regex: /(\d+)\s*日後/, offset: 1 },
    { regex: /(\d+)\s*天后/, offset: 1 }
  ]

  for (const pattern of inXDaysPatterns) {
    const match = text.match(pattern.regex)
    if (match) {
      const days = parseInt(match[1])
      if (!isNaN(days) && days > 0 && days <= 365) {
        date = addDays(now, days * pattern.offset)
        matched = match[0]
        break
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

export const smartParseTask = (inputText, options = {}) => {
  const { categories = [], tags = [], language } = options
  let text = inputText.trim()

  const detectedLang = language || detectLanguage(text)

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
    detectedLanguage: detectedLang
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

  parsed.title = cleanTitle

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
    /\d+\s*(days later|天后|日後)/i.test(text)

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
    ) || kw.important.some((w) => lowerText.includes(w.toLowerCase()))

  if (hasPriorityKeyword) hints.push('priority')

  const hasReminderKeyword = kw.reminder.some((w) => lowerText.includes(w.toLowerCase()))
  if (hasReminderKeyword) hints.push('reminder')

  if (/#/.test(text)) hints.push('tags')

  const hasRepeatKeyword = /每天|每日|every day|毎日|weekly|毎週|monthly|毎月/i.test(text)
  if (hasRepeatKeyword) hints.push('repeat')

  return hints
}
