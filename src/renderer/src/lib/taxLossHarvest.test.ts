import { describe, expect, it } from 'vitest'
import { findHarvestCandidates } from './taxLossHarvest'
import { computeTaxLotPositions, type TaxLotTrade } from './positionsFifo'

const TODAY = new Date('2026-04-21')

function daysAgoISO(days: number): string {
  const d = new Date(TODAY)
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

describe('findHarvestCandidates', () => {
  it('flags underwater short-term lot', () => {
    const trades: TaxLotTrade[] = [
      { date: daysAgoISO(60), ticker: 'XYZ', side: 'buy', quantity: 100, price: 50, fees: 0 }
    ]
    const pos = computeTaxLotPositions(trades)
    const r = findHarvestCandidates(pos, { XYZ: 40 }, trades, { today: TODAY })
    expect(r.candidates).toHaveLength(1)
    expect(r.candidates[0].term).toBe('short')
    expect(r.candidates[0].unrealizedLoss).toBeCloseTo(-1000, 0)
    expect(r.candidates[0].estimatedTaxSaving).toBeCloseTo(1000 * 0.32, 0)
  })
  it('identifies long-term when holding > 365 days', () => {
    const trades: TaxLotTrade[] = [
      { date: daysAgoISO(400), ticker: 'XYZ', side: 'buy', quantity: 100, price: 50, fees: 0 }
    ]
    const pos = computeTaxLotPositions(trades)
    const r = findHarvestCandidates(pos, { XYZ: 40 }, trades, { today: TODAY })
    expect(r.candidates[0].term).toBe('long')
    expect(r.candidates[0].estimatedTaxSaving).toBeCloseTo(1000 * 0.15, 0)
  })
  it('skips profitable lots', () => {
    const trades: TaxLotTrade[] = [
      { date: daysAgoISO(60), ticker: 'XYZ', side: 'buy', quantity: 100, price: 50, fees: 0 }
    ]
    const pos = computeTaxLotPositions(trades)
    const r = findHarvestCandidates(pos, { XYZ: 60 }, trades, { today: TODAY })
    expect(r.candidates).toHaveLength(0)
  })
  it('skips tiny losses below minLossPct', () => {
    const trades: TaxLotTrade[] = [
      { date: daysAgoISO(60), ticker: 'XYZ', side: 'buy', quantity: 100, price: 50, fees: 0 }
    ]
    const pos = computeTaxLotPositions(trades)
    const r = findHarvestCandidates(pos, { XYZ: 49.5 }, trades, {
      today: TODAY,
      minLossPct: 2
    })
    expect(r.candidates).toHaveLength(0)
  })
  it('flags wash sale risk if buy within 30d', () => {
    const trades: TaxLotTrade[] = [
      { date: daysAgoISO(60), ticker: 'XYZ', side: 'buy', quantity: 100, price: 50, fees: 0 },
      { date: daysAgoISO(10), ticker: 'XYZ', side: 'buy', quantity: 10, price: 42, fees: 0 }
    ]
    const pos = computeTaxLotPositions(trades)
    const r = findHarvestCandidates(pos, { XYZ: 40 }, trades, { today: TODAY })
    expect(r.candidates.every((c) => c.washSaleRisk === true)).toBe(true)
  })
  it('does NOT flag wash sale when buy is > 30d ago', () => {
    const trades: TaxLotTrade[] = [
      { date: daysAgoISO(60), ticker: 'XYZ', side: 'buy', quantity: 100, price: 50, fees: 0 }
    ]
    const pos = computeTaxLotPositions(trades)
    const r = findHarvestCandidates(pos, { XYZ: 40 }, trades, { today: TODAY })
    expect(r.candidates[0].washSaleRisk).toBe(false)
  })
  it('skips tickers with missing price', () => {
    const trades: TaxLotTrade[] = [
      { date: daysAgoISO(60), ticker: 'XYZ', side: 'buy', quantity: 100, price: 50, fees: 0 }
    ]
    const pos = computeTaxLotPositions(trades)
    const r = findHarvestCandidates(pos, { XYZ: null }, trades, { today: TODAY })
    expect(r.candidates).toHaveLength(0)
  })
  it('aggregates totals across ST + LT', () => {
    const trades: TaxLotTrade[] = [
      { date: daysAgoISO(60), ticker: 'A', side: 'buy', quantity: 10, price: 100, fees: 0 },
      { date: daysAgoISO(400), ticker: 'B', side: 'buy', quantity: 10, price: 100, fees: 0 }
    ]
    const pos = computeTaxLotPositions(trades)
    const r = findHarvestCandidates(pos, { A: 80, B: 60 }, trades, { today: TODAY })
    expect(r.shortTermLoss).toBeCloseTo(-200, 0)
    expect(r.longTermLoss).toBeCloseTo(-400, 0)
    expect(r.totalLoss).toBeCloseTo(-600, 0)
    expect(r.totalTaxSaving).toBeCloseTo(200 * 0.32 + 400 * 0.15, 0)
  })
  it('sorts candidates by deepest loss first', () => {
    const trades: TaxLotTrade[] = [
      { date: daysAgoISO(60), ticker: 'A', side: 'buy', quantity: 10, price: 100, fees: 0 },
      { date: daysAgoISO(60), ticker: 'B', side: 'buy', quantity: 10, price: 100, fees: 0 }
    ]
    const pos = computeTaxLotPositions(trades)
    const r = findHarvestCandidates(pos, { A: 95, B: 50 }, trades, { today: TODAY })
    expect(r.candidates[0].ticker).toBe('B') // bigger loss first
  })
})
