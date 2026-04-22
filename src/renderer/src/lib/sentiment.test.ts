import { describe, expect, it } from 'vitest'
import { aggregateSentiment, scoreHeadline } from './sentiment'

describe('scoreHeadline', () => {
  it('returns 0 for empty string', () => {
    expect(scoreHeadline('')).toBe(0)
  })
  it('positive for bullish headline', () => {
    expect(scoreHeadline('Apple beats earnings and surges on strong growth')).toBeGreaterThan(0.3)
  })
  it('negative for bearish headline', () => {
    expect(scoreHeadline('Tesla plunges after missing estimates')).toBeLessThan(-0.3)
  })
  it('negator flips sentiment', () => {
    const noBeat = scoreHeadline('Nvidia did not beat estimates')
    expect(noBeat).toBeLessThan(0)
  })
  it('neutral for factual headline', () => {
    expect(scoreHeadline('Microsoft announces annual shareholder meeting')).toBe(0)
  })
  it('bounded to [-1, 1]', () => {
    const extreme = scoreHeadline(
      'Surges soars jumps beats rallies upgrade bullish record growth profit'
    )
    expect(extreme).toBeLessThanOrEqual(1)
    expect(extreme).toBeGreaterThanOrEqual(-1)
  })
  it('handles punctuation', () => {
    expect(scoreHeadline('AAPL, Inc. (AAPL): jumps 5%!')).toBeGreaterThan(0)
  })
})

describe('aggregateSentiment', () => {
  it('empty scores yield neutral', () => {
    const r = aggregateSentiment([])
    expect(r.label).toBe('neutral')
    expect(r.averageScore).toBe(0)
  })
  it('bullish when average > 0.1', () => {
    const r = aggregateSentiment([0.5, 0.3, 0.1])
    expect(r.label).toBe('bullish')
    expect(r.positive).toBe(2)
  })
  it('bearish when average < -0.1', () => {
    const r = aggregateSentiment([-0.5, -0.3, -0.1])
    expect(r.label).toBe('bearish')
    expect(r.negative).toBe(2)
  })
  it('neutral count correct', () => {
    const r = aggregateSentiment([0.05, -0.08, 0])
    expect(r.neutral).toBe(3)
  })
})
