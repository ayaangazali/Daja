/**
 * Simplified Fear & Greed composite, inspired by CNN Business' index but
 * computed from free Yahoo data. Outputs 0..100 where 50 is neutral,
 * < 25 = extreme fear, > 75 = extreme greed.
 *
 * Components (equal-weighted):
 *  1. Market momentum — SPY price vs 125-day moving average
 *  2. Stock price strength — % off 52-week high
 *  3. Volatility — VIX (inverted; high VIX = fear)
 *  4. Safe haven demand — 20-day SPY return
 *  5. Junk bond demand — HYG vs TLT spread (yield hunger)
 */

export interface FearGreedInputs {
  spyCloses: number[]
  spy52wHigh: number | null
  spy52wLow: number | null
  vix: number | null
  hygChange20d?: number | null // percent change
  tltChange20d?: number | null
}

export interface FearGreedResult {
  score: number // 0..100
  label: 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed'
  components: { name: string; value: number; interp: string }[]
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v))
}

function labelOf(score: number): FearGreedResult['label'] {
  if (score <= 24) return 'Extreme Fear'
  if (score <= 44) return 'Fear'
  if (score <= 55) return 'Neutral'
  if (score <= 75) return 'Greed'
  return 'Extreme Greed'
}

export function computeFearGreed(i: FearGreedInputs): FearGreedResult {
  const components: FearGreedResult['components'] = []

  // 1. Momentum — SPY vs 125d SMA
  let momentumScore = 50
  if (i.spyCloses.length >= 126) {
    const recent = i.spyCloses[i.spyCloses.length - 1]
    const sma125 =
      i.spyCloses.slice(-125).reduce((s, v) => s + v, 0) / 125
    const diff = ((recent - sma125) / sma125) * 100
    // diff +10% = 90 greed, -10% = 10 fear, 0 = 50
    momentumScore = clamp(50 + diff * 4)
  }
  components.push({
    name: 'Momentum',
    value: momentumScore,
    interp:
      momentumScore > 70
        ? 'Bullish trend extended'
        : momentumScore < 30
          ? 'Trend below long MA'
          : 'Near long-term average'
  })

  // 2. Strength — % off 52w high
  let strengthScore = 50
  if (i.spy52wHigh && i.spy52wLow && i.spy52wHigh > i.spy52wLow) {
    const last = i.spyCloses[i.spyCloses.length - 1] ?? i.spy52wHigh
    const rangePct = ((last - i.spy52wLow) / (i.spy52wHigh - i.spy52wLow)) * 100
    // 100% of range = 100 (greed), 0% = 0 (fear)
    strengthScore = clamp(rangePct)
  }
  components.push({
    name: 'Strength',
    value: strengthScore,
    interp:
      strengthScore > 75
        ? 'Near 52-week high'
        : strengthScore < 25
          ? 'Near 52-week low'
          : 'Mid-range'
  })

  // 3. Volatility — VIX inverted
  let volScore = 50
  if (i.vix != null && Number.isFinite(i.vix)) {
    // VIX 12 = 85 greed, VIX 20 = 50 neutral, VIX 30 = 20 fear, VIX 40+ = ~5
    volScore = clamp(100 - (i.vix - 12) * 4)
  }
  components.push({
    name: 'Volatility (VIX)',
    value: volScore,
    interp:
      volScore > 70
        ? 'Very calm — complacency risk'
        : volScore < 30
          ? 'Elevated fear'
          : 'Normal risk appetite'
  })

  // 4. Safe haven demand — 20-day SPY return
  let safeHavenScore = 50
  if (i.spyCloses.length >= 21) {
    const last = i.spyCloses[i.spyCloses.length - 1]
    const past = i.spyCloses[i.spyCloses.length - 21]
    const ret20 = ((last - past) / past) * 100
    // +5% over 20d = 80, -5% = 20
    safeHavenScore = clamp(50 + ret20 * 6)
  }
  components.push({
    name: 'Safe-haven demand',
    value: safeHavenScore,
    interp:
      safeHavenScore > 70
        ? 'Strong 1-month rally (risk-on)'
        : safeHavenScore < 30
          ? 'Flight to safety'
          : 'Balanced'
  })

  // 5. Junk bond demand — HYG return - TLT return
  let junkScore = 50
  if (i.hygChange20d != null && i.tltChange20d != null) {
    const spread = i.hygChange20d - i.tltChange20d
    // HYG outperforms TLT = greed; TLT outperforms = fear
    junkScore = clamp(50 + spread * 10)
  }
  components.push({
    name: 'Junk bond demand',
    value: junkScore,
    interp:
      junkScore > 65
        ? 'Yield hunger — risk-on'
        : junkScore < 35
          ? 'Credit spreads widening'
          : 'Credit stable'
  })

  const score = Math.round(components.reduce((s, c) => s + c.value, 0) / components.length)

  return {
    score,
    label: labelOf(score),
    components
  }
}
