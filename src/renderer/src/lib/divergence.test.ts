import { describe, expect, it } from 'vitest'
import { detectDivergences, findSwings } from './divergence'

describe('findSwings', () => {
  it('finds local peaks and troughs', () => {
    const arr = [5, 10, 5, 8, 3, 7, 4, 9, 5]
    const { peaks, troughs } = findSwings(arr, 1)
    expect(peaks.map((p) => p.index)).toContain(1)
    expect(troughs.map((t) => t.index)).toContain(4)
  })
  it('skips nulls', () => {
    const arr = [1, null, 3, null, 2, null, 4, null]
    const { peaks } = findSwings(arr as (number | null)[], 1)
    expect(Array.isArray(peaks)).toBe(true)
  })
})

describe('detectDivergences', () => {
  it('detects bullish divergence: price lower low, osc higher low', () => {
    // price troughs at idx 3 (val 10) and idx 10 (val 5) — lower low
    // osc troughs at idx 3 (val 20) and idx 10 (val 30) — higher low
    const price = [50, 40, 30, 10, 30, 40, 50, 40, 30, 20, 5, 20, 30]
    const osc = [60, 50, 40, 20, 40, 50, 60, 50, 40, 30, 30, 40, 50]
    const hits = detectDivergences(price, osc as (number | null)[], 30, 1)
    expect(hits.some((h) => h.type === 'bullish')).toBe(true)
  })
  it('detects bearish divergence: price higher high, osc lower high', () => {
    const price = [10, 30, 50, 80, 50, 30, 10, 30, 50, 90, 50, 30]
    const osc = [10, 30, 50, 80, 50, 30, 10, 30, 50, 70, 50, 30]
    const hits = detectDivergences(price, osc as (number | null)[], 30, 1)
    expect(hits.some((h) => h.type === 'bearish')).toBe(true)
  })
  it('no divergence when price and osc move in lockstep', () => {
    const price = [10, 30, 10, 30, 10, 30]
    const osc = [10, 30, 10, 30, 10, 30]
    const hits = detectDivergences(price, osc as (number | null)[], 30, 1)
    expect(hits.filter((h) => h.type === 'bullish' || h.type === 'bearish').length).toBe(0)
  })
})
