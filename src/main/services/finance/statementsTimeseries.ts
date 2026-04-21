import { yahooFetch } from './yahooAuth'

// Yahoo fundamentals-timeseries provides richer historical data than quoteSummary.
// Each metric returns an array of {asOfDate, reportedValue: {raw, fmt}}

const INCOME_METRICS = [
  'TotalRevenue',
  'CostOfRevenue',
  'GrossProfit',
  'OperatingExpense',
  'OperatingIncome',
  'NetIncome',
  'EBITDA',
  'DilutedEPS',
  'BasicEPS'
]

const BALANCE_METRICS = [
  'TotalAssets',
  'TotalLiabilitiesNetMinorityInterest',
  'StockholdersEquity',
  'CashAndCashEquivalents',
  'CashCashEquivalentsAndShortTermInvestments',
  'LongTermDebt',
  'CurrentDebt'
]

const CASH_METRICS = [
  'OperatingCashFlow',
  'InvestingCashFlow',
  'FinancingCashFlow',
  'CapitalExpenditure',
  'FreeCashFlow'
]

type Period = 'annual' | 'quarterly'

interface TSEntry {
  asOfDate?: string
  reportedValue?: { raw?: number; fmt?: string }
  dataId?: number
  periodType?: string
}

function periodPrefix(p: Period): string {
  return p === 'annual' ? 'annual' : 'quarterly'
}

export async function fetchTimeseriesMetrics(
  symbol: string,
  metrics: string[],
  period: Period
): Promise<Map<string, Map<string, number>>> {
  const prefix = periodPrefix(period)
  const typeParam = metrics.map((m) => `${prefix}${m}`).join(',')
  const start = Math.floor(new Date('2019-01-01').getTime() / 1000)
  const end = Math.floor(Date.now() / 1000)
  const url = `https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(
    symbol
  )}?symbol=${encodeURIComponent(symbol)}&type=${typeParam}&period1=${start}&period2=${end}`
  const res = await yahooFetch(url)
  const out = new Map<string, Map<string, number>>()
  if (!res.ok) return out
  const json = (await res.json().catch(() => null)) as {
    timeseries?: {
      result?: { meta?: { type?: string[] }; [key: string]: unknown }[]
    }
  } | null
  const results = json?.timeseries?.result ?? []
  for (const r of results) {
    const typeName = r.meta?.type?.[0]
    if (!typeName) continue
    const metric = typeName.replace(prefix, '')
    const rows = (r[typeName] as TSEntry[] | undefined) ?? []
    const perDate = new Map<string, number>()
    for (const row of rows) {
      if (row?.asOfDate && typeof row.reportedValue?.raw === 'number') {
        perDate.set(row.asOfDate, row.reportedValue.raw)
      }
    }
    out.set(metric, perDate)
  }
  return out
}

export interface TsIncome {
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

export interface TsBalance {
  date: string
  totalAssets: number | null
  totalLiab: number | null
  totalEquity: number | null
  cash: number | null
  shortTermInvestments: number | null
  longTermDebt: number | null
  shortTermDebt: number | null
}

export interface TsCashflow {
  date: string
  operating: number | null
  investing: number | null
  financing: number | null
  capex: number | null
  freeCashflow: number | null
}

function rowsFromMap<T extends { date: string }>(
  metrics: Map<string, Map<string, number>>,
  mapping: Record<string, string>,
  emptyRow: () => T
): T[] {
  const allDates = new Set<string>()
  for (const perDate of metrics.values()) {
    for (const d of perDate.keys()) allDates.add(d)
  }
  const sorted = [...allDates].sort().reverse()
  return sorted.slice(0, 8).map((date) => {
    const row = emptyRow()
    for (const [ourKey, yahooKey] of Object.entries(mapping)) {
      ;(row as Record<string, number | null | string>)[ourKey] =
        metrics.get(yahooKey)?.get(date) ?? null
    }
    ;(row as Record<string, number | null | string>).date = date
    return row
  })
}

export async function fetchIncomeTs(symbol: string, period: Period): Promise<TsIncome[]> {
  const metrics = await fetchTimeseriesMetrics(symbol, INCOME_METRICS, period)
  const rows = rowsFromMap<TsIncome>(
    metrics,
    {
      revenue: 'TotalRevenue',
      costOfRevenue: 'CostOfRevenue',
      grossProfit: 'GrossProfit',
      operatingExpense: 'OperatingExpense',
      operatingIncome: 'OperatingIncome',
      netIncome: 'NetIncome',
      ebitda: 'EBITDA',
      eps: 'DilutedEPS'
    },
    () => ({
      date: '',
      revenue: null,
      costOfRevenue: null,
      grossProfit: null,
      operatingExpense: null,
      operatingIncome: null,
      netIncome: null,
      ebitda: null,
      eps: null
    })
  )
  // Fallback EPS to BasicEPS if diluted missing
  for (const r of rows) {
    if (r.eps == null) {
      r.eps = metrics.get('BasicEPS')?.get(r.date) ?? null
    }
  }
  return rows
}

export async function fetchBalanceTs(symbol: string, period: Period): Promise<TsBalance[]> {
  const metrics = await fetchTimeseriesMetrics(symbol, BALANCE_METRICS, period)
  return rowsFromMap<TsBalance>(
    metrics,
    {
      totalAssets: 'TotalAssets',
      totalLiab: 'TotalLiabilitiesNetMinorityInterest',
      totalEquity: 'StockholdersEquity',
      cash: 'CashAndCashEquivalents',
      shortTermInvestments: 'CashCashEquivalentsAndShortTermInvestments',
      longTermDebt: 'LongTermDebt',
      shortTermDebt: 'CurrentDebt'
    },
    () => ({
      date: '',
      totalAssets: null,
      totalLiab: null,
      totalEquity: null,
      cash: null,
      shortTermInvestments: null,
      longTermDebt: null,
      shortTermDebt: null
    })
  )
}

export async function fetchCashflowTs(symbol: string, period: Period): Promise<TsCashflow[]> {
  const metrics = await fetchTimeseriesMetrics(symbol, CASH_METRICS, period)
  return rowsFromMap<TsCashflow>(
    metrics,
    {
      operating: 'OperatingCashFlow',
      investing: 'InvestingCashFlow',
      financing: 'FinancingCashFlow',
      capex: 'CapitalExpenditure',
      freeCashflow: 'FreeCashFlow'
    },
    () => ({
      date: '',
      operating: null,
      investing: null,
      financing: null,
      capex: null,
      freeCashflow: null
    })
  )
}
