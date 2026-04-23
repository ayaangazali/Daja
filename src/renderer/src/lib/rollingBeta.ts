import { beta, correlation, logReturns } from './indicators'

/**
 * Rolling beta + correlation between a stock and a benchmark.
 * Returns null if insufficient data.
 */

export interface RollingPoint {
  index: number
  beta: number | null
  correlation: number | null
}

export interface RollingBetaResult {
  windowDays: number
  points: RollingPoint[]
  currentBeta: number | null
  currentCorr: number | null
  avgBeta: number | null
  minBeta: number | null
  maxBeta: number | null
  trend: 'rising' | 'falling' | 'flat' | 'unknown'
  regime: 'risk-on' | 'risk-off' | 'defensive' | 'neutral'
  rationale: string
}

export function computeRollingBeta(
  closes: number[],
  benchCloses: number[],
  window = 60
): RollingBetaResult {
  const empty: RollingBetaResult = {
    windowDays: window,
    points: [],
    currentBeta: null,
    currentCorr: null,
    avgBeta: null,
    minBeta: null,
    maxBeta: null,
    trend: 'unknown',
    regime: 'neutral',
    rationale: 'Insufficient history for rolling beta.'
  }
  if (closes.length < window + 2 || benchCloses.length < window + 2) return empty

  const n = Math.min(closes.length, benchCloses.length)
  const c = closes.slice(-n)
  const b = benchCloses.slice(-n)
  const r = logReturns(c)
  const rb = logReturns(b)
  const m = Math.min(r.length, rb.length)
  const rA = r.slice(-m)
  const rB = rb.slice(-m)

  const points: RollingPoint[] = []
  for (let i = window; i <= m; i++) {
    const sliceA = rA.slice(i - window, i)
    const sliceB = rB.slice(i - window, i)
    const bt = beta(sliceA, sliceB)
    const co = correlation(sliceA, sliceB)
    points.push({ index: i, beta: bt, correlation: co })
  }
  if (points.length === 0) return empty

  const betas = points.map((p) => p.beta).filter((x): x is number => x != null)
  const currentBeta = points[points.length - 1].beta
  const currentCorr = points[points.length - 1].correlation
  const avgBeta = betas.length > 0 ? betas.reduce((a, b) => a + b, 0) / betas.length : null
  const minBeta = betas.length > 0 ? Math.min(...betas) : null
  const maxBeta = betas.length > 0 ? Math.max(...betas) : null

  let trend: RollingBetaResult['trend'] = 'unknown'
  if (points.length >= 10) {
    const firstHalf = points.slice(0, Math.floor(points.length / 2))
    const lastHalf = points.slice(Math.floor(points.length / 2))
    const avgFirst =
      firstHalf.reduce((s, p) => s + (p.beta ?? 0), 0) / Math.max(1, firstHalf.length)
    const avgLast =
      lastHalf.reduce((s, p) => s + (p.beta ?? 0), 0) / Math.max(1, lastHalf.length)
    const delta = avgLast - avgFirst
    if (Math.abs(delta) < 0.05) trend = 'flat'
    else if (delta > 0) trend = 'rising'
    else trend = 'falling'
  }

  let regime: RollingBetaResult['regime'] = 'neutral'
  if (currentBeta != null) {
    if (currentBeta < 0) regime = 'risk-off'
    else if (currentBeta > 1.1) regime = 'risk-on'
    else if (currentBeta < 0.7) regime = 'defensive'
  }

  let rationale = ''
  if (currentBeta == null) {
    rationale = 'Beta unavailable.'
  } else if (currentBeta < 0) {
    rationale = `Negative beta (${currentBeta.toFixed(2)}) — moves inversely to the benchmark; rare "risk-off" hedge profile.`
  } else if (currentBeta < 0.7) {
    rationale = `Low beta (${currentBeta.toFixed(2)}) — defensive. Expect muted response to market swings.`
  } else if (currentBeta > 1.3) {
    rationale = `High beta (${currentBeta.toFixed(2)}) — amplifies market moves. Rally-positive, drawdown-vulnerable.`
  } else {
    rationale = `Moderate beta (${currentBeta.toFixed(2)}) — tracks market within a reasonable band.`
  }
  if (trend === 'rising') rationale += ' Beta trending higher — growing market sensitivity.'
  else if (trend === 'falling') rationale += ' Beta trending lower — decoupling from benchmark.'

  return {
    windowDays: window,
    points,
    currentBeta,
    currentCorr,
    avgBeta,
    minBeta,
    maxBeta,
    trend,
    regime,
    rationale
  }
}
