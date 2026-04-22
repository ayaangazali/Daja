import { stddev } from './indicators'

/** Sortino ratio — like Sharpe but only penalizes downside deviation. */
export function sortinoRatio(returns: number[], rfDaily = 0, target = 0): number {
  if (returns.length === 0) return 0
  const excess = returns.map((r) => r - rfDaily)
  const mean = excess.reduce((a, b) => a + b, 0) / excess.length
  const downside = excess.filter((r) => r < target)
  if (downside.length === 0) return mean > 0 ? Infinity : 0
  const downDev = Math.sqrt(downside.reduce((a, r) => a + (r - target) ** 2, 0) / excess.length)
  if (downDev === 0) return 0
  return (mean / downDev) * Math.sqrt(252)
}

/** Calmar ratio — annual return divided by absolute max drawdown. */
export function calmarRatio(annualReturnPct: number, maxDrawdownPct: number): number {
  if (maxDrawdownPct === 0) return 0
  return annualReturnPct / Math.abs(maxDrawdownPct)
}

/** Information ratio — excess return vs benchmark, scaled by tracking error. */
export function informationRatio(assetReturns: number[], benchmarkReturns: number[]): number {
  const n = Math.min(assetReturns.length, benchmarkReturns.length)
  if (n === 0) return 0
  const excess: number[] = []
  for (let i = 0; i < n; i++) excess.push(assetReturns[i] - benchmarkReturns[i])
  const mean = excess.reduce((a, b) => a + b, 0) / n
  const te = stddev(excess)
  if (te < 1e-12) return 0
  return (mean / te) * Math.sqrt(252)
}

/** Treynor ratio — excess return per unit of market risk (beta). */
export function treynorRatio(meanReturn: number, rfDaily: number, beta: number): number {
  if (beta === 0) return 0
  return ((meanReturn - rfDaily) / beta) * 252
}

/** Historical Value at Risk (VaR) — kth-percentile worst loss. */
export function historicalVaR(returns: number[], alpha = 0.05): number {
  if (returns.length === 0) return 0
  const sorted = [...returns].sort((a, b) => a - b)
  const idx = Math.max(0, Math.floor(alpha * sorted.length) - 1)
  return sorted[idx] // typically negative
}

/** Conditional VaR (Expected Shortfall) — mean of worst alpha tail. */
export function conditionalVaR(returns: number[], alpha = 0.05): number {
  if (returns.length === 0) return 0
  const sorted = [...returns].sort((a, b) => a - b)
  const k = Math.max(1, Math.floor(alpha * sorted.length))
  const tail = sorted.slice(0, k)
  return tail.reduce((a, b) => a + b, 0) / k
}

/** Parametric VaR under normal-return assumption. */
export function parametricVaR(returns: number[], alpha = 0.05): number {
  if (returns.length === 0) return 0
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length
  const sd = stddev(returns)
  // z-scores for common alphas
  const z: Record<string, number> = {
    '0.01': -2.326,
    '0.025': -1.96,
    '0.05': -1.645,
    '0.1': -1.282
  }
  const key = alpha.toString()
  const zv = z[key] ?? -1.645
  return mean + zv * sd
}

/** Skewness — third standardized moment. */
export function skewness(returns: number[]): number {
  if (returns.length < 3) return 0
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length
  const sd = stddev(returns)
  if (sd === 0) return 0
  const n = returns.length
  const m3 = returns.reduce((a, r) => a + (r - mean) ** 3, 0) / n
  return m3 / Math.pow(sd, 3)
}

/** Kurtosis (excess) — fourth standardized moment minus 3. */
export function kurtosis(returns: number[]): number {
  if (returns.length < 4) return 0
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length
  const sd = stddev(returns)
  if (sd === 0) return 0
  const n = returns.length
  const m4 = returns.reduce((a, r) => a + (r - mean) ** 4, 0) / n
  return m4 / Math.pow(sd, 4) - 3
}

/**
 * Kelly criterion optimal position sizing fraction.
 * f* = p - q/b where p = win rate, q = 1-p, b = win/loss payoff ratio.
 * Returns 0 if edge is negative. Halve for conservative "half-Kelly".
 */
export function kellyCriterion(winRate: number, avgWin: number, avgLoss: number): number {
  if (winRate <= 0 || winRate >= 1) return 0
  if (avgLoss === 0) return 0
  const b = avgWin / Math.abs(avgLoss)
  const q = 1 - winRate
  const f = winRate - q / b
  return Math.max(0, f)
}

/** Ulcer Index — downside volatility via squared drawdown. */
export function ulcerIndex(equity: number[]): number {
  if (equity.length === 0) return 0
  let peak = equity[0]
  let sumSq = 0
  for (const e of equity) {
    if (e > peak) peak = e
    const dd = ((e - peak) / peak) * 100
    sumSq += dd * dd
  }
  return Math.sqrt(sumSq / equity.length)
}
