/**
 * Price vs oscillator divergence detector.
 *
 * Bullish divergence: price makes a lower low, but oscillator (e.g. RSI) makes
 * a higher low → waning downside momentum → potential reversal up.
 * Bearish divergence: price makes a higher high, but oscillator makes a lower
 * high → waning upside momentum → potential reversal down.
 */

export interface SwingPoint {
  index: number
  value: number
}

export interface DivergenceHit {
  type: 'bullish' | 'bearish' | 'hidden_bull' | 'hidden_bear'
  firstIdx: number
  secondIdx: number
}

/** Find local-minima / maxima with a ± window. */
export function findSwings(
  arr: (number | null)[],
  windowRadius = 3
): { peaks: SwingPoint[]; troughs: SwingPoint[] } {
  const peaks: SwingPoint[] = []
  const troughs: SwingPoint[] = []
  for (let i = windowRadius; i < arr.length - windowRadius; i++) {
    const v = arr[i]
    if (v == null) continue
    let isPeak = true
    let isTrough = true
    for (let j = i - windowRadius; j <= i + windowRadius; j++) {
      if (j === i) continue
      const w = arr[j]
      if (w == null) continue
      if (w > v) isPeak = false
      if (w < v) isTrough = false
    }
    if (isPeak) peaks.push({ index: i, value: v })
    if (isTrough) troughs.push({ index: i, value: v })
  }
  return { peaks, troughs }
}

/**
 * Detect divergences between price and an oscillator (RSI/MACD) series.
 * Compares consecutive swings of the same type (peak or trough) within
 * a maxBarsBetween window.
 */
export function detectDivergences(
  priceCloses: number[],
  oscillator: (number | null)[],
  maxBarsBetween = 30,
  windowRadius = 3
): DivergenceHit[] {
  const priceSwings = findSwings(priceCloses as (number | null)[], windowRadius)
  const oscSwings = findSwings(oscillator, windowRadius)
  const hits: DivergenceHit[] = []

  // Compare consecutive troughs for bullish divergence
  for (let i = 1; i < priceSwings.troughs.length; i++) {
    const p1 = priceSwings.troughs[i - 1]
    const p2 = priceSwings.troughs[i]
    if (p2.index - p1.index > maxBarsBetween) continue
    // find matching osc troughs near p1 and p2
    const o1 = oscSwings.troughs.find((o) => Math.abs(o.index - p1.index) <= windowRadius)
    const o2 = oscSwings.troughs.find((o) => Math.abs(o.index - p2.index) <= windowRadius)
    if (!o1 || !o2) continue
    if (p2.value < p1.value && o2.value > o1.value) {
      hits.push({ type: 'bullish', firstIdx: p1.index, secondIdx: p2.index })
    } else if (p2.value > p1.value && o2.value < o1.value) {
      hits.push({ type: 'hidden_bull', firstIdx: p1.index, secondIdx: p2.index })
    }
  }

  // Compare consecutive peaks for bearish divergence
  for (let i = 1; i < priceSwings.peaks.length; i++) {
    const p1 = priceSwings.peaks[i - 1]
    const p2 = priceSwings.peaks[i]
    if (p2.index - p1.index > maxBarsBetween) continue
    const o1 = oscSwings.peaks.find((o) => Math.abs(o.index - p1.index) <= windowRadius)
    const o2 = oscSwings.peaks.find((o) => Math.abs(o.index - p2.index) <= windowRadius)
    if (!o1 || !o2) continue
    if (p2.value > p1.value && o2.value < o1.value) {
      hits.push({ type: 'bearish', firstIdx: p1.index, secondIdx: p2.index })
    } else if (p2.value < p1.value && o2.value > o1.value) {
      hits.push({ type: 'hidden_bear', firstIdx: p1.index, secondIdx: p2.index })
    }
  }

  return hits
}
