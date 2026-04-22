/**
 * Pivot point calculators — Classic (Floor), Fibonacci, Camarilla, Woodie,
 * DeMark. Given prior period's (high, low, close) returns pivot P and
 * multiple support / resistance levels for the next period.
 */

export interface PivotSet {
  p: number
  r1: number
  r2: number
  r3: number
  s1: number
  s2: number
  s3: number
  r4?: number
  s4?: number
}

export function classicPivots(high: number, low: number, close: number): PivotSet {
  const p = (high + low + close) / 3
  const r1 = 2 * p - low
  const s1 = 2 * p - high
  const r2 = p + (high - low)
  const s2 = p - (high - low)
  const r3 = high + 2 * (p - low)
  const s3 = low - 2 * (high - p)
  return { p, r1, r2, r3, s1, s2, s3 }
}

export function fibonacciPivots(high: number, low: number, close: number): PivotSet {
  const p = (high + low + close) / 3
  const range = high - low
  const r1 = p + 0.382 * range
  const r2 = p + 0.618 * range
  const r3 = p + 1.0 * range
  const s1 = p - 0.382 * range
  const s2 = p - 0.618 * range
  const s3 = p - 1.0 * range
  return { p, r1, r2, r3, s1, s2, s3 }
}

export function camarillaPivots(high: number, low: number, close: number): PivotSet {
  const range = high - low
  const p = (high + low + close) / 3
  const r1 = close + (range * 1.1) / 12
  const r2 = close + (range * 1.1) / 6
  const r3 = close + (range * 1.1) / 4
  const r4 = close + (range * 1.1) / 2
  const s1 = close - (range * 1.1) / 12
  const s2 = close - (range * 1.1) / 6
  const s3 = close - (range * 1.1) / 4
  const s4 = close - (range * 1.1) / 2
  return { p, r1, r2, r3, r4, s1, s2, s3, s4 }
}

export function woodiePivots(high: number, low: number, close: number): PivotSet {
  const p = (high + low + 2 * close) / 4
  const r1 = 2 * p - low
  const s1 = 2 * p - high
  const r2 = p + (high - low)
  const s2 = p - (high - low)
  const r3 = high + 2 * (p - low)
  const s3 = low - 2 * (high - p)
  return { p, r1, r2, r3, s1, s2, s3 }
}

/**
 * Fibonacci retracement levels between a swing high and swing low.
 * Returns standard levels: 0, 23.6%, 38.2%, 50%, 61.8%, 78.6%, 100%, plus
 * extensions 127.2%, 161.8%.
 */
export function fibonacciRetracement(
  swingHigh: number,
  swingLow: number
): { label: string; value: number; pct: number }[] {
  const levels = [
    { label: '0%', pct: 0 },
    { label: '23.6%', pct: 23.6 },
    { label: '38.2%', pct: 38.2 },
    { label: '50%', pct: 50 },
    { label: '61.8%', pct: 61.8 },
    { label: '78.6%', pct: 78.6 },
    { label: '100%', pct: 100 },
    { label: '127.2%', pct: 127.2 },
    { label: '161.8%', pct: 161.8 }
  ]
  const range = swingHigh - swingLow
  return levels.map((l) => ({
    label: l.label,
    value: swingHigh - (range * l.pct) / 100,
    pct: l.pct
  }))
}
