import { describe, expect, it } from 'vitest'
import { analyzeInsiderActivity, type InsiderTxn } from './insiderSignal'

const REF = new Date('2026-04-21')

function daysAgo(days: number): string {
  const d = new Date(REF)
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

function tx(partial: Partial<InsiderTxn>): InsiderTxn {
  return {
    name: 'CEO',
    transaction: 'Purchase at price 100',
    shares: 1000,
    value: 100_000,
    date: daysAgo(10),
    ...partial
  }
}

describe('analyzeInsiderActivity', () => {
  it('bullish when 3+ purchases dominate sales in 90d', () => {
    const r = analyzeInsiderActivity(
      [
        tx({ name: 'CEO' }),
        tx({ name: 'CFO', date: daysAgo(30) }),
        tx({ name: 'Director', date: daysAgo(60) }),
        tx({ name: 'VP Eng', date: daysAgo(45) })
      ],
      REF
    )
    expect(r.signal).toBe('bullish')
    expect(r.purchases90d).toBe(4)
    expect(r.sales90d).toBe(0)
    expect(r.uniqueBuyers90d).toBe(4)
  })
  it('bearish when 3+ sales dominate', () => {
    const r = analyzeInsiderActivity(
      [
        tx({ transaction: 'Sale at price 100', date: daysAgo(10) }),
        tx({ transaction: 'Sale at price 105', date: daysAgo(30), name: 'CFO' }),
        tx({ transaction: 'Sale at price 110', date: daysAgo(60), name: 'VP' }),
        tx({ transaction: 'Sale at price 115', date: daysAgo(5), name: 'Director' })
      ],
      REF
    )
    expect(r.signal).toBe('bearish')
    expect(r.sales90d).toBe(4)
    expect(r.uniqueSellers90d).toBe(4)
  })
  it('mixed when both buys and sells present, no 2x dominance', () => {
    const r = analyzeInsiderActivity(
      [
        tx({ transaction: 'Purchase', date: daysAgo(10) }),
        tx({ transaction: 'Purchase', date: daysAgo(15), name: 'CFO' }),
        tx({ transaction: 'Sale', date: daysAgo(20), name: 'VP' }),
        tx({ transaction: 'Sale', date: daysAgo(25), name: 'Director' })
      ],
      REF
    )
    expect(r.signal).toBe('mixed')
  })
  it('neutral when no activity', () => {
    const r = analyzeInsiderActivity([], REF)
    expect(r.signal).toBe('neutral')
    expect(r.score).toBe(0)
  })
  it('excludes txns older than 90 days', () => {
    const r = analyzeInsiderActivity(
      [tx({ transaction: 'Purchase', date: daysAgo(120) })],
      REF
    )
    expect(r.purchases90d).toBe(0)
    expect(r.sales90d).toBe(0)
  })
  it('lastTxnDays correctly reported', () => {
    const r = analyzeInsiderActivity(
      [tx({ transaction: 'Purchase', date: daysAgo(15) })],
      REF
    )
    expect(r.lastTxnDays).toBe(15)
  })
  it('score +100 when all value is purchases', () => {
    const r = analyzeInsiderActivity(
      [
        tx({ transaction: 'Purchase', value: 1_000_000 }),
        tx({ transaction: 'Purchase', value: 500_000, date: daysAgo(20), name: 'CFO' })
      ],
      REF
    )
    expect(r.score).toBe(100)
  })
  it('score -100 when all sales', () => {
    const r = analyzeInsiderActivity(
      [
        tx({ transaction: 'Sale', value: 2_000_000 }),
        tx({ transaction: 'Sale', value: 1_000_000, date: daysAgo(20), name: 'CFO' })
      ],
      REF
    )
    expect(r.score).toBe(-100)
  })
  it('purchase value aggregated', () => {
    const r = analyzeInsiderActivity(
      [
        tx({ transaction: 'Purchase', value: 100_000 }),
        tx({ transaction: 'Purchase', value: 50_000, date: daysAgo(20), name: 'X' })
      ],
      REF
    )
    expect(r.purchaseValue90d).toBe(150_000)
  })
  it('handles missing dates gracefully', () => {
    const r = analyzeInsiderActivity([tx({ date: '' })], REF)
    expect(r.purchases90d).toBe(0)
  })
  it('handles malformed transaction strings', () => {
    const r = analyzeInsiderActivity(
      [tx({ transaction: 'Nonsense gibberish', date: daysAgo(10) })],
      REF
    )
    expect(r.purchases90d).toBe(0)
    expect(r.sales90d).toBe(0)
  })
  it('absolute value handles negative', () => {
    const r = analyzeInsiderActivity(
      [tx({ transaction: 'Sale', value: -500_000 })],
      REF
    )
    expect(r.saleValue90d).toBe(500_000)
  })
})
