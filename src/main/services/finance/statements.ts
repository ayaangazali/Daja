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

function date(v: unknown): string {
  if (!v) return ''
  if (typeof v === 'object' && v !== null && 'fmt' in (v as Obj)) {
    return String((v as Obj).fmt ?? '')
  }
  return String(v)
}

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

const STATEMENT_MODULES = [
  'incomeStatementHistory',
  'incomeStatementHistoryQuarterly',
  'balanceSheetHistory',
  'balanceSheetHistoryQuarterly',
  'cashflowStatementHistory',
  'cashflowStatementHistoryQuarterly'
].join(',')

function mapIncome(rows: Obj[]): IncomeRow[] {
  return rows.map((r) => ({
    date: date(r.endDate),
    revenue: num(r.totalRevenue),
    costOfRevenue: num(r.costOfRevenue),
    grossProfit: num(r.grossProfit),
    operatingExpense: num(r.totalOperatingExpenses),
    operatingIncome: num(r.operatingIncome),
    netIncome: num(r.netIncome),
    ebitda: num(r.ebitda),
    eps: num(r.dilutedEPS) ?? num(r.basicEPS)
  }))
}

function mapBalance(rows: Obj[]): BalanceRow[] {
  return rows.map((r) => ({
    date: date(r.endDate),
    totalAssets: num(r.totalAssets),
    totalLiab: num(r.totalLiab) ?? num(r.totalLiabilities),
    totalEquity: num(r.totalStockholderEquity),
    cash: num(r.cash),
    shortTermInvestments: num(r.shortTermInvestments),
    longTermDebt: num(r.longTermDebt),
    shortTermDebt: num(r.shortLongTermDebt)
  }))
}

function mapCashflow(rows: Obj[]): CashflowRow[] {
  return rows.map((r) => {
    const op = num(r.totalCashFromOperatingActivities)
    const capex = num(r.capitalExpenditures)
    return {
      date: date(r.endDate),
      operating: op,
      investing: num(r.totalCashflowsFromInvestingActivities),
      financing: num(r.totalCashFromFinancingActivities),
      capex,
      freeCashflow: op != null && capex != null ? op + capex : null
    }
  })
}

