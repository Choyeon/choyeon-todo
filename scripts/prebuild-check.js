#!/usr/bin/env node
// scripts/prebuild-check.js
// 构建前检查脚本：版本、electron-builder 配置、构建目录权限、eslint、i18n 资源
import { readFileSync, existsSync, statSync, mkdirSync, writeFileSync, rmSync, readdirSync, stat } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = resolve(__dirname, '..')

let errors = 0
let warnings = 0
const log = (msg) => console.log(`[prebuild] ${msg}`)
const err = (msg) => {
  errors++
  console.error(`[prebuild][ERROR] ${msg}`)
}
const warn = (msg) => {
  warnings++
  console.warn(`[prebuild][WARN ] ${msg}`)
}

// ===== 1. package.json version =====
log('检查 package.json version...')
const pkgPath = join(ROOT, 'package.json')
let pkg
try {
  pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
} catch (e) {
  err(`读取 package.json 失败: ${e.message}`)
}
if (pkg) {
  if (pkg.version !== '3.0.0') {
    warn(`package.json version 为 ${pkg.version}，期望 3.0.0（仅内存修复，不写盘）`)
    // 内存修复
    pkg.version = '3.0.0'
  }
  log(`  version (内存): ${pkg.version}`)
}

// ===== 2. electron-builder 配置（package.build 或独立文件）=====
log('检查 electron-builder 配置...')
const hasBuildInPackage =
  pkg && pkg.build && typeof pkg.build === 'object' &&
  pkg.build.win && pkg.build.nsis
const builderJson = join(ROOT, 'electron-builder.json')
const builderYml = join(ROOT, 'electron-builder.yml')
const hasStandalone = existsSync(builderJson) || existsSync(builderYml)
let builderCfgOk = !!hasBuildInPackage
if (!builderCfgOk && hasStandalone) {
  try {
    let cfg
    if (existsSync(builderJson)) cfg = JSON.parse(readFileSync(builderJson, 'utf8'))
    if (cfg && cfg.win && cfg.nsis) builderCfgOk = true
  } catch (_) {}
}
if (builderCfgOk) {
  log('  electron-builder 配置包含 win/nsis')
} else {
  err('未找到 electron-builder.json / electron-builder.yml，且 package.json build 缺少 win/nsis')
}

// ===== 3. 构建目录写权限 C:\choyeon-todo\ =====
log('检查构建输出目录写权限 (C:\\choyeon-todo)...')
const buildDir = 'C:\\choyeon-todo'
try {
  if (!existsSync(buildDir)) {
    try { mkdirSync(buildDir, { recursive: true }) } catch (e) { /* will retry write test */ }
  }
  const testFile = join(buildDir, `.prebuild-write-test-${process.pid}.tmp`)
  writeFileSync(testFile, 'ok', { flag: 'w' })
  rmSync(testFile)
  log('  C:\\choyeon-todo 可写 ✓')
} catch (e) {
  err(`C:\\choyeon-todo 无写权限或创建失败: ${e.message}`)
}

// ===== 4. eslint 可用时跑 eslint src --max-warnings 100 =====
log('检查 eslint 可用性...')
let eslintAvailable = false
try {
  execSync('npx --no-install eslint --version', { cwd: ROOT, stdio: 'ignore', timeout: 15000 })
  eslintAvailable = true
} catch (_) {
  // skip
}
if (eslintAvailable) {
  log('  eslint 可用，运行 eslint src --max-warnings 100 ...')
  try {
    const out = execSync('npx --no-install eslint src --ext .vue,.js,.cjs --max-warnings 100', {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 180 * 1000,
      stdio: ['ignore', 'pipe', 'pipe']
    })
    log('  eslint 通过 ✓')
    if (out && out.trim()) log('  ' + out.trim().split('\n').slice(-3).join('\n  '))
  } catch (e) {
    const stderr = (e && e.stderr) || ''
    const stdout = (e && e.stdout) || ''
    const combined = (stdout + '\n' + stderr).trim()
    // 输出中若包含 warnings exceeded 则视为 error；否则 warning
    if (/(warnings exceeded|error)/i.test(combined)) {
      err(`eslint 失败: ${combined.slice(0, 400)}`)
    } else {
      warn(`eslint 输出异常: ${combined.slice(0, 300)}`)
    }
  }
} else {
  warn('eslint 不可用（未安装或未在 PATH），跳过 lint')
}

// ===== 5. 本地化资源数量校验 zh/en/ja =====
log('检查本地化资源 zh-CN / en-US / ja-JP ...')
const REQUIRED_KEYS = [
  // 任务分类 / 重复 / 提醒
  ['categories', /category|cat\./],
  ['repeat', /repeat|repeat\.|重复/],
  ['reminder', /remind|reminder|提醒/]
]
const i18nDir = join(ROOT, 'src', 'locales')
const files = {
  'zh-CN': join(i18nDir, 'zh-CN.js'),
  'en-US': join(i18nDir, 'en-US.js'),
  'ja-JP': join(i18nDir, 'ja-JP.js')
}
const loaded = {}
for (const [k, p] of Object.entries(files)) {
  if (!existsSync(p)) {
    err(`缺少本地化文件: ${p}`)
    continue
  }
  try {
    const raw = readFileSync(p, 'utf8')
    // 计算 key 数：大致数 "key" 或 key: 出现次数（非严格 AST，足够用于比较一致性）
    // 统计 lines 中匹配 /\s['"]?[\w-]+['"]?\s*:/
    const keyLines = raw.match(/^\s*['"]?[\w-]+['"]?\s*:/gm) || []
    // 粗略估计：每个 { 后至少一个 key
    loaded[k] = {
      keyCount: keyLines.length,
      source: raw
    }
    log(`  ${k}: ~${keyLines.length} keys`)
  } catch (e) {
    err(`读取 locale ${k} 失败: ${e.message}`)
  }
}
if (Object.keys(loaded).length >= 2) {
  const counts = Object.entries(loaded).map(([k, v]) => [k, v.keyCount])
  const vals = counts.map((c) => c[1])
  const max = Math.max(...vals)
  const min = Math.min(...vals)
  const diff = max - min
  log(`  key 数量差: ${diff}`)
  if (diff > 5) {
    err(`本地化 key 数量差 ${diff} > 5，详情: ${counts.map(([k, v]) => `${k}=${v}`).join(' ')}`)
  }
  // 必填三项（按出现关键词而非严格 key）
  for (const [label, pattern] of REQUIRED_KEYS) {
    for (const k of Object.keys(loaded)) {
      if (!pattern.test(loaded[k].source)) {
        err(`本地化 ${k} 缺少「${label}」相关关键字（regex: ${pattern}）`)
      }
    }
  }
  log('  本地化必填关键字检查完成')
}

// ===== 结果 =====
console.log('\n===== prebuild-check summary =====')
console.log(`  errors=${errors}  warnings=${warnings}`)
if (errors === 0) {
  console.log('  ✅ 通过')
  process.exit(0)
} else {
  console.log('  ❌ 失败')
  process.exit(1)
}
