export interface MonthlyReturn {
  year: number
  month: number // 1..12
  pct: number
}

export interface SeasonalitySummary {
  grid: (number | null)[][] // [yearIdx][monthIdx 0..11]
  years: number[]
  avgByMonth: (number | null)[] // length 12
  bestMonth: number | null
  worstMonth: number | null
  annualByYear: (number | null)[]
}

interface PricePoint {
  date: string // ISO yyyy-mm-dd
  close: number
}

/**
 * Compute monthly returns from daily closes. A month's return = (last close of
 * month / last close of prior month) - 1. Returns year-month grid + per-month
 * averages across years.
 */
export function analyzeSeasonality(points: PricePoint[]): SeasonalitySummary {
  // Keep last close of each (year, month)
  const lastByMonth = new Map<string, { year: number; month: number; close: number }>()
  for (const p of points) {
    const y = parseInt(p.date.slice(0, 4), 10)
    const m = parseInt(p.date.slice(5, 7), 10)
    if (Number.isNaN(y) || Number.isNaN(m)) continue
    const key = `${y}-${m}`
    lastByMonth.set(key, { year: y, month: m, close: p.close })
  }
  const ordered = [...lastByMonth.values()].sort(
    (a, b) => a.year * 12 + a.month - (b.year * 12 + b.month)
  )
  const returns: MonthlyReturn[] = []
  for (let i = 1; i < ordered.length; i++) {
    const prev = ordered[i - 1]
    const curr = ordered[i]
    if (prev.close > 0) {
      returns.push({
        year: curr.year,
        month: curr.month,
        pct: ((curr.close - prev.close) / prev.close) * 100
      })
    }
  }

  const years = Array.from(new Set(returns.map((r) => r.year))).sort((a, b) => a - b)
  const grid: (number | null)[][] = years.map(() => Array(12).fill(null))
  for (const r of returns) {
    const yi = years.indexOf(r.year)
    if (yi >= 0) grid[yi][r.month - 1] = r.pct
  }

  // Average per month across years (skip nulls)
  const avgByMonth: (number | null)[] = Array.from({ length: 12 }, (_, m) => {
    const vals = returns.filter((r) => r.month === m + 1).map((r) => r.pct)
    if (vals.length === 0) return null
    return vals.reduce((s, v) => s + v, 0) / vals.length
  })

  let bestMonth: number | null = null
  let worstMonth: number | null = null
  let bestVal = -Infinity
  let worstVal = Infinity
  avgByMonth.forEach((v, i) => {
    if (v == null) return
    if (v > bestVal) {
      bestVal = v
      bestMonth = i + 1
    }
    if (v < worstVal) {
      worstVal = v
      worstMonth = i + 1
    }
  })

  // Annual compounded return per year
  const annualByYear: (number | null)[] = years.map((y) => {
    const ret = returns.filter((r) => r.year === y).map((r) => r.pct)
    if (ret.length === 0) return null
    // Compounded: product of (1 + r/100) - 1
    const compounded = ret.reduce((acc, r) => acc * (1 + r / 100), 1) - 1
    return compounded * 100
  })

  return { grid, years, avgByMonth, bestMonth, worstMonth, annualByYear }
}
