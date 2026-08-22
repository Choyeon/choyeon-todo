#!/usr/bin/env node
// scripts/a11y-check.js
// 静态扫描 src/**/*.vue 的 a11y 规则（E1~E6），使用 @vue/compiler-sfc
import { parse } from '@vue/compiler-sfc'
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { resolve, dirname, join, isAbsolute } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = resolve(__dirname, '..')
const SRC_DIR = join(ROOT, 'src')

// ========== Helpers ==========
const INTERACTIVE_TAGS = new Set(['button', 'input', 'select', 'textarea', 'a'])
const INTERACTIVE_ROLES = new Set([
  'menuitem',
  'button',
  'option',
  'menuitemcheckbox',
  'menuitemradio',
  'link',
  'checkbox',
  'radio',
  'tab',
  'switch'
])

/** 粗略的静态递归子树：@vue/compiler-sfc 返回 AST，其中 type=1=Element, 2=Text, 3=Comment/Interpolation, ... */
const walkChildren = (node, fn) => {
  if (!node) return
  const children =
    node.children ||
    (node.content && typeof node.content === 'object' && node.content.children) ||
    []
  for (const c of children) {
    fn(c)
    walkChildren(c, fn)
  }
}

const collectElements = (root) => {
  const out = []
  if (!root) return out
  const go = (n) => {
    if (n && n.type === 1) {
      out.push(n)
    }
    walkChildren(n, go)
  }
  go(root)
  return out
}

const getAttr = (el, name) => {
  if (!el || !el.props) return null
  for (const p of el.props) {
    // type=6: Attribute（静态）；type=7: Directive（动态）
    if (p.type === 6 && p.name === name) {
      return { type: 'static', value: p.value && p.value.content ? p.value.content : '' }
    }
    if (p.type === 7 && p.name === 'bind' && p.arg && p.arg.type === 4 && p.arg.content === name) {
      return { type: 'dynamic', raw: p.exp && p.exp.type === 4 ? p.exp.content : '...' }
    }
  }
  return null
}

const hasAttr = (el, name) => getAttr(el, name) != null

const getRole = (el) => {
  const a = getAttr(el, 'role')
  return a ? a.value || a.raw || '' : ''
}

// 判断节点是否为「交互」（tag 或 role）
const isInteractive = (el) => {
  const tag = (el.tag || '').toLowerCase()
  if (tag === 'a' && hasAttr(el, 'href')) return true
  if (INTERACTIVE_TAGS.has(tag) && tag !== 'a') return true
  const role = getRole(el)
  if (role && INTERACTIVE_ROLES.has(role)) return true
  return false
}

// 获取节点的文本子孙：
// - type===2：纯文本（静态字符串内容）
// - type===5：Interpolation 插值节点（把 exp.type===4 的纯标识符 / 字符串表达式也视为「有内容」，
//   因为模板层静态 AST 无法运行时求值，但至少包含人类可读变量）
// - type===8：CompoundExpression（Vue3）：按 sources/loc 粗略判定非空
const getStaticText = (el) => {
  if (!el) return ''
  let text = ''
  walkChildren(el, (n) => {
    if (!n) return
    if (n.type === 2 && typeof n.content === 'string') {
      text += n.content
    } else if (n.type === 5) {
      // {{ exp }} 插值：仅当表达式是简单标识符（非函数调用/操作符）时，认为会有文本
      const exp = n.content && typeof n.content === 'object' ? n.content : null
      const raw = exp && exp.loc && typeof exp.loc.source === 'string' ? exp.loc.source :
        (typeof n.content === 'string' ? n.content : '')
      if (raw && /^[\w$.]+$/.test(raw.trim())) text += '{i}'
    } else if (n.type === 8 && n.children) {
      for (const c of n.children) {
        if (typeof c === 'string') text += c
      }
    }
  })
  return text.trim()
}

// 解析 style block（若存在）源码，用于 E4 颜色启发
const findStyles = (descriptor) => {
  const styles = []
  for (const s of descriptor.styles || []) {
    styles.push(s.content || '')
  }
  return styles.join('\n')
}

