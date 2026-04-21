import type { Trade } from '../../../hooks/useTrades'

export interface Position {
  ticker: string
  qty: number
  avgCost: number
  costBasis: number
  realizedPnL: number
}

export function computePositions(trades: Trade[]): Position[] {
  const grouped = new Map<string, Trade[]>()
  for (const t of trades) {
    if (!grouped.has(t.ticker)) grouped.set(t.ticker, [])
    grouped.get(t.ticker)!.push(t)
  }
  const positions: Position[] = []
  for (const [ticker, list] of grouped) {
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date))
    let qty = 0
    let costBasis = 0
    let realized = 0
    for (const t of sorted) {
      if (t.side === 'buy') {
        costBasis += t.quantity * t.price + t.fees
        qty += t.quantity
      } else if (t.side === 'sell') {
        if (qty > 0) {
          const avg = costBasis / qty
          const sellQty = Math.min(t.quantity, qty)
          realized += (t.price - avg) * sellQty - t.fees
          costBasis -= avg * sellQty
          qty -= sellQty
        }
      }
    }
    positions.push({
      ticker,
      qty,
      avgCost: qty > 0 ? costBasis / qty : 0,
      costBasis,
      realizedPnL: realized
    })
  }
  return positions
    .filter((p) => p.qty > 0 || p.realizedPnL !== 0)
    .sort((a, b) => b.costBasis - a.costBasis)
}
