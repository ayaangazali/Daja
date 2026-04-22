import { describe, expect, it } from 'vitest'
import { computeEntrySignals } from './entrySignals'

function bar(
  close: number,
  time = 0,
  volume = 1_000_000,
  high = close * 1.01,
  low = close * 0.99,
  open = close
): { time: number; open: number; high: number; low: number; close: number; volume: number } {
  return { time, open, high, low, close, volume }
}

function risingBars(n: number, start = 100, step = 0.5): ReturnType<typeof bar>[] {
  return Array.from({ length: n }, (_, i) => bar(start + i * step, i))
}


describe('computeEntrySignals', () => {
  it('ignore verdict on dead-flat inputs', () => {
    const bars = Array.from({ length: 40 }, (_, i) => bar(100, i))
    const r = computeEntrySignals({
      ticker: 'A',
      currentPrice: 100,
      technical: { bars }
    })
    expect(r.action).toBe('ignore')
  })
  it('buy action when many bullish signals stack', () => {
    const bars = risingBars(260, 100, 0.5)
    const price = bars[bars.length - 1].close
    const r = computeEntrySignals({
      ticker: 'A',
      currentPrice: price,
      technical: { bars },
      fundamental: {
        piotroskiScore: 9,
        altmanZ: 5,
        earningsHistory: [{ quarter: 'Q1', surprisePercent: 0.1 }],
        targetMean: price * 1.3,
        recommendationMean: 1.5,
        insiderSignal: 'bullish',
        insiderScore: 70,
        pegRatio: 0.7,
        revenueGrowth: 0.25,
        operatingMargins: 0.3,
        debtToEquity: 20
      }
    })
    expect(r.action).toBe('buy')
    expect(r.score).toBeGreaterThanOrEqual(60)
  })
  it('flags analyst upside > 15%', () => {
    const bars = risingBars(100, 100, 0.1)
    const r = computeEntrySignals({
      ticker: 'A',
      currentPrice: 100,
      technical: { bars },
      fundamental: { targetMean: 130 }
    })
    expect(r.signals.some((s) => s.id === 'analyst_upside')).toBe(true)
  })
  it('flags piotroski 8+', () => {
    const bars = risingBars(100, 100, 0.1)
    const r = computeEntrySignals({
      ticker: 'A',
      currentPrice: 100,
      technical: { bars },
      fundamental: { piotroskiScore: 8 }
    })
    expect(r.signals.some((s) => s.id === 'piotroski_strong')).toBe(true)
  })
  it('flags earnings beat', () => {
    const bars = risingBars(100, 100, 0.1)
    const r = computeEntrySignals({
      ticker: 'A',
      currentPrice: 100,
      technical: { bars },
      fundamental: {
        earningsHistory: [{ quarter: 'Q1 2024', surprisePercent: 0.12 }]
      }
    })
    expect(r.signals.some((s) => s.id === 'earnings_beat')).toBe(true)
  })
  it('flags insider bullish', () => {
    const bars = risingBars(100, 100, 0.1)
    const r = computeEntrySignals({
      ticker: 'A',
      currentPrice: 100,
      technical: { bars },
      fundamental: { insiderSignal: 'bullish', insiderScore: 60 }
    })
    expect(r.signals.some((s) => s.id === 'insider_bullish')).toBe(true)
  })
  it('flags PEG < 1', () => {
    const bars = risingBars(100, 100, 0.1)
    const r = computeEntrySignals({
      ticker: 'A',
      currentPrice: 100,
      technical: { bars },
      fundamental: { pegRatio: 0.8 }
    })
    expect(r.signals.some((s) => s.id === 'peg_under_one')).toBe(true)
  })
  it('flags revenue acceleration >15%', () => {
    const bars = risingBars(100, 100, 0.1)
    const r = computeEntrySignals({
      ticker: 'A',
      currentPrice: 100,
      technical: { bars },
      fundamental: { revenueGrowth: 0.2 }
    })
    expect(r.signals.some((s) => s.id === 'revenue_acceleration')).toBe(true)
  })
  it('flags accumulation day on heavy-vol up bar', () => {
    const bars = risingBars(40, 100, 0.3)
    const lastIdx = bars.length - 1
    bars[lastIdx] = {
      ...bars[lastIdx],
      close: bars[lastIdx - 1].close + 5,
      open: bars[lastIdx - 1].close,
      volume: 10_000_000
    }
    const r = computeEntrySignals({
      ticker: 'A',
      currentPrice: bars[lastIdx].close,
      technical: { bars }
    })
    expect(r.signals.some((s) => s.id === 'accumulation_day')).toBe(true)
  })
  it('produces technical signals on a healthy uptrend', () => {
    const bars = risingBars(260, 100, 0.5)
    const r = computeEntrySignals({
      ticker: 'A',
      currentPrice: bars[bars.length - 1].close,
      technical: { bars }
    })
    expect(r.signals.length).toBeGreaterThan(0)
  })
  it('signals sorted by points desc', () => {
    const bars = risingBars(260, 100, 0.5)
    const price = bars[bars.length - 1].close
    const r = computeEntrySignals({
      ticker: 'A',
      currentPrice: price,
      technical: { bars },
      fundamental: {
        piotroskiScore: 9,
        insiderSignal: 'bullish',
        pegRatio: 0.6
      }
    })
    for (let i = 1; i < r.signals.length; i++) {
      expect(r.signals[i - 1].points).toBeGreaterThanOrEqual(r.signals[i].points)
    }
  })
  it('score bounded 0..100', () => {
    const bars = risingBars(260, 100, 0.5)
    const price = bars[bars.length - 1].close
    const r = computeEntrySignals({
      ticker: 'A',
      currentPrice: price,
      technical: { bars },
      fundamental: {
        piotroskiScore: 9,
        altmanZ: 5,
        earningsHistory: [{ quarter: 'Q1', surprisePercent: 0.2 }],
        targetMean: price * 2,
        recommendationMean: 1,
        insiderSignal: 'bullish',
        pegRatio: 0.5,
        revenueGrowth: 0.5,
        operatingMargins: 0.4,
        debtToEquity: 10
      }
    })
    expect(r.score).toBeGreaterThanOrEqual(0)
    expect(r.score).toBeLessThanOrEqual(100)
  })
  it('every signal has non-empty rationale', () => {
    const bars = risingBars(260, 100, 0.5)
    const price = bars[bars.length - 1].close
    const r = computeEntrySignals({
      ticker: 'A',
      currentPrice: price,
      technical: { bars },
      fundamental: {
        piotroskiScore: 9,
        earningsHistory: [{ quarter: 'Q1', surprisePercent: 0.1 }]
      }
    })
    for (const s of r.signals) {
      expect(s.rationale.length).toBeGreaterThan(10)
      expect(s.title.length).toBeGreaterThan(5)
    }
  })
})
