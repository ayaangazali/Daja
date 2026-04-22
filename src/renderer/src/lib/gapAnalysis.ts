/**
 * Gap analyzer — detects opening gaps (today's open vs yesterday's close)
 * and tracks which gaps "filled" (price returned through the gap zone) vs
 * which remained open. Classic swing-trader tool.
 */

export interface OHLCVBar {
  time: number
  open: number | null
  high: number | null
  low: number | null
  close: number | null
  volume?: number | null
}

export interface GapEvent {
  index: number
  time: number
  type: 'gap_up' | 'gap_down'
  prevClose: number
  open: number
  pct: number
  filledIndex: number | null // bar where gap closed (price crossed prevClose), or null
  filled: boolean
  daysToFill: number | null
}

export function detectGaps(bars: OHLCVBar[], minGapPct = 1): GapEvent[] {
  const out: GapEvent[] = []
  for (let i = 1; i < bars.length; i++) {
    const prev = bars[i - 1]
    const curr = bars[i]
    if (prev.close == null || curr.open == null || curr.high == null || curr.low == null) continue
    const pct = ((curr.open - prev.close) / prev.close) * 100
    if (Math.abs(pct) < minGapPct) continue
    const type: 'gap_up' | 'gap_down' = pct > 0 ? 'gap_up' : 'gap_down'

    let filledIndex: number | null = null
    for (let j = i; j < bars.length; j++) {
      const b = bars[j]
      if (b.high == null || b.low == null) continue
      if (type === 'gap_up' && b.low <= prev.close) {
        filledIndex = j
        break
      }
      if (type === 'gap_down' && b.high >= prev.close) {
        filledIndex = j
        break
      }
    }

    out.push({
      index: i,
      time: curr.time,
      type,
      prevClose: prev.close,
      open: curr.open,
      pct,
      filledIndex,
      filled: filledIndex != null,
      daysToFill: filledIndex != null ? filledIndex - i : null
    })
  }
  return out
}

export function gapFillStats(gaps: GapEvent[]): {
  total: number
  filled: number
  unfilled: number
  fillRate: number
  medianDaysToFill: number | null
  avgGapPct: number
} {
  if (gaps.length === 0) {
    return { total: 0, filled: 0, unfilled: 0, fillRate: 0, medianDaysToFill: null, avgGapPct: 0 }
  }
  const filledGaps = gaps.filter((g) => g.filled && g.daysToFill != null)
  const daysArr = filledGaps.map((g) => g.daysToFill as number).sort((a, b) => a - b)
  const median =
    daysArr.length === 0
      ? null
      : daysArr.length % 2 === 0
        ? (daysArr[daysArr.length / 2 - 1] + daysArr[daysArr.length / 2]) / 2
        : daysArr[Math.floor(daysArr.length / 2)]
  const avgPct = gaps.reduce((a, g) => a + Math.abs(g.pct), 0) / gaps.length
  return {
    total: gaps.length,
    filled: filledGaps.length,
    unfilled: gaps.length - filledGaps.length,
    fillRate: (filledGaps.length / gaps.length) * 100,
    medianDaysToFill: median,
    avgGapPct: avgPct
  }
}
