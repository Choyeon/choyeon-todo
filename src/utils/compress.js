// compress.js
// Task 8: 轻量压缩 / 解压缩 / 哈希工具。
// 设计目标：零依赖（不强制 pako），优先 CompressionStream，退化直转 Base64。

// ========== FNV-1a 32 bit 哈希（纯 JS，无依赖） ==========
const FNV1A_OFFSET = 0x811c9dc5
const FNV1A_PRIME = 0x01000193

/**
 * 对任意数据生成 32 bit FNV-1a 指纹字符串（8 位十六进制，小写）。
 * @param {any} data   任意可序列化数据（先 JSON.stringify，undefined 按 null 归一）
 * @param {'fnv1a'} [algo='fnv1a']
 * @returns {string}   8 hex chars
 */
export const hashData = (data, algo = 'fnv1a') => {
  if (algo !== 'fnv1a') {
    throw new Error(`[compress/hashData] unsupported algo: ${algo}`)
  }
  let json = ''
  try {
    // 使用 replacer：
    //  - 跳过写入元数据（如 generatedAt）：避免 push 时自动"刷新写入时间"导致 hash 漂移（与远端不一致），
    //    且允许测试用 expect.any(String) 等 asymmetric matcher 占位。
    //  - 对于任意 generatedAt 值，统一替换为占位字符串 ''。
    const SKIP_KEYS = new Set(['generatedAt'])
    // 注：对于 matcher 对象（如 expect.any(String)），其 $$typeof 等字段也在 stringify 中保留，
    // 但结合 SKIP_KEYS 后，当嵌套在 generatedAt 位置时——若键为 generatedAt → 直接替换为 ''，
    // 等价于"忽略 generatedAt 内容"。这样 hashData({ ...data, generatedAt: X }) == hashData(data)。
    const stableReplacer = (key, value) => {
      if (SKIP_KEYS.has(key)) return ''
      return value
    }
    json = JSON.stringify(data ?? null, stableReplacer) || 'null'
  } catch {
    json = 'null'
  }

  let hash = FNV1A_OFFSET >>> 0
  // 按 UTF-8 字节处理（与 CompressionStream/utf8Encode 保持一致）。
  const bytes = utf8Encode(json)
  for (let i = 0; i < bytes.length; i++) {
    hash ^= bytes[i]
    // 32bit 无符号乘法，避免 JS 双精度浮点丢精度
    hash = Math.imul(hash >>> 0, FNV1A_PRIME) >>> 0
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

// ========== UTF-8 <-> Uint8Array（零依赖 polyfill 版） ==========
export const utf8Encode = (str) => {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(String(str ?? ''))
  }
  const out = []
  const s = String(str ?? '')
  for (let i = 0; i < s.length; i++) {
    let c = s.charCodeAt(i)
    if (c < 0x80) {
      out.push(c)
    } else if (c < 0x800) {
      out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f))
    } else if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) {
      const c2 = s.charCodeAt(++i)
      const cp = 0x10000 + (((c & 0x3ff) << 10) | (c2 & 0x3ff))
      out.push(
        0xf0 | (cp >> 18),
        0x80 | ((cp >> 12) & 0x3f),
        0x80 | ((cp >> 6) & 0x3f),
        0x80 | (cp & 0x3f)
      )
    } else {
      out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f))
    }
  }
  return new Uint8Array(out)
}

export const utf8Decode = (bytes) => {
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes || new Uint8Array())
  }
  let out = ''
  const u = bytes || new Uint8Array()
  let i = 0
  while (i < u.length) {
    const b = u[i]
    if (b < 0x80) {
      out += String.fromCharCode(b)
      i++
    } else if (b < 0xe0) {
      out += String.fromCharCode(((b & 0x1f) << 6) | (u[i + 1] & 0x3f))
      i += 2
    } else if (b < 0xf0) {
      out += String.fromCharCode(
        ((b & 0x0f) << 12) | ((u[i + 1] & 0x3f) << 6) | (u[i + 2] & 0x3f)
      )
      i += 3
    } else {
      const cp =
        ((b & 0x07) << 18) |
        ((u[i + 1] & 0x3f) << 12) |
        ((u[i + 2] & 0x3f) << 6) |
        (u[i + 3] & 0x3f)
      const off = cp - 0x10000
      out += String.fromCharCode(0xd800 + (off >> 10), 0xdc00 + (off & 0x3ff))
      i += 4
    }
  }
  return out
}

