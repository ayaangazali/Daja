import { describe, expect, it } from 'vitest'
import { blackScholes, impliedVolatility, normCdf, normPdf } from './blackScholes'

describe('normCdf', () => {
  it('cdf(0) = 0.5', () => {
    expect(normCdf(0)).toBeCloseTo(0.5, 6)
  })
  it('cdf(1.96) ≈ 0.975', () => {
    expect(normCdf(1.96)).toBeCloseTo(0.975, 3)
  })
  it('cdf(-1.96) ≈ 0.025', () => {
    expect(normCdf(-1.96)).toBeCloseTo(0.025, 3)
  })
  it('cdf(∞-ish) ≈ 1', () => {
    expect(normCdf(6)).toBeCloseTo(1, 6)
  })
  it('cdf(-∞-ish) ≈ 0', () => {
    expect(normCdf(-6)).toBeCloseTo(0, 6)
  })
  it('symmetric: cdf(x) + cdf(-x) = 1', () => {
    for (const x of [0.1, 0.5, 1, 2, 3]) {
      expect(normCdf(x) + normCdf(-x)).toBeCloseTo(1, 5)
    }
  })
})

describe('normPdf', () => {
  it('pdf(0) = 1/sqrt(2π) ≈ 0.3989', () => {
    expect(normPdf(0)).toBeCloseTo(0.39894, 4)
  })
  it('symmetric', () => {
    expect(normPdf(1.5)).toBeCloseTo(normPdf(-1.5), 10)
  })
})

describe('blackScholes call', () => {
  // Reference: Hull textbook example. S=50, K=50, T=0.25, r=0.10, σ=0.30
  const input = { S: 50, K: 50, T: 0.25, r: 0.1, sigma: 0.3 }

  it('call price in expected range for Hull example', () => {
    const g = blackScholes('call', input)
    // Reference value ~3.61 for these inputs
    expect(g.price).toBeGreaterThan(3)
    expect(g.price).toBeLessThan(4.5)
  })
  it('ATM delta ≈ 0.5-0.6', () => {
    const g = blackScholes('call', input)
    expect(g.delta).toBeGreaterThan(0.5)
    expect(g.delta).toBeLessThan(0.7)
  })
  it('gamma positive and small', () => {
    const g = blackScholes('call', input)
    expect(g.gamma).toBeGreaterThan(0)
    expect(g.gamma).toBeLessThan(0.1)
  })
  it('theta negative for long call (decay)', () => {
    const g = blackScholes('call', input)
    expect(g.theta).toBeLessThan(0)
  })
  it('vega positive', () => {
    const g = blackScholes('call', input)
    expect(g.vega).toBeGreaterThan(0)
  })
  it('rho positive for call', () => {
    const g = blackScholes('call', input)
    expect(g.rho).toBeGreaterThan(0)
  })
})

describe('blackScholes put', () => {
  const input = { S: 50, K: 50, T: 0.25, r: 0.1, sigma: 0.3 }
  it('put price > 0', () => {
    expect(blackScholes('put', input).price).toBeGreaterThan(0)
  })
  it('put delta negative', () => {
    expect(blackScholes('put', input).delta).toBeLessThan(0)
  })
  it('rho negative for put', () => {
    expect(blackScholes('put', input).rho).toBeLessThan(0)
  })
})

describe('put-call parity: C - P = S*e^(-qT) - K*e^(-rT)', () => {
  it('holds within numerical precision', () => {
    const input = { S: 100, K: 100, T: 1, r: 0.05, sigma: 0.2, q: 0 }
    const c = blackScholes('call', input).price
    const p = blackScholes('put', input).price
    const expected = input.S * Math.exp(0) - input.K * Math.exp(-input.r * input.T)
    expect(c - p).toBeCloseTo(expected, 5)
  })
})

describe('intrinsic value at expiry', () => {
  it('T=0 call ITM returns S-K', () => {
    expect(blackScholes('call', { S: 110, K: 100, T: 0, r: 0.05, sigma: 0.3 }).price).toBe(10)
  })
  it('T=0 call OTM returns 0', () => {
    expect(blackScholes('call', { S: 90, K: 100, T: 0, r: 0.05, sigma: 0.3 }).price).toBe(0)
  })
  it('T=0 put ITM returns K-S', () => {
    expect(blackScholes('put', { S: 90, K: 100, T: 0, r: 0.05, sigma: 0.3 }).price).toBe(10)
  })
})

describe('impliedVolatility', () => {
  it('round-trip: compute price, recover sigma', () => {
    const input = { S: 100, K: 100, T: 0.5, r: 0.04, sigma: 0.25 }
    const price = blackScholes('call', input).price
    const iv = impliedVolatility('call', price, input)
    expect(iv).not.toBeNull()
    expect(iv!).toBeCloseTo(0.25, 4)
  })
  it('round-trip put', () => {
    const input = { S: 100, K: 105, T: 0.25, r: 0.05, sigma: 0.4 }
    const price = blackScholes('put', input).price
    const iv = impliedVolatility('put', price, input)
    expect(iv).not.toBeNull()
    expect(iv!).toBeCloseTo(0.4, 4)
  })
  it('returns null for invalid inputs', () => {
    expect(impliedVolatility('call', 10, { S: -100, K: 100, T: 0.5, r: 0.04 })).toBeNull()
    expect(impliedVolatility('call', 0, { S: 100, K: 100, T: 0.5, r: 0.04 })).toBeNull()
  })
})
