/**
 * Composite trend-strength score combining multiple technical signals into
 * a -100..+100 scalar. Positive = bullish trend, negative = bearish,
 * magnitude = strength.
 *
 * Inputs are all nullable — missing components are skipped and the final
 * score is normalized over the number of available components.
 */

export interface TrendInputs {
  price: number
  sma20: number | null
  sma50: number | null
  sma200: number | null
  ema9: number | null
  ema21: number | null
  rsi: number | null
  macd: number | null
  macdSignal: number | null
  adx: number | null
  plusDI: number | null
  minusDI: number | null
}

export interface TrendScoreResult {
  score: number // -100..+100
  strength: 'strong_bull' | 'bull' | 'neutral' | 'bear' | 'strong_bear'
  components: { name: string; points: number; reason: string }[]
}

export function trendScore(i: TrendInputs): TrendScoreResult {
  const comps: { name: string; points: number; reason: string }[] = []

  // Price vs moving averages (up to 30 points)
  const maScore = (ma: number | null, label: string, weight: number): void => {
    if (ma == null) return
    if (i.price > ma) comps.push({ name: label, points: weight, reason: `> ${label}` })
    else comps.push({ name: label, points: -weight, reason: `< ${label}` })
  }
  maScore(i.sma20, 'SMA 20', 5)
  maScore(i.sma50, 'SMA 50', 7)
  maScore(i.sma200, 'SMA 200', 10)
  maScore(i.ema9, 'EMA 9', 3)
  maScore(i.ema21, 'EMA 21', 5)

  // MA alignment (Golden/Death stacking)
  if (i.sma50 != null && i.sma200 != null) {
    if (i.sma50 > i.sma200) comps.push({ name: 'MA stack', points: 10, reason: '50 > 200' })
    else comps.push({ name: 'MA stack', points: -10, reason: '50 < 200' })
  }

  // RSI (up to 10 points)
  if (i.rsi != null) {
    if (i.rsi > 70) comps.push({ name: 'RSI', points: -5, reason: `overbought ${i.rsi.toFixed(0)}` })
    else if (i.rsi > 55) comps.push({ name: 'RSI', points: 8, reason: `bullish ${i.rsi.toFixed(0)}` })
    else if (i.rsi > 45) comps.push({ name: 'RSI', points: 0, reason: `neutral ${i.rsi.toFixed(0)}` })
    else if (i.rsi > 30) comps.push({ name: 'RSI', points: -8, reason: `bearish ${i.rsi.toFixed(0)}` })
    else comps.push({ name: 'RSI', points: 5, reason: `oversold ${i.rsi.toFixed(0)}` })
  }

  // MACD cross state (up to 15 points)
  if (i.macd != null && i.macdSignal != null) {
    const diff = i.macd - i.macdSignal
    if (diff > 0 && i.macd > 0) comps.push({ name: 'MACD', points: 15, reason: 'above signal + above zero' })
    else if (diff > 0) comps.push({ name: 'MACD', points: 7, reason: 'above signal' })
    else if (diff < 0 && i.macd < 0) comps.push({ name: 'MACD', points: -15, reason: 'below signal + below zero' })
    else comps.push({ name: 'MACD', points: -7, reason: 'below signal' })
  }

  // ADX strength + DI (up to 20 points)
  if (i.adx != null && i.plusDI != null && i.minusDI != null) {
    const strengthFactor = Math.min(1, (i.adx - 20) / 20) // scales 0..1 for ADX 20-40
    const direction = i.plusDI > i.minusDI ? 1 : -1
    const pts = Math.round(direction * 20 * Math.max(0, strengthFactor))
    comps.push({
      name: 'ADX',
      points: pts,
      reason: `ADX ${i.adx.toFixed(0)}, ${direction > 0 ? '+DI>DI' : '-DI>+DI'}`
    })
  }

  const total = comps.reduce((a, b) => a + b.points, 0)
  // Normalize by max possible absolute contribution
  const maxPossible =
    (i.sma20 ? 5 : 0) +
    (i.sma50 ? 7 : 0) +
    (i.sma200 ? 10 : 0) +
    (i.ema9 ? 3 : 0) +
    (i.ema21 ? 5 : 0) +
    (i.sma50 && i.sma200 ? 10 : 0) +
    (i.rsi != null ? 8 : 0) +
    (i.macd != null ? 15 : 0) +
    (i.adx != null ? 20 : 0)
  const score = maxPossible > 0 ? Math.round((total / maxPossible) * 100) : 0

  let strength: TrendScoreResult['strength'] = 'neutral'
  if (score >= 60) strength = 'strong_bull'
  else if (score >= 20) strength = 'bull'
  else if (score <= -60) strength = 'strong_bear'
  else if (score <= -20) strength = 'bear'

  return { score, strength, components: comps }
}

/**
 * TTM Squeeze — Bollinger Bands inside Keltner Channels indicates volatility
 * compression; when bands expand back out, large move is likely.
 */
export function ttmSqueeze(
  bollUpper: number,
  bollLower: number,
  keltUpper: number,
  keltLower: number
): 'squeeze_on' | 'squeeze_off' {
  // Squeeze on when BB is fully inside KC
  if (bollUpper < keltUpper && bollLower > keltLower) return 'squeeze_on'
  return 'squeeze_off'
}
