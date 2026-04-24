import { describe, expect, it } from 'vitest'
import { assessDividendSustainability } from './dividendSustainability'

describe('assessDividendSustainability', () => {
  it('returns n/a for zero or missing dividend yield', () => {
    const r = assessDividendSustainability({
      dividendYield: 0,
      payoutRatio: 0.3,
      earningsGrowth: 0.05,
      debtToEquity: 1,
      totalCash: 100,
      totalDebt: 50
    })
    expect(r.tier).toBe('n/a')
    expect(r.score).toBe(0)
  })

  it('green tier for high-quality dividend', () => {
    const r = assessDividendSustainability({
      dividendYield: 0.025,
      payoutRatio: 0.35,
      earningsGrowth: 0.12,
      debtToEquity: 0.3,
      totalCash: 200,
      totalDebt: 100,
      freeCashflowTTM: 50_000_000_000,
      marketCap: 1_000_000_000_000
    })
    expect(r.tier).toBe('green')
    expect(r.score).toBeGreaterThanOrEqual(80)
  })

  it('red tier for stretched payout + high leverage', () => {
    const r = assessDividendSustainability({
      dividendYield: 0.07,
      payoutRatio: 1.1,
      earningsGrowth: -0.15,
      debtToEquity: 4,
      totalCash: 10,
      totalDebt: 500
    })
    expect(r.tier).toBe('red')
    expect(r.score).toBeLessThan(50)
  })

  it('flags negative payout ratio', () => {
    const r = assessDividendSustainability({
      dividendYield: 0.05,
      payoutRatio: -0.5,
      earningsGrowth: 0.05,
      debtToEquity: 1,
      totalCash: 100,
      totalDebt: 100
    })
    expect(r.factors.payoutRatio.points).toBe(0)
    expect(r.factors.payoutRatio.note).toContain('Negative')
  })

  it('net cash position adds leverage bonus', () => {
    const withCash = assessDividendSustainability({
      dividendYield: 0.03,
      payoutRatio: 0.4,
      earningsGrowth: 0.05,
      debtToEquity: 1.2,
      totalCash: 500,
      totalDebt: 100
    })
    const withoutCash = assessDividendSustainability({
      dividendYield: 0.03,
      payoutRatio: 0.4,
      earningsGrowth: 0.05,
      debtToEquity: 1.2,
      totalCash: 10,
      totalDebt: 500
    })
    expect(withCash.factors.leverage.points).toBeGreaterThanOrEqual(
      withoutCash.factors.leverage.points
    )
  })

  it('FCF coverage scoring — >2x gets full points', () => {
    const r = assessDividendSustainability({
      dividendYield: 0.02,
      payoutRatio: 0.3,
      earningsGrowth: 0.05,
      debtToEquity: 0.5,
      totalCash: 100,
      totalDebt: 100,
      freeCashflowTTM: 10_000_000_000,
      marketCap: 100_000_000_000
    })
    // Annual div = 100B × 2% = 2B. FCF 10B / 2B = 5×
    expect(r.factors.fcfCoverage.points).toBe(25)
  })
})