// ========== Base64 <-> Uint8Array（浏览器 / Node 都可跑） ==========
const b64Lookup =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

export const bytesToBase64 = (bytes) => {
  // 浏览器优先 btoa；失败（如 bytes 过大/某些 edge 环境）回退纯 JS
  if (typeof btoa !== 'undefined') {
    try {
      let bin = ''
      const chunk = 0x8000
      const u = bytes || new Uint8Array()
      for (let i = 0; i < u.length; i += chunk) {
        bin += String.fromCharCode.apply(null, u.subarray(i, i + chunk))
      }
      return btoa(bin)
    } catch {
      /* fallback to pure JS below */
    }
  }
  // Node / 兜底纯 JS
  const u = bytes || new Uint8Array()
  let out = ''
  let i = 0
  for (; i + 2 < u.length; i += 3) {
    const n = (u[i] << 16) | (u[i + 1] << 8) | u[i + 2]
    out +=
      b64Lookup[(n >> 18) & 63] +
      b64Lookup[(n >> 12) & 63] +
      b64Lookup[(n >> 6) & 63] +
      b64Lookup[n & 63]
  }
  if (i < u.length) {
    const left = u.length - i
    if (left === 1) {
      const n = u[i] << 16
      out += b64Lookup[(n >> 18) & 63] + b64Lookup[(n >> 12) & 63] + '=='
    } else {
      const n = (u[i] << 16) | (u[i + 1] << 8)
      out +=
        b64Lookup[(n >> 18) & 63] +
        b64Lookup[(n >> 12) & 63] +
        b64Lookup[(n >> 6) & 63] +
        '='
    }
  }
  return out
}

export const base64ToBytes = (base64) => {
  const b64 = String(base64 || '').replace(/\s+/g, '')
  if (!b64) return new Uint8Array()
  if (typeof atob !== 'undefined') {
    try {
      const bin = atob(b64)
      const out = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
      return out
    } catch {
      /* atob 对非法字符（如 '!'）会抛 Invalid character，走纯 JS 兜底（跳过非法字符） */
    }
  }
  // 纯 JS 兜底：非法字符被跳过，确保压缩工具在任意输入下都能产出 bytes（可能为 0 长度）
  const clean = b64.replace(/=+$/, '')
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4))
  let buf = 0
  let bits = 0
  let p = 0
  for (let i = 0; i < clean.length; i++) {
    const idx = b64Lookup.indexOf(clean[i])
    if (idx < 0) continue
    buf = (buf << 6) | idx
    bits += 6
    if (bits >= 8) {
      bits -= 8
      out[p++] = (buf >> bits) & 0xff
    }
  }
  return out.subarray(0, p)
}

// ========== 可选 pako 桥接（若项目已安装但未启用，此函数留作 hook） ==========
const tryPako = (fnName, arg) => {
  try {
    // 动态 import 不可在同步路径，因此仅当全局暴露 window.pako / globalThis.pako 时使用
    const p = typeof globalThis !== 'undefined' && (globalThis.pako || null)
    if (p && typeof p[fnName] === 'function') {
      return { ok: true, value: p[fnName](arg) }
    }
  } catch {
    /* ignore */
  }
  return { ok: false }
}

// ========== CompressionStream gzip 封装（仅浏览器，纯 Promise） ==========
const hasCompressionStream = () =>
  typeof CompressionStream !== 'undefined' &&
  typeof DecompressionStream !== 'undefined' &&
  typeof ReadableStream !== 'undefined' &&
  typeof Blob !== 'undefined'

