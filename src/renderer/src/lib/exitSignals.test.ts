import { describe, expect, it } from 'vitest'
import { computeExitSignals } from './exitSignals'

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

function fallingBars(n: number, start = 200, step = 0.5): ReturnType<typeof bar>[] {
  return Array.from({ length: n }, (_, i) => bar(start - i * step, i))
}

describe('computeExitSignals — base cases', () => {
  it('hold verdict on calm rising market with profit', () => {
    const bars = risingBars(300, 100, 0.3)
    const last = bars[bars.length - 1].close
    const r = computeExitSignals({
      position: { ticker: 'AAA', shares: 10, avgCost: 100, currentPrice: last },
      technical: { bars }
    })
    expect(['hold', 'trim']).toContain(r.action)
  })
  it('fires stop-loss when price below threshold', () => {
    const bars = risingBars(200, 100, 0.2)
    const r = computeExitSignals({
      position: { ticker: 'A', shares: 10, avgCost: 100, currentPrice: 88 },
      technical: { bars },
      options: { stopLossPct: 8 }
    })
    expect(r.signals.some((s) => s.id === 'stop_loss_hit')).toBe(true)
    expect(r.action).toBe('exit')
  })
  it('fires profit target when gain exceeds threshold', () => {
    const bars = risingBars(200, 100, 0.5)
    const r = computeExitSignals({
      position: { ticker: 'A', shares: 10, avgCost: 100, currentPrice: 160 },
      technical: { bars },
      options: { profitTakePct: 50 }
    })
    expect(r.signals.some((s) => s.id === 'profit_target')).toBe(true)
  })
})

describe('technical signals', () => {
  it('detects price below 200-SMA', () => {
    const prefix = risingBars(220, 100, 0.3)
    prefix[prefix.length - 1] = bar(110, 220)
    const r = computeExitSignals({
      position: { ticker: 'A', shares: 10, avgCost: 100, currentPrice: 110 },
      technical: { bars: prefix }
    })
    expect(
      r.signals.some((s) => s.id === 'below_200sma' || s.id === 'below_200sma_deep')
    ).toBe(true)
  })
  it('detects volume climax on big-volume down bar', () => {
    const bars = risingBars(40, 100, 0.3)
    const lastIdx = bars.length - 1
    bars[lastIdx] = {
      ...bars[lastIdx],
      close: bars[lastIdx - 1].close - 5,
      open: bars[lastIdx - 1].close,
      volume: 10_000_000
    }
    const r = computeExitSignals({
      position: { ticker: 'A', shares: 10, avgCost: 100, currentPrice: bars[lastIdx].close },
      technical: { bars }
    })
    expect(r.signals.some((s) => s.id === 'volume_climax_down')).toBe(true)
  })
  it('detects deep drawdown on falling series', () => {
    const bars = fallingBars(260, 200, 0.5)
    const last = bars[bars.length - 1].close
    const r = computeExitSignals({
      position: { ticker: 'A', shares: 10, avgCost: 200, currentPrice: last },
      technical: { bars }
    })
    expect(r.signals.some((s) => s.id === 'deep_drawdown')).toBe(true)
    expect(r.action).toBe('exit')
  })
})

describe('fundamental signals', () => {
  it('flags revenue contraction', () => {
    const bars = risingBars(100, 100, 0.1)
    const r = computeExitSignals({
      position: { ticker: 'A', shares: 10, avgCost: 100, currentPrice: 110 },
      technical: { bars },
      fundamental: { revenueGrowth: -0.12 }
    })
    expect(r.signals.some((s) => s.id === 'revenue_contraction')).toBe(true)
  })
  it('flags analyst target below price', () => {
    const bars = risingBars(100, 100, 0.1)
    const r = computeExitSignals({
      position: { ticker: 'A', shares: 10, avgCost: 100, currentPrice: 130 },
      technical: { bars },
      fundamental: { targetMean: 100 }
    })
    expect(r.signals.some((s) => s.id === 'target_below_price')).toBe(true)
  })
  it('flags analyst consensus hold/sell', () => {
    const bars = risingBars(100, 100, 0.1)
    const r = computeExitSignals({
      position: { ticker: 'A', shares: 10, avgCost: 100, currentPrice: 110 },
      technical: { bars },
      fundamental: { recommendationMean: 3.8 }
    })
    expect(r.signals.some((s) => s.id === 'analyst_hold_or_sell')).toBe(true)
  })
  it('flags insider bearish signal', () => {
    const bars = risingBars(100, 100, 0.1)
    const r = computeExitSignals({
      position: { ticker: 'A', shares: 10, avgCost: 100, currentPrice: 110 },
      technical: { bars },
      fundamental: { insiderSignal: 'bearish', insiderScore: -60 }
    })
    expect(r.signals.some((s) => s.id === 'insider_bearish')).toBe(true)
  })
  it('flags earnings miss', () => {
    const bars = risingBars(100, 100, 0.1)
    const r = computeExitSignals({
      position: { ticker: 'A', shares: 10, avgCost: 100, currentPrice: 110 },
      technical: { bars },
      fundamental: {
        earningsHistory: [{ quarter: 'Q1 2024', surprisePercent: -0.15 }]
      }
    })
    expect(r.signals.some((s) => s.id === 'earnings_miss')).toBe(true)
  })
  it('flags stretched valuation', () => {
    const bars = risingBars(100, 100, 0.1)
    const r = computeExitSignals({
      position: { ticker: 'A', shares: 10, avgCost: 100, currentPrice: 110 },
      technical: { bars },
      fundamental: { trailingPE: 120, pegRatio: 5 }
    })
    expect(r.signals.some((s) => s.id === 'stretched_valuation')).toBe(true)
  })
})

describe('verdict aggregation', () => {
  it('score bounded 0..100', () => {
    const bars = fallingBars(260, 200, 1)
    const r = computeExitSignals({
      position: { ticker: 'A', shares: 10, avgCost: 200, currentPrice: bars[bars.length - 1].close },
      technical: { bars },
      fundamental: {
        revenueGrowth: -0.2,
        recommendationMean: 4.5,
        insiderSignal: 'bearish',
        earningsHistory: [{ quarter: 'Q1', surprisePercent: -0.2 }],
        debtToEquity: 300
      }
    })
    expect(r.score).toBeGreaterThanOrEqual(0)
    expect(r.score).toBeLessThanOrEqual(100)
    expect(r.action).toBe('exit')
  })
  it('sorts signals by points descending', () => {
    const bars = fallingBars(260, 200, 1)
    const r = computeExitSignals({
      position: { ticker: 'A', shares: 10, avgCost: 200, currentPrice: bars[bars.length - 1].close },
      technical: { bars }
    })
    for (let i = 1; i < r.signals.length; i++) {
      expect(r.signals[i - 1].points).toBeGreaterThanOrEqual(r.signals[i].points)
    }
  })
  it('produces hold on clean inputs with no losses', () => {
    const bars = risingBars(300, 100, 0.1)
    const last = bars[bars.length - 1].close
    const r = computeExitSignals({
      position: { ticker: 'A', shares: 10, avgCost: last * 0.95, currentPrice: last },
      technical: { bars }
    })
    expect(r.action).toBe('hold')
  })
  it('includes rationale strings for every signal', () => {
    const bars = fallingBars(260, 200, 1)
    const r = computeExitSignals({
      position: { ticker: 'A', shares: 10, avgCost: 200, currentPrice: bars[bars.length - 1].close },
      technical: { bars }
    })
    for (const s of r.signals) {
      expect(s.rationale.length).toBeGreaterThan(10)
      expect(s.title.length).toBeGreaterThan(5)
    }
  })
})
