import { describe, expect, it } from 'vitest'
import {
  beta,
  correlation,
  ema,
  logReturns,
  maxDrawdown,
  positionSize,
  rMultiple,
  rsi,
  sharpeRatio,
  sma,
  stddev
} from './indicators'

describe('sma', () => {
  it('null when fewer points than period', () => {
    expect(sma([1, 2], 5)).toBe(null)
  })
  it('average of last N', () => {
    expect(sma([1, 2, 3, 4, 5], 3)).toBeCloseTo(4, 5)
  })
  it('period 1 returns last value', () => {
    expect(sma([10, 20, 30], 1)).toBe(30)
  })
  it('invalid period returns null', () => {
    expect(sma([1, 2, 3], 0)).toBe(null)
    expect(sma([1, 2, 3], -1)).toBe(null)
  })
})

describe('ema', () => {
  it('null when fewer points than period', () => {
    expect(ema([1, 2], 5)).toBe(null)
  })
  it('constant series returns that value', () => {
    expect(ema([5, 5, 5, 5, 5], 3)).toBeCloseTo(5, 5)
  })
  it('responsive to recent values more than SMA', () => {
    const series = [1, 1, 1, 1, 10, 10]
    const emaVal = ema(series, 3)!
    const smaVal = sma(series, 3)!
    expect(emaVal).toBeGreaterThan(smaVal * 0.9) // broadly responsive
  })
})

describe('rsi', () => {
  it('returns 100 when no losses', () => {
    const rising = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
    expect(rsi(rising, 14)).toBe(100)
  })
  it('null when not enough bars', () => {
    expect(rsi([1, 2, 3], 14)).toBe(null)
  })
  it('returns value in [0, 100] for mixed series', () => {
    const mixed = [10, 11, 10, 12, 9, 13, 8, 14, 7, 15, 6, 16, 5, 17, 4]
    const r = rsi(mixed, 14)!
    expect(r).toBeGreaterThanOrEqual(0)
    expect(r).toBeLessThanOrEqual(100)
  })
  it('p=14 needs exactly 15 prices — rejects 14', () => {
    const exactly14 = Array.from({ length: 14 }, (_, i) => i + 1)
    expect(rsi(exactly14, 14)).toBe(null)
  })
  it('p=14 with 15 rising prices returns 100 (no losses)', () => {
    const rising15 = Array.from({ length: 15 }, (_, i) => i + 1)
    expect(rsi(rising15, 14)).toBe(100)
  })
  it('p=14 with 15 falling prices returns 0 (no gains)', () => {
    const falling15 = Array.from({ length: 15 }, (_, i) => 100 - i)
    expect(rsi(falling15, 14)).toBeCloseTo(0, 5)
  })
})

describe('stddev', () => {
  it('zero for constant array', () => {
    expect(stddev([5, 5, 5, 5])).toBeCloseTo(0, 10)
  })
  it('classic 3-number example', () => {
    // [2, 4, 4, 4, 5, 5, 7, 9] σ = 2 (population)
    expect(stddev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2, 5)
  })
  it('zero on empty', () => {
    expect(stddev([])).toBe(0)
  })
})

describe('logReturns', () => {
  it('length is input length - 1 for valid positives', () => {
    expect(logReturns([100, 110, 121])).toHaveLength(2)
  })
  it('constant price → all zero returns', () => {
    const r = logReturns([100, 100, 100])
    expect(r.every((x) => Math.abs(x) < 1e-10)).toBe(true)
  })
  it('10% up → log(1.1) per step', () => {
    const r = logReturns([100, 110])
    expect(r[0]).toBeCloseTo(Math.log(1.1), 6)
  })
  it('non-positive prices are skipped', () => {
    expect(logReturns([100, 0, 100])).toEqual([])
  })
})

describe('maxDrawdown', () => {
  it('zero when monotonically increasing', () => {
    expect(maxDrawdown([100, 110, 120, 130])).toBe(0)
  })
  it('50% drawdown from 100 to 50', () => {
    expect(maxDrawdown([100, 50])).toBeCloseTo(-50, 5)
  })
  it('peak-to-trough even after recovery', () => {
    expect(maxDrawdown([100, 120, 60, 130])).toBeCloseTo(-50, 5)
  })
  it('returns 0 for empty input', () => {
    expect(maxDrawdown([])).toBe(0)
  })
  it('handles single-element input', () => {
    expect(maxDrawdown([100])).toBe(0)
  })
  it('never returns positive values', () => {
    const random = [100, 95, 110, 85, 120, 90, 100, 75, 130]
    expect(maxDrawdown(random)).toBeLessThanOrEqual(0)
  })
  it('guards against division by zero when peak becomes non-positive', () => {
    const r = maxDrawdown([0, 0, 0])
    expect(Number.isFinite(r)).toBe(true)
    expect(r).toBe(0)
  })
})

