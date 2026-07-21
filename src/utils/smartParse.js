import { formatDateStr, addDays, getTodayStr } from './date'

const WEEKDAY_MAP = {
  周日: 0,
  周天: 0,
  星期天: 0,
  星期日: 0,
  周一: 1,
  星期一: 1,
  周二: 2,
  星期二: 2,
  周三: 3,
  星期三: 3,
  周四: 4,
  星期四: 4,
  周五: 5,
  星期五: 5,
  周六: 6,
  星期六: 6,
  礼拜天: 0,
  礼拜一: 1,
  礼拜二: 2,
  礼拜三: 3,
  礼拜四: 4,
  礼拜五: 5,
  礼拜六: 6
}

const PRIORITY_MAP = {
  P0: 0,
  p0: 0,
  最高: 0,
  紧急: 0,
  重要紧急: 0,
  P1: 1,
  p1: 1,
  高: 1,
  高优先级: 1,
  很重要: 1,
  P2: 2,
  p2: 2,
  中: 2,
  中优先级: 2,
  一般: 2,
  P3: 3,
  p3: 3,
  低: 3,
  低优先级: 3,
  不重要: 3,
  P4: 4,
  p4: 4,
  无: 4,
  最低: 4
}

const parseDateKeyword = (text, now) => {
  let date = null
  let matched = ''

  if (/今天|今日/.test(text)) {
    date = now
    matched = text.match(/今天|今日/)[0]
  } else if (/明天|明日/.test(text)) {
    date = addDays(now, 1)
    matched = text.match(/明天|明日/)[0]
  } else if (/后天/.test(text)) {
    date = addDays(now, 2)
    matched = '后天'
  } else if (/大后天/.test(text)) {
    date = addDays(now, 3)
    matched = '大后天'
  } else if (/昨天|昨日/.test(text)) {
    date = addDays(now, -1)
    matched = text.match(/昨天|昨日/)[0]
  }

  for (const keyword in WEEKDAY_MAP) {
    if (text.includes(keyword)) {
      const targetWeekday = WEEKDAY_MAP[keyword]
      const currentWeekday = now.getDay()
      let diff = targetWeekday - currentWeekday
      if (diff <= 0) diff += 7
      date = addDays(now, diff)
      matched = keyword
      break
    }
  }

  const monthDayMatch = text.match(/(\d{1,2})月(\d{1,2})(日|号)?/)
  if (monthDayMatch) {
    const month = parseInt(monthDayMatch[1]) - 1
    const day = parseInt(monthDayMatch[2])
    let year = now.getFullYear()
    if (month < now.getMonth() || (month === now.getMonth() && day < now.getDate())) {
      year++
    }
    date = new Date(year, month, day)
    matched = monthDayMatch[0]
  }

  const fullDateMatch = text.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (fullDateMatch) {
    const year = parseInt(fullDateMatch[1])
    const month = parseInt(fullDateMatch[2]) - 1
    const day = parseInt(fullDateMatch[3])
    date = new Date(year, month, day)
    matched = fullDateMatch[0]
  }

  const nextXDaysMatch = text.match(/(下周|下下周|下下下周|以后|之后)/)
  if (nextXDaysMatch && !date) {
    if (/下下周|下下下周/.test(text)) {
      date = addDays(now, 14)
      matched = text.match(/下下周|下下下周/)[0]
    } else if (/下周/.test(text)) {
      date = addDays(now, 7)
      matched = '下周'
    }
  }

  return { date, matched }
}

const parseTimeKeyword = (text) => {
  let time = null
  let matched = ''

  const timeMatch = text.match(
    /(上午|下午|晚上|早上|中午|凌晨|清晨)?\s*(\d{1,2})([点:：]\s*(\d{1,2})?|点半|点一刻)?(分)?/
  )
  if (timeMatch) {
    let hour = parseInt(timeMatch[2])
    let minute = 0
    const period = timeMatch[1]
    const minuteMatch = timeMatch[4]

    if (timeMatch[0].includes('半')) {
      minute = 30
    } else if (timeMatch[0].includes('一刻')) {
      minute = 15
    } else if (minuteMatch) {
      minute = parseInt(minuteMatch)
    }

    if (period === '下午' || period === '晚上') {
      if (hour < 12) hour += 12
    } else if (period === '凌晨' || period === '早上') {
      if (hour === 12) hour = 0
    } else if (period === '中午') {
      if (hour < 10) hour += 12
    }

    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
      matched = timeMatch[0].trim()
    }
  }

  const nowTimeMatch = text.match(/现在|立刻|马上|立即|当前/)
  if (nowTimeMatch && !time) {
    const now = new Date()
    time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    matched = nowTimeMatch[0]
  }

  return { time, matched }
}

