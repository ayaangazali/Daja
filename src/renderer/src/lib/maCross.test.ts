import { describe, expect, it } from 'vitest'
import { detectCrosses } from './maCross'

describe('detectCrosses', () => {
  it('returns empty when insufficient data', () => {
    expect(detectCrosses([1, 2, 3], [1, 2, 3])).toEqual([])
  })
  it('detects golden cross in rising trend after dip', () => {
    // Construct: start flat, then dip, then rising — fast 50 eventually exceeds slow 200
    const closes = [
      ...Array.from({ length: 200 }, () => 100),
      ...Array.from({ length: 100 }, (_, i) => 100 + i * 0.5)
    ]
    const times = closes.map((_, i) => i)
    const res = detectCrosses(closes, times, 50, 200)
    expect(res.some((r) => r.type === 'golden')).toBe(true)
  })
  it('detects death cross on breakdown', () => {
    const closes = [
      ...Array.from({ length: 200 }, (_, i) => 100 + i * 0.5),
      ...Array.from({ length: 150 }, (_, i) => 200 - i * 1) // falling sharply
    ]
    const times = closes.map((_, i) => i)
    const res = detectCrosses(closes, times, 50, 200)
    expect(res.some((r) => r.type === 'death')).toBe(true)
  })
  it('handles custom periods', () => {
    const closes = [
      ...Array.from({ length: 30 }, () => 100),
      ...Array.from({ length: 30 }, (_, i) => 100 + i) // rising
    ]
    const times = closes.map((_, i) => i)
    const res = detectCrosses(closes, times, 10, 30)
    expect(res.length).toBeGreaterThan(0)
  })
  it('all signals have valid fast and slow values', () => {
    const closes = [
      ...Array.from({ length: 200 }, () => 100),
      ...Array.from({ length: 100 }, (_, i) => 100 + i * 0.5)
    ]
    const times = closes.map((_, i) => i)
    const res = detectCrosses(closes, times, 50, 200)
    for (const r of res) {
      expect(Number.isFinite(r.fastSma)).toBe(true)
      expect(Number.isFinite(r.slowSma)).toBe(true)
      expect(r.date).toBeGreaterThan(0)
    }
  })
})
