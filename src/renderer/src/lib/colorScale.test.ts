import { describe, expect, it } from 'vitest'
import { alphaForRank, bucketForPct } from './colorScale'

describe('bucketForPct', () => {
  it('zero → neutral', () => {
    expect(bucketForPct(0)).toBe('neutral')
  })
  it('small positive → pos', () => {
    expect(bucketForPct(0.5)).toBe('pos')
    expect(bucketForPct(1.5)).toBe('pos')
  })
  it('large positive (≥ 2x step) → deep-pos', () => {
    expect(bucketForPct(2.5)).toBe('deep-pos')
    expect(bucketForPct(10)).toBe('deep-pos')
  })
  it('small negative → neg', () => {
    expect(bucketForPct(-0.5)).toBe('neg')
    expect(bucketForPct(-1.5)).toBe('neg')
  })
  it('large negative → deep-neg', () => {
    expect(bucketForPct(-2.5)).toBe('deep-neg')
    expect(bucketForPct(-10)).toBe('deep-neg')
  })
  it('null → neutral', () => {
    expect(bucketForPct(null)).toBe('neutral')
    expect(bucketForPct(undefined)).toBe('neutral')
    expect(bucketForPct(NaN)).toBe('neutral')
  })
  it('respects custom step', () => {
    expect(bucketForPct(3, 2)).toBe('pos')
    expect(bucketForPct(5, 2)).toBe('deep-pos')
  })
})

describe('alphaForRank', () => {
  it('rank 0 → max alpha 1.0', () => {
    expect(alphaForRank(0, 10)).toBeCloseTo(1, 5)
  })
  it('rank total-1 → floor alpha 0.3', () => {
    expect(alphaForRank(9, 10)).toBeCloseTo(0.37, 2)
  })
  it('monotonically decreasing', () => {
    const values = [0, 1, 2, 3, 4].map((i) => alphaForRank(i, 5))
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeLessThan(values[i - 1])
    }
  })
  it('zero total → 1.0', () => {
    expect(alphaForRank(0, 0)).toBe(1)
  })
  it('clamps if rank > total', () => {
    expect(alphaForRank(99, 10)).toBe(0.3)
  })
})
