import { describe, expect, it } from 'vitest'
import { computeTaxLotPositions, type TaxLotTrade } from './positionsFifo'

function t(p: Partial<TaxLotTrade>): TaxLotTrade {
  return {
    date: '2025-01-01',
    ticker: 'AAPL',
    side: 'buy',
    quantity: 10,
    price: 100,
    fees: 0,
    ...p
  }
}

describe('computeTaxLotPositions FIFO', () => {
  it('empty trades → empty result', () => {
    expect(computeTaxLotPositions([])).toEqual([])
  })
  it('single buy creates one open lot', () => {
    const r = computeTaxLotPositions([t({ side: 'buy', quantity: 10, price: 100 })])
    expect(r).toHaveLength(1)
    expect(r[0].openLots).toHaveLength(1)
    expect(r[0].qty).toBe(10)
    expect(r[0].avgCost).toBe(100)
  })
  it('FIFO sell consumes oldest lot first', () => {
    const r = computeTaxLotPositions([
      t({ date: '2025-01-01', side: 'buy', quantity: 10, price: 100 }),
      t({ date: '2025-02-01', side: 'buy', quantity: 10, price: 200 }),
      t({ date: '2025-03-01', side: 'sell', quantity: 10, price: 250 })
    ])
    expect(r[0].closedLots).toHaveLength(1)
    expect(r[0].closedLots[0].price).toBe(100) // FIFO: oldest basis
    expect(r[0].closedLots[0].realized).toBe(1500) // (250 - 100) * 10
    expect(r[0].qty).toBe(10)
    expect(r[0].openLots[0].price).toBe(200) // newer lot remains
  })
  it('LIFO sell consumes newest lot first', () => {
    const r = computeTaxLotPositions(
      [
        t({ date: '2025-01-01', side: 'buy', quantity: 10, price: 100 }),
        t({ date: '2025-02-01', side: 'buy', quantity: 10, price: 200 }),
        t({ date: '2025-03-01', side: 'sell', quantity: 10, price: 250 })
      ],
      'lifo'
    )
    expect(r[0].closedLots[0].price).toBe(200)
    expect(r[0].closedLots[0].realized).toBe(500) // (250 - 200) * 10
    expect(r[0].openLots[0].price).toBe(100) // oldest remains
  })
  it('HIFO sell consumes highest-basis lot first (min gain)', () => {
    const r = computeTaxLotPositions(
      [
        t({ date: '2025-01-01', side: 'buy', quantity: 10, price: 100 }),
        t({ date: '2025-02-01', side: 'buy', quantity: 10, price: 200 }),
        t({ date: '2025-03-01', side: 'sell', quantity: 10, price: 250 })
      ],
      'hifo'
    )
    expect(r[0].closedLots[0].price).toBe(200)
    expect(r[0].closedLots[0].realized).toBe(500)
  })
  it('sell across multiple lots', () => {
    const r = computeTaxLotPositions([
      t({ date: '2025-01-01', side: 'buy', quantity: 5, price: 100 }),
      t({ date: '2025-02-01', side: 'buy', quantity: 5, price: 200 }),
      t({ date: '2025-03-01', side: 'sell', quantity: 8, price: 300 })
    ])
    expect(r[0].closedLots).toHaveLength(2)
    // FIFO: consume all 5 at 100 first, then 3 at 200
    expect(r[0].closedLots[0].qty).toBe(5)
    expect(r[0].closedLots[0].price).toBe(100)
    expect(r[0].closedLots[1].qty).toBe(3)
    expect(r[0].closedLots[1].price).toBe(200)
    expect(r[0].realized).toBe(1000 + 300) // (300-100)*5 + (300-200)*3
    expect(r[0].qty).toBe(2) // 2 remain at 200
  })
  it('long-term vs short-term gain classification', () => {
    const r = computeTaxLotPositions([
      t({ date: '2023-01-01', side: 'buy', quantity: 10, price: 100 }),
      t({ date: '2024-06-01', side: 'sell', quantity: 5, price: 150 }), // >365d → LT
      t({ date: '2023-03-01', side: 'buy', quantity: 5, price: 120 }),
      t({ date: '2023-06-01', side: 'sell', quantity: 5, price: 140 }) // <365d → ST
    ])
    expect(r[0].realizedLongTerm).toBe(250) // (150-100)*5
    // ST: first buy had 10 qty @100, at 2023-06-01 only 5 remaining (no sell yet of original 10); consume 5 @100
    // (140 - 100) * 5 = 200
    expect(r[0].realizedShortTerm).toBe(200)
  })
  it('fees included in per-share basis', () => {
    const r = computeTaxLotPositions([t({ side: 'buy', quantity: 10, price: 100, fees: 10 })])
    expect(r[0].openLots[0].price).toBeCloseTo(101, 5) // (1000 + 10) / 10
  })
  it('fees reduce per-share sell proceeds', () => {
    const r = computeTaxLotPositions([
      t({ date: '2025-01-01', side: 'buy', quantity: 10, price: 100, fees: 0 }),
      t({ date: '2025-02-01', side: 'sell', quantity: 10, price: 150, fees: 10 })
    ])
    expect(r[0].closedLots[0].exitPrice).toBeCloseTo(149, 5) // (1500 - 10) / 10
    expect(r[0].realized).toBeCloseTo(490, 5) // (149 - 100) * 10
  })
  it('multiple tickers isolated', () => {
    const r = computeTaxLotPositions([
      t({ ticker: 'AAPL', side: 'buy', quantity: 10, price: 100 }),
      t({ ticker: 'MSFT', side: 'buy', quantity: 5, price: 300 })
    ])
    expect(r).toHaveLength(2)
    expect(r.map((p) => p.ticker).sort()).toEqual(['AAPL', 'MSFT'])
  })
  it('chronological ordering even if trades out-of-order', () => {
    const r = computeTaxLotPositions([
      t({ date: '2025-03-01', side: 'sell', quantity: 5, price: 250 }),
      t({ date: '2025-01-01', side: 'buy', quantity: 10, price: 100 })
    ])
    expect(r[0].closedLots).toHaveLength(1)
    expect(r[0].closedLots[0].realized).toBe(750)
  })
  it('sorts positions by costBasis descending', () => {
    const r = computeTaxLotPositions([
      t({ ticker: 'SMALL', side: 'buy', quantity: 1, price: 10 }),
      t({ ticker: 'BIG', side: 'buy', quantity: 100, price: 500 })
    ])
    expect(r[0].ticker).toBe('BIG')
  })
  it('oversell does not throw', () => {
    const r = computeTaxLotPositions([
      t({ date: '2025-01-01', side: 'buy', quantity: 5, price: 100 }),
      t({ date: '2025-02-01', side: 'sell', quantity: 10, price: 200 })
    ])
    expect(r[0].qty).toBe(0)
    expect(r[0].realized).toBe(500) // only 5 shares could be sold
  })
})
