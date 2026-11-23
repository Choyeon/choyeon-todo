/**
 * 更新日志 HTML 白名单清理。
 * 来源为 GitHub Release body（外部内容），直接用 v-html 渲染前必须清理。
 * 正则替换挡不住未加引号属性、javascript: URL、SVG 事件等，因此走 DOMParser 白名单。
 */

const SANITIZE_ALLOWED = new Set([
  'P',
  'BR',
  'STRONG',
  'B',
  'EM',
  'I',
  'UL',
  'OL',
  'LI',
  'CODE',
  'PRE',
  'A',
  'H1',
  'H2',
  'H3',
  'H4',
  'BLOCKQUOTE'
])

export function sanitizeHtml(raw) {
  if (!raw || typeof window === 'undefined' || !window.DOMParser) return ''
  const doc = new DOMParser().parseFromString(`<div>${raw}</div>`, 'text/html')
  const root = doc.body.firstElementChild
  if (!root) return ''

  const walk = (node) => {
    for (const child of Array.from(node.children)) {
      if (!SANITIZE_ALLOWED.has(child.tagName)) {
        child.remove()
        continue
      }
      for (const attr of Array.from(child.attributes)) {
        const name = attr.name.toLowerCase()
        const allowed =
          child.tagName === 'A' && name === 'href' && /^(https?:)?\/\//i.test(attr.value)
        if (!allowed) child.removeAttribute(attr.name)
      }
      if (child.tagName === 'A') {
        child.setAttribute('target', '_blank')
        child.setAttribute('rel', 'noopener noreferrer')
      }
      walk(child)
    }
  }
  walk(root)
  return root.innerHTML
}
