import { describe, expect, it } from 'vitest'
import { dripCAGR, projectDrip } from './drip'

describe('projectDrip', () => {
  it('returns empty on invalid input', () => {
    expect(
      projectDrip({
        startAmount: 0,
        sharePrice: 100,
        dividendYieldPct: 3,
        priceGrowthPct: 7,
        dividendGrowthPct: 5,
        years: 10
      })
    ).toEqual([])
  })
  it('produces N year rows', () => {
    const r = projectDrip({
      startAmount: 10000,
      sharePrice: 100,
      dividendYieldPct: 3,
      priceGrowthPct: 7,
      dividendGrowthPct: 5,
      years: 10
    })
    expect(r).toHaveLength(10)
    expect(r[9].year).toBe(10)
  })
  it('total value compounds upward', () => {
    const r = projectDrip({
      startAmount: 10000,
      sharePrice: 100,
      dividendYieldPct: 3,
      priceGrowthPct: 7,
      dividendGrowthPct: 5,
      years: 20
    })
    for (let i = 1; i < r.length; i++) {
      expect(r[i].totalValue).toBeGreaterThan(r[i - 1].totalValue)
    }
  })
  it('with 0% growth still compounds via reinvestment', () => {
    const r = projectDrip({
      startAmount: 10000,
      sharePrice: 100,
      dividendYieldPct: 5,
      priceGrowthPct: 0,
      dividendGrowthPct: 0,
      years: 10
    })
    expect(r[9].totalValue).toBeGreaterThan(10000)
  })
  it('monthly contribution increases final value', () => {
    const noContrib = projectDrip({
      startAmount: 10000,
      sharePrice: 100,
      dividendYieldPct: 3,
      priceGrowthPct: 7,
      dividendGrowthPct: 5,
      years: 20
    })
    const withContrib = projectDrip({
      startAmount: 10000,
      sharePrice: 100,
      dividendYieldPct: 3,
      priceGrowthPct: 7,
      dividendGrowthPct: 5,
      years: 20,
      monthlyContribution: 500
    })
    expect(withContrib[19].totalValue).toBeGreaterThan(noContrib[19].totalValue)
  })
  it('tax drag reduces reinvestment', () => {
    const noTax = projectDrip({
      startAmount: 10000,
      sharePrice: 100,
      dividendYieldPct: 5,
      priceGrowthPct: 5,
      dividendGrowthPct: 0,
      years: 20
    })
    const taxed = projectDrip({
      startAmount: 10000,
      sharePrice: 100,
      dividendYieldPct: 5,
      priceGrowthPct: 5,
      dividendGrowthPct: 0,
      years: 20,
      taxDragPct: 30
    })
    expect(taxed[19].totalValue).toBeLessThan(noTax[19].totalValue)
  })
})

describe('dripCAGR', () => {
  it('0 on empty', () => {
    expect(dripCAGR([], 10000)).toBe(0)
  })
  it('approx matches geometric growth', () => {
    const r = projectDrip({
      startAmount: 10000,
      sharePrice: 100,
      dividendYieldPct: 0,
      priceGrowthPct: 10,
      dividendGrowthPct: 0,
      years: 10
    })
    const cagr = dripCAGR(r, 10000)
    expect(cagr).toBeCloseTo(10, 0)
  })
})
