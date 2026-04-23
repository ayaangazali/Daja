export type { Fundamentals } from '../../../shared/fundamentals'
import type { Fundamentals } from '../../../shared/fundamentals'

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

function str(v: unknown): string | null {
  if (v == null) return null
  if (typeof v === 'string') return v
  if (typeof v === 'object' && v !== null && 'raw' in (v as Obj)) {
    const raw = (v as Obj).raw
    return typeof raw === 'string' ? raw : null
  }
  return null
}

const MODULES = [
  'summaryDetail',
  'financialData',
  'defaultKeyStatistics',
  'assetProfile',
  'earnings',
  'earningsHistory',
  'incomeStatementHistory',
  'incomeStatementHistoryQuarterly',
  'recommendationTrend',
  'quoteType'
].join(',')

export async function fetchFundamentals(symbol: string): Promise<Fundamentals> {
  const { yahooFetch } = await import('./yahooAuth')
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(
    symbol
  )}?modules=${MODULES}`
  const res = await yahooFetch(url)
  if (!res.ok) {
    throw new Error(`Yahoo quoteSummary ${res.status}`)
  }
  const json = (await res.json()) as {
    quoteSummary?: { result?: Obj[]; error?: { description?: string } | null }
  }
  const r = json.quoteSummary?.result?.[0]
  if (!r) {
    throw new Error(json.quoteSummary?.error?.description ?? 'No fundamentals')
  }
  const sd = (r.summaryDetail as Obj) ?? {}
  const fd = (r.financialData as Obj) ?? {}
  const ks = (r.defaultKeyStatistics as Obj) ?? {}
  const ap = (r.assetProfile as Obj) ?? {}
  const qt = (r.quoteType as Obj) ?? {}
  const eh = ((r.earningsHistory as Obj)?.history as Obj[]) ?? []
  const ish = ((r.incomeStatementHistory as Obj)?.incomeStatementHistory as Obj[]) ?? []
  const ishq = ((r.incomeStatementHistoryQuarterly as Obj)?.incomeStatementHistory as Obj[]) ?? []
  const rt = ((r.recommendationTrend as Obj)?.trend as Obj[]) ?? []
  const latestRec = rt[0] ?? {}
  const earnings = (r.earnings as Obj) ?? {}
  const epsEst = ((earnings.earningsChart as Obj)?.quarterly as Obj[]) ?? []

  const epsQuarterly = epsEst.map((q) => ({
    date: str(q.date) ?? '',
    value: num(q.actual)
  }))
  const epsAnnual = (((earnings.financialsChart as Obj)?.yearly as Obj[]) ?? []).map((y) => ({
    date: String(y.date ?? ''),
    value: num(y.earnings)
  }))
  const revenueAnnual = (((earnings.financialsChart as Obj)?.yearly as Obj[]) ?? []).map((y) => ({
    date: String(y.date ?? ''),
    value: num(y.revenue)
  }))
  const revenueQuarterly = (((earnings.financialsChart as Obj)?.quarterly as Obj[]) ?? []).map(
    (q) => ({ date: String(q.date ?? ''), value: num(q.revenue) })
  )

  // fallback revenue via incomeStatementHistory
  if (revenueAnnual.length === 0 && ish.length > 0) {
    for (const row of ish) {
      revenueAnnual.unshift({
        date: String((row.endDate as Obj)?.fmt ?? ''),
        value: num(row.totalRevenue)
      })
    }
  }
  if (revenueQuarterly.length === 0 && ishq.length > 0) {
    for (const row of ishq) {
      revenueQuarterly.unshift({
        date: String((row.endDate as Obj)?.fmt ?? ''),
        value: num(row.totalRevenue)
      })
    }
  }

  return {
    symbol,
    name: str(qt.longName) ?? str(qt.shortName),
    sector: str(ap.sector),
    industry: str(ap.industry),
    description: str(ap.longBusinessSummary),
    employees: num(ap.fullTimeEmployees),
    marketCap: num(sd.marketCap),
    enterpriseValue: num(ks.enterpriseValue),
    trailingPE: num(sd.trailingPE),
    forwardPE: num(sd.forwardPE),
    pegRatio: num(ks.pegRatio),
    priceToSales: num(sd.priceToSalesTrailing12Months),
    priceToBook: num(ks.priceToBook),
    priceToFcf: null,
    revenueGrowth: num(fd.revenueGrowth),
    earningsGrowth: num(fd.earningsGrowth),
    profitMargins: num(fd.profitMargins),
    operatingMargins: num(fd.operatingMargins),
    grossMargins: num(fd.grossMargins),
    debtToEquity: num(fd.debtToEquity),
    currentRatio: num(fd.currentRatio),
    quickRatio: num(fd.quickRatio),
    totalCash: num(fd.totalCash),
    totalDebt: num(fd.totalDebt),
    returnOnEquity: num(fd.returnOnEquity),
    returnOnAssets: num(fd.returnOnAssets),
    dividendYield: num(sd.dividendYield),
    payoutRatio: num(sd.payoutRatio),
    epsQuarterly,
    epsAnnual,
    revenueQuarterly,
    revenueAnnual,
    sharesOutstanding: num(ks.sharesOutstanding),
    floatShares: num(ks.floatShares),
    insiderPercent: num(ks.heldPercentInsiders),
    institutionalPercent: num(ks.heldPercentInstitutions),
    shortPercent: num(ks.shortPercentOfFloat),
    sharesShort: num(ks.sharesShort),
    sharesShortPriorMonth: num(ks.sharesShortPriorMonth),
    shortRatio: num(ks.shortRatio),
    targetHigh: num(fd.targetHighPrice),
    targetLow: num(fd.targetLowPrice),
    targetMean: num(fd.targetMeanPrice),
    recommendationMean: num(fd.recommendationMean),
    recommendations: latestRec
      ? {
          strongBuy: num(latestRec.strongBuy) ?? 0,
          buy: num(latestRec.buy) ?? 0,
          hold: num(latestRec.hold) ?? 0,
          sell: num(latestRec.sell) ?? 0,
          strongSell: num(latestRec.strongSell) ?? 0
        }
      : null,
    recommendationTrend: rt.map((r) => ({
      period: String(r.period ?? ''),
      strongBuy: num(r.strongBuy) ?? 0,
      buy: num(r.buy) ?? 0,
      hold: num(r.hold) ?? 0,
      sell: num(r.sell) ?? 0,
      strongSell: num(r.strongSell) ?? 0
    })),
    earningsHistory: eh.map((h) => ({
      quarter: String((h.quarter as Obj)?.fmt ?? ''),
      epsActual: num(h.epsActual),
      epsEstimate: num(h.epsEstimate),
      surprisePercent: num(h.surprisePercent)
    }))
  }
}