export async function fetchStatements(symbol: string): Promise<Statements> {
  // Primary: fundamentals-timeseries (richer + reliable for Cost/Gross/OpExp)
  const { fetchIncomeTs, fetchBalanceTs, fetchCashflowTs } = await import('./statementsTimeseries')
  const [
    incomeAnnualTs,
    incomeQuarterlyTs,
    balanceAnnualTs,
    balanceQuarterlyTs,
    cashAnnualTs,
    cashQuarterlyTs
  ] = await Promise.all([
    fetchIncomeTs(symbol, 'annual').catch(() => []),
    fetchIncomeTs(symbol, 'quarterly').catch(() => []),
    fetchBalanceTs(symbol, 'annual').catch(() => []),
    fetchBalanceTs(symbol, 'quarterly').catch(() => []),
    fetchCashflowTs(symbol, 'annual').catch(() => []),
    fetchCashflowTs(symbol, 'quarterly').catch(() => [])
  ])

  const hasData = incomeAnnualTs.length + incomeQuarterlyTs.length + balanceAnnualTs.length > 0

  if (hasData) {
    return {
      symbol,
      incomeAnnual: incomeAnnualTs,
      incomeQuarterly: incomeQuarterlyTs,
      balanceAnnual: balanceAnnualTs,
      balanceQuarterly: balanceQuarterlyTs,
      cashAnnual: cashAnnualTs,
      cashQuarterly: cashQuarterlyTs
    }
  }

  // Fallback: legacy quoteSummary modules
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(
    symbol
  )}?modules=${STATEMENT_MODULES}`
  const { yahooFetch } = await import('./yahooAuth')
  const res = await yahooFetch(url)
  if (!res.ok) throw new Error(`Yahoo statements ${res.status}`)
  const json = (await res.json()) as {
    quoteSummary?: { result?: Obj[]; error?: { description?: string } | null }
  }
  const r = json.quoteSummary?.result?.[0]
  if (!r) throw new Error(json.quoteSummary?.error?.description ?? 'No statements')
  return {
    symbol,
    incomeAnnual: mapIncome(
      ((r.incomeStatementHistory as Obj)?.incomeStatementHistory as Obj[]) ?? []
    ),
    incomeQuarterly: mapIncome(
      ((r.incomeStatementHistoryQuarterly as Obj)?.incomeStatementHistory as Obj[]) ?? []
    ),
    balanceAnnual: mapBalance(
      ((r.balanceSheetHistory as Obj)?.balanceSheetStatements as Obj[]) ?? []
    ),
    balanceQuarterly: mapBalance(
      ((r.balanceSheetHistoryQuarterly as Obj)?.balanceSheetStatements as Obj[]) ?? []
    ),
    cashAnnual: mapCashflow(
      ((r.cashflowStatementHistory as Obj)?.cashflowStatements as Obj[]) ?? []
    ),
    cashQuarterly: mapCashflow(
      ((r.cashflowStatementHistoryQuarterly as Obj)?.cashflowStatements as Obj[]) ?? []
    )
  }
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

const OWNERSHIP_MODULES = [
  'insiderHolders',
  'insiderTransactions',
  'institutionOwnership',
  'fundOwnership',
  'majorHoldersBreakdown'
].join(',')

export async function fetchOwnership(symbol: string): Promise<Ownership> {
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(
    symbol
  )}?modules=${OWNERSHIP_MODULES}`
  const { yahooFetch } = await import('./yahooAuth')
  const res = await yahooFetch(url)
  if (!res.ok) throw new Error(`Yahoo ownership ${res.status}`)
  const json = (await res.json()) as {
    quoteSummary?: { result?: Obj[]; error?: { description?: string } | null }
  }
  const r = json.quoteSummary?.result?.[0]
  if (!r) throw new Error(json.quoteSummary?.error?.description ?? 'No ownership data')
  const ih = ((r.insiderHolders as Obj)?.holders as Obj[]) ?? []
  const it = ((r.insiderTransactions as Obj)?.transactions as Obj[]) ?? []
  const io = ((r.institutionOwnership as Obj)?.ownershipList as Obj[]) ?? []
  const fo = ((r.fundOwnership as Obj)?.ownershipList as Obj[]) ?? []
  const mh = (r.majorHoldersBreakdown as Obj) ?? {}
  return {
    symbol,
    insiderHolders: ih.map((h) => ({
      name: String(h.name ?? ''),
      relation: String(h.relation ?? ''),
      shares: num(h.positionDirect) ?? num(h.positionIndirect),
      position: h.positionDirectDate ? date(h.positionDirectDate) : null,
      date: date(h.latestTransDate)
    })),
    insiderTransactions: it.map((t) => ({
      name: String(t.filerName ?? ''),
      transaction: String((t.transactionText as string) ?? t.ownership ?? ''),
      shares: num(t.shares),
      value: num(t.value),
      date: date(t.startDate)
    })),
    institutionalOwnership: io.map((o) => ({
      organization: String(o.organization ?? ''),
      shares: num(o.position),
      position: num(o.value),
      pctHeld: num(o.pctHeld),
      reportDate: date(o.reportDate)
    })),
    fundOwnership: fo.map((o) => ({
      organization: String(o.organization ?? ''),
      shares: num(o.position),
      pctHeld: num(o.pctHeld),
      reportDate: date(o.reportDate)
    })),
    majorHolders: {
      insidersPercentHeld: num(mh.insidersPercentHeld),
      institutionsPercentHeld: num(mh.institutionsPercentHeld),
      institutionsFloatPercentHeld: num(mh.institutionsFloatPercentHeld),
      institutionsCount: num(mh.institutionsCount)
    }
  }
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

export async function fetchOptions(symbol: string, expiration?: number): Promise<OptionsChain> {
  const suffix = expiration ? `?date=${expiration}` : ''
  const url = `https://query1.finance.yahoo.com/v7/finance/options/${encodeURIComponent(symbol)}${suffix}`
  const { yahooFetch } = await import('./yahooAuth')
  const res = await yahooFetch(url)
  if (!res.ok) throw new Error(`Yahoo options ${res.status}`)
  const json = (await res.json()) as {
    optionChain?: { result?: Obj[]; error?: { description?: string } | null }
  }
  const r = json.optionChain?.result?.[0]
  if (!r) throw new Error(json.optionChain?.error?.description ?? 'No options')
  const quote = (r.quote as Obj) ?? {}
  const chain = ((r.options as Obj[]) ?? [])[0] ?? {}
  const mapContract = (c: Obj): OptionsContract => ({
    contractSymbol: String(c.contractSymbol ?? ''),
    strike: num(c.strike) ?? 0,
    lastPrice: num(c.lastPrice),
    bid: num(c.bid),
    ask: num(c.ask),
    change: num(c.change),
    percentChange: num(c.percentChange),
    volume: num(c.volume),
    openInterest: num(c.openInterest),
    impliedVolatility: num(c.impliedVolatility),
    inTheMoney: Boolean(c.inTheMoney),
    expiration: num(c.expiration) ?? 0
  })
  return {
    symbol,
    underlyingPrice: num(quote.regularMarketPrice) ?? 0,
    expirationDates: (r.expirationDates as number[]) ?? [],
    currentExpiration:
      num((chain as Obj).expirationDate) ?? (r.expirationDates as number[])?.[0] ?? 0,
    calls: (((chain as Obj).calls as Obj[]) ?? []).map(mapContract),
    puts: (((chain as Obj).puts as Obj[]) ?? []).map(mapContract)
  }
}
