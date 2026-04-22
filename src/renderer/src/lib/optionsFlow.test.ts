import { describe, expect, it } from 'vitest'
import {
  findUnusualActivity,
  flowBias,
  type OptionContractLike
} from './optionsFlow'

function mkCall(partial: Partial<OptionContractLike>): OptionContractLike {
  return {
    contractSymbol: 'AAPL_C200',
    strike: 200,
    expiration: 1_800_000_000,
    lastPrice: 5,
    volume: 500,
    openInterest: 100,
    impliedVolatility: 0.3,
    ...partial
  }
}

describe('findUnusualActivity', () => {
  it('flags contract with vol/OI >= 2 and volume >= 100', () => {
    const r = findUnusualActivity([mkCall({})], [])
    expect(r).toHaveLength(1)
    expect(r[0].volOiRatio).toBe(5)
  })
  it('ignores low volume even if ratio high', () => {
    const r = findUnusualActivity([mkCall({ volume: 50, openInterest: 1 })], [])
    expect(r).toHaveLength(0)
  })
  it('ignores low ratio', () => {
    const r = findUnusualActivity([mkCall({ volume: 100, openInterest: 200 })], [])
    expect(r).toHaveLength(0)
  })
  it('rejects zero openInterest (division undefined)', () => {
    const r = findUnusualActivity([mkCall({ openInterest: 0 })], [])
    expect(r).toHaveLength(0)
  })
  it('premium = volume × lastPrice × 100', () => {
    const r = findUnusualActivity([mkCall({ volume: 200, lastPrice: 3 })], [])
    expect(r[0].premium).toBe(200 * 3 * 100)
  })
  it('sorts by premium desc', () => {
    const r = findUnusualActivity(
      [
        mkCall({ contractSymbol: 'small', volume: 200, lastPrice: 1 }),
        mkCall({ contractSymbol: 'big', volume: 400, lastPrice: 10 })
      ],
      []
    )
    expect(r[0].contractSymbol).toBe('big')
  })
  it('puts tagged with side=put', () => {
    const r = findUnusualActivity([], [mkCall({ contractSymbol: 'PUT1' })])
    expect(r[0].side).toBe('put')
  })
  it('custom threshold respected', () => {
    const r = findUnusualActivity([mkCall({ volume: 150, openInterest: 100 })], [], {
      volOiRatio: 1.4
    })
    expect(r).toHaveLength(1)
  })
  it('topN caps result count', () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      mkCall({ contractSymbol: `C${i}`, strike: 100 + i })
    )
    const r = findUnusualActivity(many, [], { topN: 5 })
    expect(r).toHaveLength(5)
  })
  it('handles null prices gracefully', () => {
    const r = findUnusualActivity([mkCall({ lastPrice: null })], [])
    expect(r[0].premium).toBe(0)
  })
})

describe('flowBias', () => {
  it('none when empty', () => {
    expect(flowBias([]).bias).toBe('none')
  })
  it('bullish when calls dominate premium', () => {
    const r = flowBias([
      { contractSymbol: 'c', side: 'call', strike: 100, expiration: 0, volume: 1, openInterest: 1, volOiRatio: 1, premium: 900_000, iv: null },
      { contractSymbol: 'p', side: 'put', strike: 100, expiration: 0, volume: 1, openInterest: 1, volOiRatio: 1, premium: 100_000, iv: null }
    ])
    expect(r.bias).toBe('bullish')
    expect(r.score).toBeGreaterThanOrEqual(25)
  })
  it('bearish when puts dominate', () => {
    const r = flowBias([
      { contractSymbol: 'c', side: 'call', strike: 100, expiration: 0, volume: 1, openInterest: 1, volOiRatio: 1, premium: 100_000, iv: null },
      { contractSymbol: 'p', side: 'put', strike: 100, expiration: 0, volume: 1, openInterest: 1, volOiRatio: 1, premium: 900_000, iv: null }
    ])
    expect(r.bias).toBe('bearish')
    expect(r.score).toBeLessThanOrEqual(-25)
  })
  it('balanced near 50/50', () => {
    const r = flowBias([
      { contractSymbol: 'c', side: 'call', strike: 100, expiration: 0, volume: 1, openInterest: 1, volOiRatio: 1, premium: 500_000, iv: null },
      { contractSymbol: 'p', side: 'put', strike: 100, expiration: 0, volume: 1, openInterest: 1, volOiRatio: 1, premium: 450_000, iv: null }
    ])
    expect(r.bias).toBe('balanced')
  })
})
