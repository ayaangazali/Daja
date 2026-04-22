import { describe, expect, it } from 'vitest'
import {
  altmanZ,
  cagr,
  dcfValue,
  fcfConversion,
  fcfYield,
  grahamNumber,
  interestCoverage,
  magicFormulaMetrics,
  piotroskiScore,
  roic,
  shareholderYield,
  sustainableGrowth
} from './valuation'

describe('grahamNumber', () => {
  it('sqrt(22.5 * 4 * 16) ≈ 37.95 for EPS=4, BVPS=16', () => {
    expect(grahamNumber(4, 16)).toBeCloseTo(37.9473, 3)
  })
  it('null when EPS ≤ 0', () => {
    expect(grahamNumber(0, 10)).toBe(null)
    expect(grahamNumber(-1, 10)).toBe(null)
  })
  it('null when BVPS ≤ 0', () => {
    expect(grahamNumber(5, 0)).toBe(null)
    expect(grahamNumber(5, -2)).toBe(null)
  })
  it('null on null inputs', () => {
    expect(grahamNumber(null, 10)).toBe(null)
    expect(grahamNumber(5, null)).toBe(null)
  })
})

describe('dcfValue', () => {
  it('basic DCF returns positive per-share for profitable inputs', () => {
    const r = dcfValue({
      fcfBase: 1_000_000_000,
      growthRate: 0.05,
      terminalGrowth: 0.02,
      discountRate: 0.1,
      years: 5,
      sharesOut: 100_000_000,
      netDebt: 0
    })
    expect(r).not.toBeNull()
    expect(r!.perShare).toBeGreaterThan(0)
  })
  it('null when discount rate ≤ terminal growth', () => {
    expect(
      dcfValue({
        fcfBase: 1_000_000,
        growthRate: 0.05,
        terminalGrowth: 0.1,
        discountRate: 0.05,
        years: 5,
        sharesOut: 1_000_000,
        netDebt: 0
      })
    ).toBeNull()
  })
  it('produces forecast array of length years', () => {
    const r = dcfValue({
      fcfBase: 1_000_000,
      growthRate: 0.05,
      terminalGrowth: 0.02,
      discountRate: 0.1,
      years: 10,
      sharesOut: 1_000_000,
      netDebt: 0
    })
    expect(r!.pvForecast).toHaveLength(10)
  })
  it('higher netDebt reduces per-share value', () => {
    const base = { fcfBase: 1e9, growthRate: 0.05, terminalGrowth: 0.02, discountRate: 0.1, years: 5, sharesOut: 1e8 }
    const lowDebt = dcfValue({ ...base, netDebt: 0 })!.perShare
    const highDebt = dcfValue({ ...base, netDebt: 1e10 })!.perShare
    expect(highDebt).toBeLessThan(lowDebt)
  })
  it('zero shares → null', () => {
    expect(
      dcfValue({ fcfBase: 1e6, growthRate: 0.05, terminalGrowth: 0.02, discountRate: 0.1, years: 5, sharesOut: 0, netDebt: 0 })
    ).toBeNull()
  })
})

describe('piotroskiScore', () => {
  const baseCurr = {
    netIncome: 100,
    ocf: 150,
    totalAssets: 1000,
    prevAssets: 900,
    longTermDebt: 200,
    currentRatio: 2.0,
    sharesOut: 100,
    grossMargin: 0.4,
    assetTurnover: 1.2
  }
  const basePrev = {
    netIncome: 80,
    ocf: 100,
    totalAssets: 900,
    longTermDebt: 250,
    currentRatio: 1.8,
    sharesOut: 100,
    grossMargin: 0.35,
    assetTurnover: 1.1
  }

  it('perfect 9/9 on a strong balanced company', () => {
    const r = piotroskiScore({ curr: baseCurr, prev: basePrev })
    expect(r.score).toBe(9)
  })
  it('broken company scores low (≤ 2/9)', () => {
    const r = piotroskiScore({
      curr: { netIncome: -50, ocf: -10, totalAssets: 1000, prevAssets: 1100, longTermDebt: 400, currentRatio: 0.8, sharesOut: 200, grossMargin: 0.1, assetTurnover: 0.5 },
      prev: { netIncome: 10, ocf: 5, totalAssets: 1100, longTermDebt: 300, currentRatio: 1.0, sharesOut: 150, grossMargin: 0.2, assetTurnover: 0.7 }
    })
    expect(r.score).toBeLessThanOrEqual(2)
  })
  it('returns 9 check objects', () => {
    const r = piotroskiScore({ curr: baseCurr, prev: basePrev })
    expect(r.checks).toHaveLength(9)
  })
  it('flunks dilution check when shares rose', () => {
    const r = piotroskiScore({
      curr: { ...baseCurr, sharesOut: 110 },
      prev: basePrev
    })
    const dilutionCheck = r.checks.find((c) => c.name === 'No dilution')!
    expect(dilutionCheck.passed).toBe(false)
  })
  it('handles null gracefully', () => {
    const r = piotroskiScore({
      curr: { netIncome: null, ocf: null, totalAssets: null, prevAssets: null, longTermDebt: null, currentRatio: null, sharesOut: null, grossMargin: null, assetTurnover: null },
      prev: { netIncome: null, ocf: null, totalAssets: null, longTermDebt: null, currentRatio: null, sharesOut: null, grossMargin: null, assetTurnover: null }
    })
    expect(r.score).toBe(0)
    expect(r.checks).toHaveLength(9)
  })
})

