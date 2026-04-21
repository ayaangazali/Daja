type Obj = Record<string, unknown>

export interface EarningsCalendarEntry {
  ticker: string
  companyName: string | null
  startDateFormatted: string
  startDateType: string | null
  epsEstimate: number | null
  epsActual: number | null
  epsSurprisePercent: number | null
  marketCap: number | null
}

function num(v: unknown): number | null {
  if (v == null) return null
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'object' && v !== null && 'raw' in (v as Obj)) {
    const raw = (v as Obj).raw
    return typeof raw === 'number' && Number.isFinite(raw) ? raw : null
  }
  return null
}

export async function fetchEarningsCalendar(daysAhead = 14): Promise<EarningsCalendarEntry[]> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(today.getTime() + daysAhead * 86400000)
  const fmt = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const url = `https://finance.yahoo.com/calendar/earnings?from=${fmt(today)}&to=${fmt(end)}&day=${fmt(today)}`
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml'
      }
    })
    if (!res.ok) throw new Error(`Yahoo earnings calendar ${res.status}`)
    const html = await res.text()
    const match = html.match(/"earningsCalendar":\s*(\{.*?\]\})/)
    if (!match) return fetchEarningsFallback(today, end)
    try {
      const data = JSON.parse(match[1]) as { rows?: Obj[] }
      return (data.rows ?? []).map(mapRow)
    } catch {
      return fetchEarningsFallback(today, end)
    }
  } catch {
    return fetchEarningsFallback(today, end)
  }
}

async function fetchEarningsFallback(from: Date, to: Date): Promise<EarningsCalendarEntry[]> {
  const fmt = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const url = `https://query1.finance.yahoo.com/v1/finance/visualization?lang=en-US&region=US&crumb=`
  const body = {
    offset: 0,
    size: 100,
    sortField: 'startdatetime',
    sortType: 'ASC',
    entityIdType: 'earnings',
    includeFields: [
      'ticker',
      'companyshortname',
      'eventname',
      'startdatetime',
      'startdatetimetype',
      'epsestimate',
      'epsactual',
      'epssurprisepct'
    ],
    query: {
      operator: 'and',
      operands: [
        {
          operator: 'gte',
          operands: ['startdatetime', fmt(from)]
        },
        {
          operator: 'lt',
          operands: ['startdatetime', fmt(to)]
        },
        {
          operator: 'eq',
          operands: ['region', 'us']
        }
      ]
    }
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (NexusHub)'
      },
      body: JSON.stringify(body)
    })
    if (!res.ok) return []
    const data = (await res.json()) as {
      finance?: {
        result?: { documents?: { rows?: unknown[][]; columns?: { field: string }[] }[] }[]
      }
    }
    const docs = data.finance?.result?.[0]?.documents?.[0]
    if (!docs) return []
    const cols = (docs.columns ?? []).map((c) => c.field)
    const rows = docs.rows ?? []
    return rows.map((row) => {
      const idx = (f: string): unknown => row[cols.indexOf(f)]
      return {
        ticker: String(idx('ticker') ?? ''),
        companyName: (idx('companyshortname') as string) ?? null,
        startDateFormatted: String(idx('startdatetime') ?? '').slice(0, 10),
        startDateType: (idx('startdatetimetype') as string) ?? null,
        epsEstimate: num(idx('epsestimate')),
        epsActual: num(idx('epsactual')),
        epsSurprisePercent: num(idx('epssurprisepct')),
        marketCap: null
      }
    })
  } catch {
    return []
  }
}

function mapRow(row: Obj): EarningsCalendarEntry {
  return {
    ticker: String(row.ticker ?? ''),
    companyName: (row.companyshortname as string) ?? null,
    startDateFormatted: String(row.startdatetime ?? '').slice(0, 10),
    startDateType: (row.startdatetimetype as string) ?? null,
    epsEstimate: num(row.epsestimate),
    epsActual: num(row.epsactual),
    epsSurprisePercent: num(row.epssurprisepct),
    marketCap: num(row.marketcap)
  }
}