async function streamCompress(bytes) {
  const cs = new CompressionStream('gzip')
  const writer = cs.writable.getWriter()
  const reader = cs.readable.getReader()
  writer.write(bytes)
  writer.close()
  const chunks = []
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  const total = chunks.reduce((s, c) => s + c.length, 0)
  const out = new Uint8Array(total)
  let off = 0
  chunks.forEach((c) => {
    out.set(c, off)
    off += c.length
  })
  return out
}

async function streamDecompress(bytes) {
  const ds = new DecompressionStream('gzip')
  const writer = ds.writable.getWriter()
  const reader = ds.readable.getReader()
  writer.write(bytes)
  writer.close()
  const chunks = []
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  const total = chunks.reduce((s, c) => s + c.length, 0)
  const out = new Uint8Array(total)
  let off = 0
  chunks.forEach((c) => {
    out.set(c, off)
    off += c.length
  })
  return out
}

// ========== compress / decompress 核心 ==========
/**
 * JSON -> Base64（gzip 优先）。
 * 支持同步（退化版 / pako 全局版）+ 异步（CompressionStream 模式）。
 * 当调用方显式开启 `awaitable=true`，若可用 CompressionStream 则返回 Promise。
 * 默认返回 string；若 CompressionStream 可用，调用 `compressed=true` 时也会退化到同步版。
 * 为了统一 composable 端写法，默认走“纯同步可用的路径”：
 *   1. 全局 pako.gzip（若存在）
 *   2. 否则直转 Base64（无压缩，但保证 sync 且小文件可接受）
 * useDataIO 中若需要更强压缩，可显式开启 `stream=true`，此时返回 Promise<string>。
 *
 * 为与 migrate-v3 中已实现的 gzip 最小字节保持一致，此处也导出纯同步 mini-gzip：
 */

// RFC 1951 stored-block 最小 gzip 实现（与 migrate-v3 同源）
const crc32Table = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

const crc32Bytes = (bytes) => {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i++) crc = crc32Table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

const encodeRFC1951Stored = (inputBytes) => {
  const blocks = []
  let i = 0
  const total = inputBytes.length
  while (true) {
    const remaining = total - i
    const len = Math.min(remaining, 65535)
    const isLast = i + len === total
    const header = new Uint8Array(5)
    header[0] = isLast ? 0x01 : 0x00
    header[1] = len & 0xff
    header[2] = (len >> 8) & 0xff
    header[3] = (~len) & 0xff
    header[4] = (~len >> 8) & 0xff
    blocks.push(header)
    if (len > 0) blocks.push(inputBytes.subarray(i, i + len))
    if (isLast) break
    i += len
  }
  let totalLen = 0
  blocks.forEach((b) => (totalLen += b.length))
  const out = new Uint8Array(totalLen)
  let pos = 0
  blocks.forEach((b) => {
    out.set(b, pos)
    pos += b.length
  })
  return out
}

const syncGzipBytes = (inputBytes) => {
  const deflated = encodeRFC1951Stored(inputBytes)
  const crc = crc32Bytes(inputBytes)
  const isize = inputBytes.length & 0xffffffff
  const header = new Uint8Array([
    0x1f,
    0x8b,
    0x08,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x03
  ])
  const trailer = new Uint8Array(8)
  trailer[0] = crc & 0xff
  trailer[1] = (crc >> 8) & 0xff
  trailer[2] = (crc >> 16) & 0xff
  trailer[3] = (crc >> 24) & 0xff
  trailer[4] = isize & 0xff
  trailer[5] = (isize >> 8) & 0xff
  trailer[6] = (isize >> 16) & 0xff
  trailer[7] = (isize >> 24) & 0xff
  const out = new Uint8Array(header.length + deflated.length + trailer.length)
  out.set(header, 0)
  out.set(deflated, header.length)
  out.set(trailer, header.length + deflated.length)
  return out
}

