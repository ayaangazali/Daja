export interface DividendEvent {
  date: string // ISO yyyy-mm-dd
  amount: number
}

export interface DividendGrowth {
  annualByYear: { year: number; total: number }[]
  growth1y: number | null
  cagr3y: number | null
  cagr5y: number | null
  increaseStreak: number
  lastAmount: number | null
  lastDate: string | null
}

function cagr(start: number, end: number, years: number): number | null {
  if (start <= 0 || end <= 0 || years <= 0) return null
  return (Math.pow(end / start, 1 / years) - 1) * 100
}

export function analyzeDividendGrowth(history: DividendEvent[]): DividendGrowth {
  if (history.length === 0) {
    return {
      annualByYear: [],
      growth1y: null,
      cagr3y: null,
      cagr5y: null,
      increaseStreak: 0,
      lastAmount: null,
      lastDate: null
    }
  }

  const byYear = new Map<number, number>()
  for (const e of history) {
    const y = parseInt(e.date.slice(0, 4), 10)
    if (Number.isNaN(y)) continue
    byYear.set(y, (byYear.get(y) ?? 0) + e.amount)
  }

  // Drop current partial year if fewer divs than expected by prior year.
  // Simpler: just include all years, noting latest may be partial.
  const sorted = [...byYear.entries()]
    .map(([year, total]) => ({ year, total }))
    .sort((a, b) => a.year - b.year)

  // Exclude the most recent year if it's the current year and has fewer
  // payments than prior year — likely still mid-year and incomplete.
  const nowYear = new Date().getUTCFullYear()
  const latest = sorted[sorted.length - 1]
  const prior = sorted[sorted.length - 2]
  if (latest && latest.year === nowYear && prior) {
    const latestCount = history.filter((e) => e.date.startsWith(String(nowYear))).length
    const priorCount = history.filter((e) => e.date.startsWith(String(prior.year))).length
    if (priorCount > 0 && latestCount < priorCount) {
      sorted.pop()
    }
  }

  let streak = 0
  for (let i = sorted.length - 1; i > 0; i--) {
    if (sorted[i].total > sorted[i - 1].total) streak++
    else break
  }

  const latestY = sorted[sorted.length - 1]
  const last1 = sorted[sorted.length - 2]
  const last3 = sorted[sorted.length - 4]
  const last5 = sorted[sorted.length - 6]

  const growth1y =
    latestY && last1 && last1.total > 0 ? ((latestY.total - last1.total) / last1.total) * 100 : null
  const cagr3 = latestY && last3 ? cagr(last3.total, latestY.total, 3) : null
  const cagr5 = latestY && last5 ? cagr(last5.total, latestY.total, 5) : null

  const sortedByDate = [...history].sort((a, b) => b.date.localeCompare(a.date))
  const lastEv = sortedByDate[0] ?? null

  return {
    annualByYear: sorted,
    growth1y,
    cagr3y: cagr3,
    cagr5y: cagr5,
    increaseStreak: streak,
    lastAmount: lastEv?.amount ?? null,
    lastDate: lastEv?.date ?? null
  }
}
