import { useQuery } from '@tanstack/react-query'

export interface Fundamentals {
  symbol: string
  name: string | null
  sector: string | null
  industry: string | null
  description: string | null
  employees: number | null
  marketCap: number | null
  enterpriseValue: number | null
  trailingPE: number | null
  forwardPE: number | null
  pegRatio: number | null
  priceToSales: number | null
  priceToBook: number | null
  priceToFcf: number | null
  revenueGrowth: number | null
  earningsGrowth: number | null
  profitMargins: number | null
  operatingMargins: number | null
  grossMargins: number | null
  debtToEquity: number | null
  currentRatio: number | null
  quickRatio: number | null
  totalCash: number | null
  totalDebt: number | null
  returnOnEquity: number | null
  returnOnAssets: number | null
  dividendYield: number | null
  payoutRatio: number | null
  epsQuarterly: { date: string; value: number | null }[]
  epsAnnual: { date: string; value: number | null }[]
  revenueQuarterly: { date: string; value: number | null }[]
  revenueAnnual: { date: string; value: number | null }[]
  sharesOutstanding: number | null
  floatShares: number | null
  insiderPercent: number | null
  institutionalPercent: number | null
  shortPercent: number | null
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
  earningsHistory: {
    quarter: string
    epsActual: number | null
    epsEstimate: number | null
    surprisePercent: number | null
  }[]
}

export function useFundamentals(
  ticker: string | undefined
): ReturnType<typeof useQuery<Fundamentals, Error>> {
  return useQuery<Fundamentals, Error>({
    queryKey: ['fundamentals', ticker],
    queryFn: () => window.daja.finance.fundamentals(ticker as string) as Promise<Fundamentals>,
    enabled: !!ticker,
    staleTime: 15 * 60_000
  })
}
