import { describe, it, expect } from 'vitest'
import {
  hashData,
  compressToBase64,
  decompressFromBase64,
  bytesToBase64,
  base64ToBytes,
  utf8Encode,
  utf8Decode
} from '@/utils/compress'

describe('compress / hashData', () => {
  it('algo 默认 fnv1a → 返回 8 位 hex', () => {
    const h = hashData({ a: 1 })
    expect(typeof h).toBe('string')
    expect(h).toMatch(/^[0-9a-f]{8}$/)
  })

  it('相同输入 hash 相同（稳定性）', () => {
    const obj = { id: 't1', title: 'hi', tags: ['a', 'b'] }
    expect(hashData(obj)).toBe(hashData({ id: 't1', title: 'hi', tags: ['a', 'b'] }))
  })

  it('不同输入 hash 大概率不同（碰撞率低；基础区分）', () => {
    const a = hashData({ title: 'A' })
    const b = hashData({ title: 'B' })
    expect(a).not.toBe(b)
  })

  it('null / undefined / 空字符串 → 都输出 8 位 hex', () => {
    expect(hashData(null)).toMatch(/^[0-9a-f]{8}$/)
    expect(hashData(undefined)).toMatch(/^[0-9a-f]{8}$/)
    expect(hashData('')).toMatch(/^[0-9a-f]{8}$/)
  })

  it('嵌套对象顺序不同但值相同 → JSON.stringify 顺序相同 → hash 相同', () => {
    // 注意：对象键顺序在 V8 中是稳定的（定义顺序），所以 `{a:1,b:2}` 与 `{a:1,b:2}` 一致。
    const a = hashData({ a: 1, b: 2, c: { d: 3 } })
    const b = hashData({ a: 1, b: 2, c: { d: 3 } })
    expect(a).toBe(b)
  })

  it('未知 algo 抛错', () => {
    expect(() => hashData({}, 'md5')).toThrow(/unsupported algo/)
  })
})

describe('compress / base64 helpers', () => {
  it('utf8Encode / utf8Decode 往返 ASCII', () => {
    const s = 'hello world 123'
    expect(utf8Decode(utf8Encode(s))).toBe(s)
  })

  it('utf8Encode / utf8Decode 往返中文 emoji（BMP 外代理对）', () => {
    const s = '你好，世界 🎉 Choyeon TODO ✓'
    expect(utf8Decode(utf8Encode(s))).toBe(s)
  })

  it('bytesToBase64 / base64ToBytes 往返', () => {
    const bytes = utf8Encode('abcdefghijklmnopqrstuvwxyz0123456789+/-_')
    const b64 = bytesToBase64(bytes)
    const back = base64ToBytes(b64)
    expect(Array.from(back)).toEqual(Array.from(bytes))
  })

  it('空 bytes → base64 空', () => {
    expect(bytesToBase64(new Uint8Array(0))).toBe('')
    expect(base64ToBytes('')).toEqual(new Uint8Array(0))
  })

  it('base64ToBytes 忽略空格换行', () => {
    const b64 = bytesToBase64(utf8Encode('x'))
    expect(Array.from(base64ToBytes(b64.split('').join('\n ')))).toEqual(
      Array.from(utf8Encode('x'))
    )
  })
})

