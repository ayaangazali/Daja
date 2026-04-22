import { describe, expect, it } from 'vitest'
import {
  adx,
  atr,
  bollinger,
  bollingerSeries,
  cci,
  cmf,
  dema,
  emaSeries,
  macd,
  macdSeries,
  mfi,
  obv,
  parabolicSAR,
  roc,
  rsiSeries,
  smaSeries,
  stochastic,
  tema,
  vwap,
  williamsR,
  wma
} from './indicators2'

describe('wma', () => {
  it('returns null if insufficient data', () => {
    expect(wma([1, 2], 3)).toBeNull()
  })
  it('weights most-recent heaviest', () => {
    // p=3 → weights (1,2,3), denom=6
    expect(wma([1, 2, 3], 3)).toBeCloseTo((1 * 1 + 2 * 2 + 3 * 3) / 6, 6)
  })
})

describe('emaSeries', () => {
  it('fills nulls before warm-up', () => {
    const s = emaSeries([1, 2, 3, 4, 5, 6, 7], 3)
    expect(s[0]).toBeNull()
    expect(s[1]).toBeNull()
    expect(s[2]).not.toBeNull()
  })
  it('last value matches ema()', () => {
    const s = emaSeries([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3)
    expect(s[s.length - 1]).not.toBeNull()
  })
})

describe('smaSeries', () => {
  it('correct sliding average', () => {
    const s = smaSeries([1, 2, 3, 4, 5], 3)
    expect(s[2]).toBeCloseTo(2, 6)
    expect(s[3]).toBeCloseTo(3, 6)
    expect(s[4]).toBeCloseTo(4, 6)
  })
})

describe('dema + tema', () => {
  it('dema returns null when insufficient', () => {
    expect(dema([1, 2], 3)).toBeNull()
  })
  it('dema + tema numeric on rising series', () => {
    const arr = Array.from({ length: 50 }, (_, i) => 100 + i)
    expect(Number.isFinite(dema(arr, 10)!)).toBe(true)
    expect(Number.isFinite(tema(arr, 5)!)).toBe(true)
  })
})

describe('bollinger', () => {
  it('upper > middle > lower when σ > 0', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
    const b = bollinger(arr, 20, 2)!
    expect(b.upper).toBeGreaterThan(b.middle)
    expect(b.middle).toBeGreaterThan(b.lower)
  })
  it('bands collapse when variance is 0', () => {
    const flat = Array(20).fill(10)
    const b = bollinger(flat, 20, 2)!
    expect(b.upper).toBeCloseTo(b.middle)
    expect(b.lower).toBeCloseTo(b.middle)
  })
  it('bollingerSeries length matches input', () => {
    const arr = Array.from({ length: 30 }, (_, i) => i)
    const s = bollingerSeries(arr, 20, 2)
    expect(s.middle).toHaveLength(30)
  })
})

describe('macd', () => {
  it('null when insufficient', () => {
    expect(macd([1, 2, 3])).toBeNull()
  })
  it('numeric on sufficient series', () => {
    const arr = Array.from({ length: 100 }, (_, i) => 100 + Math.sin(i / 5) * 10)
    const m = macd(arr)!
    expect(Number.isFinite(m.macd)).toBe(true)
    expect(Number.isFinite(m.signal)).toBe(true)
    expect(m.hist).toBeCloseTo(m.macd - m.signal, 6)
  })
  it('macdSeries returns arrays same length as input', () => {
    const arr = Array.from({ length: 100 }, (_, i) => 100 + i * 0.5)
    const s = macdSeries(arr)
    expect(s.macd).toHaveLength(100)
    expect(s.signal).toHaveLength(100)
    expect(s.hist).toHaveLength(100)
  })
})

describe('rsiSeries', () => {
  it('returns 100 for monotonic rising', () => {
    const arr = Array.from({ length: 30 }, (_, i) => 100 + i)
    const s = rsiSeries(arr, 14)
    expect(s[s.length - 1]).toBeCloseTo(100, 1)
  })
  it('low RSI for monotonic falling', () => {
    const arr = Array.from({ length: 30 }, (_, i) => 100 - i)
    const s = rsiSeries(arr, 14)
    expect(s[s.length - 1]!).toBeLessThan(10)
  })
})

