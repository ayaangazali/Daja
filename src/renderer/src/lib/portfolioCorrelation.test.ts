import { describe, expect, it } from 'vitest'
import { avgOffDiagonal, correlationMatrix } from './portfolioCorrelation'

function seq(n: number, start = 100, slope = 0.01): number[] {
  return Array.from({ length: n }, (_, i) => start * (1 + slope * i))
}

describe('correlationMatrix', () => {
  it('identity matrix when single ticker', () => {
    const r = correlationMatrix({ AAPL: seq(60) })
    expect(r.tickers).toEqual(['AAPL'])
    expect(r.matrix[0][0].value).toBe(1)
  })
  it('skips tickers with < 30 bars', () => {
    const r = correlationMatrix({ AAPL: seq(60), BRK: seq(10) })
    expect(r.tickers).toEqual(['AAPL'])
  })
  it('perfectly correlated tickers return ~1', () => {
    const s = seq(80)
    const r = correlationMatrix({ A: s, B: s.map((v) => v * 2) })
    expect(r.matrix[0][1].value).toBeCloseTo(1, 5)
  })
  it('perfectly anti-correlated tickers return ~-1', () => {
    // Construct B with exactly negated log returns of A so corr == -1
    const rets = Array.from({ length: 79 }, (_, i) => 0.001 + (i % 5) * 0.0005)
    const A = [100]
    const B = [100]
    for (const r of rets) {
      A.push(A[A.length - 1] * Math.exp(r))
      B.push(B[B.length - 1] * Math.exp(-r))
    }
    const res = correlationMatrix({ A, B })
    const v = res.matrix[0][1].value
    expect(v).not.toBeNull()
    expect(v!).toBeLessThan(-0.99)
  })
  it('matrix symmetric', () => {
    const r = correlationMatrix({ A: seq(80, 100, 0.01), B: seq(80, 80, 0.02) })
    expect(r.matrix[0][1].value).toBeCloseTo(r.matrix[1][0].value ?? NaN, 5)
  })
})

describe('avgOffDiagonal', () => {
  it('returns null when only diagonal', () => {
    expect(avgOffDiagonal([[{ a: 'A', b: 'A', value: 1 }]])).toBeNull()
  })
  it('ignores diagonal cells', () => {
    const r = avgOffDiagonal([
      [
        { a: 'A', b: 'A', value: 1 },
        { a: 'A', b: 'B', value: 0.5 }
      ],
      [
        { a: 'B', b: 'A', value: 0.5 },
        { a: 'B', b: 'B', value: 1 }
      ]
    ])
    expect(r).toBeCloseTo(0.5, 5)
  })
  it('skips null values', () => {
    const r = avgOffDiagonal([
      [
        { a: 'A', b: 'A', value: 1 },
        { a: 'A', b: 'B', value: null }
      ],
      [
        { a: 'B', b: 'A', value: null },
        { a: 'B', b: 'B', value: 1 }
      ]
    ])
    expect(r).toBeNull()
  })
})
