// Pure technical indicator utilities extracted for test coverage + reuse.

export function sma(arr: number[], p: number): number | null {
  if (arr.length < p || p <= 0) return null
  const slice = arr.slice(-p)
  return slice.reduce((a, b) => a + b, 0) / p
}

export function ema(arr: number[], p: number): number | null {
  if (arr.length < p || p <= 0) return null
  const k = 2 / (p + 1)
  let val = arr.slice(0, p).reduce((a, b) => a + b, 0) / p
  for (let i = p; i < arr.length; i++) val = arr[i] * k + val * (1 - k)
  return val
}

export function rsi(arr: number[], p = 14): number | null {
  if (arr.length <= p || p <= 0) return null
  let gains = 0
  let losses = 0
  for (let i = arr.length - p; i < arr.length; i++) {
    const d = arr[i] - arr[i - 1]
    if (d >= 0) gains += d
    else losses -= d
  }
  if (losses === 0) return 100
  const rs = gains / losses
  return 100 - 100 / (1 + rs)
}

export function stddev(arr: number[]): number {
  if (arr.length === 0) return 0
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length
  const v = arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length
  return Math.sqrt(v)
}

export function logReturns(close: number[]): number[] {
  const r: number[] = []
  for (let i = 1; i < close.length; i++) {
    if (close[i - 1] > 0 && close[i] > 0) r.push(Math.log(close[i] / close[i - 1]))
  }
  return r
}

export function maxDrawdown(equity: number[]): number {
  if (equity.length === 0) return 0
  let peak = equity[0]
  let dd = 0
  for (const e of equity) {
    if (e > peak) peak = e
    const d = (peak - e) / peak
    if (d > dd) dd = d
  }
  return dd === 0 ? 0 : -dd * 100
}

export function sharpeRatio(returns: number[], rfDaily = 0): number {
  if (returns.length === 0) return 0
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length
  const s = stddev(returns)
  if (s === 0) return 0
  // Annualized assuming 252 trading days
  return ((mean - rfDaily) / s) * Math.sqrt(252)
}

export function beta(assetReturns: number[], marketReturns: number[]): number | null {
  const n = Math.min(assetReturns.length, marketReturns.length)
  if (n < 2) return null
  const a = assetReturns.slice(-n)
  const m = marketReturns.slice(-n)
  const meanA = a.reduce((x, y) => x + y, 0) / n
  const meanM = m.reduce((x, y) => x + y, 0) / n
  let cov = 0
  let varM = 0
  for (let i = 0; i < n; i++) {
    cov += (a[i] - meanA) * (m[i] - meanM)
    varM += (m[i] - meanM) ** 2
  }
  if (varM === 0) return null
  return cov / varM
}

export function correlation(a: number[], b: number[]): number | null {
  const n = Math.min(a.length, b.length)
  if (n < 2) return null
  const A = a.slice(-n)
  const B = b.slice(-n)
  const meanA = A.reduce((x, y) => x + y, 0) / n
  const meanB = B.reduce((x, y) => x + y, 0) / n
  let cov = 0
  let varA = 0
  let varB = 0
  for (let i = 0; i < n; i++) {
    cov += (A[i] - meanA) * (B[i] - meanB)
    varA += (A[i] - meanA) ** 2
    varB += (B[i] - meanB) ** 2
  }
  if (varA === 0 || varB === 0) return null
  return cov / Math.sqrt(varA * varB)
}

/**
 * Position size via fixed-fractional risk.
 * accountSize = 100000, riskPct = 1 (for 1%), entry = 50, stop = 48 → risk/share = 2 → 500 shares.
 */
export function positionSize({
  accountSize,
  riskPct,
  entry,
  stop
}: {
  accountSize: number
  riskPct: number
  entry: number
  stop: number
}): {
  shares: number
  dollarRisk: number
  positionValue: number
  portfolioPct: number
  riskPerShare: number
} {
  if (!Number.isFinite(accountSize) || accountSize <= 0)
    return { shares: 0, dollarRisk: 0, positionValue: 0, portfolioPct: 0, riskPerShare: 0 }
  if (!Number.isFinite(riskPct) || riskPct <= 0)
    return { shares: 0, dollarRisk: 0, positionValue: 0, portfolioPct: 0, riskPerShare: 0 }
  if (!Number.isFinite(entry) || !Number.isFinite(stop) || entry <= 0)
    return { shares: 0, dollarRisk: 0, positionValue: 0, portfolioPct: 0, riskPerShare: 0 }
  const dollarRisk = accountSize * (riskPct / 100)
  const riskPerShare = Math.abs(entry - stop)
  if (riskPerShare === 0)
    return { shares: 0, dollarRisk, positionValue: 0, portfolioPct: 0, riskPerShare: 0 }
  const shares = Math.floor(dollarRisk / riskPerShare)
  const positionValue = shares * entry
  const portfolioPct = (positionValue / accountSize) * 100
  return { shares, dollarRisk, positionValue, portfolioPct, riskPerShare }
}

export function rMultiple(entry: number, exit: number, stop: number, side: 'long' | 'short' = 'long'): number {
  const risk = Math.abs(entry - stop)
  if (risk === 0) return 0
  const pnl = side === 'long' ? exit - entry : entry - exit
  return pnl / risk
}
