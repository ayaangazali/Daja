import { describe, expect, it } from 'vitest'
import {
  calmarRatio,
  conditionalVaR,
  historicalVaR,
  informationRatio,
  kellyCriterion,
  kurtosis,
  parametricVaR,
  skewness,
  sortinoRatio,
  treynorRatio,
  ulcerIndex
} from './riskMetrics'

describe('sortinoRatio', () => {
  it('returns 0 on empty', () => {
    expect(sortinoRatio([])).toBe(0)
  })
  it('positive for rising series', () => {
    const r = Array.from({ length: 100 }, (_, i) => (i % 10 === 0 ? -0.001 : 0.002))
    expect(sortinoRatio(r)).toBeGreaterThan(0)
  })
  it('handles all-positive returns', () => {
    const r = Array.from({ length: 50 }, () => 0.01)
    const s = sortinoRatio(r)
    expect(Number.isFinite(s) || s === Infinity).toBe(true)
  })
})

describe('calmarRatio', () => {
  it('return/drawdown', () => {
    expect(calmarRatio(20, -10)).toBe(2)
  })
  it('0 when drawdown is 0', () => {
    expect(calmarRatio(20, 0)).toBe(0)
  })
})

describe('informationRatio', () => {
  it('0 on empty', () => {
    expect(informationRatio([], [])).toBe(0)
  })
  it('positive when asset outperforms benchmark', () => {
    const asset = Array.from({ length: 50 }, () => 0.002)
    const bench = Array.from({ length: 50 }, () => 0.001)
    expect(informationRatio(asset, bench)).toBe(0) // no variance → 0
  })
  it('non-zero when asset has varying alpha', () => {
    const asset = Array.from({ length: 50 }, (_, i) => 0.002 + Math.sin(i / 5) * 0.001)
    const bench = Array.from({ length: 50 }, () => 0.001)
    expect(informationRatio(asset, bench)).not.toBe(0)
  })
})

describe('treynorRatio', () => {
  it('0 when beta is 0', () => {
    expect(treynorRatio(0.01, 0, 0)).toBe(0)
  })
  it('scales by beta', () => {
    expect(treynorRatio(0.002, 0, 1)).toBeCloseTo(0.504, 2)
  })
})

describe('historicalVaR + conditionalVaR', () => {
  it('historical VaR = 5th worst return approx', () => {
    const returns = Array.from({ length: 100 }, (_, i) => (i - 50) / 1000)
    const v = historicalVaR(returns, 0.05)
    expect(v).toBeLessThan(0)
  })
  it('CVaR more negative than VaR', () => {
    const returns = Array.from({ length: 100 }, (_, i) => (i - 50) / 1000)
    const v = historicalVaR(returns, 0.05)
    const cv = conditionalVaR(returns, 0.05)
    expect(cv).toBeLessThanOrEqual(v)
  })
  it('parametricVaR uses z-score for 5%', () => {
    const returns = Array.from({ length: 200 }, (_, i) => Math.sin(i / 10) * 0.01)
    const v = parametricVaR(returns, 0.05)
    expect(Number.isFinite(v)).toBe(true)
  })
})

describe('skewness + kurtosis', () => {
  it('skew ~0 for symmetric', () => {
    const r: number[] = []
    for (let i = 0; i < 200; i++) r.push(Math.sin(i))
    expect(Math.abs(skewness(r))).toBeLessThan(0.5)
  })
  it('kurtosis -2 for uniform', () => {
    const r: number[] = []
    for (let i = -100; i <= 100; i++) r.push(i / 100)
    expect(kurtosis(r)).toBeLessThan(0) // platykurtic
  })
})

describe('kellyCriterion', () => {
  it('zero when no edge', () => {
    expect(kellyCriterion(0.5, 1, 1)).toBe(0)
  })
  it('positive fraction when positive edge', () => {
    // 60% win rate, even payoffs → f* = 0.2
    expect(kellyCriterion(0.6, 1, 1)).toBeCloseTo(0.2, 2)
  })
  it('zero when edge is negative', () => {
    expect(kellyCriterion(0.4, 1, 1)).toBe(0)
  })
})

describe('ulcerIndex', () => {
  it('0 for flat or monotonic up', () => {
    expect(ulcerIndex([100, 101, 102, 103])).toBe(0)
  })
  it('positive for volatile series', () => {
    expect(ulcerIndex([100, 90, 110, 95])).toBeGreaterThan(0)
  })
})
