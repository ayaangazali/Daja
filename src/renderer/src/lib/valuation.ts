// Analyst-grade valuation + quality scoring helpers.
// Pure functions, no IO. Input shapes match our Statements + Fundamentals types.

export interface ValuationRow {
  date: string
  revenue: number | null
  netIncome: number | null
  operatingIncome: number | null
  ebitda: number | null
  eps: number | null
}

export interface BalanceRow {
  date: string
  totalAssets: number | null
  totalLiab: number | null
  totalEquity: number | null
  cash: number | null
  longTermDebt: number | null
  shortTermDebt: number | null
}

export interface CashRow {
  date: string
  operating: number | null
  capex: number | null
  freeCashflow: number | null
}

// ────────────────────────────────────────────────────────────────
// Graham Number — classic Ben Graham fair value for defensive investor.
// sqrt(22.5 * EPS * BVPS)
// ────────────────────────────────────────────────────────────────
export function grahamNumber(eps: number | null, bvps: number | null): number | null {
  if (eps == null || bvps == null || eps <= 0 || bvps <= 0) return null
  return Math.sqrt(22.5 * eps * bvps)
}

// ────────────────────────────────────────────────────────────────
// DCF — single-stage Gordon growth + multi-year explicit forecast.
// Returns intrinsic value per share (equity value / shares out).
// ────────────────────────────────────────────────────────────────
export interface DcfInput {
  fcfBase: number // latest FCF (TTM)
  growthRate: number // explicit period growth (decimal, 0.08 = 8%)
  terminalGrowth: number // perpetuity growth (decimal)
  discountRate: number // WACC (decimal)
  years: number
  sharesOut: number
  netDebt: number // long + short debt − cash
}

export function dcfValue(input: DcfInput): {
  intrinsicValue: number
  perShare: number
  pvForecast: number[]
  pvTerminal: number
  enterpriseValue: number
} | null {
  const { fcfBase, growthRate, terminalGrowth, discountRate, years, sharesOut, netDebt } = input
  if (discountRate <= terminalGrowth) return null
  if (sharesOut <= 0 || years <= 0) return null
  const pvForecast: number[] = []
  let lastFcf = fcfBase
  for (let y = 1; y <= years; y++) {
    lastFcf = lastFcf * (1 + growthRate)
    const pv = lastFcf / Math.pow(1 + discountRate, y)
    pvForecast.push(pv)
  }
  const terminalFcf = lastFcf * (1 + terminalGrowth)
  const terminalValue = terminalFcf / (discountRate - terminalGrowth)
  const pvTerminal = terminalValue / Math.pow(1 + discountRate, years)
  const enterpriseValue = pvForecast.reduce((s, v) => s + v, 0) + pvTerminal
  const intrinsicValue = enterpriseValue - netDebt
  const perShare = intrinsicValue / sharesOut
  return { intrinsicValue, perShare, pvForecast, pvTerminal, enterpriseValue }
}

// ────────────────────────────────────────────────────────────────
// Piotroski F-Score — 9-point financial strength check.
// Profitability (4):   net income > 0, OCF > 0, ROA rising, OCF > NI (quality of earnings)
// Leverage/Liq (3):     LT debt lower, current ratio rising, no new shares
// Efficiency (2):       gross margin rising, asset turnover rising
// ────────────────────────────────────────────────────────────────
export interface PiotroskiInput {
  curr: {
    netIncome: number | null
    ocf: number | null
    totalAssets: number | null
    prevAssets: number | null
    longTermDebt: number | null
    currentRatio: number | null
    sharesOut: number | null
    grossMargin: number | null
    assetTurnover: number | null
  }
  prev: {
    netIncome: number | null
    ocf: number | null
    totalAssets: number | null
    longTermDebt: number | null
    currentRatio: number | null
    sharesOut: number | null
    grossMargin: number | null
    assetTurnover: number | null
  }
}

