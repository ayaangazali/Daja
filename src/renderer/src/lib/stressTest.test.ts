import { describe, expect, it } from 'vitest'
import { HISTORICAL_SCENARIOS, runCustomScenario, runStressTest, type Position } from './stressTest'

const samplePositions: Position[] = [
  { ticker: 'AAPL', shares: 100, currentPrice: 200, beta: 1.2, sector: 'Technology' },
  { ticker: 'JPM', shares: 50, currentPrice: 180, beta: 1.1, sector: 'Financial Services' },
  { ticker: 'XLE', shares: 200, currentPrice: 90, beta: 0.9, sector: 'Energy' },
  { ticker: 'KO', shares: 300, currentPrice: 60, beta: 0.6, sector: 'Consumer Defensive' }
]

describe('runStressTest', () => {
  it('applies sector-specific shock when available', () => {
    const gfc = HISTORICAL_SCENARIOS.find((s) => s.id === 'gfc_2008')!
    const r = runStressTest(samplePositions, gfc)
    const jpm = r.positions.find((p) => p.ticker === 'JPM')!
    // GFC scenario specifies Financial Services -78%, so JPM should be -78%
    expect(jpm.shockPct).toBe(-78)
  })
  it('falls back to beta × spyShock when sector not specified', () => {
    // Create custom scenario with no sector overrides
    const r = runCustomScenario(
      [{ ticker: 'X', shares: 1, currentPrice: 100, beta: 1.5, sector: null }],
      -10
    )
    // beta 1.5 × -10% = -15%
    expect(r.positions[0].shockPct).toBeCloseTo(-15, 5)
  })
  it('portfolio delta sums position pnls', () => {
    const covid = HISTORICAL_SCENARIOS.find((s) => s.id === 'covid_2020')!
    const r = runStressTest(samplePositions, covid)
    const sumPnl = r.positions.reduce((s, p) => s + p.pnl, 0)
    expect(r.portfolioDelta).toBeCloseTo(sumPnl, 2)
  })
  it('GFC scenario produces massive loss', () => {
    const gfc = HISTORICAL_SCENARIOS.find((s) => s.id === 'gfc_2008')!
    const r = runStressTest(samplePositions, gfc)
    expect(r.portfolioDeltaPct).toBeLessThan(-30)
  })
  it('bull rally produces gain', () => {
    const bull = HISTORICAL_SCENARIOS.find((s) => s.id === 'bull_rally')!
    const r = runStressTest(samplePositions, bull)
    expect(r.portfolioDeltaPct).toBeGreaterThan(0)
  })
  it('identifies worst + best positions', () => {
    const covid = HISTORICAL_SCENARIOS.find((s) => s.id === 'covid_2020')!
    const r = runStressTest(samplePositions, covid)
    expect(r.worstPosition).not.toBeNull()
    expect(r.bestPosition).not.toBeNull()
    expect(r.worstPosition!.pnl).toBeLessThanOrEqual(r.bestPosition!.pnl)
  })
  it('empty positions yields zero portfolio', () => {
    const r = runStressTest([], HISTORICAL_SCENARIOS[0])
    expect(r.portfolioBefore).toBe(0)
    expect(r.portfolioAfter).toBe(0)
    expect(r.portfolioDelta).toBe(0)
  })
})

describe('HISTORICAL_SCENARIOS', () => {
  it('all scenarios have required fields', () => {
    for (const s of HISTORICAL_SCENARIOS) {
      expect(s.id.length).toBeGreaterThan(0)
      expect(s.name.length).toBeGreaterThan(0)
      expect(typeof s.spyShock).toBe('number')
    }
  })
  it('contains the classic crises', () => {
    const ids = HISTORICAL_SCENARIOS.map((s) => s.id)
    expect(ids).toContain('gfc_2008')
    expect(ids).toContain('covid_2020')
    expect(ids).toContain('bear_2022')
  })
})
