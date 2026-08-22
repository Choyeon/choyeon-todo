import { describe, test, expect, beforeAll, vi } from 'vitest'
import {
  smartParseTask,
  parseRepeatExtended,
  parseInlineSyntax,
  getSmartHint
} from '@/utils/smartParse'
import { formatDateStr, isValidDateStr } from '@/utils/date'

// Anchor reference: 2026-08-22 是周六 (Saturday, day=6)
// Pick a deterministic reference time: Thursday 2026-08-20 10:00 local
// so weekday calculations are stable across runs.
const REF_ISO = new Date(2026, 7, 20, 10, 0, 0) // Thu Aug 20, 2026, dayOfWeek=4
const REF_DATE_STR = formatDateStr(REF_ISO)

// Unfortunately parseDateKeyword uses `new Date()` internally (today detection still via now arg),
// but the smartParseTask constructs its own now. We'll hijack Date global to lock "now".
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(REF_ISO)
})
afterEach(() => {
  vi.useRealTimers()
})

const addDaysStr = (dateStr, n) => {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + n)
  return formatDateStr(dt)
}

const lastDayOfMonth = (y, m0Based) => {
  // last day of month m (0-based)
  const dt = new Date(y, m0Based + 1, 0)
  return formatDateStr(dt)
}

const nthWeekdayOfMonth = (y, mo, nth, wd) => {
  const dt = new Date(y, mo, 1)
  const diff = (wd - dt.getDay() + 7) % 7
  dt.setDate(1 + diff + (nth - 1) * 7)
  if (dt.getMonth() !== mo) return null
  return formatDateStr(dt)
}

