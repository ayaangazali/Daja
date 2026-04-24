/**
 * Dividend sustainability heuristic.
 *
 * Scores a payout on four criteria, each 0-25 points:
 *   - Payout ratio (<50% healthy, 50-80% watch, >80% stressed)
 *   - FCF coverage of dividend (>2x healthy, 1.2-2x watch, <1.2x red flag)
 *   - Earnings growth trend (positive growth supports increase capacity)
 *   - Balance-sheet strength (debt/equity, cash relative to debt)
 *
 * 0-100 composite → green (80+), yellow (50-79), red (<50).
 */

import type { Fundamentals } from '../../../shared/fundamentals'

export interface DividendSustainability {
  score: number // 0..100
  tier: 'green' | 'yellow' | 'red' | 'n/a'
  factors: {
    payoutRatio: { value: number | null; points: number; note: string }
    fcfCoverage: { value: number | null; points: number; note: string }
    earningsGrowth: { value: number | null; points: number; note: string }
    leverage: { value: number | null; points: number; note: string }
  }
  summary: string
}

export interface DividendInputs {
  dividendYield: number | null
  payoutRatio: number | null
  earningsGrowth: number | null
  debtToEquity: number | null
  totalCash: number | null
  totalDebt: number | null
  /** Optional — TTM free cash flow, if the caller has it */
  freeCashflowTTM?: number | null
  /** Market cap — used to estimate dividend dollars paid when needed */
  marketCap?: number | null
}

export function assessDividendSustainability(f: DividendInputs): DividendSustainability {
  const { dividendYield } = f
  const zero = {
    score: 0,
    tier: 'n/a' as const,
    factors: {
      payoutRatio: { value: null, points: 0, note: 'Not applicable — no dividend.' },
      fcfCoverage: { value: null, points: 0, note: '' },
      earningsGrowth: { value: null, points: 0, note: '' },
      leverage: { value: null, points: 0, note: '' }
    },
    summary: 'Non-dividend paying (or yield data unavailable).'
  }

  if (dividendYield == null || dividendYield <= 0) return zero

  // Payout ratio scoring
  const payout = f.payoutRatio
  let payoutPts = 0
  let payoutNote = 'Payout ratio unavailable.'
  if (payout != null) {
    if (payout < 0) {
      payoutPts = 0
      payoutNote = `Negative payout ratio (${(payout * 100).toFixed(0)}%) — company paying out more than earning.`
    } else if (payout < 0.5) {
      payoutPts = 25
      payoutNote = `Healthy payout ${(payout * 100).toFixed(0)}% — room for increases.`
    } else if (payout < 0.8) {
      payoutPts = 15
      payoutNote = `Moderate payout ${(payout * 100).toFixed(0)}% — watch for earnings drops.`
    } else if (payout < 1.0) {
      payoutPts = 7
      payoutNote = `Stretched payout ${(payout * 100).toFixed(0)}% — cut risk if earnings slip.`
    } else {
      payoutPts = 0
      payoutNote = `Unsustainable payout ${(payout * 100).toFixed(0)}% of earnings.`
    }
  }

  // FCF coverage — dividends paid / FCF. >2x is healthy.
  let fcfPts = 0
  let fcfNote = 'FCF coverage unavailable.'
  let fcfCoverage: number | null = null
  if (f.freeCashflowTTM != null && f.marketCap != null && dividendYield != null) {
    // Approximate annual dividend $ = market cap × yield
    const annualDividends = f.marketCap * dividendYield
    if (annualDividends > 0) {
      fcfCoverage = f.freeCashflowTTM / annualDividends
      if (fcfCoverage >= 2) {
        fcfPts = 25
        fcfNote = `FCF covers dividend ${fcfCoverage.toFixed(1)}× — strong.`
      } else if (fcfCoverage >= 1.2) {
        fcfPts = 15
        fcfNote = `FCF covers dividend ${fcfCoverage.toFixed(1)}× — adequate.`
      } else if (fcfCoverage >= 1) {
        fcfPts = 8
        fcfNote = `FCF barely covers dividend ${fcfCoverage.toFixed(1)}×.`
      } else {
        fcfPts = 0
        fcfNote = `FCF covers only ${fcfCoverage.toFixed(1)}× — dividend funded from debt or cash reserves.`
      }
    }
  }

  // Earnings growth — positive growth is a proxy for future payout capacity
  let growthPts = 0
  let growthNote = 'Earnings growth unavailable.'
  if (f.earningsGrowth != null) {
    const g = f.earningsGrowth
    if (g >= 0.1) {
      growthPts = 25
      growthNote = `Strong earnings growth ${(g * 100).toFixed(0)}% — dividend hikes plausible.`
    } else if (g >= 0.02) {
      growthPts = 18
      growthNote = `Modest earnings growth ${(g * 100).toFixed(0)}%.`
    } else if (g >= -0.05) {
      growthPts = 10
      growthNote = `Flat earnings (${(g * 100).toFixed(0)}%) — hold for now.`
    } else {
      growthPts = 0
      growthNote = `Earnings contracting ${(g * 100).toFixed(0)}% — payout pressure likely.`
    }
  }

  // Leverage — lower debt/equity + cash cushion reduces cut risk under stress
  let levPts = 0
  let levNote = 'Balance-sheet metrics unavailable.'
  const de = f.debtToEquity
  if (de != null) {
    if (de < 0.5) {
      levPts = 25
      levNote = `Low leverage D/E ${de.toFixed(2)} — balance sheet absorbs shocks.`
    } else if (de < 1.5) {
      levPts = 15
      levNote = `Moderate leverage D/E ${de.toFixed(2)}.`
    } else if (de < 3) {
      levPts = 7
      levNote = `Elevated leverage D/E ${de.toFixed(2)} — dividend cut possible in a downturn.`
    } else {
      levPts = 0
      levNote = `High leverage D/E ${de.toFixed(2)} — dividend at material risk if cash flow stressed.`
    }
    // Bonus: net cash position
    if (f.totalCash != null && f.totalDebt != null && f.totalCash > f.totalDebt) {
      levPts = Math.min(25, levPts + 5)
      levNote += ' Net cash position strengthens coverage.'
    }
  }

  const score = payoutPts + fcfPts + growthPts + levPts
  let tier: DividendSustainability['tier'] = 'red'
  if (score >= 80) tier = 'green'
  else if (score >= 50) tier = 'yellow'

  const summary =
    tier === 'green'
      ? `Sustainable dividend (score ${score}/100). Monitor quarterly — no red flags currently.`
      : tier === 'yellow'
        ? `Dividend holding but watch for deterioration. Score ${score}/100.`
        : `Dividend at meaningful risk. Score ${score}/100. Prioritize the factor with lowest points when deciding whether to hold.`

  return {
    score,
    tier,
    factors: {
      payoutRatio: { value: payout, points: payoutPts, note: payoutNote },
      fcfCoverage: { value: fcfCoverage, points: fcfPts, note: fcfNote },
      earningsGrowth: { value: f.earningsGrowth, points: growthPts, note: growthNote },
      leverage: { value: de, points: levPts, note: levNote }
    },
    summary
  }
}

export function fromFundamentals(
  f: Fundamentals,
  freeCashflowTTM?: number | null
): DividendSustainability {
  return assessDividendSustainability({
    dividendYield: f.dividendYield,
    payoutRatio: f.payoutRatio,
    earningsGrowth: f.earningsGrowth,
    debtToEquity: f.debtToEquity,
    totalCash: f.totalCash,
    totalDebt: f.totalDebt,
    freeCashflowTTM,
    marketCap: f.marketCap
  })
}
