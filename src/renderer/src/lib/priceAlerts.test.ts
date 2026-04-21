import { describe, expect, it } from 'vitest'
import { isCrossedAbove, isCrossedBelow, validateThreshold } from './priceAlerts'

describe('isCrossedAbove', () => {
  it('true when price crosses through above from below', () => {
    expect(isCrossedAbove(105, 95, 100)).toBe(true)
  })
  it('false when both current and previous are above', () => {
    expect(isCrossedAbove(110, 105, 100)).toBe(false)
  })
  it('false when current is below above', () => {
    expect(isCrossedAbove(95, 90, 100)).toBe(false)
  })
  it('null above → false', () => {
    expect(isCrossedAbove(105, 95, null)).toBe(false)
  })
  it('no previous → fires if current >= above', () => {
    expect(isCrossedAbove(105, null, 100)).toBe(true)
    expect(isCrossedAbove(95, null, 100)).toBe(false)
  })
  it('null current → false', () => {
    expect(isCrossedAbove(null, 95, 100)).toBe(false)
  })
  it('exact touch counts as crossed', () => {
    expect(isCrossedAbove(100, 99, 100)).toBe(true)
  })
})

describe('isCrossedBelow', () => {
  it('true when price drops through below from above', () => {
    expect(isCrossedBelow(95, 105, 100)).toBe(true)
  })
  it('false when both already below', () => {
    expect(isCrossedBelow(90, 95, 100)).toBe(false)
  })
  it('false when current still above', () => {
    expect(isCrossedBelow(105, 110, 100)).toBe(false)
  })
  it('exact touch counts', () => {
    expect(isCrossedBelow(100, 101, 100)).toBe(true)
  })
})

describe('validateThreshold', () => {
  it('flags below >= above', () => {
    expect(validateThreshold(100, 100, 95)).toContain(
      'Below threshold must be less than above threshold'
    )
    expect(validateThreshold(100, 120, 95).length).toBeGreaterThan(0)
  })
  it('flags above <= current (already hit)', () => {
    expect(validateThreshold(50, null, 60)).toContain(
      'Above threshold is already at/below current price'
    )
  })
  it('flags below >= current', () => {
    expect(validateThreshold(null, 100, 50)).toContain(
      'Below threshold is already at/above current price'
    )
  })
  it('no errors on valid thresholds', () => {
    expect(validateThreshold(110, 90, 100)).toEqual([])
  })
  it('no errors when both null', () => {
    expect(validateThreshold(null, null, 100)).toEqual([])
  })
})