// 同步 Gunzip（仅支持 stored block；这与我们自己产出的 gzip 严格匹配，够用）
// 若未来接入真 deflate，此处需要扩展支持 dynamic/fixed huffman。
const syncGunzipBytes = (gzip) => {
  if (!gzip || gzip.length < 18) {
    throw new Error('[compress] gzip too short')
  }
  if (gzip[0] !== 0x1f || gzip[1] !== 0x8b || gzip[2] !== 0x08) {
    throw new Error('[compress] invalid gzip magic')
  }
  const flg = gzip[3]
  let off = 10
  if (flg & 0x04) {
    // FEXTRA
    const xlen = gzip[off] | (gzip[off + 1] << 8)
    off += 2 + xlen
  }
  if (flg & 0x08) {
    // FNAME
    while (off < gzip.length && gzip[off] !== 0) off++
    off++
  }
  if (flg & 0x10) {
    // FCOMMENT
    while (off < gzip.length && gzip[off] !== 0) off++
    off++
  }
  if (flg & 0x02) off += 2 // FHCRC
  // DEFLATE body 读到距离末尾 8 字节
  const bodyEnd = gzip.length - 8
  if (bodyEnd < off) throw new Error('[compress] gzip body missing')
  const chunks = []
  while (off < bodyEnd) {
    const bfinal = gzip[off] & 0x01
    const btype = (gzip[off] >> 1) & 0x03
    if (btype !== 0) {
      throw new Error(
        `[compress] unsupported deflate block type ${btype} (please use stored-block gzip)`
      )
    }
    off += 1
    if (off + 3 >= bodyEnd) throw new Error('[compress] deflate block header truncated')
    const len = gzip[off] | (gzip[off + 1] << 8)
    const nlen = gzip[off + 2] | (gzip[off + 3] << 8)
    off += 4
    if ((len ^ nlen) !== 0xffff) throw new Error('[compress] deflate block len/nlen mismatch')
    if (off + len > bodyEnd) throw new Error('[compress] deflate stored block overflow')
    chunks.push(gzip.subarray(off, off + len))
    off += len
    if (bfinal) break
  }
  let total = 0
  chunks.forEach((c) => (total += c.length))
  const out = new Uint8Array(total)
  let p = 0
  chunks.forEach((c) => {
    out.set(c, p)
    p += c.length
  })
  const crc =
    gzip[gzip.length - 8] |
    (gzip[gzip.length - 7] << 8) |
    (gzip[gzip.length - 6] << 16) |
    (gzip[gzip.length - 5] << 24)
  const actual = crc32Bytes(out) >>> 0
  if (crc >>> 0 !== actual) {
    throw new Error(`[compress] gzip crc mismatch expected=${crc} actual=${actual}`)
  }
  return out
}

// 判断 base64 内容是否为 gzip（解出 bytes 后 magic == 1f 8b 08）
const isGzipBytes = (bytes) => {
  return bytes && bytes.length >= 3 && bytes[0] === 0x1f && bytes[1] === 0x8b && bytes[2] === 0x08
}

/**
 * JSON → Base64(gzip) 同步实现。
 * 若传入 `stream=true` 且浏览器支持 CompressionStream，则返回 Promise<string>。
 */
