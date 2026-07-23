import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

const projectRoot = path.resolve(process.cwd())
const publicDir = path.join(projectRoot, 'public')
const buildDir = path.join(projectRoot, 'build')

const iconSizes = [16, 32, 48, 64, 128, 256]

async function generateIcons() {
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true })
  }

  const faviconPath = path.join(publicDir, 'favicon.png')
  console.warn('Looking for favicon at:', faviconPath)
  if (!fs.existsSync(faviconPath)) {
    console.error('favicon.png not found in public directory')
    process.exit(1)
  }

  console.warn('Generating icons from favicon.png...')

  for (const size of iconSizes) {
    const outputPath = path.join(buildDir, `icon-${size}x${size}.png`)
    await sharp(faviconPath)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(outputPath)
    console.warn(`Generated: ${outputPath}`)
  }

  const icoPath = path.join(buildDir, 'icon.ico')
  const icoBuffers = []
  for (const size of iconSizes) {
    const buffer = await sharp(faviconPath)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toBuffer()
    icoBuffers.push({ size, buffer })
  }

  const icoData = createIco(icoBuffers)
  fs.writeFileSync(icoPath, icoData)
  console.warn(`Generated: ${icoPath}`)

  const pngPath = path.join(buildDir, 'icon.png')
  await sharp(faviconPath)
    .resize(512, 512, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toFile(pngPath)
  console.warn(`Generated: ${pngPath}`)

  console.warn('Icon generation complete!')
}

function createIco(images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)

  const entries = []
  const data = []

  let offset = 6 + images.length * 16

  for (const { size, buffer } of images) {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(Math.min(size, 255), 0)
    entry.writeUInt8(Math.min(size, 255), 1)
    entry.writeUInt8(0, 2)
    entry.writeUInt8(0, 3)
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 6)
    entry.writeUInt32LE(buffer.length, 8)
    entry.writeUInt32LE(offset, 12)
    entries.push(entry)
    data.push(buffer)
    offset += buffer.length
  }

  return Buffer.concat([header, ...entries, ...data])
}

generateIcons().catch((err) => {
  console.error('Error generating icons:', err)
  process.exit(1)
})
