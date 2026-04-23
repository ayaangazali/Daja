import { describe, expect, it } from 'vitest'
import { computeRollingBeta } from './rollingBeta'

function randomWalk(n: number, drift = 0, vol = 0.01, seed = 1): number[] {
  let x = 100
  const out: number[] = [x]
  let s = seed
  for (let i = 0; i < n; i++) {
    s = (s * 9301 + 49297) % 233280
    const rnd = s / 233280 - 0.5
    x = x * (1 + drift + vol * rnd * 2)
    out.push(x)
  }
  return out
}

describe('computeRollingBeta', () => {
  it('returns empty unknown when data too short', () => {
    const r = computeRollingBeta([100, 101, 102], [100, 101, 102], 60)
    expect(r.trend).toBe('unknown')
    expect(r.points).toHaveLength(0)
  })

  it('identifies ~1 beta when stock perfectly tracks market', () => {
    const market = randomWalk(120, 0, 0.01, 42)
    const stock = market.slice()
    const r = computeRollingBeta(stock, market, 30)
    expect(r.currentBeta).not.toBeNull()
    expect(Math.abs((r.currentBeta ?? 0) - 1)).toBeLessThan(0.05)
  })

  it('flags high-beta when stock moves 2x market', () => {
    const market = randomWalk(120, 0, 0.01, 7)
    const stock = [market[0]]
    for (let i = 1; i < market.length; i++) {
      const mret = (market[i] - market[i - 1]) / market[i - 1]
      stock.push(stock[i - 1] * (1 + 2 * mret))
    }
    const r = computeRollingBeta(stock, market, 30)
    expect(r.currentBeta).toBeGreaterThan(1.5)
    expect(r.regime).toBe('risk-on')
  })

  it('negative beta detected for inverse-moving asset', () => {
    const market = randomWalk(120, 0, 0.01, 3)
    const stock = [market[0]]
    for (let i = 1; i < market.length; i++) {
      const mret = (market[i] - market[i - 1]) / market[i - 1]
      stock.push(stock[i - 1] * (1 - mret))
    }
    const r = computeRollingBeta(stock, market, 30)
    expect(r.currentBeta).toBeLessThan(0)
    expect(r.regime).toBe('risk-off')
  })

  it('rationale mentions high-beta for aggressive stock', () => {
    const market = randomWalk(120, 0, 0.01, 11)
    const stock = [market[0]]
    for (let i = 1; i < market.length; i++) {
      const mret = (market[i] - market[i - 1]) / market[i - 1]
      stock.push(stock[i - 1] * (1 + 1.8 * mret))
    }
    const r = computeRollingBeta(stock, market, 30)
    expect(r.rationale.toLowerCase()).toContain('high')
  })
})
