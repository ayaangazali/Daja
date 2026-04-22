import { describe, expect, it } from 'vitest'
import { detectGaps, gapFillStats, type OHLCVBar } from './gapAnalysis'

function bar(o: number, h: number, l: number, c: number, t = 0): OHLCVBar {
  return { open: o, high: h, low: l, close: c, time: t }
}

describe('detectGaps', () => {
  it('no gaps on normal day', () => {
    const bars: OHLCVBar[] = [bar(100, 101, 99, 100), bar(100, 101, 99, 100.5)]
    expect(detectGaps(bars, 1)).toHaveLength(0)
  })
  it('detects gap up', () => {
    const bars: OHLCVBar[] = [
      bar(100, 101, 99, 100, 1),
      bar(103, 104, 102, 104, 2) // open +3%
    ]
    const r = detectGaps(bars, 1)
    expect(r).toHaveLength(1)
    expect(r[0].type).toBe('gap_up')
    expect(r[0].pct).toBeCloseTo(3, 1)
  })
  it('detects gap down', () => {
    const bars: OHLCVBar[] = [
      bar(100, 101, 99, 100, 1),
      bar(95, 96, 94, 94, 2) // open -5%
    ]
    const r = detectGaps(bars, 1)
    expect(r[0].type).toBe('gap_down')
  })
  it('marks gap as filled when price returns through prev close', () => {
    const bars: OHLCVBar[] = [
      bar(100, 101, 99, 100, 1),
      bar(103, 104, 102, 103, 2), // gap up
      bar(103, 103, 99, 99, 3) // low = 99 < prev close 100 → gap fills
    ]
    const r = detectGaps(bars, 1)
    expect(r[0].filled).toBe(true)
    expect(r[0].daysToFill).toBe(1)
  })
  it('unfilled gap has null fill', () => {
    const bars: OHLCVBar[] = [
      bar(100, 101, 99, 100, 1),
      bar(103, 104, 102, 105, 2),
      bar(105, 106, 104, 106, 3)
    ]
    const r = detectGaps(bars, 1)
    expect(r[0].filled).toBe(false)
    expect(r[0].daysToFill).toBeNull()
  })
  it('ignores gaps below threshold', () => {
    const bars: OHLCVBar[] = [
      bar(100, 101, 99, 100, 1),
      bar(100.5, 101, 100, 101, 2)
    ]
    expect(detectGaps(bars, 1)).toHaveLength(0)
  })
})

describe('gapFillStats', () => {
  it('empty yields zeros', () => {
    const s = gapFillStats([])
    expect(s.total).toBe(0)
    expect(s.fillRate).toBe(0)
  })
  it('fillRate and median correct', () => {
    const gaps = [
      { index: 1, time: 0, type: 'gap_up' as const, prevClose: 100, open: 102, pct: 2, filledIndex: 3, filled: true, daysToFill: 2 },
      { index: 5, time: 0, type: 'gap_down' as const, prevClose: 100, open: 98, pct: -2, filledIndex: 10, filled: true, daysToFill: 5 },
      { index: 10, time: 0, type: 'gap_up' as const, prevClose: 100, open: 103, pct: 3, filledIndex: null, filled: false, daysToFill: null }
    ]
    const s = gapFillStats(gaps)
    expect(s.total).toBe(3)
    expect(s.filled).toBe(2)
    expect(s.fillRate).toBeCloseTo(66.67, 1)
    expect(s.medianDaysToFill).toBe(3.5) // avg of 2 and 5
  })
})
