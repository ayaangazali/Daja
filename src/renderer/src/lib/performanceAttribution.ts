/**
 * Portfolio performance attribution — decomposes total portfolio P&L
 * into contribution by position, sector, and factor (market-beta).
 *
 * Inputs: list of positions (ticker, qty, avg cost, current price, sector,
 * beta) and a benchmark return (SPY).
 */

export interface PerfPosition {
  ticker: string
  shares: number
  avgCost: number
  currentPrice: number
  sector: string | null
  beta?: number | null
}

export interface PositionAttribution {
  ticker: string
  sector: string | null
  beginValue: number
  endValue: number
  pnl: number
  pnlPct: number // position return %
  weightBegin: number // % of portfolio at cost
  contribution: number // % contribution to total return
}

export interface SectorAttribution {
  sector: string
  weight: number
  return: number
  contribution: number
}

export interface PerformanceResult {
  positions: PositionAttribution[]
  sectors: SectorAttribution[]
  totalBegin: number
  totalEnd: number
  totalPnl: number
  totalReturnPct: number
  benchmarkReturnPct: number
  alpha: number // total return - benchmark
  best: PositionAttribution | null
  worst: PositionAttribution | null
}

export function attributePerformance(
  positions: PerfPosition[],
  benchmarkReturnPct: number
): PerformanceResult {
  const totalBegin = positions.reduce((s, p) => s + p.shares * p.avgCost, 0)
  const totalEnd = positions.reduce((s, p) => s + p.shares * p.currentPrice, 0)
  const totalPnl = totalEnd - totalBegin
  const totalReturnPct = totalBegin > 0 ? (totalPnl / totalBegin) * 100 : 0

  const attrs: PositionAttribution[] = positions.map((p) => {
    const beginValue = p.shares * p.avgCost
    const endValue = p.shares * p.currentPrice
    const pnl = endValue - beginValue
    const pnlPct = beginValue > 0 ? (pnl / beginValue) * 100 : 0
    const weightBegin = totalBegin > 0 ? (beginValue / totalBegin) * 100 : 0
    // Contribution = weight × position return (in % points of total return)
    const contribution = (weightBegin / 100) * pnlPct
    return {
      ticker: p.ticker,
      sector: p.sector,
      beginValue,
      endValue,
      pnl,
      pnlPct,
      weightBegin,
      contribution
    }
  })

  // Aggregate by sector
  const bySector = new Map<string, { begin: number; pnl: number }>()
  for (const a of attrs) {
    const key = a.sector ?? 'Unknown'
    const entry = bySector.get(key) ?? { begin: 0, pnl: 0 }
    entry.begin += a.beginValue
    entry.pnl += a.pnl
    bySector.set(key, entry)
  }
  const sectors: SectorAttribution[] = [...bySector.entries()]
    .map(([sector, v]) => {
      const weight = totalBegin > 0 ? (v.begin / totalBegin) * 100 : 0
      const ret = v.begin > 0 ? (v.pnl / v.begin) * 100 : 0
      return {
        sector,
        weight,
        return: ret,
        contribution: (weight / 100) * ret
      }
    })
    .sort((a, b) => b.contribution - a.contribution)

  const alpha = totalReturnPct - benchmarkReturnPct

  const sortedByPnl = [...attrs].sort((a, b) => a.pnl - b.pnl)
  const worst = sortedByPnl[0] ?? null
  const best = sortedByPnl[sortedByPnl.length - 1] ?? null

  return {
    positions: attrs,
    sectors,
    totalBegin,
    totalEnd,
    totalPnl,
    totalReturnPct,
    benchmarkReturnPct,
    alpha,
    best,
    worst
  }
}