describe('smartParse v3 — 相对/序数日期解析', () => {
  // 中文 ≥ 15
  describe('中文：相对日期', () => {
    test('大后天 -> +3天', () => {
      const r = smartParseTask('写文档 大后天', { language: 'zh-CN' })
      expect(r.date).toBe(addDaysStr(REF_DATE_STR, 3))
    })
    test('3天后 -> +3天', () => {
      const r = smartParseTask('写文档 3天后', { language: 'zh-CN' })
      expect(r.date).toBe(addDaysStr(REF_DATE_STR, 3))
    })
    test('7天后 -> +7天', () => {
      const r = smartParseTask('写文档 7天后', { language: 'zh-CN' })
      expect(r.date).toBe(addDaysStr(REF_DATE_STR, 7))
    })
    test('第3天 -> +3天', () => {
      const r = smartParseTask('汇报 第3天', { language: 'zh-CN' })
      expect(r.date).toBe(addDaysStr(REF_DATE_STR, 3))
    })
    test('第10天 -> +10天', () => {
      const r = smartParseTask('评审 第10天', { language: 'zh-CN' })
      expect(r.date).toBe(addDaysStr(REF_DATE_STR, 10))
    })
    test('下周一 -> 下周 Monday (Aug 24, 2026) 从 Thu 起：本周周一已过，下周一=Aug 24', () => {
      const r = smartParseTask('例会 下周一', { language: 'zh-CN' })
      // 2026-08-20 Thu -> Monday of this week = Aug 17 -> next week Monday = Aug 24
      expect(r.date).toBe('2026-08-24')
    })
    test('下周三 -> Aug 26', () => {
      const r = smartParseTask('例会 下周三', { language: 'zh-CN' })
      expect(r.date).toBe('2026-08-26')
    })
    test('本周三 -> 本周三 (Aug 19) 已过，但仍然指向本周三', () => {
      const r = smartParseTask('回顾 本周三', { language: 'zh-CN' })
      expect(r.date).toBe('2026-08-19')
    })
    test('本周五 -> Aug 21', () => {
      const r = smartParseTask('发布 本周五', { language: 'zh-CN' })
      expect(r.date).toBe('2026-08-21')
    })
    test('下下周 -> Aug 20 + 14 = Sep 03', () => {
      const r = smartParseTask('交付 下下周', { language: 'zh-CN' })
      // Original parser: nextNextWeek -> addDays(now, 14) => Aug 20 + 14 = Sep 3
      expect(r.date).toBe(addDaysStr(REF_DATE_STR, 14))
    })
    test('下个工作日 (今天是 Thu) -> 明天 Fri', () => {
      const r = smartParseTask('确认 下个工作日', { language: 'zh-CN' })
      expect(r.date).toBe(addDaysStr(REF_DATE_STR, 1))
    })
    test('本月最后一天 -> Aug 31, 2026', () => {
      const r = smartParseTask('月结 本月最后一天', { language: 'zh-CN' })
      expect(r.date).toBe(lastDayOfMonth(2026, 7))
    })
    test('月末 -> Aug 31, 2026', () => {
      const r = smartParseTask('账单 月末', { language: 'zh-CN' })
      expect(r.date).toBe(lastDayOfMonth(2026, 7))
    })
    test('月底 -> Aug 31, 2026', () => {
      const r = smartParseTask('财务 月底', { language: 'zh-CN' })
      expect(r.date).toBe(lastDayOfMonth(2026, 7))
    })
    test("5月第二个星期一 -> next May 2nd Monday. Current=Aug 2026 => May 2027. 2nd Monday of May 2027 = May 10", () => {
      const r = smartParseTask('年会 5月第二个星期一', { language: 'zh-CN' })
      // May 2027: 1st = Monday May 3? Let's compute:
      // May 1 2027 is Saturday. First Monday = May 3, second Monday = May 10.
      const expected = nthWeekdayOfMonth(2027, 4, 2, 1)
      expect(r.date).toBe(expected)
    })
    test('12月第3个周五 -> Dec 2026 third Friday = Dec 18', () => {
      const r = smartParseTask('总结 12月第3个周五', { language: 'zh-CN' })
      const expected = nthWeekdayOfMonth(2026, 11, 3, 5)
      expect(r.date).toBe(expected)
    })
    test('3个工作日后 -> Thu(20) + 3 biz days: Fri(21), Mon(24), Tue(25) => Aug 25', () => {
      const r = smartParseTask('回复 3个工作日后', { language: 'zh-CN' })
      expect(r.date).toBe('2026-08-25')
    })
    test('下个工作日（如果今天周六 => 周一）—— 测试周六偏移', () => {
      const sat = new Date(2026, 7, 22) // Sat Aug 22
      vi.setSystemTime(sat)
      const r = smartParseTask('发货 下个工作日', { language: 'zh-CN' })
      expect(r.date).toBe('2026-08-24')
      vi.setSystemTime(REF_ISO)
    })
  })

  describe('英文：相对日期', () => {
    test('next Monday -> Aug 24', () => {
      const r = smartParseTask('meeting next Monday', { language: 'en-US' })
      expect(r.date).toBe('2026-08-24')
    })
    test('next Wednesday -> Aug 26', () => {
      const r = smartParseTask('sync next Wednesday', { language: 'en-US' })
      expect(r.date).toBe('2026-08-26')
    })
    test('this Friday -> Aug 21', () => {
      const r = smartParseTask('deploy this Friday', { language: 'en-US' })
      expect(r.date).toBe('2026-08-21')
    })
    test('a week today -> +7 days = Aug 27', () => {
      const r = smartParseTask('review a week today', { language: 'en-US' })
      expect(r.date).toBe(addDaysStr(REF_DATE_STR, 7))
    })
    test('in 3 business days -> Thu(20) + 3 biz days: Aug 25', () => {
      const r = smartParseTask('reply in 3 business days', { language: 'en-US' })
      expect(r.date).toBe('2026-08-25')
    })
    test('in 5 business days from Thu: Fri(21), Mon(24), Tue(25), Wed(26), Thu(27) => Aug 27', () => {
      const r = smartParseTask('feedback in 5 business days', { language: 'en-US' })
      expect(r.date).toBe('2026-08-27')
    })
    test('next business day -> Aug 21 (from Thu)', () => {
      const r = smartParseTask('confirm next business day', { language: 'en-US' })
      expect(r.date).toBe(addDaysStr(REF_DATE_STR, 1))
    })
    test('next business day (Sat scenario) -> Mon', () => {
      vi.setSystemTime(new Date(2026, 7, 22))
      const r = smartParseTask('ship next business day', { language: 'en-US' })
      expect(r.date).toBe('2026-08-24')
      vi.setSystemTime(REF_ISO)
    })
    test('last day of the month -> Aug 31', () => {
      const r = smartParseTask('billing last day of the month', { language: 'en-US' })
      expect(r.date).toBe(lastDayOfMonth(2026, 7))
    })
    test('eom (alias) -> Aug 31', () => {
      const r = smartParseTask('close books eom', { language: 'en-US' })
      expect(r.date).toBe(lastDayOfMonth(2026, 7))
    })
    test('end of the month -> Aug 31', () => {
      const r = smartParseTask('report end of the month', { language: 'en-US' })
      expect(r.date).toBe(lastDayOfMonth(2026, 7))
    })
    test('2nd Monday of May -> May 2027 = May 10', () => {
      const r = smartParseTask('trip 2nd Monday of May', { language: 'en-US' })
      expect(r.date).toBe(nthWeekdayOfMonth(2027, 4, 2, 1))
    })
    test('3rd Friday of December 2026 -> Dec 18', () => {
      const r = smartParseTask('holiday 3rd Friday of December', { language: 'en-US' })
      expect(r.date).toBe(nthWeekdayOfMonth(2026, 11, 3, 5))
    })
    test('1st Sunday of October 2026 -> Oct 4', () => {
      const r = smartParseTask('brunch 1st Sunday of October', { language: 'en-US' })
      expect(r.date).toBe(nthWeekdayOfMonth(2026, 9, 1, 0))
    })
    test('in 2 days -> Aug 22', () => {
      const r = smartParseTask('call in 2 days', { language: 'en-US' })
      expect(r.date).toBe(addDaysStr(REF_DATE_STR, 2))
    })
    test('5 days later -> Aug 25', () => {
      const r = smartParseTask('follow up 5 days later', { language: 'en-US' })
      expect(r.date).toBe(addDaysStr(REF_DATE_STR, 5))
    })
  })

  describe('日文：相对日期', () => {
    test('来週の水曜日 -> next week Wednesday = Aug 26', () => {
      const r = smartParseTask('会議 来週の水曜日', { language: 'ja-JP' })
      expect(r.date).toBe('2026-08-26')
    })
    test('来週の月曜日 -> Aug 24', () => {
      const r = smartParseTask('レビュー 来週の月曜日', { language: 'ja-JP' })
      expect(r.date).toBe('2026-08-24')
    })
    test('今週の金曜日 -> Aug 21', () => {
      const r = smartParseTask('リリース 今週の金曜日', { language: 'ja-JP' })
      expect(r.date).toBe('2026-08-21')
    })
    test('翌営業日 -> Aug 21 (from Thu)', () => {
      const r = smartParseTask('確認 翌営業日', { language: 'ja-JP' })
      expect(r.date).toBe(addDaysStr(REF_DATE_STR, 1))
    })
    test('翌営業日 (Saturday) -> Monday Aug 24', () => {
      vi.setSystemTime(new Date(2026, 7, 22))
      const r = smartParseTask('発送 翌営業日', { language: 'ja-JP' })
      expect(r.date).toBe('2026-08-24')
      vi.setSystemTime(REF_ISO)
    })
    test('月末 -> Aug 31', () => {
      const r = smartParseTask('締め切り 月末', { language: 'ja-JP' })
      expect(r.date).toBe(lastDayOfMonth(2026, 7))
    })
    test('今月末 -> Aug 31', () => {
      const r = smartParseTask('請求 今月末', { language: 'ja-JP' })
      expect(r.date).toBe(lastDayOfMonth(2026, 7))
    })
    test('5日後 -> Aug 25', () => {
      const r = smartParseTask('返信 5日後', { language: 'ja-JP' })
      expect(r.date).toBe(addDaysStr(REF_DATE_STR, 5))
    })
    test('3営業日後 -> Aug 25 (from Thu)', () => {
      const r = smartParseTask('納品 3営業日後', { language: 'ja-JP' })
      expect(r.date).toBe('2026-08-25')
    })
    test('5月第2月曜日 -> 2027 May 2nd Monday = May 10', () => {
      const r = smartParseTask('総会 5月第2月曜日', { language: 'ja-JP' })
      expect(r.date).toBe(nthWeekdayOfMonth(2027, 4, 2, 1))
    })
    test('12月第3金曜日 -> Dec 2026 = Dec 18', () => {
      const r = smartParseTask('忘年会 12月第3金曜日', { language: 'ja-JP' })
      expect(r.date).toBe(nthWeekdayOfMonth(2026, 11, 3, 5))
    })
  })
})