const parsePriority = (text) => {
  let priority = null
  let matched = ''

  for (const keyword in PRIORITY_MAP) {
    if (text.includes(keyword)) {
      if (matched.length < keyword.length) {
        priority = PRIORITY_MAP[keyword]
        matched = keyword
      }
    }
  }

  if (/重要/.test(text) && priority === null) {
    priority = 1
    matched = '重要'
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
      if (text.includes(tag.name) && !tags.includes(tag.id)) {
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

const parseCategory = (text, allCategories) => {
  let categoryId = null
  let matched = ''

  if (allCategories) {
    for (const cat of allCategories) {
      if (text.includes(cat.name) && cat.name.length > matched.length) {
        categoryId = cat.id
        matched = cat.name
      }
    }
  }

  return { categoryId, matched }
}

const parseReminder = (text) => {
  let reminder = false
  let matched = ''

  if (/提醒|闹钟|通知/.test(text)) {
    reminder = true
    const match = text.match(/提醒|闹钟|通知/)
    matched = match[0]
  }

  return { reminder, matched }
}

const parseImportant = (text) => {
  let important = false
  let matched = ''

  if (/重要|星标|收藏|加星/.test(text)) {
    important = true
    const match = text.match(/重要|星标|收藏|加星/)
    matched = match[0]
  }

  return { important, matched }
}

export const smartParseTask = (inputText, options = {}) => {
  const { categories = [], tags = [] } = options
  let text = inputText.trim()
  const parsed = {
    title: text,
    date: null,
    time: null,
    priority: null,
    tags: [],
    categoryId: null,
    reminder: false,
    important: false
  }

  const toRemove = new Set()

  const dateResult = parseDateKeyword(text, new Date())
  if (dateResult.date) {
    parsed.date = formatDateStr(dateResult.date)
    toRemove.add(dateResult.matched)
  }

  const timeResult = parseTimeKeyword(text)
  if (timeResult.time) {
    parsed.time = timeResult.time
    toRemove.add(timeResult.matched)
  }

  const priorityResult = parsePriority(text)
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

  const catResult = parseCategory(text, categories)
  if (catResult.categoryId) {
    parsed.categoryId = catResult.categoryId
    toRemove.add(catResult.matched)
  }

  const reminderResult = parseReminder(text)
  if (reminderResult.reminder) {
    parsed.reminder = true
    toRemove.add(reminderResult.matched)
  }

  const importantResult = parseImportant(text)
  if (importantResult.important) {
    parsed.important = true
    toRemove.add(importantResult.matched)
  }

  let cleanTitle = text
  for (const part of toRemove) {
    const regex = new RegExp(part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
    cleanTitle = cleanTitle.replace(regex, '')
  }

  cleanTitle = cleanTitle
    .replace(/[，,。.\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!cleanTitle) {
    cleanTitle = text
  }

  if (parsed.time && !parsed.date) {
    const now = new Date()
    const [hours, minutes] = parsed.time.split(':').map(Number)
    if (hours < now.getHours() || (hours === now.getHours() && minutes < now.getMinutes())) {
      parsed.date = formatDateStr(addDays(now, 1))
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

export const getSmartHint = (text) => {
  const hints = []

  if (/今天|今日|明天|明日|后天|\d{1,2}月\d{1,2}|周[一二三四五六日天]/.test(text)) {
    hints.push('日期')
  }
  if (/\d{1,2}[点:：]|上午|下午|晚上|早上/.test(text)) {
    hints.push('时间')
  }
  if (/重要|紧急|P[0-4]|高优先级|低优先级/.test(text)) {
    hints.push('优先级')
  }
  if (/提醒|闹钟/.test(text)) {
    hints.push('提醒')
  }
  if (/#/.test(text)) {
    hints.push('标签')
  }

  return hints
}
