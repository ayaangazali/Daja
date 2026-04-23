/**
 * Options "max pain" calculator.
 *
 * Max pain theory: the strike at expiration where the aggregate value of
 * all outstanding call + put options is minimized. Some traders believe
 * price "gravitates" toward max pain into expiry because market makers
 * hedge flows. Controversial but widely tracked on FinTwit.
 */

export interface Contract {
  strike: number
  openInterest: number | null
}

export interface MaxPainResult {
  maxPainStrike: number | null
  currentPrice: number
  distanceToPain: number // % (current - maxPain) / current
  painByStrike: { strike: number; pain: number }[]
  callOi: number
  putOi: number
  putCallRatio: number
}

/**
 * Compute max pain strike. For each candidate strike K:
 *   callPain = sum over call contracts of max(0, K - strike) × OI × 100
 *   putPain  = sum over put  contracts of max(0, strike - K) × OI × 100
 * Max pain = strike that minimizes (callPain + putPain).
 */
export function computeMaxPain(
  calls: Contract[],
  puts: Contract[],
  currentPrice: number
): MaxPainResult {
  const strikes = new Set<number>()
  for (const c of calls) strikes.add(c.strike)
  for (const p of puts) strikes.add(p.strike)
  const sortedStrikes = [...strikes].sort((a, b) => a - b)

  if (sortedStrikes.length === 0) {
    return {
      maxPainStrike: null,
      currentPrice,
      distanceToPain: 0,
      painByStrike: [],
      callOi: 0,
      putOi: 0,
      putCallRatio: 0
    }
  }

  const painByStrike = sortedStrikes.map((testStrike) => {
    let callPain = 0
    let putPain = 0
    for (const c of calls) {
      const oi = c.openInterest ?? 0
      if (oi <= 0) continue
      // Intrinsic payout a call buyer would receive if price settles at testStrike
      callPain += Math.max(0, testStrike - c.strike) * oi * 100
    }
    for (const p of puts) {
      const oi = p.openInterest ?? 0
      if (oi <= 0) continue
      putPain += Math.max(0, p.strike - testStrike) * oi * 100
    }
    return { strike: testStrike, pain: callPain + putPain }
  })

  let minPain = Infinity
  let minStrike: number | null = null
  for (const row of painByStrike) {
    if (row.pain < minPain) {
      minPain = row.pain
      minStrike = row.strike
    }
  }

  const callOi = calls.reduce((s, c) => s + (c.openInterest ?? 0), 0)
  const putOi = puts.reduce((s, p) => s + (p.openInterest ?? 0), 0)
  const putCallRatio = callOi === 0 ? 0 : putOi / callOi

  return {
    maxPainStrike: minStrike,
    currentPrice,
    distanceToPain: minStrike != null && currentPrice > 0
      ? ((currentPrice - minStrike) / currentPrice) * 100
      : 0,
    painByStrike,
    callOi,
    putOi,
    putCallRatio
  }
}
