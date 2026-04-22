import { describe, expect, it } from 'vitest'
import { analyzeDividendGrowth, type DividendEvent } from './dividendGrowth'

function ev(date: string, amount: number): DividendEvent {
  return { date, amount }
}

describe('analyzeDividendGrowth', () => {
  it('returns all-null on empty input', () => {
    const r = analyzeDividendGrowth([])
    expect(r.annualByYear).toEqual([])
    expect(r.growth1y).toBeNull()
    expect(r.cagr3y).toBeNull()
    expect(r.lastAmount).toBeNull()
  })
  it('aggregates quarterly dividends by year', () => {
    const r = analyzeDividendGrowth([
      ev('2019-03-15', 0.5),
      ev('2019-06-15', 0.5),
      ev('2019-09-15', 0.5),
      ev('2019-12-15', 0.5),
      ev('2020-03-15', 0.6),
      ev('2020-06-15', 0.6),
      ev('2020-09-15', 0.6),
      ev('2020-12-15', 0.6)
    ])
    // 2020 should still be complete (not current year in this fixture's sense)
    const map = Object.fromEntries(r.annualByYear.map((y) => [y.year, y.total]))
    expect(map[2019]).toBeCloseTo(2.0, 2)
    expect(map[2020]).toBeCloseTo(2.4, 2)
  })
  it('computes 1y growth', () => {
    const r = analyzeDividendGrowth([
      ev('2020-01-15', 1),
      ev('2020-07-15', 1),
      ev('2021-01-15', 1.2),
      ev('2021-07-15', 1.2)
    ])
    // 2020 total 2, 2021 total 2.4 → 20% growth
    expect(r.growth1y).toBeCloseTo(20, 1)
  })
  it('tracks consecutive increase streak', () => {
    const r = analyzeDividendGrowth([
      ev('2018-01-01', 1),
      ev('2019-01-01', 2),
      ev('2020-01-01', 3),
      ev('2021-01-01', 4),
      ev('2022-01-01', 5)
    ])
    expect(r.increaseStreak).toBe(4) // 2019..2022 each exceed prior
  })
  it('streak resets on decrease', () => {
    const r = analyzeDividendGrowth([
      ev('2018-01-01', 1),
      ev('2019-01-01', 2),
      ev('2020-01-01', 1.5), // decrease
      ev('2021-01-01', 1.6),
      ev('2022-01-01', 1.7)
    ])
    expect(r.increaseStreak).toBe(2) // 21 vs 20, 22 vs 21
  })
  it('3y CAGR correct', () => {
    const r = analyzeDividendGrowth([
      ev('2019-01-01', 1),
      ev('2020-01-01', 1.1),
      ev('2021-01-01', 1.21),
      ev('2022-01-01', 1.331)
    ])
    // 3y CAGR of (1.331/1) = 10%
    expect(r.cagr3y).toBeCloseTo(10, 0)
  })
  it('lastAmount + lastDate from most recent event', () => {
    const r = analyzeDividendGrowth([
      ev('2021-03-15', 1),
      ev('2022-03-15', 1.1),
      ev('2023-03-15', 1.2)
    ])
    expect(r.lastAmount).toBe(1.2)
    expect(r.lastDate).toBe('2023-03-15')
  })
})
