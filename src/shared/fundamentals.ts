/**
 * Canonical Fundamentals shape — single source of truth for both the main
 * process (fetchFundamentals via Yahoo) and the renderer (useFundamentals hook).
 * Both sides MUST import this type; do not redeclare locally.
 */
export interface Fundamentals {
  symbol: string
  name: string | null
  sector: string | null
  industry: string | null
  description: string | null
  employees: number | null
  // valuation
  marketCap: number | null
  enterpriseValue: number | null
  trailingPE: number | null
  forwardPE: number | null
  pegRatio: number | null
  priceToSales: number | null
  priceToBook: number | null
  priceToFcf: number | null
  // growth
  revenueGrowth: number | null
  earningsGrowth: number | null
  // margins
  profitMargins: number | null
  operatingMargins: number | null
  grossMargins: number | null
  // balance
  debtToEquity: number | null
  currentRatio: number | null
  quickRatio: number | null
  totalCash: number | null
  totalDebt: number | null
  // returns
  returnOnEquity: number | null
  returnOnAssets: number | null
  // yields
  dividendYield: number | null
  payoutRatio: number | null
  // statements (quarterly/annual EPS + revenue)
  epsQuarterly: { date: string; value: number | null }[]
  epsAnnual: { date: string; value: number | null }[]
  revenueQuarterly: { date: string; value: number | null }[]
  revenueAnnual: { date: string; value: number | null }[]
  // ownership
  sharesOutstanding: number | null
  floatShares: number | null
  insiderPercent: number | null
  institutionalPercent: number | null
  shortPercent: number | null
  sharesShort: number | null
  sharesShortPriorMonth: number | null
  shortRatio: number | null
  // analyst
  targetHigh: number | null
  targetLow: number | null
  targetMean: number | null
  recommendationMean: number | null
  recommendations: {
    strongBuy: number
    buy: number
    hold: number
    sell: number
    strongSell: number
  } | null
  recommendationTrend: {
    period: string
    strongBuy: number
    buy: number
    hold: number
    sell: number
    strongSell: number
  }[]
  // earnings surprises
  earningsHistory: {
    quarter: string
    epsActual: number | null
    epsEstimate: number | null
    surprisePercent: number | null
  }[]
}
