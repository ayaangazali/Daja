/**
 * Japanese candlestick pattern detector — pure function per OHLC array.
 * Recognizes common reversal and continuation patterns used by technical
 * traders. Returns list of {index, pattern, bias} for each detection.
 */

export interface Candle {
  open: number
  high: number
  low: number
  close: number
}

export interface CandlePatternHit {
  index: number
  pattern: string
  bias: 'bullish' | 'bearish' | 'neutral'
}

function body(c: Candle): number {
  return Math.abs(c.close - c.open)
}
function upperShadow(c: Candle): number {
  return c.high - Math.max(c.open, c.close)
}
function lowerShadow(c: Candle): number {
  return Math.min(c.open, c.close) - c.low
}
function range(c: Candle): number {
  return c.high - c.low
}
function bullish(c: Candle): boolean {
  return c.close > c.open
}
function bearish(c: Candle): boolean {
  return c.close < c.open
}

export function detectPatterns(candles: Candle[]): CandlePatternHit[] {
  const hits: CandlePatternHit[] = []
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i]
    const r = range(c)
    if (r === 0) continue
    const b = body(c)
    const up = upperShadow(c)
    const lo = lowerShadow(c)

    // Doji — tiny body relative to range
    if (b / r < 0.1) {
      hits.push({ index: i, pattern: 'Doji', bias: 'neutral' })
    }

    // Hammer (bullish reversal) — small body, long lower shadow, little upper
    if (lo > b * 2 && up < b * 0.5 && b / r < 0.4) {
      hits.push({ index: i, pattern: 'Hammer', bias: 'bullish' })
    }
    // Shooting star (bearish reversal) — small body, long upper, little lower
    if (up > b * 2 && lo < b * 0.5 && b / r < 0.4) {
      hits.push({ index: i, pattern: 'Shooting Star', bias: 'bearish' })
    }
    // Marubozu — near-full body (very small shadows)
    if (up / r < 0.05 && lo / r < 0.05 && b / r > 0.9) {
      hits.push({
        index: i,
        pattern: bullish(c) ? 'Bullish Marubozu' : 'Bearish Marubozu',
        bias: bullish(c) ? 'bullish' : 'bearish'
      })
    }

    // Two-candle patterns need prev
    if (i === 0) continue
    const prev = candles[i - 1]

    // Bullish engulfing
    if (
      bearish(prev) &&
      bullish(c) &&
      c.open < prev.close &&
      c.close > prev.open &&
      body(c) > body(prev)
    ) {
      hits.push({ index: i, pattern: 'Bullish Engulfing', bias: 'bullish' })
    }
    // Bearish engulfing
    if (
      bullish(prev) &&
      bearish(c) &&
      c.open > prev.close &&
      c.close < prev.open &&
      body(c) > body(prev)
    ) {
      hits.push({ index: i, pattern: 'Bearish Engulfing', bias: 'bearish' })
    }
    // Piercing line (bullish) — gap down, then close past prev midpoint
    if (bearish(prev) && bullish(c)) {
      const mid = (prev.open + prev.close) / 2
      if (c.open < prev.low && c.close > mid && c.close < prev.open) {
        hits.push({ index: i, pattern: 'Piercing Line', bias: 'bullish' })
      }
    }
    // Dark cloud cover (bearish)
    if (bullish(prev) && bearish(c)) {
      const mid = (prev.open + prev.close) / 2
      if (c.open > prev.high && c.close < mid && c.close > prev.open) {
        hits.push({ index: i, pattern: 'Dark Cloud Cover', bias: 'bearish' })
      }
    }

    // Three-candle: morning/evening star
    if (i < 2) continue
    const prev2 = candles[i - 2]
    // Morning star: bearish → small body → bullish that closes above midpoint of prev2
    if (
      bearish(prev2) &&
      body(prev) / range(prev) < 0.3 &&
      bullish(c) &&
      c.close > (prev2.open + prev2.close) / 2
    ) {
      hits.push({ index: i, pattern: 'Morning Star', bias: 'bullish' })
    }
    // Evening star: bullish → small body → bearish that closes below midpoint of prev2
    if (
      bullish(prev2) &&
      body(prev) / range(prev) < 0.3 &&
      bearish(c) &&
      c.close < (prev2.open + prev2.close) / 2
    ) {
      hits.push({ index: i, pattern: 'Evening Star', bias: 'bearish' })
    }
  }
  return hits
}

/** Summary aggregating recent patterns (last N bars). */
export function summarizePatterns(
  hits: CandlePatternHit[],
  windowSize = 20,
  totalBars: number
): { bullish: number; bearish: number; neutral: number; net: 'bullish' | 'bearish' | 'neutral' } {
  const recent = hits.filter((h) => h.index >= totalBars - windowSize)
  let bu = 0
  let be = 0
  let ne = 0
  for (const h of recent) {
    if (h.bias === 'bullish') bu++
    else if (h.bias === 'bearish') be++
    else ne++
  }
  const net: 'bullish' | 'bearish' | 'neutral' =
    bu > be + 1 ? 'bullish' : be > bu + 1 ? 'bearish' : 'neutral'
  return { bullish: bu, bearish: be, neutral: ne, net }
}
