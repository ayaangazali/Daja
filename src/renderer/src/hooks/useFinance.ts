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

/**
 * Market-hours-aware refetch cadence.
 * During NYSE regular hours (09:30–16:00 ET Mon-Fri): refresh every 60s.
 * Pre/post (04:00–09:30, 16:00–20:00 ET): every 5 min.
 * Otherwise (overnight, weekends, holidays): every 30 min — quotes barely move.
 */
function marketAwareInterval(): number {
  const now = new Date()
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const day = et.getDay()
  if (day === 0 || day === 6) return 30 * 60_000
  const mins = et.getHours() * 60 + et.getMinutes()
  if (mins >= 9 * 60 + 30 && mins < 16 * 60) return 60_000
  if ((mins >= 4 * 60 && mins < 9 * 60 + 30) || (mins >= 16 * 60 && mins < 20 * 60))
    return 5 * 60_000
  return 30 * 60_000
}

export function useQuote(ticker: string | undefined): ReturnType<typeof useQuery<Quote, Error>> {
  const interval = marketAwareInterval()
  return useQuery<Quote, Error>({
    queryKey: ['quote', ticker],
    queryFn: () => window.daja.finance.quote(ticker as string) as Promise<Quote>,
    enabled: !!ticker,
    staleTime: interval,
    refetchInterval: interval
  })
}

export function useQuotes(tickers: string[]): UseQueryResult<Quote, Error>[] {
  const interval = marketAwareInterval()
  return useQueries({
    queries: tickers.map((t) => ({
      queryKey: ['quote', t],
      queryFn: () => window.daja.finance.quote(t) as Promise<Quote>,
      staleTime: interval,
      refetchInterval: interval
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
