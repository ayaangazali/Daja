import { yahooFetch } from './yahooAuth'

// Yahoo's predefined screeners return lists of stocks matching preset criteria.
// No auth required beyond standard cookie/crumb flow.

export interface ScreenerStock {
  symbol: string
  shortName: string
  regularMarketPrice: number
  regularMarketChangePercent: number
  regularMarketVolume: number
  marketCap: number | null
  trailingPE: number | null
  forwardPE: number | null
  epsTrailingTwelveMonths: number | null
  sector: string | null
  industry: string | null
}

type Obj = Record<string, unknown>

function num(v: unknown): number | null {
  if (v == null) return null
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'object' && v !== null && 'raw' in (v as Obj)) {
    const raw = (v as Obj).raw
    return typeof raw === 'number' && Number.isFinite(raw) ? raw : null
  }
  return null
}

export const SCREENER_PRESETS = [
  { id: 'day_gainers', label: 'Day Gainers' },
  { id: 'day_losers', label: 'Day Losers' },
  { id: 'most_actives', label: 'Most Active' },
  { id: 'undervalued_growth_stocks', label: 'Undervalued Growth' },
  { id: 'growth_technology_stocks', label: 'Growth Tech' },
  { id: 'aggressive_small_caps', label: 'Aggressive Small Caps' },
  { id: 'small_cap_gainers', label: 'Small Cap Gainers' },
  { id: 'undervalued_large_caps', label: 'Undervalued Large Caps' },
  { id: 'conservative_foreign_funds', label: 'Conservative Foreign' },
  { id: 'high_yield_bond', label: 'High-Yield Bonds' }
] as const

export type ScreenerId = (typeof SCREENER_PRESETS)[number]['id']

export async function fetchScreener(
  id: ScreenerId,
  count = 25
): Promise<ScreenerStock[]> {
  const url = `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?count=${count}&scrIds=${encodeURIComponent(
    id
  )}`
  const res = await yahooFetch(url)
  if (!res.ok) throw new Error(`Yahoo screener ${res.status}`)
  const data = (await res.json()) as {
    finance?: { result?: { quotes?: Obj[] }[]; error?: { description?: string } | null }
  }
  const quotes = data.finance?.result?.[0]?.quotes ?? []
  return quotes.map((q) => ({
    symbol: String(q.symbol ?? ''),
    shortName: String(q.shortName ?? q.longName ?? q.symbol ?? ''),
    regularMarketPrice: num(q.regularMarketPrice) ?? 0,
    regularMarketChangePercent: num(q.regularMarketChangePercent) ?? 0,
    regularMarketVolume: num(q.regularMarketVolume) ?? 0,
    marketCap: num(q.marketCap),
    trailingPE: num(q.trailingPE),
    forwardPE: num(q.forwardPE),
    epsTrailingTwelveMonths: num(q.epsTrailingTwelveMonths),
    sector: (q.sector as string) ?? null,
    industry: (q.industry as string) ?? null
  }))
}
