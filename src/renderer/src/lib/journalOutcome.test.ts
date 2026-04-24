import { describe, expect, it } from 'vitest'
import { outcomeForEntry, type JournalLike } from './journalOutcome'
import type { HistoricalBar } from '../hooks/useFinance'

function mkBars(prices: number[], startDate = '2026-01-01'): HistoricalBar[] {
  const startMs = Date.parse(startDate)
  return prices.map((p, i) => ({
    time: (startMs + i * 86400_000) / 1000,
    open: p,
    high: p * 1.02,
    low: p * 0.98,
    close: p,
    volume: 1_000_000
  }))
}

function mkEntry(overrides: Partial<JournalLike> = {}): JournalLike {
  return {
    id: 1,
    ticker: 'AAPL',
    entry_type: 'entry',
    thesis: null,
    target_price: null,
    stop_loss: null,
    conviction: 7,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides
  }
}

describe('outcomeForEntry', () => {
  it('pending when no bars at or after creation', () => {
    const bars = mkBars([100, 101, 102], '2025-12-01') // all before entry
    const r = outcomeForEntry(mkEntry({ created_at: '2026-01-01T00:00:00Z' }), bars)
    expect(r.verdict).toBe('pending')
  })

  it('detects target hit within window', () => {
    const bars = mkBars([100, 105, 110, 115, 120]) // high of each = price * 1.02
    const r = outcomeForEntry(mkEntry({ target_price: 112 }), bars, { evalDays: 10 })
    expect(r.targetHit).toBe(true)
    expect(r.verdict).toBe('win')
  })

  it('detects stop-loss hit within window', () => {
    const bars = mkBars([100, 95, 90, 85]) // low = price * 0.98
    const r = outcomeForEntry(mkEntry({ stop_loss: 88 }), bars, { evalDays: 10 })
    expect(r.stopHit).toBe(true)
    expect(r.verdict).toBe('loss')
  })

  it('classifies win by 5%+ return when full window elapsed', () => {
    const bars = mkBars([100, 102, 104, 106, 108, 110, 112])
    const r = outcomeForEntry(mkEntry(), bars, {
      evalDays: 5,
      today: new Date(Date.parse('2026-02-01'))
    })
    expect(r.verdict).toBe('win')
    expect(r.returnPct).toBeGreaterThan(5)
  })

  it('pending when inside eval window and neither target nor stop hit', () => {
    const bars = mkBars([100, 101, 102])
    const r = outcomeForEntry(mkEntry({ target_price: 200, stop_loss: 50 }), bars, {
      evalDays: 30,
      today: new Date(Date.parse('2026-01-05'))
    })
    expect(r.verdict).toBe('pending')
    expect(r.targetHit).toBe(false)
    expect(r.stopHit).toBe(false)
  })

  it('returns n/a when start bar close missing', () => {
    const bars = mkBars([100, 101])
    bars[0].close = null
    const r = outcomeForEntry(mkEntry(), bars)
    expect(r.verdict).toBe('n/a')
  })
})
