import { describe, expect, it } from 'vitest'
import { anchoredVWAP, haTrendRun, toHeikinAshi } from './heikinAshi'

describe('toHeikinAshi', () => {
  it('empty → empty', () => {
    expect(toHeikinAshi([])).toEqual([])
  })
  it('first bar: haOpen = (open+close)/2', () => {
    const ha = toHeikinAshi([{ open: 100, high: 110, low: 90, close: 105 }])
    expect(ha[0].open).toBe(102.5)
  })
  it('haClose is average of OHLC', () => {
    const ha = toHeikinAshi([{ open: 100, high: 110, low: 90, close: 105 }])
    expect(ha[0].close).toBeCloseTo((100 + 110 + 90 + 105) / 4, 6)
  })
  it('bullish flag reflects haClose vs haOpen', () => {
    const ha = toHeikinAshi([
      { open: 100, high: 110, low: 90, close: 105 }, // ha0 open=102.5, close=101.25 → bearish
      { open: 105, high: 115, low: 100, close: 112 } // ha1 open = avg of ha0 → 101.875, close = 108 → bullish
    ])
    expect(ha[1].bullish).toBe(true)
  })
})

describe('haTrendRun', () => {
  it('none on empty', () => {
    expect(haTrendRun([]).direction).toBe('none')
  })
  it('counts consecutive same-direction candles', () => {
    const ha = [
      { open: 100, high: 110, low: 99, close: 95, bullish: false },
      { open: 100, high: 110, low: 99, close: 105, bullish: true },
      { open: 105, high: 112, low: 104, close: 110, bullish: true },
      { open: 110, high: 115, low: 109, close: 114, bullish: true }
    ]
    const r = haTrendRun(ha)
    expect(r.direction).toBe('up')
    expect(r.run).toBe(3)
  })
})

describe('anchoredVWAP', () => {
  it('starts at anchor index', () => {
    const h = [10, 11, 12, 13, 14]
    const l = [9, 10, 11, 12, 13]
    const c = [9.5, 10.5, 11.5, 12.5, 13.5]
    const v = [100, 100, 100, 100, 100]
    const r = anchoredVWAP(h, l, c, v, 2)
    expect(r[0]).toBeNull()
    expect(r[1]).toBeNull()
    expect(r[2]).not.toBeNull()
    expect(r[4]).not.toBeNull()
  })
  it('cumulative VWAP grows monotonically for rising prices', () => {
    const h = [10, 11, 12, 13, 14]
    const l = [9, 10, 11, 12, 13]
    const c = [9.5, 10.5, 11.5, 12.5, 13.5]
    const v = [100, 100, 100, 100, 100]
    const r = anchoredVWAP(h, l, c, v, 0)
    for (let i = 1; i < r.length; i++) {
      if (r[i] != null && r[i - 1] != null) {
        expect(r[i]!).toBeGreaterThanOrEqual(r[i - 1]!)
      }
    }
  })
})
