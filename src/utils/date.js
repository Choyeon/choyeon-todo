// 共享日期工具 — 统一本地日期处理，避免 UTC 时区问题

export const getTodayStr = () => {
  const d = new Date()
  return formatDateStr(d)
}

export const getTomorrowStr = () => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return formatDateStr(d)
}

export const formatDateStr = (date) => {
  if (!(date instanceof Date)) date = new Date(date)
  if (isNaN(date)) return getTodayStr()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 解析 YYYY-MM-DD 字符串为本地 Date（避免 UTC 解析偏移）
export const parseDateStr = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return new Date()
  const [year, month, day] = dateStr.split('-').map(Number)
  if (!year || !month || !day) return new Date()
  return new Date(year, month - 1, day)
}

export const isValidDateStr = (str) => {
  if (!str || typeof str !== 'string') return false
  const regex = /^(\d{4})-(\d{2})-(\d{2})$/
  const match = str.match(regex)
  if (!match) return false
  const [, y, m, d] = match
  const year = parseInt(y, 10)
  const month = parseInt(m, 10)
  const day = parseInt(d, 10)
  if (month < 1 || month > 12) return false
  if (day < 1 || day > 31) return false
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
}

export const isValidTimeStr = (str) => {
  if (!str || typeof str !== 'string') return false
  const regex = /^(\d{2}):(\d{2})$/
  const match = str.match(regex)
  if (!match) return false
  const hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2], 10)
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59
}

// 判断任务是否逾期（考虑时间）
export const isTaskOverdue = (task) => {
  if (task.completed) return false
  const today = getTodayStr()
  if (task.date < today) return true
  if (task.date === today && task.time) {
    const now = new Date()
    const currentHM = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0')
    if (task.time < currentHM) return true
  }
  return false
}

export const addDays = (dateStr, days) => {
  if (dateStr instanceof Date) {
    const d = new Date(dateStr)
    d.setDate(d.getDate() + days)
    return formatDateStr(d)
  }
  const date = parseDateStr(dateStr)
  date.setDate(date.getDate() + days)
  return formatDateStr(date)
}

export const getNextWeekRange = (date = new Date()) => {
  const d = new Date(date)
  const dayOfWeek = d.getDay()
  const nextSunday = new Date(d)
  nextSunday.setDate(d.getDate() + (7 - dayOfWeek))
  const end = new Date(nextSunday)
  end.setDate(nextSunday.getDate() + 6)
  return {
    start: formatDateStr(nextSunday),
    end: formatDateStr(end)
  }
}
