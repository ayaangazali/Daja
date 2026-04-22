import { useMemo } from 'react'
import { LayoutGrid } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useWatchlist } from '../../../hooks/useWatchlist'
import { useQuotes, type Quote } from '../../../hooks/useFinance'
import { fmtPct } from '../../../lib/format'

function cellColor(pct: number | null): string {
  if (pct == null || !Number.isFinite(pct)) return 'var(--color-bg)'
  const cap = 5
  const mag = Math.min(Math.abs(pct), cap) / cap
  if (pct > 0) return `rgba(34, 197, 94, ${0.1 + mag * 0.75})`
  return `rgba(239, 68, 68, ${0.1 + mag * 0.75})`
}

export function WatchlistHeatmap(): React.JSX.Element | null {
  const { data: items = [] } = useWatchlist()
  const tickers = items.map((i) => i.ticker)
  const quotes = useQuotes(tickers)
  const navigate = useNavigate()

  const cells = useMemo(() => {
    const out: {
      ticker: string
      pct: number | null
      price: number | null
      cap: number | null
    }[] = []
    items.forEach((it, i) => {
      const q = quotes[i]?.data as Quote | undefined
      out.push({
        ticker: it.ticker,
        pct: q?.changePercent ?? null,
        price: q?.price ?? null,
        cap: q?.marketCap ?? null
      })
    })
    return out
  }, [items, quotes])

  if (items.length === 0) return null

  // Size each tile by sqrt of market cap so very-large-cap doesn't dominate entirely.
  const maxSize = Math.max(
    1,
    ...cells.map((c) => (c.cap != null && c.cap > 0 ? Math.sqrt(c.cap) : 1))
  )

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <LayoutGrid className="h-3 w-3" /> Watchlist heatmap ({cells.length} tickers)
        </div>
        <div className="font-mono text-[9px] text-[var(--color-fg-muted)]">
          Size ∝ √(market cap) · color ∝ day % change
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {cells.map((c) => {
          const sizePct = c.cap != null && c.cap > 0 ? Math.sqrt(c.cap) / maxSize : 0.2
          const dim = Math.max(60, Math.min(180, sizePct * 180))
          return (
            <button
              key={c.ticker}
              onClick={() => navigate(`/finance/stock/${c.ticker}`)}
              className="flex flex-col items-center justify-center rounded border border-[var(--color-border)] p-1 font-mono transition-opacity hover:opacity-80"
              style={{
                width: `${dim}px`,
                height: `${dim * 0.7}px`,
                background: cellColor(c.pct)
              }}
              title={`${c.ticker}: ${c.pct != null ? fmtPct(c.pct) : '—'} · ${c.price != null ? `$${c.price.toFixed(2)}` : ''}`}
            >
              <span className="text-[11px] font-bold">{c.ticker}</span>
              <span className="text-[10px] tabular">{c.pct != null ? fmtPct(c.pct) : '—'}</span>
              {c.price != null && (
                <span className="text-[9px] tabular text-[var(--color-fg-muted)]">
                  ${c.price.toFixed(2)}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
