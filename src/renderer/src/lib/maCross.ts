export interface CrossSignal {
  date: number // bar timestamp
  type: 'golden' | 'death'
  fastSma: number
  slowSma: number
}

function sma(arr: number[], p: number): number | null {
  if (arr.length < p) return null
  return arr.slice(-p).reduce((a, b) => a + b, 0) / p
}

/**
 * Detect Golden Cross (fast SMA crosses above slow SMA) and Death Cross
 * (fast crosses below slow) on a closes series. Returns all crosses in the
 * window, oldest first.
 */
export function detectCrosses(
  closes: number[],
  times: number[],
  fastPeriod = 50,
  slowPeriod = 200
): CrossSignal[] {
  const out: CrossSignal[] = []
  if (closes.length < slowPeriod + 1) return out
  let prevFast: number | null = null
  let prevSlow: number | null = null
  for (let i = slowPeriod; i < closes.length; i++) {
    const window = closes.slice(0, i + 1)
    const f = sma(window, fastPeriod)
    const s = sma(window, slowPeriod)
    if (f == null || s == null) continue
    if (prevFast != null && prevSlow != null) {
      if (prevFast <= prevSlow && f > s) {
        out.push({ date: times[i], type: 'golden', fastSma: f, slowSma: s })
      } else if (prevFast >= prevSlow && f < s) {
        out.push({ date: times[i], type: 'death', fastSma: f, slowSma: s })
      }
    }
    prevFast = f
    prevSlow = s
  }
  return out
}
