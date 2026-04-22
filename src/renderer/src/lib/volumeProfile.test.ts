import { describe, expect, it } from 'vitest'
import { volumeProfile } from './volumeProfile'

describe('volumeProfile', () => {
  it('empty input returns empty', () => {
    const r = volumeProfile([], [], [], [])
    expect(r.buckets).toEqual([])
    expect(r.poc).toBeNull()
  })
  it('buckets cover full price range', () => {
    const h = [100, 110, 105, 108]
    const l = [95, 100, 100, 102]
    const c = [98, 105, 103, 106]
    const v = [1000, 2000, 1500, 1800]
    const r = volumeProfile(h, l, c, v, 10)
    expect(r.buckets).toHaveLength(10)
    expect(r.buckets[0].low).toBeCloseTo(95, 6)
    expect(r.buckets[9].high).toBeCloseTo(110, 6)
  })
  it('total volume preserved', () => {
    const h = [100, 110, 105]
    const l = [90, 100, 100]
    const c = [95, 105, 102]
    const v = [1000, 2000, 1500]
    const r = volumeProfile(h, l, c, v, 10)
    expect(r.totalVolume).toBe(4500)
  })
  it('POC is highest-volume bucket', () => {
    // 100 bars clustered at price 100 + few outliers
    const closes = Array(100).fill(100).concat([150, 50])
    const highs = closes.map((v) => v + 1)
    const lows = closes.map((v) => v - 1)
    const vols = closes.map(() => 1000)
    const r = volumeProfile(highs, lows, closes, vols, 20)
    expect(r.poc).not.toBeNull()
    expect(r.poc!.low).toBeLessThanOrEqual(100)
    expect(r.poc!.high).toBeGreaterThanOrEqual(100)
  })
  it('value area brackets POC', () => {
    const closes = Array.from({ length: 50 }, (_, i) => 100 + (i % 5))
    const highs = closes.map((v) => v + 1)
    const lows = closes.map((v) => v - 1)
    const vols = closes.map(() => 1000)
    const r = volumeProfile(highs, lows, closes, vols, 20)
    expect(r.valueAreaHigh).toBeGreaterThanOrEqual(r.valueAreaLow)
  })
})
