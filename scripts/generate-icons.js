import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const svgContent = fs.readFileSync(path.join(__dirname, '../public/favicon.svg'), 'utf-8')

const sizes = [
  { size: 16, name: 'icon-16.png' },
  { size: 32, name: 'icon-32.png' },
  { size: 48, name: 'icon-48.png' },
  { size: 64, name: 'icon-64.png' },
  { size: 128, name: 'icon-128.png' },
  { size: 256, name: 'icon-256.png' },
  { size: 512, name: 'icon-512.png' }
]

const buildDir = path.join(__dirname, '../build')

async function generateIcons() {
  const pngBuffers = {}

  for (const { size, name } of sizes) {
    const svgBuffer = Buffer.from(svgContent.replace('width="48" height="48"', `width="${size}" height="${size}"`))
    const output = await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toBuffer()
    pngBuffers[size] = output
    fs.writeFileSync(path.join(buildDir, name), output)
    console.log(`Generated ${name} (${size}x${size})`)
  }

  fs.copyFileSync(path.join(buildDir, 'icon-512.png'), path.join(buildDir, 'icon.png'))
  console.log('Copied icon.png (512x512)')

  // 生成 ICO 文件
  await generateIco(pngBuffers, path.join(buildDir, 'icon.ico'))
  console.log('Generated icon.ico')

  // 更新 src/assets/favicon.png
  fs.copyFileSync(path.join(buildDir, 'icon-48.png'), path.join(__dirname, '../src/assets/favicon.png'))
  console.log('Updated src/assets/favicon.png')

  console.log('All icons generated successfully!')
}

async function generateIco(pngBuffers, outputPath) {
  const icoSizes = [16, 32, 48, 64, 128, 256]
  const entries = []
  let offset = 6 + icoSizes.length * 16

  for (const size of icoSizes) {
    const pngBuffer = pngBuffers[size]
    entries.push({
      width: size >= 256 ? 0 : size,
      height: size >= 256 ? 0 : size,
      colors: 0,
      planes: 1,
      bitCount: 32,
      size: pngBuffer.length,
      offset: offset
    })
    offset += pngBuffer.length
  }

  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(icoSizes.length, 4)

  const dirEntries = Buffer.alloc(icoSizes.length * 16)
  for (let i = 0; i < icoSizes.length; i++) {
    const e = entries[i]
    const off = i * 16
    dirEntries.writeUInt8(e.width, off)
    dirEntries.writeUInt8(e.height, off + 1)
    dirEntries.writeUInt8(e.colors, off + 2)
    dirEntries.writeUInt8(0, off + 3)
    dirEntries.writeUInt16LE(e.planes, off + 4)
    dirEntries.writeUInt16LE(e.bitCount, off + 6)
    dirEntries.writeUInt32LE(e.size, off + 8)
    dirEntries.writeUInt32LE(e.offset, off + 12)
  }

  const icoBuffer = Buffer.concat([
    header,
    dirEntries,
    ...icoSizes.map(s => pngBuffers[s])
  ])

  fs.writeFileSync(outputPath, icoBuffer)
}

generateIcons().catch(console.error)
