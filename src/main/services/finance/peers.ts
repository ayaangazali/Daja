export interface PeerList {
  symbol: string
  peers: string[]
}

interface RecommendationsResponse {
  finance?: {
    result?: { recommendedSymbols?: { symbol: string; score: number }[] }[]
    error?: { description?: string } | null
  }
}

export async function fetchPeers(symbol: string): Promise<PeerList> {
  const { yahooFetch } = await import('./yahooAuth')
  const url = `https://query1.finance.yahoo.com/v6/finance/recommendationsbysymbol/${encodeURIComponent(
    symbol
  )}`
  const res = await yahooFetch(url)
  if (!res.ok) throw new Error(`Yahoo peers ${res.status}`)
  const json = (await res.json()) as RecommendationsResponse
  const recs = json.finance?.result?.[0]?.recommendedSymbols ?? []
  return {
    symbol,
    peers: recs
      .map((r) => r.symbol)
      .filter((s) => typeof s === 'string' && s !== symbol)
      .slice(0, 8)
  }
}
