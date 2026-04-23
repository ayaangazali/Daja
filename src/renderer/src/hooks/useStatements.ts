import { useQuery } from '@tanstack/react-query'

export interface IncomeRow {
  date: string
  revenue: number | null
  costOfRevenue: number | null
  grossProfit: number | null
  operatingExpense: number | null
  operatingIncome: number | null
  netIncome: number | null
  ebitda: number | null
  eps: number | null
}

export interface BalanceRow {
  date: string
  totalAssets: number | null
  totalLiab: number | null
  totalEquity: number | null
  cash: number | null
  shortTermInvestments: number | null
  longTermDebt: number | null
  shortTermDebt: number | null
}

export interface CashflowRow {
  date: string
  operating: number | null
  investing: number | null
  financing: number | null
  capex: number | null
  freeCashflow: number | null
  repurchaseOfStock: number | null
  dividendsPaid: number | null
  issuanceOfStock: number | null
}

export interface Statements {
  symbol: string
  incomeAnnual: IncomeRow[]
  incomeQuarterly: IncomeRow[]
  balanceAnnual: BalanceRow[]
  balanceQuarterly: BalanceRow[]
  cashAnnual: CashflowRow[]
  cashQuarterly: CashflowRow[]
}

export function useStatements(
  ticker: string | undefined
): ReturnType<typeof useQuery<Statements, Error>> {
  return useQuery<Statements, Error>({
    queryKey: ['statements', ticker],
    queryFn: () => window.daja.finance.statements(ticker as string) as Promise<Statements>,
    enabled: !!ticker,
    staleTime: 30 * 60_000
  })
}

export interface Ownership {
  symbol: string
  insiderHolders: {
    name: string
    relation: string
    shares: number | null
    position: string | null
    date: string
  }[]
  insiderTransactions: {
    name: string
    transaction: string
    shares: number | null
    value: number | null
    date: string
  }[]
  institutionalOwnership: {
    organization: string
    shares: number | null
    position: number | null
    pctHeld: number | null
    reportDate: string
  }[]
  fundOwnership: {
    organization: string
    shares: number | null
    pctHeld: number | null
    reportDate: string
  }[]
  majorHolders: {
    insidersPercentHeld: number | null
    institutionsPercentHeld: number | null
    institutionsFloatPercentHeld: number | null
    institutionsCount: number | null
  }
}

export function useOwnership(
  ticker: string | undefined
): ReturnType<typeof useQuery<Ownership, Error>> {
  return useQuery<Ownership, Error>({
    queryKey: ['ownership', ticker],
    queryFn: () => window.daja.finance.ownership(ticker as string) as Promise<Ownership>,
    enabled: !!ticker,
    staleTime: 60 * 60_000
  })
}

export interface OptionsContract {
  contractSymbol: string
  strike: number
  lastPrice: number | null
  bid: number | null
  ask: number | null
  change: number | null
  percentChange: number | null
  volume: number | null
  openInterest: number | null
  impliedVolatility: number | null
  inTheMoney: boolean
  expiration: number
}

export interface OptionsChain {
  symbol: string
  underlyingPrice: number
  expirationDates: number[]
  currentExpiration: number
  calls: OptionsContract[]
  puts: OptionsContract[]
}

export function useOptions(
  ticker: string | undefined,
  expiration?: number
): ReturnType<typeof useQuery<OptionsChain, Error>> {
  return useQuery<OptionsChain, Error>({
    queryKey: ['options', ticker, expiration],
    queryFn: () =>
      window.daja.finance.options(ticker as string, expiration) as Promise<OptionsChain>,
    enabled: !!ticker,
    staleTime: 5 * 60_000
  })
}

export interface NewsItem {
  id: string
  title: string
  publisher: string
  link: string
  providerPublishTime: number
  type: string
  thumbnail: string | null
  relatedTickers: string[]
}

export function useNews(
  ticker: string | undefined
): ReturnType<typeof useQuery<NewsItem[], Error>> {
  return useQuery<NewsItem[], Error>({
    queryKey: ['news', ticker],
    queryFn: () => window.daja.finance.news(ticker as string) as Promise<NewsItem[]>,
    enabled: !!ticker,
    staleTime: 10 * 60_000
  })
}

export interface SecFiling {
  accession: string
  form: string
  filingDate: string
  reportDate: string
  primaryDocument: string
  url: string
}

export function useFilings(
  ticker: string | undefined
): ReturnType<typeof useQuery<SecFiling[], Error>> {
  return useQuery<SecFiling[], Error>({
    queryKey: ['filings', ticker],
    queryFn: () => window.daja.finance.filings(ticker as string) as Promise<SecFiling[]>,
    enabled: !!ticker,
    staleTime: 60 * 60_000
  })
}

export interface RedditPost {
  id: string
  title: string
  author: string
  score: number
  numComments: number
  permalink: string
  subreddit: string
  created: number
  selftext: string
}

export function useReddit(
  ticker: string | undefined
): ReturnType<typeof useQuery<RedditPost[], Error>> {
  return useQuery<RedditPost[], Error>({
    queryKey: ['reddit', ticker],
    queryFn: () => window.daja.finance.reddit(ticker as string) as Promise<RedditPost[]>,
    enabled: !!ticker,
    staleTime: 10 * 60_000
  })
}
