import { describe, expect, it } from 'vitest'
import { assessShortSqueeze } from './shortSqueeze'

describe('assessShortSqueeze', () => {
  it('returns low tier when all inputs null', () => {
    const r = assessShortSqueeze({
      shortPercent: null,
      sharesShort: null,
      sharesShortPriorMonth: null,
      shortRatio: null,
      priceChange1m: null
    })
    expect(r.tier).toBe('low')
    expect(r.score).toBe(0)
  })

  it('flags extreme squeeze on heavy short + high DTC + rallying price', () => {
    const r = assessShortSqueeze({
      shortPercent: 0.35,
      sharesShort: 12_000_000,
      sharesShortPriorMonth: 10_000_000,
      shortRatio: 12,
      priceChange1m: 0.15
    })
    expect(['high', 'extreme']).toContain(r.tier)
    expect(r.score).toBeGreaterThanOrEqual(60)
  })

  it('reduces score if shorts covering already', () => {
    const base = assessShortSqueeze({
      shortPercent: 0.25,
      sharesShort: 10_000_000,
      sharesShortPriorMonth: 10_000_000,
      shortRatio: 6,
      priceChange1m: null
    })
    const covering = assessShortSqueeze({
      shortPercent: 0.25,
      sharesShort: 8_000_000,
      sharesShortPriorMonth: 10_000_000,
      shortRatio: 6,
      priceChange1m: null
    })
    expect(covering.score).toBeLessThan(base.score)
  })

  it('ignores price move when short interest low', () => {
    const r = assessShortSqueeze({
      shortPercent: 0.02,
      sharesShort: 1_000_000,
      sharesShortPriorMonth: 1_000_000,
      shortRatio: 1,
      priceChange1m: 0.3
    })
    expect(r.tier).toBe('low')
  })

  it('rationale includes bucket labels', () => {
    const r = assessShortSqueeze({
      shortPercent: 0.22,
      sharesShort: 5_000_000,
      sharesShortPriorMonth: 4_000_000,
      shortRatio: 7,
      priceChange1m: 0.08
    })
    expect(r.rationale.some((s) => s.toLowerCase().includes('short interest'))).toBe(true)
    expect(r.rationale.some((s) => s.toLowerCase().includes('days-to-cover'))).toBe(true)
  })
})