describe('altmanZ', () => {
  it('computes Z for a safe healthy firm', () => {
    const r = altmanZ({
      workingCapital: 500,
      retainedEarnings: 300,
      ebit: 400,
      marketCap: 10_000,
      totalLiab: 1_000,
      sales: 5_000,
      totalAssets: 5_000
    })
    expect(r.z).not.toBeNull()
    expect(r.zone).toBe('safe')
  })
  it('classifies distress for weak firm', () => {
    const r = altmanZ({
      workingCapital: -200,
      retainedEarnings: -500,
      ebit: -100,
      marketCap: 100,
      totalLiab: 2_000,
      sales: 500,
      totalAssets: 2_500
    })
    expect(r.z).not.toBeNull()
    expect(r.z!).toBeLessThan(1.81)
    expect(r.zone).toBe('distress')
  })
  it('unknown when inputs missing', () => {
    const r = altmanZ({
      workingCapital: null,
      retainedEarnings: null,
      ebit: null,
      marketCap: null,
      totalLiab: null,
      sales: null,
      totalAssets: null
    })
    expect(r.z).toBeNull()
    expect(r.zone).toBe('unknown')
  })
  it('unknown when total assets zero', () => {
    const r = altmanZ({
      workingCapital: 100,
      retainedEarnings: 100,
      ebit: 100,
      marketCap: 1000,
      totalLiab: 500,
      sales: 500,
      totalAssets: 0
    })
    expect(r.zone).toBe('unknown')
  })
})

describe('roic', () => {
  it('classic NOPAT / invested capital', () => {
    // OpInc 1000, tax 25%, Debt 2000, Equity 3000, Cash 500
    // NOPAT = 750, IC = 2000+3000-500 = 4500
    // ROIC = 750/4500 = 16.67%
    expect(roic({ operatingIncome: 1000, taxRate: 0.25, totalDebt: 2000, totalEquity: 3000, cash: 500 }))
      .toBeCloseTo(16.67, 1)
  })
  it('null on zero invested capital', () => {
    expect(roic({ operatingIncome: 100, taxRate: 0.25, totalDebt: 0, totalEquity: 0, cash: 1000 }))
      .toBeNull()
  })
  it('null on missing inputs', () => {
    expect(roic({ operatingIncome: null, taxRate: 0.25, totalDebt: 1000, totalEquity: 1000, cash: 100 }))
      .toBeNull()
  })
})

describe('magicFormulaMetrics', () => {
  it('earnings yield = EBIT / EV', () => {
    const r = magicFormulaMetrics({ ebit: 100, enterpriseValue: 1000, roicPct: 15 })
    expect(r.earningsYieldPct).toBe(10)
    expect(r.roicPct).toBe(15)
  })
  it('null ey when EV ≤ 0', () => {
    expect(magicFormulaMetrics({ ebit: 100, enterpriseValue: 0, roicPct: 15 }).earningsYieldPct).toBeNull()
  })
})

describe('sustainableGrowth', () => {
  it('ROE × (1 - payout)', () => {
    expect(sustainableGrowth(20, 0.4)).toBeCloseTo(12, 5)
  })
  it('full retention when payout null', () => {
    expect(sustainableGrowth(15, null)).toBe(15)
  })
  it('null roe → null', () => {
    expect(sustainableGrowth(null, 0.4)).toBeNull()
  })
})

describe('fcfYield', () => {
  it('FCF 2B / MCap 40B = 5%', () => {
    expect(fcfYield(2_000_000_000, 40_000_000_000)).toBeCloseTo(5, 5)
  })
  it('null when mcap 0', () => {
    expect(fcfYield(1000, 0)).toBeNull()
  })
})

describe('shareholderYield', () => {
  it('(Div 100 + Buyback 200) / MCap 10000 = 3%', () => {
    expect(shareholderYield(100, 200, 10_000)).toBeCloseTo(3, 5)
  })
  it('handles missing buyback', () => {
    expect(shareholderYield(100, null, 10_000)).toBeCloseTo(1, 5)
  })
  it('null mcap', () => {
    expect(shareholderYield(100, 100, 0)).toBeNull()
  })
})

describe('interestCoverage', () => {
  it('EBIT 500 / interest 100 = 5x', () => {
    expect(interestCoverage(500, 100)).toBeCloseTo(5, 5)
  })
  it('uses absolute value of interest (cash flow stmt often negative)', () => {
    expect(interestCoverage(500, -100)).toBeCloseTo(5, 5)
  })
  it('null when interest 0', () => {
    expect(interestCoverage(500, 0)).toBeNull()
  })
})

describe('fcfConversion', () => {
  it('FCF 120 / NI 100 = 1.2 (high quality)', () => {
    expect(fcfConversion(120, 100)).toBeCloseTo(1.2, 5)
  })
  it('null when NI 0', () => {
    expect(fcfConversion(100, 0)).toBeNull()
  })
})

describe('cagr', () => {
  it('100 → 200 over 5 years = 14.87%', () => {
    expect(cagr(100, 200, 5)).toBeCloseTo(14.87, 2)
  })
  it('doubling over 1 year = 100%', () => {
    expect(cagr(100, 200, 1)).toBeCloseTo(100, 5)
  })
  it('null on non-positive inputs', () => {
    expect(cagr(0, 100, 5)).toBeNull()
    expect(cagr(100, -10, 5)).toBeNull()
    expect(cagr(100, 200, 0)).toBeNull()
  })
})
