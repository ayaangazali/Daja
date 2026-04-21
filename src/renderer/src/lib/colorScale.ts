/**
 * Returns a "tone" bucket for a percent change value used for heatmap tiles.
 * Range: deep-neg | neg | neutral | pos | deep-pos.
 */
export type ColorBucket = 'deep-neg' | 'neg' | 'neutral' | 'pos' | 'deep-pos'

export function bucketForPct(pct: number | null | undefined, step = 1): ColorBucket {
  if (pct == null || !Number.isFinite(pct)) return 'neutral'
  if (pct >= step * 2) return 'deep-pos'
  if (pct > 0) return 'pos'
  if (pct <= -step * 2) return 'deep-neg'
  if (pct < 0) return 'neg'
  return 'neutral'
}

/**
 * Rank-based greyscale bucket for ordinal data (e.g. screener row index).
 */
export function alphaForRank(index: number, total: number): number {
  if (total <= 0) return 1
  const r = Math.max(0, Math.min(1, 1 - index / total))
  return 0.3 + r * 0.7
}
