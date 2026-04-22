type Obj = Record<string, unknown>

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

export async function fetchNews(symbol: string): Promise<NewsItem[]> {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
    symbol
  )}&quotesCount=0&newsCount=15`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Daja)', Accept: 'application/json' }
  })
  if (!res.ok) throw new Error(`Yahoo news ${res.status}`)
  const json = (await res.json()) as { news?: Obj[] }
  return (json.news ?? []).map((n) => {
    const thumb = ((n.thumbnail as Obj)?.resolutions as Obj[])?.[0]?.url as string | undefined
    return {
      id: String(n.uuid ?? ''),
      title: String(n.title ?? ''),
      publisher: String(n.publisher ?? ''),
      link: String(n.link ?? ''),
      providerPublishTime: Number(n.providerPublishTime ?? 0),
      type: String(n.type ?? ''),
      thumbnail: thumb ?? null,
      relatedTickers: (n.relatedTickers as string[]) ?? []
    }
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

interface CikRow {
  cik_str: number
  ticker: string
  title: string
}

let cikCache: Map<string, string> | null = null

async function getCikMap(): Promise<Map<string, string>> {
  if (cikCache) return cikCache
  const res = await fetch('https://www.sec.gov/files/company_tickers.json', {
    headers: { 'User-Agent': 'Daja ayaangazali.work@gmail.com', Accept: 'application/json' }
  })
  if (!res.ok) throw new Error(`SEC CIK map ${res.status}`)
  const data = (await res.json()) as Record<string, CikRow>
  const m = new Map<string, string>()
  for (const row of Object.values(data)) {
    m.set(row.ticker.toUpperCase(), row.cik_str.toString().padStart(10, '0'))
  }
  cikCache = m
  return m
}

export async function fetchSecFilings(symbol: string): Promise<SecFiling[]> {
  const map = await getCikMap()
  const cik = map.get(symbol.toUpperCase())
  if (!cik) return []
  const res = await fetch(`https://data.sec.gov/submissions/CIK${cik}.json`, {
    headers: { 'User-Agent': 'Daja ayaangazali.work@gmail.com', Accept: 'application/json' }
  })
  if (!res.ok) throw new Error(`SEC submissions ${res.status}`)
  const json = (await res.json()) as {
    filings?: {
      recent?: {
        accessionNumber: string[]
        form: string[]
        filingDate: string[]
        reportDate: string[]
        primaryDocument: string[]
      }
    }
  }
  const recent = json.filings?.recent
  if (!recent) return []
  const out: SecFiling[] = []
  const interesting = new Set(['10-K', '10-Q', '8-K', '4', 'S-1', 'DEF 14A'])
  for (let i = 0; i < recent.accessionNumber.length && out.length < 40; i++) {
    const form = recent.form[i]
    if (!interesting.has(form)) continue
    const acc = recent.accessionNumber[i].replace(/-/g, '')
    out.push({
      accession: recent.accessionNumber[i],
      form,
      filingDate: recent.filingDate[i],
      reportDate: recent.reportDate[i] ?? '',
      primaryDocument: recent.primaryDocument[i],
      url: `https://www.sec.gov/Archives/edgar/data/${parseInt(cik, 10)}/${acc}/${recent.primaryDocument[i]}`
    })
  }
  return out
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

export async function fetchRedditMentions(symbol: string): Promise<RedditPost[]> {
  const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(
    '$' + symbol
  )}&sort=new&limit=25&t=week`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Daja/1.0 (Reddit sentiment scan)', Accept: 'application/json' }
  })
  if (!res.ok) return []
  const json = (await res.json()) as {
    data?: { children?: { data: Record<string, unknown> }[] }
  }
  return (json.data?.children ?? []).map((c) => {
    const d = c.data
    return {
      id: String(d.id ?? ''),
      title: String(d.title ?? ''),
      author: String(d.author ?? ''),
      score: Number(d.score ?? 0),
      numComments: Number(d.num_comments ?? 0),
      permalink: `https://reddit.com${String(d.permalink ?? '')}`,
      subreddit: String(d.subreddit ?? ''),
      created: Number(d.created_utc ?? 0),
      selftext: String(d.selftext ?? '').slice(0, 400)
    }
  })
}
