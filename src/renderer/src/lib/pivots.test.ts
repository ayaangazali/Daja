import { describe, expect, it } from 'vitest'
import {
  camarillaPivots,
  classicPivots,
  fibonacciPivots,
  fibonacciRetracement,
  woodiePivots
} from './pivots'

describe('classicPivots', () => {
  it('p = (H+L+C)/3', () => {
    const r = classicPivots(110, 90, 100)
    expect(r.p).toBeCloseTo(100, 6)
    expect(r.r1).toBe(110) // 200 - 90
    expect(r.s1).toBe(90) // 200 - 110
  })
  it('r2 = p + (h-l)', () => {
    const r = classicPivots(110, 90, 100)
    expect(r.r2).toBe(120)
    expect(r.s2).toBe(80)
  })
})

describe('fibonacciPivots', () => {
  it('r1 = p + 0.382 * range', () => {
    const r = fibonacciPivots(110, 90, 100)
    expect(r.r1).toBeCloseTo(100 + 0.382 * 20, 6)
    expect(r.s1).toBeCloseTo(100 - 0.382 * 20, 6)
  })
})

describe('camarillaPivots', () => {
  it('includes r4/s4 (extra levels)', () => {
    const r = camarillaPivots(110, 90, 100)
    expect(r.r4).toBeDefined()
    expect(r.s4).toBeDefined()
  })
  it('r1 > close, s1 < close', () => {
    const r = camarillaPivots(110, 90, 100)
    expect(r.r1).toBeGreaterThan(100)
    expect(r.s1).toBeLessThan(100)
  })
})

describe('woodiePivots', () => {
  it('p weighted toward close', () => {
    const r = woodiePivots(110, 90, 100)
    expect(r.p).toBeCloseTo((110 + 90 + 200) / 4, 6)
  })
})

describe('fibonacciRetracement', () => {
  it('0% equals swing high', () => {
    const r = fibonacciRetracement(100, 50)
    expect(r[0].value).toBe(100)
  })
  it('100% equals swing low', () => {
    const r = fibonacciRetracement(100, 50)
    expect(r[6].value).toBe(50)
  })
  it('61.8% retracement correct', () => {
    const r = fibonacciRetracement(100, 50)
    const fib618 = r.find((l) => l.pct === 61.8)
    expect(fib618?.value).toBeCloseTo(100 - 0.618 * 50, 4)
  })
  it('extensions go beyond swing low', () => {
    const r = fibonacciRetracement(100, 50)
    const ext = r.find((l) => l.pct === 161.8)
    expect(ext?.value).toBeLessThan(50)
  })
})
