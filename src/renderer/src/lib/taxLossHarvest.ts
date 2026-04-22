import type { Lot, TaxLotPosition, TaxLotTrade } from './positionsFifo'

export interface HarvestCandidate {
  ticker: string
  lot: Lot
  marketPrice: number
  unrealizedLoss: number // negative number
  unrealizedPct: number // negative number
  holdingDays: number
  term: 'short' | 'long'
  washSaleRisk: boolean // if buy within 30 days
  estimatedTaxSaving: number
}

export interface HarvestSummary {
  candidates: HarvestCandidate[]
  totalLoss: number
  shortTermLoss: number
  longTermLoss: number
  totalTaxSaving: number
}

const MS_DAY = 86_400_000

function daysSince(date: string, ref: Date): number {
  return Math.floor((ref.getTime() - new Date(date).getTime()) / MS_DAY)
}

/**
 * Identify tax-loss-harvest candidates from open FIFO lots + current prices.
 *
 * Rules (IRS §1091 wash sale simplified):
 *   - Candidate if lot is underwater (market < basis)
 *   - Flag washSaleRisk if a buy of the same ticker occurred within 30 days
 *     before today (would be 30 days before AND after the sell, but we only
 *     guard the recent-buy side since future buys are under user control)
 *
 * Tax-saving estimate uses user-supplied ST and LT rates.
 */
export function findHarvestCandidates(
  positions: TaxLotPosition[],
  prices: Record<string, number | null | undefined>,
  trades: TaxLotTrade[],
  opts: {
    shortTermRate?: number // e.g. 0.32
    longTermRate?: number // e.g. 0.15
    today?: Date
    minLossPct?: number // skip tiny losses, default 2%
  } = {}
): HarvestSummary {
  const today = opts.today ?? new Date()
  const stRate = opts.shortTermRate ?? 0.32
  const ltRate = opts.longTermRate ?? 0.15
  const minLossPct = opts.minLossPct ?? 2

  const recentBuys = new Map<string, number>()
  for (const t of trades) {
    if (t.side !== 'buy') continue
    const age = daysSince(t.date, today)
    if (age >= 0 && age <= 30) {
      recentBuys.set(t.ticker, Math.min(age, recentBuys.get(t.ticker) ?? Infinity))
    }
  }

  const candidates: HarvestCandidate[] = []

  for (const pos of positions) {
    const px = prices[pos.ticker]
    if (px == null || !Number.isFinite(px) || px <= 0) continue
    for (const lot of pos.openLots) {
      const costTotal = lot.price * lot.qty
      const mktTotal = px * lot.qty
      const pnl = mktTotal - costTotal
      if (pnl >= 0) continue
      const lossPct = (pnl / costTotal) * 100
      if (-lossPct < minLossPct) continue
      const holdingDays = daysSince(lot.date, today)
      const term: 'short' | 'long' = holdingDays < 365 ? 'short' : 'long'
      const rate = term === 'short' ? stRate : ltRate
      const washSaleRisk = recentBuys.has(pos.ticker)
      candidates.push({
        ticker: pos.ticker,
        lot,
        marketPrice: px,
        unrealizedLoss: pnl,
        unrealizedPct: lossPct,
        holdingDays,
        term,
        washSaleRisk,
        estimatedTaxSaving: -pnl * rate
      })
    }
  }

  candidates.sort((a, b) => a.unrealizedLoss - b.unrealizedLoss)

  const shortTermLoss = candidates
    .filter((c) => c.term === 'short')
    .reduce((s, c) => s + c.unrealizedLoss, 0)
  const longTermLoss = candidates
    .filter((c) => c.term === 'long')
    .reduce((s, c) => s + c.unrealizedLoss, 0)
  const totalLoss = shortTermLoss + longTermLoss
  const totalTaxSaving = candidates.reduce((s, c) => s + c.estimatedTaxSaving, 0)

  return { candidates, totalLoss, shortTermLoss, longTermLoss, totalTaxSaving }
}
