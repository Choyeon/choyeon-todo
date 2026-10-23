import { describe, it, expect } from 'vitest'
import { MemoryProvider, FallbackProvider } from '../../src/sync/SyncProvider'

// 一个永远抛错的假 provider，用于模拟"主数据源不可用"
class BoomProvider {
  constructor() {
    this.type = 'boom'
  }
  async pull() {
    throw new Error('primary down')
  }
  async push() {
    throw new Error('primary down')
  }
  async resolveConflicts() {
    throw new Error('primary down')
  }
}

describe('FallbackProvider（数据源换源/故障转移）', () => {
  it('优先使用主数据源，成功时不再尝试备用', async () => {
    const primary = new MemoryProvider({ tasks: [{ id: 'a' }] })
    const secondary = new MemoryProvider({ tasks: [{ id: 'b' }] })
    const fb = new FallbackProvider([primary, secondary])
    const res = await fb.pull()
    expect(res.snapshot.tasks).toEqual([{ id: 'a' }])
  })

  it('主数据源失败时自动切换到备用数据源', async () => {
    const secondary = new MemoryProvider({ tasks: [{ id: 'b' }] })
    const fb = new FallbackProvider([new BoomProvider(), secondary])
    const res = await fb.pull()
    expect(res.snapshot.tasks).toEqual([{ id: 'b' }])
  })

  it('push 同样具备故障转移能力', async () => {
    const secondary = new MemoryProvider()
    const fb = new FallbackProvider([new BoomProvider(), secondary])
    const snap = { tasks: [{ id: 'x' }] }
    const res = await fb.push(snap)
    expect(res.remoteHash).toBeTruthy()
    const pulled = await secondary.pull()
    expect(pulled.snapshot.tasks).toEqual([{ id: 'x' }])
  })

  it('所有数据源都失败时应抛出聚合错误', async () => {
    const fb = new FallbackProvider([new BoomProvider(), new BoomProvider()])
    await expect(fb.pull()).rejects.toThrow(/全部 2 个数据源均失败/)
  })

  it('缺少 provider 时应直接报错', () => {
    expect(() => new FallbackProvider([])).toThrow(/requires at least one provider/)
  })

  it('resolveConflicts 委托给第一个可用 provider', async () => {
    const secondary = new MemoryProvider()
    const fb = new FallbackProvider([new BoomProvider(), secondary])
    const res = await fb.resolveConflicts([])
    expect(res.ok).toBe(true)
  })
})
