import { useQueries } from '@tanstack/react-query'
import { usePeers } from '../../../../hooks/usePeers'
import type { Fundamentals } from '../../../../hooks/useFundamentals'
import { fmtLargeNum, fmtPct, fmtPrice } from '../../../../lib/format'
import { cn } from '../../../../lib/cn'

export function PeersTab({ ticker }: { ticker: string }): React.JSX.Element {
  const { data: peerList, isLoading: peerLoading, error: peerError } = usePeers(ticker)
  const symbols = [ticker, ...(peerList?.peers ?? [])]

  const results = useQueries({
    queries: symbols.map((s) => ({
      queryKey: ['fundamentals', s],
      queryFn: () => window.daja.finance.fundamentals(s) as Promise<Fundamentals>,
      staleTime: 15 * 60_000,
      enabled: !!peerList
    }))
  })

  if (peerError) {
    return (
      <div className="p-4 text-[11px] text-[var(--color-neg)]">
        Peers load failed: {peerError.message}
      </div>
    )
  }
  if (peerLoading || !peerList) {
    return <div className="p-4 text-[11px] text-[var(--color-fg-muted)]">Loading peers…</div>
  }
  if (peerList.peers.length === 0) {
    return (
      <div className="p-4 text-[11px] text-[var(--color-fg-muted)]">
        No peer recommendations available for {ticker}.
      </div>
    )
  }

  const loaded = results
    .map((r, i) => ({ symbol: symbols[i], data: r.data, loading: r.isLoading }))
    .filter((r) => r.data != null) as { symbol: string; data: Fundamentals; loading: false }[]

  const metrics: {
    key: keyof Fundamentals
    label: string
    fmt: 'pct' | 'ratio' | 'large' | 'price'
    posIsGood: boolean | null
  }[] = [
    { key: 'marketCap', label: 'Mkt Cap', fmt: 'large', posIsGood: null },
    { key: 'trailingPE', label: 'P/E (ttm)', fmt: 'ratio', posIsGood: false },
    { key: 'forwardPE', label: 'P/E (fwd)', fmt: 'ratio', posIsGood: false },
    { key: 'pegRatio', label: 'PEG', fmt: 'ratio', posIsGood: false },
    { key: 'priceToSales', label: 'P/S', fmt: 'ratio', posIsGood: false },
    { key: 'priceToBook', label: 'P/B', fmt: 'ratio', posIsGood: false },
    { key: 'grossMargins', label: 'Gross M%', fmt: 'pct', posIsGood: true },
    { key: 'operatingMargins', label: 'Op M%', fmt: 'pct', posIsGood: true },
    { key: 'profitMargins', label: 'Net M%', fmt: 'pct', posIsGood: true },
    { key: 'returnOnEquity', label: 'ROE', fmt: 'pct', posIsGood: true },
    { key: 'returnOnAssets', label: 'ROA', fmt: 'pct', posIsGood: true },
    { key: 'revenueGrowth', label: 'Rev Grw', fmt: 'pct', posIsGood: true },
    { key: 'earningsGrowth', label: 'EPS Grw', fmt: 'pct', posIsGood: true },
    { key: 'debtToEquity', label: 'D/E', fmt: 'ratio', posIsGood: false },
    { key: 'dividendYield', label: 'Div Yld', fmt: 'pct', posIsGood: true }
  ]

  const fmtVal = (v: number | null, f: 'pct' | 'ratio' | 'large' | 'price'): string => {
    if (v == null || !Number.isFinite(v)) return '—'
    if (f === 'pct') return fmtPct(v * 100)
    if (f === 'ratio') return v.toFixed(2)
    if (f === 'large') return fmtLargeNum(v)
    return fmtPrice(v)
  }

  // For each metric, identify best (green) and worst (red) across peers for highlighting.
  function rank(m: (typeof metrics)[number]): { best: number | null; worst: number | null } {
    const vals = loaded
      .map((r) => r.data[m.key] as number | null)
      .filter((v): v is number => v != null && Number.isFinite(v))
    if (vals.length < 2) return { best: null, worst: null }
    if (m.posIsGood === true) return { best: Math.max(...vals), worst: Math.min(...vals) }
    if (m.posIsGood === false) return { best: Math.min(...vals), worst: Math.max(...vals) }
    return { best: null, worst: null }
  }

  return (
    <div className="space-y-3 p-3">
      <div className="text-[11px] text-[var(--color-fg-muted)]">
        Peer comparison: {ticker} vs {peerList.peers.length} Yahoo-recommended peers.
      </div>
      <div className="overflow-x-auto rounded-md border border-[var(--color-border)]">
        <table className="w-full text-[11px]">
          <thead className="border-b border-[var(--color-border)] text-[10px] uppercase text-[var(--color-fg-muted)]">
            <tr>
              <th className="sticky left-0 z-10 bg-[var(--color-bg)] px-2 py-1 text-left">
                Metric
              </th>
              {loaded.map((r) => (
                <th
                  key={r.symbol}
                  className={cn(
                    'px-2 py-1 text-right font-mono',
                    r.symbol === ticker && 'text-[var(--color-info)]'
                  )}
                >
                  {r.symbol}
                </th>
              ))}
            </tr>
            <tr className="text-[9px] normal-case text-[var(--color-fg-muted)]">
              <th className="sticky left-0 z-10 bg-[var(--color-bg)] px-2 py-1 text-left font-normal">
                Name
              </th>
              {loaded.map((r) => (
                <th
                  key={r.symbol}
                  className="max-w-[10rem] truncate px-2 py-1 text-right font-normal"
                  title={r.data.name ?? ''}
                >
                  {r.data.name?.slice(0, 18) ?? '—'}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => {
              const { best, worst } = rank(m)
              return (
                <tr
                  key={m.key as string}
                  className="border-t border-[var(--color-border)] hover:bg-[var(--color-bg-elev)]"
                >
                  <td className="sticky left-0 z-10 bg-[var(--color-bg)] px-2 py-1 text-[var(--color-fg-muted)]">
                    {m.label}
                  </td>
                  {loaded.map((r) => {
                    const v = r.data[m.key] as number | null
                    const isBest = best != null && v === best
                    const isWorst = worst != null && v === worst && best !== worst
                    return (
                      <td
                        key={r.symbol}
                        className={cn(
                          'px-2 py-1 text-right font-mono tabular',
                          isBest && 'text-[var(--color-pos)]',
                          isWorst && 'text-[var(--color-neg)]',
                          r.symbol === ticker && 'bg-[var(--color-info)]/5'
                        )}
                      >
                        {fmtVal(v, m.fmt)}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {results.some((r) => r.isLoading) && (
        <div className="text-[10px] text-[var(--color-fg-muted)]">Loading peer fundamentals…</div>
      )}
    </div>
  )
}
