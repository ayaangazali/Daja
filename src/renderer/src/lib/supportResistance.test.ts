import { describe, expect, it } from 'vitest'
import { detectSRLevels } from './supportResistance'

describe('detectSRLevels', () => {
  it('returns empty when < minTouches', () => {
    const highs = [100, 101, 100]
    const lows = [99, 98, 99]
    const r = detectSRLevels(highs, lows, { radius: 1, minTouches: 3 })
    expect(r).toHaveLength(0)
  })
  it('detects clustered resistance near 100', () => {
    // Swings: peaks near 100 every 5 bars
    const highs = [95, 98, 100, 98, 95, 96, 100, 98, 96, 95, 97, 100, 98, 96, 97, 100, 98, 95]
    const lows = highs.map((v) => v - 2)
    const r = detectSRLevels(highs, lows, {
      radius: 1,
      tolerancePct: 1,
      minTouches: 2
    })
    expect(r.some((l) => l.type === 'resistance' && Math.abs(l.price - 100) < 0.5)).toBe(true)
  })
  it('detects clustered support near 90', () => {
    const highs = [95, 97, 96, 98, 95, 97, 95, 97, 95, 97]
    const lows = [92, 90, 92, 90, 92, 90, 92, 90, 92, 90]
    const r = detectSRLevels(highs, lows, {
      radius: 1,
      tolerancePct: 1,
      minTouches: 2
    })
    expect(r.some((l) => l.type === 'support' && Math.abs(l.price - 90) < 0.5)).toBe(true)
  })
  it('ranks by strength', () => {
    const highs = [95, 100, 95, 97, 100, 97, 95, 100, 95, 90, 95, 90, 95]
    const lows = highs.map((v) => v - 2)
    const r = detectSRLevels(highs, lows, {
      radius: 1,
      tolerancePct: 2,
      minTouches: 2
    })
    // Most touched should be first
    expect(r[0]?.touches).toBeGreaterThanOrEqual(r[r.length - 1]?.touches ?? 0)
  })
})