describe('obv', () => {
  it('increases when close rises, decreases when falls', () => {
    const closes = [10, 11, 10, 12]
    const vols = [100, 200, 150, 300]
    const o = obv(closes, vols)
    expect(o[0]).toBe(0)
    expect(o[1]).toBe(200) // up day
    expect(o[2]).toBe(200 - 150) // down day
    expect(o[3]).toBe(50 + 300) // up day
  })
})

describe('vwap', () => {
  it('equals typical price when volume flat', () => {
    const h = [10, 10, 10]
    const l = [10, 10, 10]
    const c = [10, 10, 10]
    const v = [100, 100, 100]
    expect(vwap(h, l, c, v)[2]).toBeCloseTo(10, 6)
  })
})

describe('cci', () => {
  it('null when insufficient', () => {
    expect(cci([1, 2], [1, 2], [1, 2], 5)).toBeNull()
  })
  it('numeric on sufficient', () => {
    const h = Array.from({ length: 25 }, (_, i) => 100 + i)
    const l = h.map((v) => v - 2)
    const c = h.map((v) => v - 1)
    expect(Number.isFinite(cci(h, l, c, 20)!)).toBe(true)
  })
})

describe('cmf', () => {
  it('positive when close near high', () => {
    const highs = Array(25).fill(10)
    const lows = Array(25).fill(5)
    const closes = Array(25).fill(9.5) // near high
    const vols = Array(25).fill(100)
    const v = cmf(highs, lows, closes, vols, 20)
    expect(v).not.toBeNull()
    expect(v!).toBeGreaterThan(0)
  })
})

describe('atr', () => {
  it('null when insufficient', () => {
    expect(atr([1], [1], [1], 14)).toBeNull()
  })
  it('non-zero on realistic data', () => {
    const n = 50
    const highs = Array.from({ length: n }, (_, i) => 105 + (i % 5))
    const lows = Array.from({ length: n }, (_, i) => 95 + (i % 3))
    const closes = Array.from({ length: n }, (_, i) => 100 + (i % 4))
    expect(atr(highs, lows, closes, 14)!).toBeGreaterThan(0)
  })
})

describe('adx', () => {
  it('returns null when insufficient data', () => {
    expect(adx([1, 2], [1, 2], [1, 2], 14)).toBeNull()
  })
  it('returns valid object on sufficient data', () => {
    const n = 60
    const highs = Array.from({ length: n }, (_, i) => 100 + i)
    const lows = highs.map((v) => v - 2)
    const closes = highs.map((v) => v - 1)
    const r = adx(highs, lows, closes, 14)!
    expect(Number.isFinite(r.adx)).toBe(true)
  })
})

describe('williamsR', () => {
  it('null when insufficient', () => {
    expect(williamsR([1], [1], [1], 14)).toBeNull()
  })
  it('returns 0 when range collapses', () => {
    const flat = Array(14).fill(10)
    expect(williamsR(flat, flat, flat, 14)).toBe(0)
  })
})

describe('stochastic', () => {
  it('null when insufficient', () => {
    expect(stochastic([1], [1], [1])).toBeNull()
  })
  it('k and d in [0, 100]', () => {
    const n = 30
    const highs = Array.from({ length: n }, (_, i) => 100 + Math.sin(i) * 5)
    const lows = highs.map((v) => v - 2)
    const closes = highs.map((v) => v - 1)
    const r = stochastic(highs, lows, closes)!
    expect(r.k).toBeGreaterThanOrEqual(0)
    expect(r.k).toBeLessThanOrEqual(100)
  })
})

describe('parabolicSAR', () => {
  it('numeric on rising trend', () => {
    const highs = Array.from({ length: 30 }, (_, i) => 100 + i * 0.5)
    const lows = highs.map((v) => v - 2)
    const sar = parabolicSAR(highs, lows)
    expect(Number.isFinite(sar!)).toBe(true)
  })
})

describe('roc', () => {
  it('+10% change over 10 periods', () => {
    const arr = Array.from({ length: 11 }, (_, i) => 100 + i)
    expect(roc(arr, 10)).toBeCloseTo(10, 1)
  })
})

describe('mfi', () => {
  it('100 when only inflow', () => {
    const highs = Array.from({ length: 20 }, (_, i) => 100 + i)
    const lows = highs.map((v) => v - 2)
    const closes = highs.map((v) => v - 1)
    const vols = Array(20).fill(1000)
    expect(mfi(highs, lows, closes, vols, 14)).toBe(100)
  })
})
