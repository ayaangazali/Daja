/**
 * Short-squeeze heuristic score from shares-short + short-%-of-float +
 * days-to-cover + month-over-month short delta.
 *
 * Thresholds loosely mirror the buckets retail traders watch (FinTwit /
 * Reddit WallStreetBets commentary): short %>20 is "heavy short",
 * days-to-cover >5 means bears need many sessions to unwind, a rising
 * short position into a rally is kindling.
 */

export interface ShortInputs {
  shortPercent: number | null // fraction (0..1), e.g. 0.22 = 22%
  sharesShort: number | null
  sharesShortPriorMonth: number | null
  shortRatio: number | null // days to cover
  priceChange1m: number | null // fraction, e.g. 0.10 = +10%
}

export interface ShortSqueezeResult {
  score: number // 0..100
  tier: 'low' | 'moderate' | 'elevated' | 'high' | 'extreme'
  shortPercentPct: number | null
  momShortDeltaPct: number | null
  daysToCover: number | null
  rationale: string[]
}

function pct(frac: number | null): number | null {
  return frac == null ? null : frac * 100
}

export function assessShortSqueeze(i: ShortInputs): ShortSqueezeResult {
  const shortPctPct = pct(i.shortPercent)
  const mom =
    i.sharesShort != null && i.sharesShortPriorMonth != null && i.sharesShortPriorMonth > 0
      ? ((i.sharesShort - i.sharesShortPriorMonth) / i.sharesShortPriorMonth) * 100
      : null
  const dtc = i.shortRatio
  const priceMovePct = i.priceChange1m != null ? i.priceChange1m * 100 : null

  let score = 0
  const rationale: string[] = []

  if (shortPctPct != null) {
    if (shortPctPct >= 30) {
      score += 40
      rationale.push(`Short interest ${shortPctPct.toFixed(1)}% of float — extreme (>30%)`)
    } else if (shortPctPct >= 20) {
      score += 28
      rationale.push(`Short interest ${shortPctPct.toFixed(1)}% of float — high (>20%)`)
    } else if (shortPctPct >= 10) {
      score += 15
      rationale.push(`Short interest ${shortPctPct.toFixed(1)}% of float — elevated (>10%)`)
    } else if (shortPctPct >= 5) {
      score += 6
      rationale.push(`Short interest ${shortPctPct.toFixed(1)}% — moderate`)
    } else {
      rationale.push(`Short interest ${shortPctPct.toFixed(1)}% — low`)
    }
  }

  if (dtc != null) {
    if (dtc >= 10) {
      score += 25
      rationale.push(`Days-to-cover ${dtc.toFixed(1)} — shorts trapped if rally continues`)
    } else if (dtc >= 5) {
      score += 15
      rationale.push(`Days-to-cover ${dtc.toFixed(1)} — meaningful cover burden`)
    } else if (dtc >= 2) {
      score += 5
      rationale.push(`Days-to-cover ${dtc.toFixed(1)} — modest`)
    }
  }

  if (mom != null) {
    if (mom >= 20) {
      score += 15
      rationale.push(`Short position +${mom.toFixed(1)}% MoM — shorts piling in`)
    } else if (mom >= 10) {
      score += 8
      rationale.push(`Short position +${mom.toFixed(1)}% MoM — adding`)
    } else if (mom <= -10) {
      score -= 5
      rationale.push(`Short position ${mom.toFixed(1)}% MoM — shorts covering already`)
    }
  }

  if (priceMovePct != null && shortPctPct != null && shortPctPct >= 10) {
    if (priceMovePct >= 10) {
      score += 20
      rationale.push(
        `Price +${priceMovePct.toFixed(1)}% last month with heavy short — cover-squeeze tinder`
      )
    } else if (priceMovePct >= 5) {
      score += 10
      rationale.push(`Price +${priceMovePct.toFixed(1)}% last month — upward pressure on shorts`)
    } else if (priceMovePct <= -10) {
      score -= 10
      rationale.push(`Price ${priceMovePct.toFixed(1)}% — shorts winning, squeeze risk muted`)
    }
  }

  score = Math.max(0, Math.min(100, score))
  let tier: ShortSqueezeResult['tier'] = 'low'
  if (score >= 80) tier = 'extreme'
  else if (score >= 60) tier = 'high'
  else if (score >= 40) tier = 'elevated'
  else if (score >= 20) tier = 'moderate'

  return {
    score,
    tier,
    shortPercentPct: shortPctPct,
    momShortDeltaPct: mom,
    daysToCover: dtc,
    rationale
  }
}