// 解析 template 行号：el.loc.start.line
const lineOf = (el) => (el && el.loc && el.loc.start && el.loc.start.line) || 1

// ========== 单文件扫描 ==========
const scanFile = (filePath, source) => {
  const issues = []
  let parsed
  try {
    parsed = parse(source, { filename: filePath })
  } catch (e) {
    issues.push({ rule: 'PARSE', level: 'error', line: 1, msg: `SFC parse 失败: ${e.message}` })
    return issues
  }
  const descriptor = parsed.descriptor
  const template = descriptor.template
  const tplAST = template && template.ast
  const elements = collectElements(tplAST)

  // 映射 form name/id 供 E3 检查
  const inputNames = new Set()
  const idAttrs = new Set()
  const labelFors = new Set()

  for (const el of elements) {
    const id = getAttr(el, 'id')
    if (id && id.value) idAttrs.add(id.value)
    const name = getAttr(el, 'name')
    if (name && name.value) inputNames.add(name.value)
    const ffor = getAttr(el, 'for')
    if (ffor && ffor.value) labelFors.add(ffor.value)
  }

  // ===== E1：交互元素 label =====
  for (const el of elements) {
    if (!isInteractive(el)) continue
    const hasAriaLabel = hasAttr(el, 'aria-label') || hasAttr(el, 'aria-labelledby')
    const hasText = getStaticText(el).length > 0
    // label for 匹配 id
    const idV = getAttr(el, 'id')
    const idVal = idV && idV.value
    const hasLabelFor = idVal ? labelFors.has(idVal) : false
    // 输入控件若 type=hidden 则跳过
    const typeAttr = getAttr(el, 'type')
    if (typeAttr && typeAttr.value === 'hidden') continue
    const ok = hasAriaLabel || hasText || hasLabelFor
    if (!ok) {
      const tag = (el.tag || '').toLowerCase()
      const role = getRole(el) || ''
      issues.push({
        rule: 'E1',
        level: 'error',
        line: lineOf(el),
        msg: `交互元素 <${tag}${role ? ` role="${role}"` : ''}> 缺可读 label（aria-label/aria-labelledby/文字内容/<label for>）`
      })
    }
  }

  // ===== E2：<img alt> 与 SVG role='img' =====
  for (const el of elements) {
    const tag = (el.tag || '').toLowerCase()
    if (tag === 'img') {
      const alt = getAttr(el, 'alt')
      if (alt == null) {
        issues.push({
          rule: 'E2',
          level: 'error',
          line: lineOf(el),
          msg: '<img> 缺少 alt 属性（允许 alt="" 作装饰）'
        })
      }
    }
    if (tag === 'svg') {
      const role = getRole(el)
      if (role === 'img') {
        const hasLabel = hasAttr(el, 'aria-label') || hasAttr(el, 'aria-labelledby')
        if (!hasLabel) {
          issues.push({
            rule: 'E2',
            level: 'error',
            line: lineOf(el),
            msg: `装饰 SVG role="img" 需要 aria-label`
          })
        }
      }
    }
  }

  // ===== E3：表单输入要有 name；radio/checkbox 组要有 fieldset+legend =====
  for (const el of elements) {
    const tag = (el.tag || '').toLowerCase()
    if (!['input', 'select', 'textarea'].includes(tag)) continue
    // 跳过 button / submit 等
    const typeAttr = getAttr(el, 'type')
    const typeVal = (typeAttr && typeAttr.value) || (tag === 'input' ? 'text' : null)
    if (typeVal === 'button' || typeVal === 'submit' || typeVal === 'reset') continue
    const nameAttr = getAttr(el, 'name')
    if (!nameAttr) {
      issues.push({
        rule: 'E3',
        level: 'error',
        line: lineOf(el),
        msg: `表单控件 <${tag}> 缺少 name 属性`
      })
    }
  }

  // 检查 radio/checkbox 组：如果在 fieldset 里但没 legend → warn
  const fieldsetEls = elements.filter((e) => (e.tag || '').toLowerCase() === 'fieldset')
  for (const fs of fieldsetEls) {
    const fsChildren = collectElements(fs)
    const hasLegend = fsChildren.some((c) => (c.tag || '').toLowerCase() === 'legend')
    const hasRadiogroupAria =
      getAttr(fs, 'role') && getAttr(fs, 'role').value === 'radiogroup' && hasAttr(fs, 'aria-label')
    const hasRadios = fsChildren.some((c) => {
      const t = getAttr(c, 'type')
      return (c.tag || '').toLowerCase() === 'input' && t && (t.value === 'radio' || t.value === 'checkbox')
    })
    if (hasRadios && !hasLegend && !hasRadiogroupAria) {
      issues.push({
        rule: 'E3',
        level: 'error',
        line: lineOf(fs),
        msg: `<fieldset> 包含 radio/checkbox 但缺 <legend>（或 role=radiogroup + aria-label）`
      })
    }
  }
  // 如果使用了 role=radiogroup 但没 aria-label：报错
  for (const el of elements) {
    const role = getRole(el)
    if (role === 'radiogroup') {
      if (!hasAttr(el, 'aria-label') && !hasAttr(el, 'aria-labelledby')) {
        issues.push({
          rule: 'E3',
          level: 'error',
          line: lineOf(el),
          msg: `role="radiogroup" 元素缺 aria-label/aria-labelledby`
        })
      }
    }
  }

  // ===== E4：颜色样式仅用于区分（启发 warning，非 error）=====
  const styles = findStyles(descriptor)
  // 简单启发：若存在类似 .error { color: #f00; } 类名 + 无伴随 icon/text 变量就提示（非常保守）
  const colorClasses = []
  const re = /\.([A-Za-z_][\w-]*)\s*\{[^}]*color\s*:/g
  let mm
  while ((mm = re.exec(styles)) !== null) {
    const block = mm[0]
    const cls = mm[1]
    // 若块里只有 color/background-color（没 border/content），提示 warning
    if (/border|box-shadow|icon|font-weight|text-decoration|content|display.*flex|padding.*\d/.test(block)) continue
    colorClasses.push(cls)
  }
  // 判断这些类名是否只作用在不含文字/图标的块上（若模板里有此类名的元素且无 child 文本且无 svg/img 子 → warn）
  for (const cls of colorClasses) {
    for (const el of elements) {
      const clazz = getAttr(el, 'class')
      if (!clazz) continue
      const classVal = typeof clazz.value === 'string' ? clazz.value : String(clazz.raw || '')
      if (!classVal.split(/\s+/).includes(cls)) continue
      // 若 element 有子元素 svg/img/icon → ok
      const hasIcon = collectElements(el).some((c) => {
        const t = (c.tag || '').toLowerCase()
        return t === 'svg' || t === 'img' || t === 'i' || t === 'lucide-icon'
      })
      const txt = getStaticText(el)
      if (!hasIcon && txt.length === 0) {
        issues.push({
          rule: 'E4',
          level: 'warning',
          line: lineOf(el),
          msg: `疑似仅以颜色作为区分（类 .${cls}），建议增加图标或文字提示`
        })
      }
    }
  }

  // ===== E5：Dialog 语义与 ESC =====
  // 明显不是 dialog 自身的后缀（只是包裹/内部区块）
  const NON_DIALOG_SUFFIXES =
    /(^|[\s_-])(modal|dialog|popup|popover)[-_](backdrop|overlay|mask|header|title|body|content|footer|actions|colors|close|btn|buttons|label|divider|groups?|rows?|cols?|grid|list|form|inputs?|selects?)([\s_-]|$)/i
  const dialogCandidates = elements.filter((el) => {
    const role = getRole(el)
    if (role === 'dialog' || role === 'alertdialog') return true
    const clazz = getAttr(el, 'class')
    const cv = clazz ? clazz.value || String(clazz.raw || '') : ''
    if (!cv) return false
    // 类名暗示 dialog/popup/popover（支持 hyphen/underscore/空格）
    if (!/(^|[\s_-])(modal|dialog|popup|popover|confirm-dialog)([\s_-]|$)/i.test(cv)) return false
    // 过滤掉明显只是 backdrop/overlay/header/title/body/actions 等子块
    if (NON_DIALOG_SUFFIXES.test(cv)) return false
    return true
  })
  const parentOf = (target) => {
    let p = target && target.parent
    while (p && p.type !== 1) p = p.parent
    return p || null
  }
  // 判断是否处于某个"确实像 dialog 的祖先"中：有 role=dialog 或类名就是 dialog-container/modal-container
  const hasDialogAncestor = (el) => {
    let p = parentOf(el)
    while (p) {
      const role = getRole(p)
      if (role === 'dialog' || role === 'alertdialog') return true
      const c = getAttr(p, 'class')
      const cv = c ? c.value || String(c.raw || '') : ''
      if (/(^|[\s_-])(modal|dialog|popup|popover|confirm-dialog)([\s_-]|$)/i.test(cv) && !NON_DIALOG_SUFFIXES.test(cv)) return true
      p = parentOf(p)
    }
    return false
  }
  for (const dlg of dialogCandidates) {
    const role = getRole(dlg)
    const hasRole = role === 'dialog' || role === 'alertdialog'
    // 若自身没有 role，但祖先有 role=dialog（说明是 backdrop / 内层元素），仅当有 aria-modal/aria-labelledby 错误才提示
    const inheritedOk = !hasRole && hasDialogAncestor(dlg)
    if (inheritedOk) continue
    const hasModal = (() => {
      const a = getAttr(dlg, 'aria-modal')
      return a && (a.value === 'true' || a.raw && a.raw.includes('true'))
    })()
    const hasLb = hasAttr(dlg, 'aria-labelledby') || hasAttr(dlg, 'aria-label')
    if (!hasRole || !hasModal || !hasLb) {
      const missing = [
        !hasRole ? 'role=dialog' : null,
        !hasModal ? 'aria-modal=true' : null,
        !hasLb ? 'aria-labelledby/aria-label' : null
      ].filter(Boolean).join('、')
      issues.push({
        rule: 'E5',
        level: 'error',
        line: lineOf(dlg),
        msg: `Dialog 缺少：${missing}`
      })
      continue
    }
    // ESC 检查：template 里是否有 @keydown.*escape/@keydown.*esc 或 .esc/.esc.prevent 修饰符
    // 或 .vue 源码中有 keydown listener + Escape/Esc
    const hasEsc =
      /@keydown(?:\.self)?(?:\.(?:prevent|stop|ctrl|meta|alt|shift|exact))*(?:\.esc|\.escape)(?:\.(?:prevent|stop|exact))*=/.test(source) ||
      /@keydown(?:\.self)?(?:\.(?:prevent|stop))*="[^"]*(?:Escape|Esc|escape|esc)[^"]*"/.test(source) ||
      /window\.addEventListener\(['"]keydown['"]/.test(source) && /Escape|Esc/.test(source) ||
      /addEventListener\(\s*['"]keydown['"]/.test(source) && /Escape|Esc/.test(source) ||
      /e\.key\s*(?:===|!==|==|!=)\s*['"`]Escape['"`]/.test(source)
    if (!hasEsc) {
      issues.push({
        rule: 'E5',
        level: 'error',
        line: lineOf(dlg),
        msg: `Dialog 无 ESC 关闭（扫描 template/script 中的 Escape/Esc keydown）`
      })
    }
  }

  // ===== E6：<template> 根 / App.vue lang =====
  if (/App\.vue$/.test(filePath) || (tplAST && Array.isArray(tplAST.children) && tplAST.children[0] && tplAST.children[0].type === 1)) {
    const root = tplAST && Array.isArray(tplAST.children) ? tplAST.children.find((c) => c && c.type === 1) : null
    const rootEl = root
    let hasLang = false
    if (rootEl) {
      const lang = getAttr(rootEl, 'lang')
      if (lang) hasLang = true
    }
    // 或任意祖先元素（最外层元素）有 :lang / lang=
    for (const el of elements) {
      if (hasAttr(el, 'lang')) { hasLang = true; break }
    }
    if (!hasLang && filePath.replace(/\\/g, '/').endsWith('/src/App.vue')) {
      issues.push({
        rule: 'E6',
        level: 'error',
        line: 1,
        msg: `App.vue 顶层元素缺少 :lang="locale" 或 lang="zh-CN"`
      })
    } else if (!hasLang) {
      // 其他组件非强制：warning（不列为 error）
      // 这里不记（避免海量）
    }
  }

  return issues
}

// ========== main ==========
const main = async () => {
  const vueFiles = []
  // 使用 readdirSync 递归扫描（兼容所有 Node 版本）
  const scan = (d) => {
    try {
      for (const n of readdirSync(d)) {
        const p = join(d, n)
        try {
          const s = statSync(p)
          if (s.isDirectory()) scan(p)
          else if (p.endsWith('.vue')) vueFiles.push(p)
        } catch (_) { /* ignore */ }
      }
    } catch (_) { /* ignore */ }
  }
  scan(SRC_DIR)

  const summary = {
    E1: { errors: 0, warnings: 0 },
    E2: { errors: 0, warnings: 0 },
    E3: { errors: 0, warnings: 0 },
    E4: { errors: 0, warnings: 0 },
    E5: { errors: 0, warnings: 0 },
    E6: { errors: 0, warnings: 0 },
    PARSE: { errors: 0, warnings: 0 }
  }
  let totalErrors = 0
  let totalWarnings = 0
  // 防止重复：以 rule:file:line:msg 为 key 去重（静态 AST 下同一行 v-for 可能重复展开造成巨量噪音）
  const unique = new Set()
  const printCap = { E1: 50, E2: 50, E3: 50, E4: 40, E5: 30, E6: 5, PARSE: 10 }
  const printed = {}

  for (const p of vueFiles) {
    const src = readFileSync(p, 'utf8')
    const rel = p.slice(ROOT.length + 1).replace(/\\/g, '/')
    const issues = scanFile(p, src)
    if (issues.length === 0) continue
    for (const it of issues) {
      summary[it.rule] = summary[it.rule] || { errors: 0, warnings: 0 }
      if (it.level === 'error') {
        summary[it.rule].errors++
        totalErrors++
      } else {
        summary[it.rule].warnings++
        totalWarnings++
      }
      const key = `${it.rule}\x00${rel}\x00${it.line}\x00${it.msg}`
      if (unique.has(key)) continue
      unique.add(key)
      const cap = printCap[it.rule] || 20
      printed[it.rule] = (printed[it.rule] || 0) + 1
      if (printed[it.rule] <= cap) {
        const prefix = it.level === 'error' ? 'ERROR' : 'WARN '
        console.log(`${prefix} [${it.rule}] ${rel}:${it.line} ${it.msg}`)
      }
    }
  }
  // 对于到达 cap 的规则补充一条摘要
  for (const r of Object.keys(printCap)) {
    const cap = printCap[r]
    if ((printed[r] || 0) > cap) {
      const overflow = (printed[r] || 0) - cap
      console.log(`...  [${r}] 另有 ${overflow} 条同规则问题被省略（见 summary）`)
    }
  }

  console.log('\n===== a11y-check summary =====')
  for (const r of Object.keys(summary)) {
    const s = summary[r]
    if (s.errors + s.warnings === 0) continue
    console.log(`  ${r}: errors=${s.errors} warnings=${s.warnings}`)
  }
  console.log(`  total: errors=${totalErrors} warnings=${totalWarnings}`)
  console.log(`  files scanned=${vueFiles.length}`)

  process.exit(totalErrors > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error('a11y-check failed:', e)
  process.exit(2)
})
