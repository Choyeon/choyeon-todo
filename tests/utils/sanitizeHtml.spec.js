import { describe, it, expect } from 'vitest'
import { sanitizeHtml } from '../../src/utils/sanitizeHtml'

describe('sanitizeHtml — 更新日志白名单清理', () => {
  it('保留安全标签', () => {
    const out = sanitizeHtml('<p>修复 <strong>标题栏</strong> 问题</p>')
    expect(out).toContain('<strong>标题栏</strong>')
    expect(out).toContain('<p>')
  })

  it('移除 script 标签及其内容', () => {
    const out = sanitizeHtml('<p>正常</p><script>alert(1)</script>')
    expect(out).not.toContain('script')
    expect(out).not.toContain('alert(1)')
  })

  it('移除未加引号的 onerror 属性（正则方案会漏）', () => {
    const out = sanitizeHtml('<img src=x onerror=alert(1)>')
    expect(out).not.toContain('onerror')
    expect(out).not.toContain('<img')
  })

  it('移除 javascript: 链接', () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)">点击</a>')
    expect(out).not.toContain('javascript:')
  })

  it('允许的 http 链接加上 noopener', () => {
    const out = sanitizeHtml('<a href="https://github.com/Choyeon/choyeon-todo">仓库</a>')
    expect(out).toContain('https://github.com/Choyeon/choyeon-todo')
    expect(out).toContain('noopener')
  })

  it('移除 iframe / svg 等危险容器', () => {
    const out = sanitizeHtml(
      '<iframe src="https://evil.example"></iframe><svg onload="alert(1)"></svg>'
    )
    expect(out).not.toContain('iframe')
    expect(out).not.toContain('svg')
  })

  it('空输入返回空字符串', () => {
    expect(sanitizeHtml('')).toBe('')
    expect(sanitizeHtml(null)).toBe('')
  })
})