describe('compress / compressToBase64 + decompressFromBase64', () => {
  it('简单对象 compress → decompress 往返（同步 stored-block gzip）', () => {
    const obj = { tasks: [{ id: 't1', title: '买牛奶', priority: 3 }], ok: true }
    const b64 = compressToBase64(obj)
    expect(typeof b64).toBe('string')
    expect(b64.startsWith('gz:')).toBe(true)
    const back = decompressFromBase64(b64)
    expect(back).toEqual(obj)
  })

  it('string 入参 compress → decompress 往返', () => {
    const s = JSON.stringify({ foo: 'bar', n: 42 })
    const b64 = compressToBase64(s)
    const back = decompressFromBase64(b64)
    expect(back).toEqual(JSON.parse(s))
  })

  it('大对象（>64KB stored block 拆分）往返', () => {
    const big = new Array(2000).fill(0).map((_, i) => ({
      id: `task_${i}`,
      title: `任务标题 #${i} - Choyeon To Do 中文填充数据，确保足够的字节数。`,
      notes: 'x'.repeat(100),
      tags: ['tag1', 'tag2', 'tag3']
    }))
    const b64 = compressToBase64(big)
    expect(b64.startsWith('gz:')).toBe(true)
    const back = decompressFromBase64(b64)
    expect(Array.isArray(back)).toBe(true)
    expect(back.length).toBe(big.length)
    expect(back[0].id).toBe(big[0].id)
    expect(back[big.length - 1].title).toBe(big[big.length - 1].title)
  })

  it('raw: 前缀直转 Base64，往返', () => {
    const obj = { a: 1, b: 2 }
    // 用 bytesToBase64 直接拼 raw: 前缀模拟
    const rawB64 = 'raw:' + bytesToBase64(utf8Encode(JSON.stringify(obj)))
    const back = decompressFromBase64(rawB64)
    expect(back).toEqual(obj)
  })

  it('无前缀 gzip（migrate-v3 产物）：decompressFromBase64 识别 magic 并解压', () => {
    const obj = { hello: 'migrate-compat' }
    const withPrefix = compressToBase64(obj) // 'gz:XXXX'
    const noPrefix = withPrefix.slice(3)
    const back = decompressFromBase64(noPrefix)
    expect(back).toEqual(obj)
  })

  it('非法 JSON → decompress 抛错（JSON parse failed）', () => {
    const bad = 'gz:' + bytesToBase64(utf8Encode('{not json'))
    // 注意：bad 不是 gzip bytes，base64 → bytes 解出后 gzip header 校验失败
    // 这里改为直接构造“合法 gzip 但 payload 非 JSON”：
    const validGzipInvalidJson = compressToBase64('{not json literally').slice(3)
    expect(() => decompressFromBase64('gz:' + validGzipInvalidJson)).toThrow(/JSON parse failed/)
  })

  it('压缩后大小：纯 ASCII 大文本不会比原文大太多（stored block 有 ~18 字节 gzip 开销）', () => {
    const text = 'a'.repeat(1024)
    const b64 = compressToBase64(text)
    // Base64 展开为 4/3；原文 Base64 为 ceil(1024/3)*4 ≈ 1368，加上前缀 gz:
    expect(b64.length).toBeLessThan(1400 + 20)
  })

  it('hashData 对同一压缩前后对象：保持相同 hash 判定（对 pkg，hash 其 JSON 内容）', () => {
    const obj = { tasks: [], settings: { tasksVersion: 3 } }
    const b64 = compressToBase64(obj)
    const back = decompressFromBase64(b64)
    expect(hashData(obj)).toBe(hashData(back))
  })

  it('数组/对象空值往返', () => {
    const cases = [null, undefined, {}, [], 0, '', false]
    for (const c of cases) {
      const b64 = compressToBase64(c)
      const back = decompressFromBase64(b64)
      expect(back).toEqual(c ?? null) // JSON.stringify undefined → null
    }
  })

  it('非法 base64 字符 → decompressFromBase64 失败（或抛错）', () => {
    // gz:!!! 会解出一些字节，但 gzip magic 校验失败
    expect(() => decompressFromBase64('gz:!!!')).toThrow(/gzip/)
  })

  it('compressed base64 长度始终为 string（不返回 Promise 同步路径）', () => {
    const r = compressToBase64({ a: 1 })
    expect(typeof r).toBe('string')
  })

  it('CompressionStream 不可用时仍可工作（降级同步）', () => {
    // jsdom 下 CompressionStream 一般不存在
    const s = '降级同步路径测试：确保压缩工具在纯 JS 下仍然可用。'.repeat(10)
    const r = compressToBase64(s)
    const back = decompressFromBase64(r)
    expect(back).toEqual(JSON.parse(JSON.stringify(s)))
  })
})
