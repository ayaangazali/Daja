/**
 * Options payoff diagram generator. Given a position (call/put, long/short,
 * strike, premium), computes profit/loss at a range of underlying prices at
 * expiration. Supports multi-leg strategies (spreads, straddles, condors).
 */

export interface OptionLeg {
  type: 'call' | 'put'
  side: 'long' | 'short'
  strike: number
  premium: number // paid/received per share
  quantity: number // number of contracts (1 contract = 100 shares)
}

export function legPayoffAtPrice(leg: OptionLeg, S: number): number {
  const multiplier = 100 * leg.quantity
  let intrinsic = 0
  if (leg.type === 'call') intrinsic = Math.max(0, S - leg.strike)
  else intrinsic = Math.max(0, leg.strike - S)
  // For long: pnl = intrinsic - premium paid
  // For short: pnl = premium received - intrinsic
  if (leg.side === 'long') return (intrinsic - leg.premium) * multiplier
  return (leg.premium - intrinsic) * multiplier
}

export function portfolioPayoff(legs: OptionLeg[], S: number): number {
  return legs.reduce((sum, leg) => sum + legPayoffAtPrice(leg, S), 0)
}

export interface PayoffPoint {
  price: number
  pnl: number
}

export function payoffCurve(
  legs: OptionLeg[],
  minPrice: number,
  maxPrice: number,
  nPoints = 100
): PayoffPoint[] {
  const step = (maxPrice - minPrice) / (nPoints - 1)
  const out: PayoffPoint[] = []
  for (let i = 0; i < nPoints; i++) {
    const price = minPrice + i * step
    out.push({ price, pnl: portfolioPayoff(legs, price) })
  }
  return out
}

/**
 * Find break-even prices by scanning for sign changes in payoff curve.
 */
export function breakEvens(curve: PayoffPoint[]): number[] {
  const out: number[] = []
  for (let i = 1; i < curve.length; i++) {
    const a = curve[i - 1]
    const b = curve[i]
    if (a.pnl === 0) out.push(a.price)
    else if (a.pnl * b.pnl < 0) {
      // Linear interp
      const t = a.pnl / (a.pnl - b.pnl)
      out.push(a.price + t * (b.price - a.price))
    }
  }
  return out
}

export function maxProfit(curve: PayoffPoint[]): { price: number; pnl: number } {
  let best = curve[0] ?? { price: 0, pnl: 0 }
  for (const p of curve) if (p.pnl > best.pnl) best = p
  return best
}

export function maxLoss(curve: PayoffPoint[]): { price: number; pnl: number } {
  let worst = curve[0] ?? { price: 0, pnl: 0 }
  for (const p of curve) if (p.pnl < worst.pnl) worst = p
  return worst
}
