import { describe, expect, it } from 'vitest'
import { coefficientOfVariation, qualityScore } from './qualityScore'

describe('qualityScore', () => {
  it('F grade on all-null', () => {
    const r = qualityScore({
      piotroskiScore: null,
      altmanZ: null,
      roicPct: null,
      grossMarginStdev: null,
      fcfConversionPct: null,
      debtToEquity: null,
      revenueCagr3y: null,
      epsCagr3y: null
    })
    expect(r.score).toBe(0)
    expect(r.grade).toBe('F')
  })
  it('A+ on ideal inputs', () => {
    const r = qualityScore({
      piotroskiScore: 9,
      altmanZ: 4,
      roicPct: 25,
      grossMarginStdev: 0.5,
      fcfConversionPct: 110,
      debtToEquity: 0.3,
      revenueCagr3y: 20,
      epsCagr3y: 25
    })
    expect(r.score).toBeGreaterThanOrEqual(85)
    expect(r.grade).toBe('A+')
  })
  it('distressed inputs → F or D', () => {
    const r = qualityScore({
      piotroskiScore: 1,
      altmanZ: 0.8,
      roicPct: -5,
      grossMarginStdev: 15,
      fcfConversionPct: 10,
      debtToEquity: 3,
      revenueCagr3y: -10,
      epsCagr3y: -15
    })
    expect(r.grade === 'F' || r.grade === 'D').toBe(true)
  })
  it('Piotroski contributes up to 20 points', () => {
    const r = qualityScore({
      piotroskiScore: 9,
      altmanZ: null,
      roicPct: null,
      grossMarginStdev: null,
      fcfConversionPct: null,
      debtToEquity: null,
      revenueCagr3y: null,
      epsCagr3y: null
    })
    const pt = r.breakdown.find((b) => b.name === 'Piotroski')
    expect(pt?.points).toBeCloseTo(20, 1)
  })
  it('score is sum of breakdown points', () => {
    const r = qualityScore({
      piotroskiScore: 5,
      altmanZ: 2,
      roicPct: 10,
      grossMarginStdev: 3,
      fcfConversionPct: 80,
      debtToEquity: 1,
      revenueCagr3y: 8,
      epsCagr3y: 10
    })
    const sum = r.breakdown.reduce((a, b) => a + b.points, 0)
    expect(r.score).toBe(Math.round(sum))
  })
})

describe('coefficientOfVariation', () => {
  it('null on < 2 values', () => {
    expect(coefficientOfVariation([5])).toBeNull()
  })
  it('0 for constant series', () => {
    expect(coefficientOfVariation([5, 5, 5])).toBe(0)
  })
  it('positive for varying series', () => {
    expect(coefficientOfVariation([1, 5, 10])).toBeGreaterThan(0)
  })
})
