import { describe, expect, it } from 'vitest'
import { dateToSec, findIndexForDate, runBacktest } from './backtest'

describe('runBacktest', () => {
  it('returns zero on empty input', () => {
    const r = runBacktest({
      closes: [],
      times: [],
      startIndex: 0,
      initialAmount: 1000
    })
    expect(r.finalValue).toBe(0)
    expect(r.totalReturnPct).toBe(0)
  })
  it('computes simple growth without contributions', () => {
    // Price goes 100 → 120 over 365 days (no DCA) → final = 1200, return = 20%
    const closes = [100, 120]
    const times = [dateToSec('2023-01-01'), dateToSec('2024-01-01')]
    const r = runBacktest({ closes, times, startIndex: 0, initialAmount: 1000 })
    expect(r.finalValue).toBeCloseTo(1200, 0)
    expect(r.totalReturnPct).toBeCloseTo(20, 0)
  })
  it('monthly DCA buys more shares', () => {
    const closes = Array.from({ length: 60 }, (_, i) => 100 + i * 0.1)
    const times = Array.from({ length: 60 }, (_, i) => dateToSec('2023-01-01') + i * 30 * 86400)
    const noDCA = runBacktest({ closes, times, startIndex: 0, initialAmount: 1000 })
    const withDCA = runBacktest({
      closes,
      times,
      startIndex: 0,
      initialAmount: 1000,
      monthlyContribution: 100
    })
    expect(withDCA.finalValue).toBeGreaterThan(noDCA.finalValue)
    expect(withDCA.totalContributed).toBeGreaterThan(noDCA.totalContributed)
  })
  it('max drawdown is negative', () => {
    const closes = [100, 110, 120, 80, 90, 100]
    const times = closes.map((_, i) => dateToSec('2024-01-01') + i * 86400)
    const r = runBacktest({ closes, times, startIndex: 0, initialAmount: 1000 })
    expect(r.maxDrawdownPct).toBeLessThan(0)
  })
})

describe('findIndexForDate', () => {
  it('returns closest index', () => {
    const times = [dateToSec('2024-01-01'), dateToSec('2024-06-01'), dateToSec('2024-12-01')]
    expect(findIndexForDate(times, dateToSec('2024-06-15'))).toBe(1)
  })
})

describe('dateToSec', () => {
  it('converts ISO date to epoch seconds', () => {
    expect(dateToSec('2024-01-01')).toBe(1704067200)
  })
})