describe('smartParse v3 — 重复规则解析 (parseRepeatExtended)', () => {
  describe('中文：重复', () => {
    test('每周一三五 -> weekly weekdays [1,3,5]', () => {
      const r = parseRepeatExtended('开会 每周一三五', 'zh-CN')
      expect(r.type).toBe('weekly')
      expect(r.weekdays).toEqual([1, 3, 5])
    })
    test('每两周周三 -> weekly everyNWeeks=2 weekdays [3]', () => {
      const r = parseRepeatExtended('值班 每两周周三', 'zh-CN')
      expect(r.type).toBe('weekly')
      expect(r.everyNWeeks).toBe(2)
      expect(r.weekdays).toEqual([3])
    })
    test('每月15号 -> monthly dayOfMonth=15', () => {
      const r = parseRepeatExtended('交租 每月15号', 'zh-CN')
      expect(r.type).toBe('monthly')
      expect(r.dayOfMonth).toBe(15)
    })
    test('每月最后一个工作日 -> monthly isLastWorkday=true', () => {
      const r = parseRepeatExtended('工资 每月最后一个工作日', 'zh-CN')
      expect(r.type).toBe('monthly')
      expect(r.isLastWorkday).toBe(true)
    })
    test('每天 -> daily', () => {
      const r = parseRepeatExtended('喝水 每天', 'zh-CN')
      expect(r.type).toBe('daily')
    })
    test('从今天起 7 次后停止 -> stopAfter=7', () => {
      const r = parseRepeatExtended('打卡 每天 7 次后停止', 'zh-CN')
      expect(r.stopAfter).toBe(7)
      expect(r.type).toBe('daily')
    })
    test('2026-12-31 前重复 -> until=2026-12-31', () => {
      const r = parseRepeatExtended('锻炼 每周一 2026-12-31 前重复', 'zh-CN')
      expect(r.until).toBe('2026-12-31')
    })
    test('每月 -> monthly', () => {
      const r = parseRepeatExtended('月度报告 每月', 'zh-CN')
      expect(r.type).toBe('monthly')
    })
    test('周末 -> weekly weekends [0,6]', () => {
      const r = parseRepeatExtended('打扫 周末', 'zh-CN')
      expect(r.type).toBe('weekly')
      expect(r.weekdays).toEqual([0, 6])
    })
    test('工作日 -> weekly weekdays [1,2,3,4,5]', () => {
      const r = parseRepeatExtended('通勤 工作日', 'zh-CN')
      expect(r.type).toBe('weekly')
      expect(r.weekdays).toEqual([1, 2, 3, 4, 5])
    })
  })

  describe('英文：重复', () => {
    test('every Mon Wed Fri -> weekly weekdays [1,3,5]', () => {
      const r = parseRepeatExtended('meeting every Mon Wed Fri', 'en-US')
      expect(r.type).toBe('weekly')
      expect(r.weekdays).toEqual(expect.arrayContaining([1, 3, 5]))
      expect(r.weekdays.length).toBe(3)
    })
    test('every 2 weeks on Thursday -> weekly everyNWeeks=2 weekdays [4]', () => {
      const r = parseRepeatExtended('report every 2 weeks on Thursday', 'en-US')
      expect(r.type).toBe('weekly')
      expect(r.everyNWeeks).toBe(2)
      expect(r.weekdays).toEqual([4])
    })
    test('monthly on the 15th -> monthly dayOfMonth=15', () => {
      const r = parseRepeatExtended('rent monthly on the 15th', 'en-US')
      expect(r.type).toBe('monthly')
      expect(r.dayOfMonth).toBe(15)
    })
    test('every month on the 1st -> monthly dayOfMonth=1', () => {
      const r = parseRepeatExtended('invoice every month on the 1st', 'en-US')
      expect(r.type).toBe('monthly')
      expect(r.dayOfMonth).toBe(1)
    })
    test('every day -> daily', () => {
      const r = parseRepeatExtended('hydrate every day', 'en-US')
      expect(r.type).toBe('daily')
    })
    test('7 occurrences then stop -> stopAfter=7', () => {
      const r = parseRepeatExtended('take pills daily 7 occurrences then stop', 'en-US')
      expect(r.stopAfter).toBe(7)
    })
    test('until 2026-12-31 -> until=2026-12-31', () => {
      const r = parseRepeatExtended('run weekly until 2026-12-31', 'en-US')
      expect(r.until).toBe('2026-12-31')
    })
    test('annually -> yearly', () => {
      const r = parseRepeatExtended('birthday annually', 'en-US')
      expect(r.type).toBe('yearly')
    })
    test('every 2 months -> monthly everyNMonths=2', () => {
      const r = parseRepeatExtended('dental check every 2 months', 'en-US')
      expect(r.type).toBe('monthly')
      expect(r.everyNMonths).toBe(2)
    })
  })

  describe('日文：重复', () => {
    test('毎週月水金 -> weekly [1,3,5]', () => {
      const r = parseRepeatExtended('ミーティング 毎週月水金', 'ja-JP')
      expect(r.type).toBe('weekly')
      expect(r.weekdays).toEqual([1, 3, 5])
    })
    test('毎週月曜日 -> weekly [1]', () => {
      const r = parseRepeatExtended('レビュー 毎週月曜日', 'ja-JP')
      expect(r.type).toBe('weekly')
      expect(r.weekdays).toEqual([1])
    })
    test('毎月15日 -> monthly dayOfMonth=15', () => {
      const r = parseRepeatExtended('家賃 毎月15日', 'ja-JP')
      expect(r.type).toBe('monthly')
      expect(r.dayOfMonth).toBe(15)
    })
    test('毎日 -> daily', () => {
      const r = parseRepeatExtended('日報 毎日', 'ja-JP')
      expect(r.type).toBe('daily')
    })
    test('7回後停止 -> stopAfter=7', () => {
      const r = parseRepeatExtended('投薬 毎日 7回後停止', 'ja-JP')
      expect(r.stopAfter).toBe(7)
    })
    test('毎年 -> yearly', () => {
      const r = parseRepeatExtended('健康診断 毎年', 'ja-JP')
      expect(r.type).toBe('yearly')
    })
  })
})