export interface PiotroskiResult {
  score: number
  checks: { name: string; passed: boolean; detail?: string }[]
}

export function piotroskiScore({ curr, prev }: PiotroskiInput): PiotroskiResult {
  const checks: { name: string; passed: boolean; detail?: string }[] = []
  const c: typeof curr = curr
  const p: typeof prev = prev

  // 1. Positive net income
  checks.push({
    name: 'Positive net income',
    passed: (c.netIncome ?? 0) > 0
  })
  // 2. Positive operating cash flow
  checks.push({
    name: 'Positive OCF',
    passed: (c.ocf ?? 0) > 0
  })
  // 3. ROA rising (NI / assets)
  const roaC = c.netIncome != null && c.totalAssets != null && c.totalAssets > 0 ? c.netIncome / c.totalAssets : null
  const roaP = p.netIncome != null && p.totalAssets != null && p.totalAssets > 0 ? p.netIncome / p.totalAssets : null
  checks.push({
    name: 'ROA improving',
    passed: roaC != null && roaP != null && roaC > roaP
  })
  // 4. OCF > NI (earnings quality)
  checks.push({
    name: 'OCF > net income',
    passed: c.ocf != null && c.netIncome != null && c.ocf > c.netIncome
  })
  // 5. LT debt lower vs prior
  checks.push({
    name: 'LT debt reduced',
    passed: c.longTermDebt != null && p.longTermDebt != null && c.longTermDebt < p.longTermDebt
  })
  // 6. Current ratio rising
  checks.push({
    name: 'Current ratio improving',
    passed:
      c.currentRatio != null && p.currentRatio != null && c.currentRatio > p.currentRatio
  })
  // 7. No new shares (no dilution)
  checks.push({
    name: 'No dilution',
    passed: c.sharesOut != null && p.sharesOut != null && c.sharesOut <= p.sharesOut
  })
  // 8. Gross margin rising
  checks.push({
    name: 'Gross margin improving',
    passed: c.grossMargin != null && p.grossMargin != null && c.grossMargin > p.grossMargin
  })
  // 9. Asset turnover rising
  checks.push({
    name: 'Asset turnover improving',
    passed:
      c.assetTurnover != null && p.assetTurnover != null && c.assetTurnover > p.assetTurnover
  })

  const score = checks.filter((c) => c.passed).length
  return { score, checks }
}

// ────────────────────────────────────────────────────────────────
// Altman Z-Score — bankruptcy risk for manufacturing firms (original 1968).
// Z = 1.2*A + 1.4*B + 3.3*C + 0.6*D + 1.0*E
//   A = working capital / total assets
//   B = retained earnings / total assets
//   C = EBIT / total assets
//   D = market value equity / total liabilities
//   E = sales / total assets
// Zone: >2.99 safe, 1.81-2.99 grey, <1.81 distress
// ────────────────────────────────────────────────────────────────
export interface AltmanInput {
  workingCapital: number | null
  retainedEarnings: number | null
  ebit: number | null
  marketCap: number | null
  totalLiab: number | null
  sales: number | null
  totalAssets: number | null
}

export function altmanZ(i: AltmanInput): { z: number | null; zone: 'safe' | 'grey' | 'distress' | 'unknown' } {
  if (
    i.workingCapital == null ||
    i.retainedEarnings == null ||
    i.ebit == null ||
    i.marketCap == null ||
    i.totalLiab == null ||
    i.sales == null ||
    i.totalAssets == null ||
    i.totalAssets === 0 ||
    i.totalLiab === 0
  ) {
    return { z: null, zone: 'unknown' }
  }
  const A = i.workingCapital / i.totalAssets
  const B = i.retainedEarnings / i.totalAssets
  const C = i.ebit / i.totalAssets
  const D = i.marketCap / i.totalLiab
  const E = i.sales / i.totalAssets
  const z = 1.2 * A + 1.4 * B + 3.3 * C + 0.6 * D + 1.0 * E
  const zone = z > 2.99 ? 'safe' : z > 1.81 ? 'grey' : 'distress'
  return { z, zone }
}

