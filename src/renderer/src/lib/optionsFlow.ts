export interface OptionContractLike {
  contractSymbol: string
  strike: number
  expiration: number
  lastPrice: number | null
  volume: number | null
  openInterest: number | null
  impliedVolatility: number | null
  inTheMoney?: boolean
}

export interface UnusualContract {
  contractSymbol: string
  side: 'call' | 'put'
  strike: number
  expiration: number
  volume: number
  openInterest: number
  volOiRatio: number
  premium: number // volume × lastPrice × 100 (contract multiplier)
  iv: number | null
}

/**
 * Flag contracts with volume significantly exceeding open interest — a classic
 * "unusual options activity" signal often traced by services like FlowAlgo,
 * UnusualWhales, BarChart. Default threshold = 2× OI and minimum absolute
 * volume = 100 contracts.
 */
export function findUnusualActivity(
  calls: OptionContractLike[],
  puts: OptionContractLike[],
  opts: { volOiRatio?: number; minVolume?: number; topN?: number } = {}
): UnusualContract[] {
  const volOiMin = opts.volOiRatio ?? 2
  const minVol = opts.minVolume ?? 100
  const topN = opts.topN ?? 15

  const toUnusual = (c: OptionContractLike, side: 'call' | 'put'): UnusualContract | null => {
    const vol = c.volume ?? 0
    const oi = c.openInterest ?? 0
    if (vol < minVol) return null
    if (oi <= 0) return null
    const ratio = vol / oi
    if (ratio < volOiMin) return null
    const premium = vol * (c.lastPrice ?? 0) * 100
    return {
      contractSymbol: c.contractSymbol,
      side,
      strike: c.strike,
      expiration: c.expiration,
      volume: vol,
      openInterest: oi,
      volOiRatio: ratio,
      premium,
      iv: c.impliedVolatility
    }
  }

  const flagged: UnusualContract[] = []
  for (const c of calls) {
    const u = toUnusual(c, 'call')
    if (u) flagged.push(u)
  }
  for (const c of puts) {
    const u = toUnusual(c, 'put')
    if (u) flagged.push(u)
  }

  return flagged.sort((a, b) => b.premium - a.premium).slice(0, topN)
}

/**
 * Notional-weighted call/put skew of the flagged flow.
 * Returns positive number → bullish flow dominance, negative → bearish.
 */
export function flowBias(unusual: UnusualContract[]): {
  bias: 'bullish' | 'bearish' | 'balanced' | 'none'
  score: number
  callPremium: number
  putPremium: number
} {
  if (unusual.length === 0) return { bias: 'none', score: 0, callPremium: 0, putPremium: 0 }
  let callP = 0
  let putP = 0
  for (const u of unusual) {
    if (u.side === 'call') callP += u.premium
    else putP += u.premium
  }
  const tot = callP + putP
  const score = tot > 0 ? Math.round(((callP - putP) / tot) * 100) : 0
  let bias: 'bullish' | 'bearish' | 'balanced' = 'balanced'
  if (score >= 25) bias = 'bullish'
  else if (score <= -25) bias = 'bearish'
  return { bias, score, callPremium: callP, putPremium: putP }
}
