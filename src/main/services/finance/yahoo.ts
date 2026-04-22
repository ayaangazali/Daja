export interface YahooQuote {
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

export interface YahooHistoricalBar {
  time: number
  open: number | null
  high: number | null
  low: number | null
  close: number | null
  volume: number | null
}

export interface YahooSearchResult {
  symbol: string
  name: string
  exchange: string
  typeDisp: string
}

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Daja)',
  Accept: 'application/json'
}

interface ChartResp {
  chart: {
    result:
      | {
          meta: {
            symbol: string
            shortName?: string
            exchangeName?: string
            currency?: string
            regularMarketPrice?: number
            chartPreviousClose?: number
            previousClose?: number
            regularMarketDayHigh?: number
            regularMarketDayLow?: number
            fiftyTwoWeekHigh?: number
            fiftyTwoWeekLow?: number
            regularMarketVolume?: number
            marketCap?: number
          }
          timestamp?: number[]
          indicators: {
            quote: {
              open?: (number | null)[]
              close?: (number | null)[]
              high?: (number | null)[]
              low?: (number | null)[]
              volume?: (number | null)[]
            }[]
          }
        }[]
      | null
    error: { code: string; description: string } | null
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: DEFAULT_HEADERS })
  if (!res.ok) throw new Error(`Yahoo ${res.status}: ${url}`)
  return (await res.json()) as T
}

function rangeToInterval(range: string): string {
  switch (range) {
    case '1d':
      return '5m'
    case '5d':
      return '15m'
    case '1mo':
      return '1d'
    case '3mo':
    case '6mo':
      return '1d'
    case 'ytd':
    case '1y':
      return '1d'
    case '5y':
      return '1wk'
    case 'max':
      return '1mo'
    default:
      return '1d'
  }
}

export async function fetchQuote(symbol: string): Promise<YahooQuote> {
  const range = '1mo'
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?interval=1d&range=${range}&includePrePost=false`
  const data = await fetchJson<ChartResp>(url)
  const result = data.chart.result?.[0]
  if (!result) {
    throw new Error(data.chart.error?.description ?? 'No data')
  }
  const m = result.meta
  const closes = result.indicators.quote[0]?.close ?? []
  const price = m.regularMarketPrice ?? closes[closes.length - 1] ?? 0
  const previousClose = m.chartPreviousClose ?? m.previousClose ?? price
  const change = price - previousClose
  const changePercent = previousClose === 0 ? 0 : (change / previousClose) * 100
  const spark = closes.filter((v): v is number => v != null)
  const sparkTimes = (result.timestamp ?? []).slice(0, spark.length)
  return {
    symbol: m.symbol,
    shortName: m.shortName ?? null,
    exchange: m.exchangeName ?? null,
    currency: m.currency ?? 'USD',
    price,
    previousClose,
    change,
    changePercent,
    marketCap: m.marketCap ?? null,
    volume: m.regularMarketVolume ?? null,
    dayHigh: m.regularMarketDayHigh ?? null,
    dayLow: m.regularMarketDayLow ?? null,
    fiftyTwoWeekHigh: m.fiftyTwoWeekHigh ?? null,
    fiftyTwoWeekLow: m.fiftyTwoWeekLow ?? null,
    spark,
    sparkTimes
  }
}

export async function fetchHistorical(
  symbol: string,
  range: string
): Promise<YahooHistoricalBar[]> {
  const interval = rangeToInterval(range)
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?interval=${interval}&range=${range}&includePrePost=false`
  const data = await fetchJson<ChartResp>(url)
  const r = data.chart.result?.[0]
  if (!r) return []
  const ts = r.timestamp ?? []
  const q = r.indicators.quote[0] ?? {}
  const bars: YahooHistoricalBar[] = ts.map((t, i) => ({
    time: t,
    open: q.open?.[i] ?? null,
    high: q.high?.[i] ?? null,
    low: q.low?.[i] ?? null,
    close: q.close?.[i] ?? null,
    volume: q.volume?.[i] ?? null
  }))
  return bars.filter((b) => b.close != null)
}

interface SearchResp {
  quotes?: {
    symbol: string
    shortname?: string
    longname?: string
    exchDisp?: string
    exchange?: string
    typeDisp?: string
  }[]
}

export async function searchTickers(q: string): Promise<YahooSearchResult[]> {
  if (!q.trim()) return []
  const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
    q
  )}&lang=en-US&region=US&quotesCount=8&newsCount=0`
  const data = await fetchJson<SearchResp>(url)
  return (data.quotes ?? []).map((x) => ({
    symbol: x.symbol,
    name: x.longname ?? x.shortname ?? x.symbol,
    exchange: x.exchDisp ?? x.exchange ?? '',
    typeDisp: x.typeDisp ?? ''
  }))
}
