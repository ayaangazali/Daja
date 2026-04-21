import { yahooFetch } from './yahooAuth'

export interface DividendEvent {
  date: string
  amount: number
}

export interface DividendInfo {
  symbol: string
  yield: number | null
  rate: number | null
  exDate: string | null
  payDate: string | null
  history: DividendEvent[]
}

// Use Yahoo's chart endpoint w/ events=div to get dividend history
export async function fetchDividends(symbol: string): Promise<DividendInfo> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?interval=1mo&range=10y&events=div,split&includePrePost=false`
  const res = await yahooFetch(url)
  if (!res.ok) {
    return { symbol, yield: null, rate: null, exDate: null, payDate: null, history: [] }
  }
  const data = (await res.json()) as {
    chart?: {
      result?: {
        events?: { dividends?: Record<string, { amount: number; date: number }> }
        meta?: {
          trailingAnnualDividendRate?: number
          trailingAnnualDividendYield?: number
          dividendDate?: number
        }
      }[]
    }
  }
  const r = data.chart?.result?.[0]
  if (!r) return { symbol, yield: null, rate: null, exDate: null, payDate: null, history: [] }
  const divs = r.events?.dividends ?? {}
  const history = Object.values(divs)
    .map((d) => ({
      date: new Date(d.date * 1000).toISOString().slice(0, 10),
      amount: d.amount
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
  const meta = r.meta ?? {}
  return {
    symbol,
    yield: meta.trailingAnnualDividendYield != null ? meta.trailingAnnualDividendYield * 100 : null,
    rate: meta.trailingAnnualDividendRate ?? null,
    exDate: null,
    payDate: meta.dividendDate ? new Date(meta.dividendDate * 1000).toISOString().slice(0, 10) : null,
    history
  }
}
