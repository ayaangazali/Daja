import { describe, expect, it } from 'vitest'
import { computeFearGreed } from './fearGreed'

describe('computeFearGreed', () => {
  it('returns 50 on empty/neutral inputs', () => {
    const r = computeFearGreed({
      spyCloses: [],
      spy52wHigh: null,
      spy52wLow: null,
      vix: null
    })
    expect(r.score).toBe(50)
    expect(r.label).toBe('Neutral')
  })
  it('extreme fear on crashing inputs', () => {
    const n = 200
    const spy = Array.from({ length: n }, (_, i) => 500 - i * 1.5)
    const last = spy[n - 1]
    const r = computeFearGreed({
      spyCloses: spy,
      spy52wHigh: 500,
      spy52wLow: last,
      vix: 45
    })
    expect(r.label === 'Extreme Fear' || r.label === 'Fear').toBe(true)
    expect(r.score).toBeLessThan(40)
  })
  it('extreme greed on rallying inputs', () => {
    const n = 200
    const spy = Array.from({ length: n }, (_, i) => 300 + i * 1.2)
    const last = spy[n - 1]
    const r = computeFearGreed({
      spyCloses: spy,
      spy52wHigh: last,
      spy52wLow: 300,
      vix: 12,
      hygChange20d: 3,
      tltChange20d: -1
    })
    expect(r.label === 'Greed' || r.label === 'Extreme Greed').toBe(true)
    expect(r.score).toBeGreaterThan(60)
  })
  it('emits 5 components', () => {
    const r = computeFearGreed({
      spyCloses: [100, 101, 102],
      spy52wHigh: 110,
      spy52wLow: 90,
      vix: 20
    })
    expect(r.components).toHaveLength(5)
  })
  it('score bounded 0..100', () => {
    const r = computeFearGreed({
      spyCloses: Array.from({ length: 200 }, () => 100),
      spy52wHigh: 100,
      spy52wLow: 100,
      vix: 100
    })
    expect(r.score).toBeGreaterThanOrEqual(0)
    expect(r.score).toBeLessThanOrEqual(100)
  })
})
