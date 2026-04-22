/**
 * Heikin-Ashi candle transformer. Smooths out noise by averaging each bar's
 * open/close with prior HA bar. Useful for visually spotting sustained trends.
 */

export interface OHLCBar {
  open: number
  high: number
  low: number
  close: number
}

export interface HABar extends OHLCBar {
  bullish: boolean
}

export function toHeikinAshi(bars: OHLCBar[]): HABar[] {
  const out: HABar[] = []
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i]
    const haClose = (b.open + b.high + b.low + b.close) / 4
    const prev = out[i - 1]
    const haOpen = prev ? (prev.open + prev.close) / 2 : (b.open + b.close) / 2
    const haHigh = Math.max(b.high, haOpen, haClose)
    const haLow = Math.min(b.low, haOpen, haClose)
    out.push({
      open: haOpen,
      high: haHigh,
      low: haLow,
      close: haClose,
      bullish: haClose >= haOpen
    })
  }
  return out
}

/** Count consecutive HA candles of same direction (trend run length). */
export function haTrendRun(bars: HABar[]): { direction: 'up' | 'down' | 'none'; run: number } {
  if (bars.length === 0) return { direction: 'none', run: 0 }
  const last = bars[bars.length - 1]
  let run = 1
  for (let i = bars.length - 2; i >= 0; i--) {
    if (bars[i].bullish === last.bullish) run++
    else break
  }
  return { direction: last.bullish ? 'up' : 'down', run }
}

/**
 * Anchored VWAP — cumulative VWAP starting from a specific index rather than
 * beginning of data. Useful for post-earnings, post-gap anchoring.
 */
export function anchoredVWAP(
  highs: number[],
  lows: number[],
  closes: number[],
  volumes: number[],
  anchorIdx: number
): (number | null)[] {
  const n = closes.length
  const out: (number | null)[] = Array(n).fill(null)
  if (anchorIdx < 0 || anchorIdx >= n) return out
  let cumPV = 0
  let cumV = 0
  for (let i = anchorIdx; i < n; i++) {
    const typical = (highs[i] + lows[i] + closes[i]) / 3
    const v = volumes[i] ?? 0
    cumPV += typical * v
    cumV += v
    out[i] = cumV > 0 ? cumPV / cumV : typical
  }
  return out
}