describe('smartParse v3 — 内联语法', () => {
  describe('!priority 语法', () => {
    test('!0 -> priority 0', () => {
      const r = smartParseTask('发布 !0', { language: 'zh-CN' })
      expect(r.priority).toBe(0)
    })
    test('!4 -> priority 4', () => {
      const r = smartParseTask('清理 !4', { language: 'zh-CN' })
      expect(r.priority).toBe(4)
    })
    test('!紧急 -> priority 0 (中文关键字)', () => {
      const r = smartParseTask('抢修 !紧急', { language: 'zh-CN' })
      expect(r.priority).toBe(0)
    })
    test('!高 -> priority 1', () => {
      const r = smartParseTask('汇报 !高', { language: 'zh-CN' })
      expect(r.priority).toBe(1)
    })
    test('!urgent -> priority 0 (英文关键字)', () => {
      const r = smartParseTask('outage !urgent', { language: 'en-US' })
      expect(r.priority).toBe(0)
    })
    test('!緊急 -> priority 0 (日文)', () => {
      const r = smartParseTask('障害 !緊急', { language: 'ja-JP' })
      expect(r.priority).toBe(0)
    })
    test('更长匹配优先：!紧急 超过 !0', () => {
      const r = smartParseTask('!紧急 发布', { language: 'zh-CN' })
      // Both match; !紧急 is longer but both map to level 0. The field still 0.
      expect(r.priority).toBe(0)
    })
    test('旧 parsePriority 与新语法并存：P2 与 !3 同时存在，!3 优先 (长度>=)', () => {
      const r = smartParseTask('P2 review !3', { language: 'zh-CN' })
      // priority parse says P2 (len 2). inline says !3 (len 2). length equal => inline wins
      expect(r.priority).toBe(3)
    })
  })

  describe('@分类 语法', () => {
    const cats = [
      { id: 'c-work', name: '工作', listId: 'l-work' },
      { id: 'c-personal', name: '个人' },
      { id: 'c-study', name: '学习' },
      { id: 'c-shop', name: '购物' }
    ]
    test('@工作 -> categoryId 匹配 + listId 可用', () => {
      const r = smartParseTask('写周报 @工作', { categories: cats, language: 'zh-CN' })
      expect(r.categoryId).toBe('c-work')
      expect(r.listId).toBe('l-work')
    })
    test('@学 -> 模糊匹配 学习', () => {
      const r = smartParseTask('背单词 @学', { categories: cats, language: 'zh-CN' })
      expect(r.categoryId).toBe('c-study')
    })
    test('@不存在 -> categoryId 仍为 null (不报错)', () => {
      const r = smartParseTask('冥想 @兴趣', { categories: cats, language: 'zh-CN' })
      expect(r.categoryId).toBeNull()
    })
  })

  describe('#标签 语法', () => {
    const tags = [
      { id: 't-urg', name: 'urgent' },
      { id: 't-home', name: 'home' },
      { id: 't-仕事', name: '仕事' }
    ]
    test('#urgent 存在 -> tagIds 加入', () => {
      const r = smartParseTask('call mom #urgent', { tags, language: 'en-US' })
      expect(r.tags).toContain('t-urg')
    })
    test('#newtag 不存在 -> tagNames 建议集合', () => {
      const r = smartParseTask('idea #newtag #brainstorm', { tags, language: 'en-US' })
      expect(r.tagNames).toEqual(expect.arrayContaining(['newtag', 'brainstorm']))
      expect(r.tagNames.length).toBeGreaterThanOrEqual(2)
    })
    test('#仕事 日文标签 -> 已匹配 tagId', () => {
      const r = smartParseTask('資料作成 #仕事', { tags, language: 'ja-JP' })
      expect(r.tags).toContain('t-仕事')
    })
  })

  describe('$area 语法', () => {
    const areas = [
      { id: 'a-home', name: 'Home' },
      { id: 'a-office', name: 'Office' },
      { id: 'a-自宅', name: '自宅' }
    ]
    test('$Office 匹配 -> areaId + areaName', () => {
      const r = smartParseTask('meeting $Office', { areas, language: 'en-US' })
      expect(r.areaId).toBe('a-office')
      expect(r.areaName).toBe('Office')
    })
    test('$自宅 日文匹配', () => {
      const r = smartParseTask('リモート $自宅', { areas, language: 'ja-JP' })
      expect(r.areaId).toBe('a-自宅')
    })
    test('$Unknown 未匹配 -> hints 包含 area', () => {
      const r = smartParseTask('travel $Unknown', { areas, language: 'en-US' })
      expect(r.areaId).toBeNull()
      expect(r.hints).toContain('area')
    })
  })

  describe('~提醒 / 时间语法', () => {
    test('~17:30 -> reminder=true + time=17:30', () => {
      const r = smartParseTask('会议 ~17:30', { language: 'zh-CN' })
      expect(r.reminder).toBe(true)
      expect(r.time).toBe('17:30')
    })
    test('~下午5点半 -> reminder=true + time=17:30', () => {
      const r = smartParseTask('电话 ~下午5点半', { language: 'zh-CN' })
      expect(r.reminder).toBe(true)
      expect(r.time).toBe('17:30')
    })
    test('~tomorrow 9am -> reminder + date + time', () => {
      const r = smartParseTask('drink ~tomorrow 9am', { language: 'en-US' })
      expect(r.reminder).toBe(true)
      expect(r.time).toBe('09:00')
      expect(r.date).toBe(addDaysStr(REF_DATE_STR, 1))
    })
    test('~提醒 9:00 -> reminder=true + time=09:00', () => {
      const r = smartParseTask('带伞 ~提醒 9:00', { language: 'zh-CN' })
      expect(r.reminder).toBe(true)
      expect(r.time).toBe('09:00')
    })
    test('~リマインド 18:00 (日文)', () => {
      const r = smartParseTask('買い物 ~リマインド 18:00', { language: 'ja-JP' })
      expect(r.reminder).toBe(true)
      expect(r.time).toBe('18:00')
    })
  })

  describe('>dueUntil 语法', () => {
    test('>2026-12-31 -> dueUntil=2026-12-31', () => {
      const r = smartParseTask('论文 >2026-12-31', { language: 'zh-CN' })
      expect(r.dueUntil).toBe('2026-12-31')
    })
    test('>12/31 -> dueUntil=Dec 31 of 2026', () => {
      const r = smartParseTask('述职 >12/31', { language: 'zh-CN' })
      // Current=Aug, so Dec 31 -> 2026-12-31
      expect(r.dueUntil).toBe('2026-12-31')
    })
    test('>本月末 -> dueUntil=Aug 31', () => {
      const r = smartParseTask('报销 >本月末', { language: 'zh-CN' })
      expect(r.dueUntil).toBe(lastDayOfMonth(2026, 7))
    })
  })

  describe('⏱ 番茄/专注时长语法', () => {
    test('⏱25m -> pomodoroEstimateMinutes=25', () => {
      const r = smartParseTask('写作 ⏱25m', { language: 'zh-CN' })
      expect(r.pomodoroEstimateMinutes).toBe(25)
    })
    test('⏱1h30m -> 90 minutes', () => {
      const r = smartParseTask('深度工作 ⏱1h30m', { language: 'zh-CN' })
      expect(r.pomodoroEstimateMinutes).toBe(90)
    })
    test('⏱2h -> 120 minutes', () => {
      const r = smartParseTask('design ⏱2h', { language: 'en-US' })
      expect(r.pomodoroEstimateMinutes).toBe(120)
    })
    test('番茄45分钟 -> 45 (中文)', () => {
      const r = smartParseTask('刷题 番茄45分钟', { language: 'zh-CN' })
      expect(r.pomodoroEstimateMinutes).toBe(45)
    })
    test('ポモドーロ50分 -> 50 (日文)', () => {
      const r = smartParseTask('論文 ポモドーロ50分', { language: 'ja-JP' })
      expect(r.pomodoroEstimateMinutes).toBe(50)
    })
  })
})