describe('sharpeRatio', () => {
  it('zero for constant returns (std = 0)', () => {
    expect(sharpeRatio([0.001, 0.001, 0.001])).toBe(0)
  })
  it('positive for positive mean returns', () => {
    const positiveReturns = Array.from({ length: 20 }, (_, i) => (i % 2 === 0 ? 0.01 : 0.005))
    expect(sharpeRatio(positiveReturns)).toBeGreaterThan(0)
  })
})

describe('beta', () => {
  it('asset == market → 1', () => {
    const m = [0.01, -0.02, 0.03, -0.01, 0.02]
    expect(beta(m, m)).toBeCloseTo(1, 5)
  })
  it('asset doubles market → 2', () => {
    const m = [0.01, -0.02, 0.03, -0.01, 0.02]
    const a = m.map((x) => 2 * x)
    expect(beta(a, m)).toBeCloseTo(2, 5)
  })
  it('null with insufficient data', () => {
    expect(beta([0.1], [0.1])).toBe(null)
  })
})

describe('correlation', () => {
  it('perfect positive → 1', () => {
    const a = [1, 2, 3, 4, 5]
    expect(correlation(a, a)).toBeCloseTo(1, 5)
  })
  it('perfect negative → -1', () => {
    const a = [1, 2, 3, 4, 5]
    const b = a.map((x) => -x)
    expect(correlation(a, b)).toBeCloseTo(-1, 5)
  })
  it('null for insufficient data', () => {
    expect(correlation([1], [2])).toBe(null)
  })
})

describe('positionSize', () => {
  it('classic 1% risk on 100k, $2/share stop → 500 shares', () => {
    const r = positionSize({ accountSize: 100_000, riskPct: 1, entry: 50, stop: 48 })
    expect(r.shares).toBe(500)
    expect(r.dollarRisk).toBe(1000)
    expect(r.riskPerShare).toBe(2)
    expect(r.positionValue).toBe(25_000)
    expect(r.portfolioPct).toBeCloseTo(25, 3)
  })
  it('zero stop distance → 0 shares', () => {
    const r = positionSize({ accountSize: 100_000, riskPct: 1, entry: 50, stop: 50 })
    expect(r.shares).toBe(0)
  })
  it('short-side risk same absolute distance', () => {
    const r = positionSize({ accountSize: 100_000, riskPct: 1, entry: 48, stop: 50 })
    expect(r.shares).toBe(500)
  })
  it('invalid inputs return zeros', () => {
    expect(positionSize({ accountSize: 0, riskPct: 1, entry: 50, stop: 48 }).shares).toBe(0)
    expect(positionSize({ accountSize: 100_000, riskPct: 0, entry: 50, stop: 48 }).shares).toBe(0)
    expect(positionSize({ accountSize: 100_000, riskPct: 1, entry: 0, stop: 48 }).shares).toBe(0)
    expect(positionSize({ accountSize: 100_000, riskPct: 1, entry: NaN, stop: 48 }).shares).toBe(0)
  })
  it('higher risk pct → more shares linearly', () => {
    const a = positionSize({ accountSize: 100_000, riskPct: 1, entry: 50, stop: 48 })
    const b = positionSize({ accountSize: 100_000, riskPct: 2, entry: 50, stop: 48 })
    expect(b.shares).toBe(a.shares * 2)
  })
  it('shares are floored (whole-share)', () => {
    const r = positionSize({ accountSize: 100_000, riskPct: 1, entry: 50, stop: 47.333 })
    expect(Number.isInteger(r.shares)).toBe(true)
    expect(r.shares).toBe(Math.floor(1000 / 2.667))
  })
})

describe('rMultiple', () => {
  it('long: exit above entry by risk distance = 1R', () => {
    expect(rMultiple(100, 110, 90, 'long')).toBeCloseTo(1, 5)
  })
  it('long: exit below entry by risk distance = -1R', () => {
    expect(rMultiple(100, 90, 90, 'long')).toBeCloseTo(-1, 5)
  })
  it('short flips direction', () => {
    expect(rMultiple(100, 90, 110, 'short')).toBeCloseTo(1, 5)
  })
  it('zero risk → 0 R', () => {
    expect(rMultiple(100, 110, 100)).toBe(0)
  })
})
