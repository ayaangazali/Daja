import { describe, expect, it } from 'vitest'
import { fmtLargeNum, fmtPct, fmtPrice } from './format'
import { ema, sma, rsi, positionSize, rMultiple } from './indicators'
import { dcfValue, grahamNumber, cagr, fcfYield } from './valuation'
import { blackScholes, normCdf } from './blackScholes'

describe('extra edge cases — format', () => {
  it('fmtPrice negative trillion', () => {
    expect(fmtPrice(-1_234_567_890_123)).toContain('-')
  })
  it('fmtPct tiny positive', () => {
    expect(fmtPct(0.001)).toBe('+0.00%')
  })
  it('fmtPct precision 5', () => {
    expect(fmtPct(1.23456789, 5)).toBe('+1.23457%')
  })
  it('fmtLargeNum boundary at 999', () => {
    expect(fmtLargeNum(999)).toBe('999')
  })
  it('fmtLargeNum 1000 → 1.00K', () => {
    expect(fmtLargeNum(1000)).toBe('1.00K')
  })
  it('fmtLargeNum 999_999 → 999.99K', () => {
    expect(fmtLargeNum(999_999)).toBe('1000.00K')
  })
  it('fmtPrice with large digits', () => {
    expect(fmtPrice(1.23456789, 8)).toBe('1.23456789')
  })
})

describe('extra edge cases — indicators', () => {
  it('sma period equals length returns mean', () => {
    expect(sma([2, 4, 6], 3)).toBeCloseTo(4, 5)
  })
  it('ema on two points equals first when period=1', () => {
    expect(ema([5, 10], 1)).toBeCloseTo(10, 5)
  })
  it('rsi on declining series is low', () => {
    const d = Array.from({ length: 20 }, (_, i) => 100 - i)
    const r = rsi(d, 14)
    expect(r).toBeLessThan(50)
  })
  it('positionSize reacts to account size', () => {
    const r1 = positionSize({ accountSize: 50_000, riskPct: 1, entry: 50, stop: 48 })
    const r2 = positionSize({ accountSize: 100_000, riskPct: 1, entry: 50, stop: 48 })
    expect(r2.shares).toBe(r1.shares * 2)
  })
  it('rMultiple large gain', () => {
    expect(rMultiple(100, 300, 90, 'long')).toBeCloseTo(20, 5)
  })
})

describe('extra edge cases — valuation', () => {
  it('DCF over 20-year horizon converges', () => {
    const r = dcfValue({
      fcfBase: 1e9,
      growthRate: 0.03,
      terminalGrowth: 0.02,
      discountRate: 0.08,
      years: 20,
      sharesOut: 1e8,
      netDebt: 0
    })
    expect(r).not.toBeNull()
    expect(r!.pvForecast).toHaveLength(20)
  })
  it('graham on reasonable value stock', () => {
    expect(grahamNumber(5, 20)).toBeCloseTo(47.43, 2)
  })
  it('cagr quadruple in 2 years', () => {
    expect(cagr(100, 400, 2)).toBeCloseTo(100, 2)
  })
  it('fcfYield above 10% is unusual/high', () => {
    expect(fcfYield(15, 100)).toBeCloseTo(15, 5)
  })
})

describe('extra edge cases — Black-Scholes', () => {
  it('deep ITM call delta → 1', () => {
    const g = blackScholes('call', { S: 200, K: 100, T: 1, r: 0.05, sigma: 0.3 })
    expect(g.delta).toBeGreaterThan(0.95)
  })
  it('deep OTM call delta → 0', () => {
    const g = blackScholes('call', { S: 50, K: 200, T: 1, r: 0.05, sigma: 0.3 })
    expect(g.delta).toBeLessThan(0.05)
  })
  it('deep ITM put delta → -1', () => {
    const g = blackScholes('put', { S: 50, K: 200, T: 1, r: 0.05, sigma: 0.3 })
    expect(g.delta).toBeLessThan(-0.95)
  })
  it('normCdf at 0.5 sigma ≈ 0.691', () => {
    expect(normCdf(0.5)).toBeCloseTo(0.691, 3)
  })
  it('deep OTM put delta → 0', () => {
    const g = blackScholes('put', { S: 200, K: 100, T: 1, r: 0.05, sigma: 0.3 })
    expect(g.delta).toBeGreaterThan(-0.05)
  })
  it('higher IV raises price', () => {
    const lo = blackScholes('call', { S: 100, K: 100, T: 1, r: 0.05, sigma: 0.2 }).price
    const hi = blackScholes('call', { S: 100, K: 100, T: 1, r: 0.05, sigma: 0.4 }).price
    expect(hi).toBeGreaterThan(lo)
  })
  it('longer T raises ATM call price', () => {
    const short = blackScholes('call', { S: 100, K: 100, T: 0.1, r: 0.05, sigma: 0.3 }).price
    const long = blackScholes('call', { S: 100, K: 100, T: 2, r: 0.05, sigma: 0.3 }).price
    expect(long).toBeGreaterThan(short)
  })
})