describe('smartParse v3 — URL 粘贴', () => {
  test('纯 https URL -> notes=URL, title=待命名链接任务, isLink=true', () => {
    const r = smartParseTask('https://example.com/docs')
    expect(r.isLink).toBe(true)
    expect(r.notes).toBe('https://example.com/docs')
    expect(r.title).toBe('待命名链接任务')
    expect(r.hints).toContain('link')
  })
  test('纯 http URL -> isLink=true', () => {
    const r = smartParseTask('http://example.com')
    expect(r.isLink).toBe(true)
    expect(r.notes).toBe('http://example.com')
  })
  test('URL 与其他文本混合 -> isLink=false', () => {
    const r = smartParseTask('阅读 https://example.com 今天')
    expect(r.isLink).toBe(false)
  })
  test('邮件 mailto: -> isLink=true', () => {
    const r = smartParseTask('mailto:t***@***********')
    expect(r.isLink).toBe(true)
    expect(r.notes).toBe('mailto:t***@***********')
  })
})

describe('smartParse v3 — smartParseTask repeatConfig 集成', () => {
  test('每周一三五 -> parsed.repeatConfig.type=weekday weekdays=[1,3,5]', () => {
    const r = smartParseTask('开会 每周一三五', { language: 'zh-CN' })
    expect(r.repeatConfig).toBeDefined()
    expect(r.repeatConfig.type).toBe('weekly')
    expect(r.repeatConfig.weekdays).toEqual([1, 3, 5])
  })
  test('每月15号 -> monthly dayOfMonth=15', () => {
    const r = smartParseTask('交费 每月15号 7次后停止', { language: 'zh-CN' })
    expect(r.repeatConfig).toBeDefined()
    expect(r.repeatConfig.type).toBe('monthly')
    expect(r.repeatConfig.dayOfMonth).toBe(15)
    expect(r.repeatConfig.stopAfter).toBe(7)
  })
})

