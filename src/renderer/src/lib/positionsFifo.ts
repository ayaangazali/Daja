/**
 * FIFO-based tax-lot position accounting.
 *
 * Each buy creates a lot. Each sell consumes oldest (or newest for LIFO) lots.
 * Result: realized P&L computed against the specific lot basis, not a blended avg.
 * This is how actual brokers report capital gains to the IRS.
 */

export interface Lot {
  date: string
  qty: number
  price: number // cost per share (entry + proportional fees)
}

export interface ClosedLot extends Lot {
  exitDate: string
  exitPrice: number
  realized: number
}

export interface TaxLotTrade {
  date: string
  ticker: string
  side: 'buy' | 'sell'
  quantity: number
  price: number
  fees: number
}

export interface TaxLotPosition {
  ticker: string
  openLots: Lot[]
  closedLots: ClosedLot[]
  qty: number
  costBasis: number
  avgCost: number
  realized: number
  realizedShortTerm: number
  realizedLongTerm: number
}

export type LotMethod = 'fifo' | 'lifo' | 'hifo'

function daysBetween(a: string, b: string): number {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Compute tax-lot positions for a list of trades.
 * Trades are processed in chronological order.
 * Lots are sorted per the method when consuming on sell:
 *   - FIFO: oldest first
 *   - LIFO: newest first
 *   - HIFO: highest-basis first (minimize realized gain)
 */
export function computeTaxLotPositions(
  trades: TaxLotTrade[],
  method: LotMethod = 'fifo'
): TaxLotPosition[] {
  const byTicker = new Map<string, TaxLotTrade[]>()
  for (const t of trades) {
    const existing = byTicker.get(t.ticker)
    if (existing) existing.push(t)
    else byTicker.set(t.ticker, [t])
  }

  const out: TaxLotPosition[] = []

  for (const [ticker, list] of byTicker) {
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date))
    const openLots: Lot[] = []
    const closedLots: ClosedLot[] = []
    let realized = 0
    let realizedShortTerm = 0
    let realizedLongTerm = 0

    for (const t of sorted) {
      if (t.side === 'buy') {
        // Per-share cost includes proportional fees
        const perShareCost = t.quantity > 0 ? (t.quantity * t.price + t.fees) / t.quantity : 0
        openLots.push({ date: t.date, qty: t.quantity, price: perShareCost })
      } else {
        // Sell: consume lots per method
        let remaining = t.quantity
        const sellPrice = t.quantity > 0 ? (t.quantity * t.price - t.fees) / t.quantity : 0
        const order = sortForMethod(openLots, method)
        for (const lot of order) {
          if (remaining <= 0) break
          const consumeQty = Math.min(lot.qty, remaining)
          if (consumeQty <= 0) continue
          const gain = (sellPrice - lot.price) * consumeQty
          realized += gain
          const holdDays = daysBetween(lot.date, t.date)
          if (holdDays > 365) realizedLongTerm += gain
          else realizedShortTerm += gain
          closedLots.push({
            date: lot.date,
            qty: consumeQty,
            price: lot.price,
            exitDate: t.date,
            exitPrice: sellPrice,
            realized: gain
          })
          lot.qty -= consumeQty
          remaining -= consumeQty
        }
        // Remove fully-consumed lots
        for (let i = openLots.length - 1; i >= 0; i--) {
          if (openLots[i].qty <= 0.0000001) openLots.splice(i, 1)
        }
      }
    }

    const qty = openLots.reduce((s, l) => s + l.qty, 0)
    const costBasis = openLots.reduce((s, l) => s + l.qty * l.price, 0)
    const avgCost = qty > 0 ? costBasis / qty : 0

    if (qty > 0 || closedLots.length > 0) {
      out.push({
        ticker,
        openLots,
        closedLots,
        qty,
        costBasis,
        avgCost,
        realized,
        realizedShortTerm,
        realizedLongTerm
      })
    }
  }
  return out.sort((a, b) => b.costBasis - a.costBasis)
}

function sortForMethod(lots: Lot[], method: LotMethod): Lot[] {
  if (method === 'fifo') return [...lots].sort((a, b) => a.date.localeCompare(b.date))
  if (method === 'lifo') return [...lots].sort((a, b) => b.date.localeCompare(a.date))
  return [...lots].sort((a, b) => b.price - a.price) // hifo
}
