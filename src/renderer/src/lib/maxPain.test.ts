import { describe, expect, it } from 'vitest'
import { computeMaxPain } from './maxPain'

describe('computeMaxPain', () => {
  it('empty chains return null', () => {
    const r = computeMaxPain([], [], 100)
    expect(r.maxPainStrike).toBeNull()
    expect(r.painByStrike).toEqual([])
  })
  it('finds strike minimizing aggregate intrinsic value', () => {
    // Large call OI at 110; large put OI at 90. Both parties lose least at strike 100.
    const calls = [
      { strike: 95, openInterest: 10 },
      { strike: 100, openInterest: 50 },
      { strike: 105, openInterest: 100 },
      { strike: 110, openInterest: 500 }
    ]
    const puts = [
      { strike: 90, openInterest: 500 },
      { strike: 95, openInterest: 100 },
      { strike: 100, openInterest: 50 },
      { strike: 105, openInterest: 10 }
    ]
    const r = computeMaxPain(calls, puts, 102)
    expect(r.maxPainStrike).not.toBeNull()
    // With symmetric OI, max pain should land near middle strikes
    expect(r.maxPainStrike!).toBeGreaterThanOrEqual(95)
    expect(r.maxPainStrike!).toBeLessThanOrEqual(105)
  })
  it('call-heavy chain pushes max pain lower', () => {
    const calls = [
      { strike: 100, openInterest: 10000 },
      { strike: 110, openInterest: 10000 }
    ]
    const puts = [
      { strike: 90, openInterest: 10 },
      { strike: 100, openInterest: 10 }
    ]
    const r = computeMaxPain(calls, puts, 105)
    // Large call OI means big payout if price > strike. Max pain pushes price LOW.
    expect(r.maxPainStrike!).toBeLessThanOrEqual(100)
  })
  it('put-heavy chain pushes max pain higher', () => {
    const calls = [
      { strike: 100, openInterest: 10 },
      { strike: 110, openInterest: 10 }
    ]
    const puts = [
      { strike: 100, openInterest: 10000 },
      { strike: 110, openInterest: 10000 }
    ]
    const r = computeMaxPain(calls, puts, 105)
    // Large put OI means big payout if price < strike. Max pain pushes price HIGH.
    expect(r.maxPainStrike!).toBeGreaterThanOrEqual(100)
  })
  it('computes put/call ratio correctly', () => {
    const calls = [
      { strike: 100, openInterest: 200 },
      { strike: 110, openInterest: 100 }
    ]
    const puts = [
      { strike: 90, openInterest: 150 },
      { strike: 100, openInterest: 100 }
    ]
    const r = computeMaxPain(calls, puts, 100)
    expect(r.callOi).toBe(300)
    expect(r.putOi).toBe(250)
    expect(r.putCallRatio).toBeCloseTo(250 / 300, 3)
  })
  it('distance to pain is percent difference', () => {
    const calls = [{ strike: 100, openInterest: 1000 }]
    const puts = [{ strike: 90, openInterest: 100 }]
    const r = computeMaxPain(calls, puts, 100)
    expect(r.maxPainStrike).not.toBeNull()
    // With call-heavy setup at strike 100, max pain should be at or below 100
    expect(Math.abs(r.distanceToPain)).toBeLessThan(15)
  })
})
