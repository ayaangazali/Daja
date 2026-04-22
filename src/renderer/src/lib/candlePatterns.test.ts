import { describe, expect, it } from 'vitest'
import { detectPatterns, summarizePatterns, type Candle } from './candlePatterns'

function c(open: number, high: number, low: number, close: number): Candle {
  return { open, high, low, close }
}

describe('detectPatterns', () => {
  it('detects doji (tiny body)', () => {
    const hits = detectPatterns([c(100, 105, 95, 100.2)])
    expect(hits.some((h) => h.pattern === 'Doji')).toBe(true)
  })
  it('detects hammer', () => {
    // Body 100-101, low 92 → lower shadow 8, body 1, lower ratio >> 2
    const hits = detectPatterns([c(100, 101.2, 92, 101)])
    expect(hits.some((h) => h.pattern === 'Hammer' && h.bias === 'bullish')).toBe(true)
  })
  it('detects shooting star', () => {
    // Body 100-101, high 108 → upper shadow 7, lower 0
    const hits = detectPatterns([c(101, 108, 100.8, 100)])
    expect(hits.some((h) => h.pattern === 'Shooting Star' && h.bias === 'bearish')).toBe(true)
  })
  it('detects bullish marubozu', () => {
    const hits = detectPatterns([c(100, 110.2, 99.9, 110)])
    expect(hits.some((h) => h.pattern === 'Bullish Marubozu')).toBe(true)
  })
  it('detects bullish engulfing', () => {
    const hits = detectPatterns([
      c(100, 102, 99, 98), // bearish
      c(97, 105, 96, 104) // bullish engulfing
    ])
    expect(hits.some((h) => h.pattern === 'Bullish Engulfing')).toBe(true)
  })
  it('detects bearish engulfing', () => {
    const hits = detectPatterns([
      c(100, 103, 99, 102), // bullish
      c(103, 104, 96, 97) // bearish engulfing
    ])
    expect(hits.some((h) => h.pattern === 'Bearish Engulfing')).toBe(true)
  })
  it('detects morning star 3-candle', () => {
    const hits = detectPatterns([
      c(100, 102, 94, 95), // bearish big
      c(94, 97, 93, 94.5), // small body range 4, body 0.5, ratio 0.125
      c(95, 101, 94, 100) // bullish past midpoint of 1st (97.5)
    ])
    expect(hits.some((h) => h.pattern === 'Morning Star')).toBe(true)
  })
  it('empty returns no hits', () => {
    expect(detectPatterns([])).toEqual([])
  })
})

describe('summarizePatterns', () => {
  it('empty → neutral', () => {
    const r = summarizePatterns([], 20, 0)
    expect(r.net).toBe('neutral')
  })
  it('counts bullish vs bearish within window', () => {
    const r = summarizePatterns(
      [
        { index: 10, pattern: 'Hammer', bias: 'bullish' },
        { index: 12, pattern: 'Bullish Engulfing', bias: 'bullish' },
        { index: 0, pattern: 'Old', bias: 'bearish' } // outside window of last 5
      ],
      5,
      15
    )
    expect(r.bullish).toBe(2)
    expect(r.bearish).toBe(0)
    expect(r.net).toBe('bullish')
  })
})
