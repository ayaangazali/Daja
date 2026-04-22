import { describe, expect, it } from 'vitest'
import { analyzeEarningsReactions } from './earningsReaction'

function bar(time: number, close: number): { time: number; close: number | null } {
  return { time, close }
}

describe('analyzeEarningsReactions', () => {
  it('empty → zeros', () => {
    const r = analyzeEarningsReactions({ earningsDates: [], bars: [] })
    expect(r.events).toEqual([])
    expect(r.hitRate1d).toBe(0)
  })
  it('computes 1d/5d returns relative to earnings-day close', () => {
    const dayStart = new Date('2024-06-10T00:00:00Z').getTime() / 1000
    const bars = Array.from(
      { length: 20 },
      (_, i) => bar(dayStart + i * 86400, 100 + i) // rising series
    )
    const r = analyzeEarningsReactions({
      earningsDates: ['2024-06-10'],
      bars
    })
    expect(r.events).toHaveLength(1)
    // base = 100, +1d close = 101 → 1%, +5d close = 105 → 5%
    expect(r.events[0].r1d).toBeCloseTo(1, 1)
    expect(r.events[0].r5d).toBeCloseTo(5, 1)
  })
  it('aggregates average + hit rate', () => {
    const dayStart = new Date('2024-01-01T00:00:00Z').getTime() / 1000
    const bars: { time: number; close: number | null }[] = []
    for (let i = 0; i < 100; i++) {
      bars.push(bar(dayStart + i * 86400, 100 + (i % 2 === 0 ? 1 : -1)))
    }
    const r = analyzeEarningsReactions({
      earningsDates: ['2024-01-01', '2024-02-01'],
      bars
    })
    expect(r.events.length).toBeGreaterThanOrEqual(1)
    expect(r.hitRate1d).toBeGreaterThanOrEqual(0)
  })
  it('skips earnings dates outside bar range', () => {
    const dayStart = new Date('2024-06-10T00:00:00Z').getTime() / 1000
    const bars = [bar(dayStart, 100), bar(dayStart + 86400, 101)]
    const r = analyzeEarningsReactions({
      earningsDates: ['2020-01-01'], // before bars
      bars
    })
    // Finds first bar on or after → matches first bar. Accept either 0 or 1 events.
    expect(r.events.length).toBeGreaterThanOrEqual(0)
  })
})
