/**
 * Post-earnings reaction study. For each past earnings date, computes return
 * 1d / 3d / 5d / 10d after. Averages across history to answer "what typically
 * happens after this stock reports".
 */

export interface ReactionInput {
  earningsDates: string[] // ISO yyyy-mm-dd or yyyy-mm
  bars: { time: number; close: number | null }[] // sorted ascending
}

export interface ReactionEvent {
  date: string
  baseClose: number
  r1d: number | null
  r3d: number | null
  r5d: number | null
  r10d: number | null
}

export interface ReactionSummary {
  events: ReactionEvent[]
  avg1d: number | null
  avg3d: number | null
  avg5d: number | null
  avg10d: number | null
  positive1d: number
  positive5d: number
  hitRate1d: number // 0..100
  hitRate5d: number
}

function findBarIdxOnOrAfter(bars: ReactionInput['bars'], sec: number): number {
  for (let i = 0; i < bars.length; i++) {
    if (bars[i].time >= sec) return i
  }
  return -1
}

function dateToSec(d: string): number {
  return Math.floor(new Date(d + 'T00:00:00Z').getTime() / 1000)
}

function pct(a: number, b: number): number {
  if (b === 0) return 0
  return ((a - b) / b) * 100
}

export function analyzeEarningsReactions(input: ReactionInput): ReactionSummary {
  const events: ReactionEvent[] = []
  for (const raw of input.earningsDates) {
    const date = raw.length === 7 ? raw + '-01' : raw
    const sec = dateToSec(date)
    const idx = findBarIdxOnOrAfter(input.bars, sec)
    if (idx < 0) continue
    const base = input.bars[idx]?.close ?? null
    if (base == null) continue
    const getClose = (offset: number): number | null => {
      const j = idx + offset
      if (j < 0 || j >= input.bars.length) return null
      return input.bars[j].close
    }
    const c1 = getClose(1)
    const c3 = getClose(3)
    const c5 = getClose(5)
    const c10 = getClose(10)
    events.push({
      date,
      baseClose: base,
      r1d: c1 != null ? pct(c1, base) : null,
      r3d: c3 != null ? pct(c3, base) : null,
      r5d: c5 != null ? pct(c5, base) : null,
      r10d: c10 != null ? pct(c10, base) : null
    })
  }

  const mean = (arr: (number | null)[]): number | null => {
    const vals = arr.filter((v): v is number => v != null)
    if (vals.length === 0) return null
    return vals.reduce((a, b) => a + b, 0) / vals.length
  }

  const positive1d = events.filter((e) => e.r1d != null && e.r1d > 0).length
  const positive5d = events.filter((e) => e.r5d != null && e.r5d > 0).length
  const total1d = events.filter((e) => e.r1d != null).length
  const total5d = events.filter((e) => e.r5d != null).length

  return {
    events,
    avg1d: mean(events.map((e) => e.r1d)),
    avg3d: mean(events.map((e) => e.r3d)),
    avg5d: mean(events.map((e) => e.r5d)),
    avg10d: mean(events.map((e) => e.r10d)),
    positive1d,
    positive5d,
    hitRate1d: total1d > 0 ? (positive1d / total1d) * 100 : 0,
    hitRate5d: total5d > 0 ? (positive5d / total5d) * 100 : 0
  }
}
