// 收集所有 t('a.b.c') 用到的 key，对照 zh-CN 找缺失
const fs = require('fs')
const path = require('path')
const vm = require('vm')

const projectRoot = path.join(__dirname, '..')
const srcDir = path.join(projectRoot, 'src')
const exts = new Set(['.vue', '.js', '.cjs', '.mjs'])
const keysUsed = new Set()

function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f)
    const st = fs.statSync(full)
    if (st.isDirectory()) walk(full)
    else if (exts.has(path.extname(f))) {
      const txt = fs.readFileSync(full, 'utf8')
      // 匹配 t('a.b') / $t('a.b') / i18n.t('a.b')，允许后续还有参数
      // 前置负向后顾 [{word}.] 用于排除 emit( / split( / prompt( 等以 t 结尾的标识符
      const re = /(?<![\w$.])(?:[$]?t|i18n\.t)\(\s*['"]([a-zA-Z0-9_.]+)['"]/g
      let m
      while ((m = re.exec(txt))) {
        const key = m[1]
        // 跳过动态拼接的键前缀，如 t('pomodoro.' + mode) / t('pomodoro.noise_' + n)
        if (key.endsWith('.') || key.endsWith('_')) continue
        keysUsed.add(key)
      }
    }
  }
}
walk(srcDir)

function flatten(obj, prefix = '') {
  const out = new Set()
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? prefix + '.' + k : k
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const sub of flatten(v, p)) out.add(sub)
    } else {
      out.add(p)
    }
  }
  return out
}

function loadLocale(file) {
  let src = fs.readFileSync(file, 'utf8')
  // eval object literal
  src = src.replace(/^export default\s*/, '')
  src = src.replace(/;\s*$/, '')
  const sandbox = {}
  vm.runInNewContext(`__obj = ${src}`, sandbox)
  return sandbox.__obj
}

const zh = flatten(loadLocale(path.join(srcDir, 'locales', 'zh-CN.js')))
const en = flatten(loadLocale(path.join(srcDir, 'locales', 'en-US.js')))
const ja = flatten(loadLocale(path.join(srcDir, 'locales', 'ja-JP.js')))

const missingZh = [...keysUsed].filter((k) => !zh.has(k)).sort()
const missingEn = [...keysUsed].filter((k) => !en.has(k)).sort()
const missingJa = [...keysUsed].filter((k) => !ja.has(k)).sort()

console.log('Used keys:', keysUsed.size)
console.log('zh-CN missing:', missingZh.length)
console.log('en-US missing:', missingEn.length)
console.log('ja-JP missing:', missingJa.length)
console.log('\n=== zh-CN missing ===')
for (const k of missingZh) console.log('  ' + k)