// ────────────────────────────────────────────────────────────────
// ROIC — Return on Invested Capital
// NOPAT / (Debt + Equity - Cash)
// ────────────────────────────────────────────────────────────────
export function roic(input: {
  operatingIncome: number | null
  taxRate: number
  totalDebt: number | null
  totalEquity: number | null
  cash: number | null
}): number | null {
  const { operatingIncome, taxRate, totalDebt, totalEquity, cash } = input
  if (operatingIncome == null || totalDebt == null || totalEquity == null) return null
  const nopat = operatingIncome * (1 - taxRate)
  const invested = totalDebt + totalEquity - (cash ?? 0)
  if (invested <= 0) return null
  return (nopat / invested) * 100
}

// ────────────────────────────────────────────────────────────────
// Magic Formula Rank (Greenblatt) — earnings yield + ROIC.
// Returns components; ranking happens across a universe elsewhere.
// ────────────────────────────────────────────────────────────────
export function magicFormulaMetrics(input: {
  ebit: number | null
  enterpriseValue: number | null
  roicPct: number | null
}): { earningsYieldPct: number | null; roicPct: number | null } {
  const { ebit, enterpriseValue, roicPct } = input
  const earningsYieldPct =
    ebit != null && enterpriseValue != null && enterpriseValue > 0
      ? (ebit / enterpriseValue) * 100
      : null
  return { earningsYieldPct, roicPct }
}

// ────────────────────────────────────────────────────────────────
// Sustainable Growth Rate = ROE × retention ratio
// ────────────────────────────────────────────────────────────────
export function sustainableGrowth(roePct: number | null, payoutRatio: number | null): number | null {
  if (roePct == null) return null
  const retention = payoutRatio != null ? 1 - payoutRatio : 1
  return roePct * retention
}

// ────────────────────────────────────────────────────────────────
// FCF Yield = FCF / Market Cap
// ────────────────────────────────────────────────────────────────
export function fcfYield(fcf: number | null, marketCap: number | null): number | null {
  if (fcf == null || marketCap == null || marketCap <= 0) return null
  return (fcf / marketCap) * 100
}

// ────────────────────────────────────────────────────────────────
// Shareholder Yield = (Dividends + Buybacks) / Market Cap
// ────────────────────────────────────────────────────────────────
export function shareholderYield(
  dividends: number | null,
  buybacks: number | null,
  marketCap: number | null
): number | null {
  if (marketCap == null || marketCap <= 0) return null
  const d = dividends ?? 0
  const b = buybacks ?? 0
  return ((d + b) / marketCap) * 100
}

// ────────────────────────────────────────────────────────────────
// Interest Coverage = EBIT / Interest Expense
// >3 = healthy, <1.5 = distressed
// ────────────────────────────────────────────────────────────────
export function interestCoverage(ebit: number | null, interestExpense: number | null): number | null {
  if (ebit == null || interestExpense == null || interestExpense === 0) return null
  return ebit / Math.abs(interestExpense)
}

// ────────────────────────────────────────────────────────────────
// FCF Conversion = FCF / Net Income  (>1 = high-quality earnings)
// ────────────────────────────────────────────────────────────────
export function fcfConversion(fcf: number | null, netIncome: number | null): number | null {
  if (fcf == null || netIncome == null || netIncome === 0) return null
  return fcf / netIncome
}

// ────────────────────────────────────────────────────────────────
// CAGR over n years from first + last value
// ────────────────────────────────────────────────────────────────
export function cagr(first: number | null, last: number | null, years: number): number | null {
  if (first == null || last == null || first <= 0 || last <= 0 || years <= 0) return null
  return (Math.pow(last / first, 1 / years) - 1) * 100
}
