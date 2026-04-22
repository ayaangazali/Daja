/**
 * Monte Carlo simulation for forward price projection using geometric
 * Brownian motion. Pure functions; deterministic given a seeded RNG.
 */

export interface MonteCarloResult {
  mean: number[]
  p05: number[]
  p25: number[]
  p50: number[]
  p75: number[]
  p95: number[]
  paths: number[][]
}

/** Box-Muller normal(0,1) sampler. */
function randNormal(rng: () => number): number {
  const u1 = rng() || 1e-9
  const u2 = rng()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

/**
 * Seeded PRNG (mulberry32) for reproducible simulation.
 */
export function seedRng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Estimate mu and sigma from log returns. */
export function estimateDriftVol(logReturns: number[]): { mu: number; sigma: number } {
  if (logReturns.length === 0) return { mu: 0, sigma: 0 }
  const mean = logReturns.reduce((a, b) => a + b, 0) / logReturns.length
  const variance =
    logReturns.reduce((a, r) => a + (r - mean) ** 2, 0) / logReturns.length
  return { mu: mean, sigma: Math.sqrt(variance) }
}

/**
 * Simulate nPaths geometric Brownian paths over nSteps days.
 * Returns raw paths plus percentile curves per step.
 */
export function simulateGBM({
  startPrice,
  mu,
  sigma,
  nSteps,
  nPaths,
  seed = 42
}: {
  startPrice: number
  mu: number
  sigma: number
  nSteps: number
  nPaths: number
  seed?: number
}): MonteCarloResult {
  const rng = seedRng(seed)
  const paths: number[][] = Array.from({ length: nPaths }, () => [startPrice])
  for (let s = 1; s <= nSteps; s++) {
    for (let p = 0; p < nPaths; p++) {
      const prev = paths[p][s - 1]
      const z = randNormal(rng)
      const drift = mu - 0.5 * sigma * sigma
      const next = prev * Math.exp(drift + sigma * z)
      paths[p].push(next)
    }
  }
  const percentileAt = (step: number, pct: number): number => {
    const vals = paths.map((pth) => pth[step]).sort((a, b) => a - b)
    const idx = Math.floor(pct * (vals.length - 1))
    return vals[idx]
  }
  const meanAt = (step: number): number => {
    const vals = paths.map((pth) => pth[step])
    return vals.reduce((a, b) => a + b, 0) / vals.length
  }
  const steps = nSteps + 1
  const mean = Array.from({ length: steps }, (_, i) => meanAt(i))
  const p05 = Array.from({ length: steps }, (_, i) => percentileAt(i, 0.05))
  const p25 = Array.from({ length: steps }, (_, i) => percentileAt(i, 0.25))
  const p50 = Array.from({ length: steps }, (_, i) => percentileAt(i, 0.5))
  const p75 = Array.from({ length: steps }, (_, i) => percentileAt(i, 0.75))
  const p95 = Array.from({ length: steps }, (_, i) => percentileAt(i, 0.95))
  return { mean, p05, p25, p50, p75, p95, paths }
}
