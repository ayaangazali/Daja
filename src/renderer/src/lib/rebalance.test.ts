import { describe, expect, it } from 'vitest'
import { computeRebalance } from './rebalance'

describe('computeRebalance', () => {
  it('computes buy/sell for simple two-ticker rebalance', () => {
    const r = computeRebalance([
      { ticker: 'A', currentValue: 7000, price: 100, targetWeight: 0.5 },
      { ticker: 'B', currentValue: 3000, price: 50, targetWeight: 0.5 }
    ])
    // Total = 10000. Target each = 5000.
    expect(r.actions[0].action).toBe('sell')
    expect(r.actions[0].deltaValue).toBeCloseTo(-2000, 1)
    expect(r.actions[0].deltaShares).toBeCloseTo(-20, 1)
    expect(r.actions[1].action).toBe('buy')
    expect(r.actions[1].deltaValue).toBeCloseTo(2000, 1)
    expect(r.actions[1].deltaShares).toBeCloseTo(40, 1)
  })
  it('respects cash and includes it in total', () => {
    const r = computeRebalance(
      [
        { ticker: 'A', currentValue: 5000, price: 100, targetWeight: 0.5 },
        { ticker: 'B', currentValue: 5000, price: 50, targetWeight: 0.5 }
      ],
      { cash: 2000 }
    )
    // Total = 12000. Target each = 6000.
    expect(r.actions[0].deltaValue).toBeCloseTo(1000, 1)
    expect(r.actions[1].deltaValue).toBeCloseTo(1000, 1)
    // Both buys
    expect(r.actions.every((a) => a.action === 'buy')).toBe(true)
  })
  it('holds when within threshold', () => {
    const r = computeRebalance(
      [
        { ticker: 'A', currentValue: 5010, price: 100, targetWeight: 0.5 },
        { ticker: 'B', currentValue: 4990, price: 50, targetWeight: 0.5 }
      ],
      { holdThresholdPct: 0.5 }
    )
    expect(r.actions.every((a) => a.action === 'hold')).toBe(true)
    expect(r.totalTrades).toBe(0)
  })
  it('detects unallocated weight when targets sum < 1', () => {
    const r = computeRebalance([
      { ticker: 'A', currentValue: 5000, price: 100, targetWeight: 0.3 },
      { ticker: 'B', currentValue: 5000, price: 50, targetWeight: 0.4 }
    ])
    expect(r.unallocatedWeight).toBeCloseTo(0.3, 5)
  })
  it('outOfWhackMax reports largest deviation', () => {
    const r = computeRebalance([
      { ticker: 'A', currentValue: 9000, price: 100, targetWeight: 0.5 },
      { ticker: 'B', currentValue: 1000, price: 50, targetWeight: 0.5 }
    ])
    // Current A = 0.9, target = 0.5, drift = 0.4
    expect(r.outOfWhackMax).toBeCloseTo(0.4, 5)
  })
  it('totalVolume sums absolute deltas', () => {
    const r = computeRebalance([
      { ticker: 'A', currentValue: 7000, price: 100, targetWeight: 0.5 },
      { ticker: 'B', currentValue: 3000, price: 50, targetWeight: 0.5 }
    ])
    expect(r.totalVolume).toBeCloseTo(4000, 1)
  })
  it('handles zero price gracefully', () => {
    const r = computeRebalance([
      { ticker: 'A', currentValue: 5000, price: 0, targetWeight: 0.5 },
      { ticker: 'B', currentValue: 5000, price: 50, targetWeight: 0.5 }
    ])
    expect(r.actions[0].deltaShares).toBe(0)
  })
  it('no positions returns empty', () => {
    const r = computeRebalance([])
    expect(r.actions).toEqual([])
    expect(r.totalTrades).toBe(0)
  })
})
