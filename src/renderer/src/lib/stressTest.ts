/**
 * Portfolio stress-test engine. Scales each position by historical/factor
 * shocks to estimate mark-to-market drawdown under named crises or
 * user-defined scenarios.
 */

export interface Position {
  ticker: string
  shares: number
  currentPrice: number
  beta: number | null // SPY beta, optional
  sector: string | null
}

export interface Scenario {
  id: string
  name: string
  description: string
  spyShock: number // % change in SPY (e.g. -37 for 2008 crisis)
  sectorShocks?: Partial<Record<string, number>>
  rateShockBp?: number // change in 10Y yield, basis points (for duration proxy)
}

export const HISTORICAL_SCENARIOS: Scenario[] = [
  {
    id: 'gfc_2008',
    name: '2008 GFC (peak→trough)',
    description: 'Global Financial Crisis: Oct 2007 high to Mar 2009 low (SPY -56%)',
    spyShock: -56,
    sectorShocks: {
      'Financial Services': -78,
      'Real Estate': -66,
      Technology: -43,
      'Consumer Defensive': -29,
      Utilities: -32
    }
  },
  {
    id: 'covid_2020',
    name: 'COVID crash (Feb–Mar 2020)',
    description: '5-week selloff: SPY -34%, energy -53%, travel -60%',
    spyShock: -34,
    sectorShocks: {
      Energy: -53,
      Industrials: -38,
      'Consumer Cyclical': -40,
      'Financial Services': -37,
      Technology: -23,
      Healthcare: -20,
      'Consumer Defensive': -13
    }
  },
  {
    id: 'bear_2022',
    name: '2022 inflation bear',
    description: 'Full-year 2022: SPY -19%, Nasdaq -33%, 10Y from 1.5% to 4.3%',
    spyShock: -19,
    sectorShocks: {
      Technology: -33,
      'Communication Services': -38,
      'Consumer Cyclical': -37,
      Energy: 59,
      Utilities: -3,
      'Consumer Defensive': -4
    },
    rateShockBp: 280
  },
  {
    id: 'dotcom_2000',
    name: 'Dotcom bust (2000–2002)',
    description: 'Mar 2000 peak to Oct 2002: SPY -49%, Nasdaq -78%',
    spyShock: -49,
    sectorShocks: {
      Technology: -78,
      'Communication Services': -70,
      'Consumer Cyclical': -45,
      Utilities: -30,
      'Consumer Defensive': -3
    }
  },
  {
    id: 'flash_crash',
    name: 'Flash crash (-10% SPY)',
    description: 'Sudden single-day 10% index drop scenario',
    spyShock: -10
  },
  {
    id: 'mild_correction',
    name: 'Mild correction (-10%)',
    description: 'Typical 10% SPY pullback',
    spyShock: -10
  },
  {
    id: 'bull_rally',
    name: 'Bull rally (+20%)',
    description: 'Strong upside scenario — SPY +20%',
    spyShock: 20
  }
]

export interface PositionImpact {
  ticker: string
  sector: string | null
  shares: number
  currentValue: number
  shockPct: number
  newValue: number
  pnl: number
}

export interface StressResult {
  scenario: Scenario
  positions: PositionImpact[]
  portfolioBefore: number
  portfolioAfter: number
  portfolioDelta: number
  portfolioDeltaPct: number
  worstPosition: PositionImpact | null
  bestPosition: PositionImpact | null
}

/**
 * Apply scenario to a list of positions.
 * - If sector-specific shock defined, use it.
 * - Else scale by beta × spyShock (defaults beta = 1).
 */
export function runStressTest(positions: Position[], scenario: Scenario): StressResult {
  const impacts: PositionImpact[] = positions.map((p) => {
    const currentValue = p.shares * p.currentPrice
    const sectorShock = p.sector ? scenario.sectorShocks?.[p.sector] : undefined
    const beta = p.beta ?? 1
    const shockPct = sectorShock != null ? sectorShock : beta * scenario.spyShock
    const newValue = currentValue * (1 + shockPct / 100)
    const pnl = newValue - currentValue
    return {
      ticker: p.ticker,
      sector: p.sector,
      shares: p.shares,
      currentValue,
      shockPct,
      newValue,
      pnl
    }
  })

  const portfolioBefore = impacts.reduce((s, p) => s + p.currentValue, 0)
  const portfolioAfter = impacts.reduce((s, p) => s + p.newValue, 0)
  const portfolioDelta = portfolioAfter - portfolioBefore
  const portfolioDeltaPct = portfolioBefore > 0 ? (portfolioDelta / portfolioBefore) * 100 : 0

  const sorted = [...impacts].sort((a, b) => a.pnl - b.pnl)
  const worstPosition = sorted[0] ?? null
  const bestPosition = sorted[sorted.length - 1] ?? null

  return {
    scenario,
    positions: impacts,
    portfolioBefore,
    portfolioAfter,
    portfolioDelta,
    portfolioDeltaPct,
    worstPosition,
    bestPosition
  }
}

/** Apply a user-defined custom scenario (same interface as named). */
export function runCustomScenario(
  positions: Position[],
  spyShock: number,
  sectorShocks?: Partial<Record<string, number>>,
  rateShockBp?: number
): StressResult {
  return runStressTest(positions, {
    id: 'custom',
    name: 'Custom scenario',
    description: 'User-defined macro shock',
    spyShock,
    sectorShocks,
    rateShockBp
  })
}
