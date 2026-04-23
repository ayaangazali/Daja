import { describe, expect, it } from 'vitest'
import { analyzeSkew } from './ivSkew'

interface C {
  strike: number
  impliedVolatility: number | null
  openInterest: number | null
}

function chain(
  strikes: number[],
  callIvFn: (k: number) => number,
  putIvFn: (k: number) => number
): { calls: C[]; puts: C[] } {
  return {
    calls: strikes.map((k) => ({ strike: k, impliedVolatility: callIvFn(k), openInterest: 100 })),
    puts: strikes.map((k) => ({ strike: k, impliedVolatility: putIvFn(k), openInterest: 100 }))
  }
}

describe('analyzeSkew', () => {
  it('returns unknown when underlying price missing', () => {
    const r = analyzeSkew([], [], 0)
    expect(r.regime).toBe('unknown')
  })

  it('detects put-smirk for equity index with downside hedge bid', () => {
    const strikes = [80, 90, 95, 100, 105, 110, 120]
    const underlying = 100
    // Puts richer on the downside
    const { calls, puts } = chain(
      strikes,
      (k) => (k >= underlying ? 0.2 + (k - underlying) * 0.001 : 0.22),
      (k) => (k < underlying ? 0.2 + (underlying - k) * 0.01 : 0.2)
    )
    const r = analyzeSkew(calls, puts, underlying)
    expect(r.putSkew25Delta).not.toBeNull()
    expect(r.regime).toBe('put-smirk')
  })

  it('detects call-smirk when OTM calls richer than OTM puts', () => {
    const strikes = [80, 90, 95, 100, 105, 110, 120]
    const underlying = 100
    const { calls, puts } = chain(
      strikes,
      (k) => (k > underlying ? 0.2 + (k - underlying) * 0.01 : 0.2),
      () => 0.2
    )
    const r = analyzeSkew(calls, puts, underlying)
    expect(r.regime).toBe('call-smirk')
  })

  it('detects smile when both wings elevated', () => {
    const strikes = [80, 90, 95, 100, 105, 110, 120]
    const underlying = 100
    const { calls, puts } = chain(
      strikes,
      (k) => 0.2 + Math.abs(k - underlying) * 0.01,
      (k) => 0.2 + Math.abs(k - underlying) * 0.01
    )
    const r = analyzeSkew(calls, puts, underlying)
    expect(r.regime).toBe('smile')
  })

  it('ignores invalid IV values (null, negative, gigantic)', () => {
    const underlying = 100
    const calls: C[] = [
      { strike: 95, impliedVolatility: null, openInterest: 10 },
      { strike: 100, impliedVolatility: 0.2, openInterest: 10 },
      { strike: 105, impliedVolatility: -1, openInterest: 10 },
      { strike: 110, impliedVolatility: 999, openInterest: 10 }
    ]
    const puts: C[] = [{ strike: 100, impliedVolatility: 0.2, openInterest: 10 }]
    const r = analyzeSkew(calls, puts, underlying)
    // Only 1 valid call + 1 valid put — no 25-delta points OTM, regime stays unknown or flat
    expect(r.rows.length).toBeGreaterThan(0)
    expect(['unknown', 'flat']).toContain(r.regime)
  })

  it('computes atmIv as avg of ATM call+put when both present', () => {
    const strikes = [95, 100, 105]
    const { calls, puts } = chain(
      strikes,
      () => 0.25,
      () => 0.35
    )
    const r = analyzeSkew(calls, puts, 100)
    expect(r.atmIv).toBeCloseTo(0.3, 5)
  })
})