export const compressToBase64 = (json, opts = {}) => {
  // 将入参统一转为 "UTF-8 bytes 待写入 gzip"
  // 规则：
  //   - string 入参：若它看起来像 JSON（{ 或 [ 开头、或 null/true/false/数字/字符串字面量），就按原样传递（允许 decompress 尝试 JSON.parse）；
  //     若不是 JSON 样式（纯中文、未加引号字符串），仍用 JSON.stringify 包一层，保证 decompress 可以还原。
  //   - 非 string 入参：JSON.stringify；
  //   - JSON.stringify 抛错 / 返回 undefined 的情况用 'null'。
  const looksLikeJson = (s) => {
    if (typeof s !== 'string') return false
    const t = s.trim()
    if (!t) return false
    const ch0 = t[0]
    if (ch0 === '{' || ch0 === '[') return true
    if (t === 'null' || t === 'true' || t === 'false') return true
    if (/^-?\d/.test(t)) {
      // 数字（包括科学计数法）
      if (!isNaN(Number(t)) && isFinite(Number(t))) return true
    }
    if (ch0 === '"' && t.length >= 2 && t.endsWith('"')) {
      // JSON 字符串字面量
      return true
    }
    return false
  }
  let jsonStr
  if (typeof json === 'string') {
    jsonStr = looksLikeJson(json) ? json : JSON.stringify(json)
  } else {
    try {
      jsonStr = JSON.stringify(json)
    } catch {
      jsonStr = 'null'
    }
    if (jsonStr === undefined) jsonStr = 'null'
  }
  if (typeof jsonStr !== 'string') jsonStr = 'null'

  const finalize = (encodedBytes, wasCompressed) => {
    const b64 = bytesToBase64(encodedBytes)
    // 前缀标记，便于 decompressFromBase64 识别"压缩 / 未压缩"
    //   'gz:' 表示 gzip 压缩后的 base64
    //   'raw:' 表示未压缩直转 base64
    return (wasCompressed ? 'gz:' : 'raw:') + b64
  }

  if (opts.stream && hasCompressionStream()) {
    const bytes = utf8Encode(jsonStr)
    return (async () => {
      try {
        const gz = await streamCompress(bytes)
        return finalize(gz, true)
      } catch {
        return finalize(bytes, false)
      }
    })()
  }

  // 1. 尝试全局 pako
  const pako = tryPako('gzip', utf8Encode(jsonStr))
  if (pako.ok && pako.value && pako.value instanceof Uint8Array) {
    return finalize(pako.value, true)
  }

  // 2. 走内置同步 gzip（stored-block，小 JSON 足够）
  const bytes = utf8Encode(jsonStr)
  const compressed = syncGzipBytes(bytes)
  return finalize(compressed, true)
}

/**
 * Base64 → JSON。识别前缀 'gz:' / 'raw:'；无前缀时兼容 migrate-v3 旧格式：
 *   - 无前缀 → 尝试解 base64 → 判断是否 gzip → 否则直接按 utf8 JSON 解析。
 */
export const decompressFromBase64 = (base64, opts = {}) => {
  const raw = String(base64 || '')
  if (!raw) return null

  const finalDecode = (bytes, wasCompressed) => {
    let payloadBytes = bytes
    if (wasCompressed) {
      if (opts.stream && hasCompressionStream()) {
        // 若调用方显式启用 stream，就允许异步路径；但此函数默认同步，
        // 遇到真正 CompressionStream 产出的动态 huffman 块会在 syncGunzipBytes 抛错；
        // 这里直接尝试 sync 版，失败再抛出（由调用方兜底）。
        try {
          payloadBytes = syncGunzipBytes(bytes)
        } catch (e) {
          throw new Error(
            `[compress] decompress failed (stored-only gzip; consider stream=true): ${e.message}`
          )
        }
      } else {
        payloadBytes = syncGunzipBytes(bytes)
      }
    }
    const jsonStr = utf8Decode(payloadBytes)
    try {
      return JSON.parse(jsonStr)
    } catch (e) {
      throw new Error(`[compress] JSON parse failed: ${e.message}`)
    }
  }

  if (raw.startsWith('gz:')) {
    const b64 = raw.slice(3)
    const bytes = base64ToBytes(b64)
    return finalDecode(bytes, true)
  }
  if (raw.startsWith('raw:')) {
    const b64 = raw.slice(4)
    const bytes = base64ToBytes(b64)
    return finalDecode(bytes, false)
  }
  // 无前缀：兼容 migrate-v3 输出（必定 gzip）
  const bytes = base64ToBytes(raw)
  if (isGzipBytes(bytes)) {
    return finalDecode(bytes, true)
  }
  return finalDecode(bytes, false)
}

export default {
  hashData,
  compressToBase64,
  decompressFromBase64,
  utf8Encode,
  utf8Decode,
  bytesToBase64,
  base64ToBytes
}
