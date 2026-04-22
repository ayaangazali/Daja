import { useQueries, useQuery, type UseQueryResult } from '@tanstack/react-query'

export interface Quote {
  symbol: string
  shortName: string | null
  exchange: string | null
  currency: string
  price: number
  previousClose: number
  change: number
  changePercent: number
  marketCap: number | null
  volume: number | null
  dayHigh: number | null
  dayLow: number | null
  fiftyTwoWeekHigh: number | null
  fiftyTwoWeekLow: number | null
  spark: number[]
  sparkTimes: number[]
}

export interface HistoricalBar {
  time: number
  open: number | null
  high: number | null
  low: number | null
  close: number | null
  volume: number | null
}

export interface SearchResult {
  symbol: string
  name: string
  exchange: string
  typeDisp: string
}

export function useQuote(ticker: string | undefined): ReturnType<typeof useQuery<Quote, Error>> {
  return useQuery<Quote, Error>({
    queryKey: ['quote', ticker],
    queryFn: () => window.daja.finance.quote(ticker as string) as Promise<Quote>,
    enabled: !!ticker,
    staleTime: 60_000,
    refetchInterval: 60_000
  })
}

export function useQuotes(tickers: string[]): UseQueryResult<Quote, Error>[] {
  return useQueries({
    queries: tickers.map((t) => ({
      queryKey: ['quote', t],
      queryFn: () => window.daja.finance.quote(t) as Promise<Quote>,
      staleTime: 60_000,
      refetchInterval: 60_000
    }))
  }) as UseQueryResult<Quote, Error>[]
}

export function useHistorical(
  ticker: string | undefined,
  range: string
): ReturnType<typeof useQuery<HistoricalBar[], Error>> {
  return useQuery<HistoricalBar[], Error>({
    queryKey: ['historical', ticker, range],
    queryFn: () =>
      window.daja.finance.historical(ticker as string, range) as Promise<HistoricalBar[]>,
    enabled: !!ticker,
    staleTime: 5 * 60_000
  })
}

export function useSearch(q: string): ReturnType<typeof useQuery<SearchResult[], Error>> {
  return useQuery<SearchResult[], Error>({
    queryKey: ['search', q],
    queryFn: () => window.daja.finance.search(q) as Promise<SearchResult[]>,
    enabled: q.trim().length > 0,
    staleTime: 30_000
  })
}
