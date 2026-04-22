import { describe, expect, it } from 'vitest'
import { analyzeSeasonality } from './monthlyReturns'

describe('analyzeSeasonality', () => {
  it('empty input returns empty summary', () => {
    const r = analyzeSeasonality([])
    expect(r.years).toEqual([])
    expect(r.grid).toEqual([])
    expect(r.bestMonth).toBeNull()
  })
  it('computes simple monthly returns', () => {
    const r = analyzeSeasonality([
      { date: '2024-01-31', close: 100 },
      { date: '2024-02-29', close: 110 },
      { date: '2024-03-31', close: 110 },
      { date: '2024-04-30', close: 99 }
    ])
    // Feb: (110-100)/100 = 10%
    // Mar: 0%
    // Apr: (99-110)/110 = -10%
    expect(r.grid[0][1]).toBeCloseTo(10, 5)
    expect(r.grid[0][2]).toBeCloseTo(0, 5)
    expect(r.grid[0][3]).toBeCloseTo(-10, 5)
  })
  it('uses last close of each month', () => {
    const r = analyzeSeasonality([
      { date: '2024-01-15', close: 50 },
      { date: '2024-01-31', close: 100 },
      { date: '2024-02-28', close: 120 }
    ])
    expect(r.grid[0][1]).toBeCloseTo(20, 5)
  })
  it('detects best and worst average month', () => {
    const r = analyzeSeasonality([
      { date: '2023-01-31', close: 100 },
      { date: '2023-02-28', close: 110 }, // +10 feb
      { date: '2023-03-31', close: 99 }, // -10 mar
      { date: '2023-04-30', close: 99 }, // 0 apr
      { date: '2024-01-31', close: 100 },
      { date: '2024-02-29', close: 110 }, // +10 feb
      { date: '2024-03-31', close: 99 } // -10 mar
    ])
    expect(r.bestMonth).toBe(2)
    expect(r.worstMonth).toBe(3)
  })
  it('computes compounded annual', () => {
    const r = analyzeSeasonality([
      { date: '2023-01-31', close: 100 },
      { date: '2023-02-28', close: 110 }, // +10%
      { date: '2023-03-31', close: 121 } // +10%
    ])
    // Compounded: 1.1 * 1.1 = 1.21 → 21%
    expect(r.annualByYear[0]).toBeCloseTo(21, 2)
  })
  it('handles multi-year correctly', () => {
    const r = analyzeSeasonality([
      { date: '2022-12-31', close: 100 },
      { date: '2023-01-31', close: 110 },
      { date: '2023-12-31', close: 120 },
      { date: '2024-01-31', close: 132 }
    ])
    expect(r.years).toEqual([2023, 2024])
  })
})
