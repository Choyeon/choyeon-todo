import { describe, test, expect, beforeEach, vi } from 'vitest'
import {
  formatDateStr,
  parseDateStr,
  isValidDateStr,
  isValidTimeStr,
  isTaskOverdue,
  addDays,
  getNextWeekRange,
  getTodayStr,
  getTomorrowStr
} from '@/utils/date'

describe('日期工具函数', () => {
  describe('formatDateStr', () => {
    test('应该将 Date 对象格式化为 YYYY-MM-DD', () => {
      const date = new Date(2026, 0, 15)
      expect(formatDateStr(date)).toBe('2026-01-15')
    })

    test('应该正确处理单数字月和日', () => {
      const date = new Date(2026, 0, 5)
      expect(formatDateStr(date)).toBe('2026-01-05')
    })

    test('应该接受时间戳字符串', () => {
      const date = new Date(2026, 5, 20)
      expect(formatDateStr(date.toISOString())).toBeTruthy()
    })
  })

  describe('parseDateStr', () => {
    test('应该解析 YYYY-MM-DD 字符串为本地 Date', () => {
      const date = parseDateStr('2026-01-15')
      expect(date.getFullYear()).toBe(2026)
      expect(date.getMonth()).toBe(0)
      expect(date.getDate()).toBe(15)
    })

    test('无效输入应该返回当前日期', () => {
      const result = parseDateStr('invalid')
      expect(result instanceof Date).toBe(true)
      expect(isNaN(result.getTime())).toBe(false)
    })

    test('空字符串应该返回当前日期', () => {
      const result = parseDateStr('')
      expect(result instanceof Date).toBe(true)
    })
  })

  describe('isValidDateStr', () => {
    test('有效日期字符串应该返回 true', () => {
      expect(isValidDateStr('2026-01-15')).toBe(true)
      expect(isValidDateStr('2026-12-31')).toBe(true)
      expect(isValidDateStr('2024-02-29')).toBe(true)
    })

    test('无效日期字符串应该返回 false', () => {
      expect(isValidDateStr('2026-13-01')).toBe(false)
      expect(isValidDateStr('2026-01-32')).toBe(false)
      expect(isValidDateStr('2023-02-29')).toBe(false)
      expect(isValidDateStr('invalid')).toBe(false)
      expect(isValidDateStr('')).toBe(false)
      expect(isValidDateStr(null)).toBe(false)
    })

    test('格式不正确应该返回 false', () => {
      expect(isValidDateStr('2026/01/15')).toBe(false)
      expect(isValidDateStr('01-15-2026')).toBe(false)
      expect(isValidDateStr('2026-1-15')).toBe(false)
    })
  })

  describe('isValidTimeStr', () => {
    test('有效时间字符串应该返回 true', () => {
      expect(isValidTimeStr('00:00')).toBe(true)
      expect(isValidTimeStr('23:59')).toBe(true)
      expect(isValidTimeStr('12:30')).toBe(true)
    })

    test('无效时间字符串应该返回 false', () => {
      expect(isValidTimeStr('24:00')).toBe(false)
      expect(isValidTimeStr('23:60')).toBe(false)
      expect(isValidTimeStr('invalid')).toBe(false)
      expect(isValidTimeStr('')).toBe(false)
      expect(isValidTimeStr(null)).toBe(false)
    })

    test('格式不正确应该返回 false', () => {
      expect(isValidTimeStr('12:3')).toBe(false)
      expect(isValidTimeStr('12:30:00')).toBe(false)
      expect(isValidTimeStr('12-30')).toBe(false)
    })
  })

  describe('isTaskOverdue', () => {
    test('已完成的任务不会逾期', () => {
      const task = { completed: true, date: '2020-01-01' }
      expect(isTaskOverdue(task)).toBe(false)
    })

    test('日期早于今天的任务逾期', () => {
      const task = { completed: false, date: '2020-01-01' }
      expect(isTaskOverdue(task)).toBe(true)
    })

    test('日期晚于今天的任务不逾期', () => {
      const task = { completed: false, date: '2099-12-31' }
      expect(isTaskOverdue(task)).toBe(false)
    })
  })

  describe('addDays', () => {
    test('应该正确增加天数', () => {
      expect(addDays('2026-01-15', 5)).toBe('2026-01-20')
    })

    test('应该正确处理跨月', () => {
      expect(addDays('2026-01-30', 3)).toBe('2026-02-02')
    })

    test('应该正确处理负数天数', () => {
      expect(addDays('2026-01-05', -3)).toBe('2026-01-02')
    })

    test('接受 Date 对象', () => {
      const date = new Date(2026, 0, 15)
      expect(addDays(date, 1)).toBe('2026-01-16')
    })
  })

  describe('getNextWeekRange', () => {
    test('应该返回下周的开始和结束日期', () => {
      const result = getNextWeekRange(new Date(2026, 0, 12))
      expect(result).toHaveProperty('start')
      expect(result).toHaveProperty('end')
      expect(isValidDateStr(result.start)).toBe(true)
      expect(isValidDateStr(result.end)).toBe(true)
    })
  })

  describe('getTodayStr & getTomorrowStr', () => {
    test('getTodayStr 应该返回有效日期字符串', () => {
      const today = getTodayStr()
      expect(isValidDateStr(today)).toBe(true)
    })

    test('getTomorrowStr 应该返回有效日期字符串', () => {
      const tomorrow = getTomorrowStr()
      expect(isValidDateStr(tomorrow)).toBe(true)
    })

    test('明天应该比今天多一天', () => {
      const today = getTodayStr()
      const tomorrow = getTomorrowStr()
      expect(addDays(today, 1)).toBe(tomorrow)
    })
  })
})
