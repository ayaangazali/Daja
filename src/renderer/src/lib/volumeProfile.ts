/**
 * Volume-by-price profile — buckets total traded volume into price bins.
 * Identifies Point of Control (POC, highest-volume price) and Value Area
 * (70% of volume around POC).
 */

export interface PriceBucket {
  low: number
  high: number
  volume: number
}

export interface VolumeProfileResult {
  buckets: PriceBucket[]
  poc: PriceBucket | null
  valueAreaHigh: number
  valueAreaLow: number
  totalVolume: number
}

export function volumeProfile(
  highs: number[],
  lows: number[],
  closes: number[],
  volumes: number[],
  nBuckets = 24
): VolumeProfileResult {
  if (highs.length === 0)
    return { buckets: [], poc: null, valueAreaHigh: 0, valueAreaLow: 0, totalVolume: 0 }
  const priceMin = Math.min(...lows)
  const priceMax = Math.max(...highs)
  const span = priceMax - priceMin || 1
  const bucketSize = span / nBuckets
  const buckets: PriceBucket[] = Array.from({ length: nBuckets }, (_, i) => ({
    low: priceMin + i * bucketSize,
    high: priceMin + (i + 1) * bucketSize,
    volume: 0
  }))

  for (let i = 0; i < closes.length; i++) {
    const price = closes[i]
    const vol = volumes[i] ?? 0
    let idx = Math.floor(((price - priceMin) / span) * nBuckets)
    if (idx < 0) idx = 0
    if (idx >= nBuckets) idx = nBuckets - 1
    buckets[idx].volume += vol
  }

  const totalVolume = buckets.reduce((a, b) => a + b.volume, 0)
  let poc: PriceBucket | null = null
  let pocVol = -1
  for (const b of buckets) {
    if (b.volume > pocVol) {
      pocVol = b.volume
      poc = b
    }
  }

  // Value area = contiguous buckets around POC covering 70% of volume
  let valueAreaHigh = poc?.high ?? 0
  let valueAreaLow = poc?.low ?? 0
  if (poc && totalVolume > 0) {
    const pocIdx = buckets.indexOf(poc)
    let accum = poc.volume
    let lo = pocIdx
    let hi = pocIdx
    while (accum / totalVolume < 0.7 && (lo > 0 || hi < nBuckets - 1)) {
      const nextUp = hi < nBuckets - 1 ? buckets[hi + 1].volume : -1
      const nextDown = lo > 0 ? buckets[lo - 1].volume : -1
      if (nextUp >= nextDown && hi < nBuckets - 1) {
        hi++
        accum += buckets[hi].volume
      } else if (lo > 0) {
        lo--
        accum += buckets[lo].volume
      } else {
        break
      }
    }
    valueAreaHigh = buckets[hi].high
    valueAreaLow = buckets[lo].low
  }

  return { buckets, poc, valueAreaHigh, valueAreaLow, totalVolume }
}
