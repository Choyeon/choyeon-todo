// 生成 electron-updater 所需 latest.yml
// 用法: node scripts/gen-latest-yml.cjs [输出目录] [版本号]
// 未指定输出目录时，按 electron-builder 的 directories.output 约定推导 (C:/choyeon-todo/<version>)
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'))
const version = process.argv[3] || pkg.version
const outDir = process.argv[2] || path.posix.join('C:/choyeon-todo', version)

if (!fs.existsSync(outDir)) {
  console.error(`[ERROR] 输出目录不存在: ${outDir}`)
  console.error('请先运行打包，或通过参数指定正确的输出目录。')
  process.exit(1)
}

const setupName = `Choyeon-To-Do-Setup-${version}.exe`
const blockmapName = `${setupName}.blockmap`
const portableName = `Choyeon-To-Do-Portable-${version}.exe`

const sha512Of = (file) => {
  const buf = fs.readFileSync(file)
  return crypto.createHash('sha512').update(buf).digest('base64')
}
const sizeOf = (file) => fs.statSync(file).size

const resolve = (name, required) => {
  const full = path.join(outDir, name)
  if (!fs.existsSync(full)) {
    if (required) {
      console.error(`[ERROR] 缺少必需产物: ${full}`)
      console.error('latest.yml 必须描述真实存在的安装文件，否则客户端更新会失败。')
      process.exit(1)
    }
    return null
  }
  return { url: name, sha512: sha512Of(full), size: sizeOf(full) }
}

const setup = resolve(setupName, true)
const blockmap = resolve(blockmapName, false)
const portable = resolve(portableName, false)

// electron-updater 依赖 files 列表里的 sha512/size 做完整性校验，顺序无关但必须齐全
const files = [setup, blockmap, portable].filter(Boolean)

const lines = [
  `version: ${version}`,
  'files:',
  ...files.map((f) => `  - url: ${f.url}\n    sha512: ${f.sha512}\n    size: ${f.size}`),
  `path: ${setup.url}`,
  `sha512: ${setup.sha512}`,
  `releaseDate: ${new Date().toISOString()}`,
  ''
]

const yml = lines.join('\n')
fs.writeFileSync(path.join(outDir, 'latest.yml'), yml, 'utf8')
console.log(`[OK] latest.yml generated -> ${path.join(outDir, 'latest.yml')}`)
console.log(yml)