describe('smartParse v3 — getSmartHint 新增 hint', () => {
  test('重复语法 -> hints 含 repeat', () => {
    const h = getSmartHint('例会 每周一', 'zh-CN')
    expect(h).toContain('repeat')
  })
  test('内联语法 !0 -> hints 含 syntax', () => {
    const h = getSmartHint('修复 !0', 'zh-CN')
    expect(h).toContain('syntax')
  })
  test('>date -> hints 含 dueUntil', () => {
    const h = getSmartHint('交付 >12/31', 'zh-CN')
    expect(h).toContain('dueUntil')
  })
  test('⏱时间 -> hints 含 pomodoroEstimate', () => {
    const h = getSmartHint('任务 ⏱25m', 'zh-CN')
    expect(h).toContain('pomodoroEstimate')
  })
  test('番茄X分钟 -> hints 含 pomodoroEstimate', () => {
    const h = getSmartHint('学习 番茄25分钟', 'zh-CN')
    expect(h).toContain('pomodoroEstimate')
  })
  test('纯 URL -> hints 含 link', () => {
    const h = getSmartHint('https://example.com')
    expect(h).toContain('link')
  })
  test('英文 every day -> hints repeat', () => {
    const h = getSmartHint('brush teeth every day', 'en-US')
    expect(h).toContain('repeat')
  })
  test('日文 繰り返し -> hints repeat', () => {
    const h = getSmartHint('ランニング 毎週 繰り返し', 'ja-JP')
    expect(h).toContain('repeat')
  })
  test('@分类 #标签 $area 内联 -> syntax hint', () => {
    const h = getSmartHint('汇报 @工作 #周报 $Office', 'zh-CN')
    expect(h).toContain('syntax')
    expect(h).toContain('tags')
  })
})

// Extra sanity checks for isValidDateStr
describe('smartParse v3 — 输出格式校验', () => {
  test('所有日期字段均为合法 YYYY-MM-DD', () => {
    const cases = ['下周一 例会', '月末 结账', '3个工作日后 交付', '5月第二个星期一 年会']
    for (const c of cases) {
      const r = smartParseTask(c, { language: 'zh-CN' })
      expect(isValidDateStr(r.date), `case=${c} got ${r.date}`).toBe(true)
    }
  })
  test('repeatConfig 不会影响原 repeat 字段', () => {
    const r = smartParseTask('每天 打卡', { language: 'zh-CN' })
    expect(r.repeat).toBe('daily')
    expect(r.repeatConfig.type).toBe('daily')
  })
})
