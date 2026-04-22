/**
 * Lightweight historical "what-if" backtest. Given daily bars, a start index,
 * and an invested amount, computes the growth trajectory and a summary.
 *
 * Optional: monthly DCA contributions. Returns equity curve + metrics
 * (final value, total return %, CAGR, max drawdown).
 */

export interface BacktestInput {
  closes: number[]
  times: number[] // UNIX seconds per bar
  startIndex: number
  initialAmount: number
  monthlyContribution?: number
}

export interface BacktestResult {
  equity: (number | null)[]
  contributions: (number | null)[]
  finalValue: number
  totalReturnPct: number
  cagr: number
  maxDrawdownPct: number
  totalContributed: number
}

export function runBacktest(input: BacktestInput): BacktestResult {
  const { closes, times, startIndex, initialAmount } = input
  const monthly = input.monthlyContribution ?? 0
  const equity: (number | null)[] = Array(closes.length).fill(null)
  const contribs: (number | null)[] = Array(closes.length).fill(null)

  if (closes.length === 0 || startIndex < 0 || startIndex >= closes.length) {
    return {
      equity,
      contributions: contribs,
      finalValue: 0,
      totalReturnPct: 0,
      cagr: 0,
      maxDrawdownPct: 0,
      totalContributed: 0
    }
  }

  let shares = initialAmount / closes[startIndex]
  let totalContributed = initialAmount
  let lastContribMonth = new Date(times[startIndex] * 1000).getUTCMonth()
  let peak = initialAmount

  let maxDd = 0

  for (let i = startIndex; i < closes.length; i++) {
    const date = new Date(times[i] * 1000)
    const month = date.getUTCMonth()
    if (monthly > 0 && month !== lastContribMonth) {
      shares += monthly / closes[i]
      totalContributed += monthly
      lastContribMonth = month
    }
    const val = shares * closes[i]
    equity[i] = val
    contribs[i] = totalContributed
    if (val > peak) peak = val
    const dd = (peak - val) / peak
    if (dd > maxDd) maxDd = dd
  }

  const finalValue = equity[closes.length - 1] ?? 0
  const totalReturnPct = ((finalValue - totalContributed) / totalContributed) * 100
  const years = Math.max(1 / 365, (times[closes.length - 1] - times[startIndex]) / 86400 / 365.25)
  const cagr = (Math.pow(finalValue / totalContributed, 1 / years) - 1) * 100

  return {
    equity,
    contributions: contribs,
    finalValue,
    totalReturnPct,
    cagr,
    maxDrawdownPct: -maxDd * 100,
    totalContributed
  }
}

/** Find index of bar closest to target date (epoch seconds). */
export function findIndexForDate(times: number[], targetSec: number): number {
  let best = 0
  let bestDiff = Infinity
  for (let i = 0; i < times.length; i++) {
    const diff = Math.abs(times[i] - targetSec)
    if (diff < bestDiff) {
      bestDiff = diff
      best = i
    }
  }
  return best
}

/** Convert YYYY-MM-DD string to epoch seconds (UTC). */
export function dateToSec(dateStr: string): number {
  return Math.floor(new Date(dateStr + 'T00:00:00Z').getTime() / 1000)
}
