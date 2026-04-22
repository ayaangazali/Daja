/**
 * Support / Resistance auto-detector. Identifies clusters of swing highs
 * (resistance) and swing lows (support) within a tolerance band, ranking by
 * how many times price tested each level. Popular quant approach.
 */

export interface SRLevel {
  price: number
  touches: number
  type: 'support' | 'resistance'
  firstIdx: number
  lastIdx: number
  strength: number // touches weighted by recency
}

function findSwingsHighLow(
  highs: number[],
  lows: number[],
  radius = 3
): { peaks: { idx: number; price: number }[]; troughs: { idx: number; price: number }[] } {
  const peaks: { idx: number; price: number }[] = []
  const troughs: { idx: number; price: number }[] = []
  for (let i = radius; i < highs.length - radius; i++) {
    let isPeak = true
    let isTrough = true
    for (let j = i - radius; j <= i + radius; j++) {
      if (j === i) continue
      if (highs[j] > highs[i]) isPeak = false
      if (lows[j] < lows[i]) isTrough = false
    }
    if (isPeak) peaks.push({ idx: i, price: highs[i] })
    if (isTrough) troughs.push({ idx: i, price: lows[i] })
  }
  return { peaks, troughs }
}

/**
 * Cluster nearby swings into levels. Each level is the average of its members.
 * Tolerance = % of price.
 */
export function detectSRLevels(
  highs: number[],
  lows: number[],
  opts: { radius?: number; tolerancePct?: number; minTouches?: number; topN?: number } = {}
): SRLevel[] {
  const radius = opts.radius ?? 3
  const tolerancePct = opts.tolerancePct ?? 1
  const minTouches = opts.minTouches ?? 2
  const topN = opts.topN ?? 8

  const { peaks, troughs } = findSwingsHighLow(highs, lows, radius)
  const n = highs.length

  const cluster = (
    points: { idx: number; price: number }[],
    type: 'support' | 'resistance'
  ): SRLevel[] => {
    const sorted = [...points].sort((a, b) => a.price - b.price)
    const clusters: { members: { idx: number; price: number }[] }[] = []
    for (const p of sorted) {
      const last = clusters[clusters.length - 1]
      if (!last) {
        clusters.push({ members: [p] })
        continue
      }
      const lastAvg = last.members.reduce((a, m) => a + m.price, 0) / last.members.length
      if (Math.abs((p.price - lastAvg) / lastAvg) * 100 <= tolerancePct) {
        last.members.push(p)
      } else {
        clusters.push({ members: [p] })
      }
    }
    return clusters
      .filter((c) => c.members.length >= minTouches)
      .map((c) => {
        const avg = c.members.reduce((a, m) => a + m.price, 0) / c.members.length
        const idxs = c.members.map((m) => m.idx)
        const firstIdx = Math.min(...idxs)
        const lastIdx = Math.max(...idxs)
        // Strength: touches × (recency bonus) — more recent touches count more
        const strength = c.members.reduce((a, m) => a + (0.5 + (m.idx / n) * 0.5), 0)
        return {
          price: avg,
          touches: c.members.length,
          type,
          firstIdx,
          lastIdx,
          strength
        }
      })
  }

  const levels = [...cluster(peaks, 'resistance'), ...cluster(troughs, 'support')]
  return levels.sort((a, b) => b.strength - a.strength).slice(0, topN)
}
