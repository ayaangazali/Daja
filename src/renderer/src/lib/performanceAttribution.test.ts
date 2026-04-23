import { describe, expect, it } from 'vitest'
import { attributePerformance, type PerfPosition } from './performanceAttribution'

const positions: PerfPosition[] = [
  {
    ticker: 'AAPL',
    shares: 100,
    avgCost: 150,
    currentPrice: 180,
    sector: 'Technology'
  },
  {
    ticker: 'MSFT',
    shares: 50,
    avgCost: 300,
    currentPrice: 350,
    sector: 'Technology'
  },
  { ticker: 'JPM', shares: 30, avgCost: 150, currentPrice: 140, sector: 'Financial Services' }
]

describe('attributePerformance', () => {
  it('computes total P&L correctly', () => {
    const r = attributePerformance(positions, 10)
    const expectedPnl = (180 - 150) * 100 + (350 - 300) * 50 + (140 - 150) * 30
    expect(r.totalPnl).toBe(expectedPnl)
  })
  it('weights sum to 100 (within rounding)', () => {
    const r = attributePerformance(positions, 10)
    const sumWeights = r.positions.reduce((s, p) => s + p.weightBegin, 0)
    expect(sumWeights).toBeCloseTo(100, 2)
  })
  it('contributions sum to total return', () => {
    const r = attributePerformance(positions, 10)
    const sumContrib = r.positions.reduce((s, p) => s + p.contribution, 0)
    expect(sumContrib).toBeCloseTo(r.totalReturnPct, 2)
  })
  it('identifies best and worst', () => {
    const r = attributePerformance(positions, 10)
    expect(r.worst?.ticker).toBe('JPM') // only loser
    expect(['AAPL', 'MSFT']).toContain(r.best?.ticker)
  })
  it('sectors aggregate correctly', () => {
    const r = attributePerformance(positions, 10)
    const tech = r.sectors.find((s) => s.sector === 'Technology')
    const fin = r.sectors.find((s) => s.sector === 'Financial Services')
    expect(tech).toBeDefined()
    expect(fin).toBeDefined()
    expect(tech!.weight + fin!.weight).toBeCloseTo(100, 2)
  })
  it('alpha = total - benchmark', () => {
    const r = attributePerformance(positions, 10)
    expect(r.alpha).toBeCloseTo(r.totalReturnPct - 10, 5)
  })
  it('empty portfolio returns zeros', () => {
    const r = attributePerformance([], 5)
    expect(r.totalBegin).toBe(0)
    expect(r.totalReturnPct).toBe(0)
    expect(r.positions).toEqual([])
  })
})
