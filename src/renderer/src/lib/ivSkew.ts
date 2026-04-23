/**
 * Options implied-volatility skew analyzer.
 *
 * Skew: IV differs across strikes for the same expiry. Two shapes traders watch:
 *   - Smile:  both deep OTM puts + deep OTM calls have elevated IV (typical equity).
 *   - Smirk:  OTM puts have materially higher IV than OTM calls (crash insurance premium).
 *
 * Steeper put skew = stronger downside hedging demand = nervous market. Flat/positive
 * call-side skew = speculative call-buying (meme/squeeze setups).
 */

export interface IvPoint {
  strike: number
  iv: number
  moneyness: number
  openInterest: number
}

export interface SkewRow {
  strike: number
  moneyness: number
  callIv: number | null
  putIv: number | null
  callOi: number
  putOi: number
}

export interface SkewAnalysis {
  underlyingPrice: number
  atmIv: number | null
  rows: SkewRow[]
  putSkew25Delta: number | null
  callSkew25Delta: number | null
  skewSlope: number | null
  regime: 'smile' | 'put-smirk' | 'call-smirk' | 'flat' | 'unknown'
  rationale: string
}

interface MinContract {
  strike: number
  impliedVolatility: number | null
  openInterest: number | null
}

function validIv(iv: number | null): iv is number {
  return iv != null && Number.isFinite(iv) && iv > 0 && iv < 5
}

function nearestBy<T>(arr: T[], scoreFn: (t: T) => number): T | null {
  let best: T | null = null
  let bestScore = Infinity
  for (const item of arr) {
    const s = Math.abs(scoreFn(item))
    if (s < bestScore) {
      bestScore = s
      best = item
    }
  }
  return best
}

export function analyzeSkew(
  calls: MinContract[],
  puts: MinContract[],
  underlyingPrice: number
): SkewAnalysis {
  if (!(underlyingPrice > 0)) {
    return {
      underlyingPrice: 0,
      atmIv: null,
      rows: [],
      putSkew25Delta: null,
      callSkew25Delta: null,
      skewSlope: null,
      regime: 'unknown',
      rationale: 'No underlying price available.'
    }
  }

  const callsV = calls.filter((c) => validIv(c.impliedVolatility))
  const putsV = puts.filter((p) => validIv(p.impliedVolatility))

  const strikes = new Set<number>()
  for (const c of callsV) strikes.add(c.strike)
  for (const p of putsV) strikes.add(p.strike)
  const sortedStrikes = [...strikes].sort((a, b) => a - b)

  const callByStrike = new Map(callsV.map((c) => [c.strike, c]))
  const putByStrike = new Map(putsV.map((p) => [p.strike, p]))

  const rows: SkewRow[] = sortedStrikes.map((k) => {
    const c = callByStrike.get(k)
    const p = putByStrike.get(k)
    return {
      strike: k,
      moneyness: (k - underlyingPrice) / underlyingPrice,
      callIv: c?.impliedVolatility ?? null,
      putIv: p?.impliedVolatility ?? null,
      callOi: c?.openInterest ?? 0,
      putOi: p?.openInterest ?? 0
    }
  })

  const atmRow = nearestBy(rows, (r) => r.moneyness)
  const atmCall = atmRow?.callIv ?? null
  const atmPut = atmRow?.putIv ?? null
  const atmIv =
    atmCall != null && atmPut != null ? (atmCall + atmPut) / 2 : (atmCall ?? atmPut ?? null)

  const putPoints: IvPoint[] = putsV.map((p) => ({
    strike: p.strike,
    iv: p.impliedVolatility as number,
    moneyness: (p.strike - underlyingPrice) / underlyingPrice,
    openInterest: p.openInterest ?? 0
  }))
  const callPoints: IvPoint[] = callsV.map((c) => ({
    strike: c.strike,
    iv: c.impliedVolatility as number,
    moneyness: (c.strike - underlyingPrice) / underlyingPrice,
    openInterest: c.openInterest ?? 0
  }))

  // Approximate 25-delta strikes as OTM put near -10% moneyness, OTM call near +10%.
  const put25 = nearestBy(
    putPoints.filter((p) => p.moneyness < 0),
    (p) => p.moneyness + 0.1
  )
  const call25 = nearestBy(
    callPoints.filter((c) => c.moneyness > 0),
    (c) => c.moneyness - 0.1
  )

  const putSkew25Delta = put25 && atmIv ? (put25.iv - atmIv) * 100 : null
  const callSkew25Delta = call25 && atmIv ? (call25.iv - atmIv) * 100 : null

  // Linear regression of iv against moneyness across ALL rows (calls+puts blended).
  const all: IvPoint[] = [...putPoints, ...callPoints]
  let slope: number | null = null
  if (all.length >= 3) {
    const n = all.length
    const meanX = all.reduce((s, p) => s + p.moneyness, 0) / n
    const meanY = all.reduce((s, p) => s + p.iv, 0) / n
    let num = 0
    let den = 0
    for (const p of all) {
      num += (p.moneyness - meanX) * (p.iv - meanY)
      den += (p.moneyness - meanX) ** 2
    }
    slope = den > 0 ? num / den : null
  }

  let regime: SkewAnalysis['regime'] = 'unknown'
  let rationale = 'Insufficient IV data.'
  if (putSkew25Delta != null && callSkew25Delta != null) {
    const put = putSkew25Delta
    const call = callSkew25Delta
    if (put > 5 && call > 5) {
      regime = 'smile'
      rationale = `Both wings elevated (put +${put.toFixed(1)}vol, call +${call.toFixed(1)}vol vs ATM). Market pricing tail risk on both sides.`
    } else if (put > 3 && put - call > 3) {
      regime = 'put-smirk'
      rationale = `Put skew dominant (+${put.toFixed(1)}vol vs call ${call >= 0 ? '+' : ''}${call.toFixed(1)}vol). Classic downside hedge demand — nervous tape.`
    } else if (call > 3 && call - put > 3) {
      regime = 'call-smirk'
      rationale = `Call skew dominant (+${call.toFixed(1)}vol vs put ${put >= 0 ? '+' : ''}${put.toFixed(1)}vol). Speculative upside demand — squeeze or meme behavior possible.`
    } else {
      regime = 'flat'
      rationale = `Wings balanced near ATM IV. Market not pricing directional tail risk.`
    }
  }

  return {
    underlyingPrice,
    atmIv,
    rows,
    putSkew25Delta,
    callSkew25Delta,
    skewSlope: slope,
    regime,
    rationale
  }
}
