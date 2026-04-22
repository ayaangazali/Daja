import { useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { Flame, TrendingDown, TrendingUp } from 'lucide-react'
import { useWatchlist } from '../../../hooks/useWatchlist'
import { useQuotes } from '../../../hooks/useFinance'
import { fmtPct, fmtPrice, signColor } from '../../../lib/format'
import { cn } from '../../../lib/cn'

export function TopMovers(): React.JSX.Element | null {
  const { data: items = [] } = useWatchlist()
  const quotes = useQuotes(items.map((i) => i.ticker))

  const movers = useMemo(() => {
    const enriched = items
      .map((item, i) => {
        const q = quotes[i]?.data
        return {
          ticker: item.ticker,
          price: q?.price ?? null,
          pct: q?.changePercent ?? null
        }
      })
      .filter((r): r is { ticker: string; price: number | null; pct: number } => r.pct != null)
    const gainers = [...enriched].sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0)).slice(0, 3)
    const losers = [...enriched].sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0)).slice(0, 3)
    return { gainers, losers }
  }, [items, quotes])

  if (items.length === 0) return null

  return (
    <div
      className={cn(
        'rounded-md border p-3',
        'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
      )}
    >
      <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
        <Flame className="h-3 w-3 text-[var(--color-warn)]" />
        Your watchlist today
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="mb-1 flex items-center gap-1 text-[10px] text-[var(--color-pos)]">
            <TrendingUp className="h-2.5 w-2.5" /> Top gainers
          </div>
          {movers.gainers.length === 0 && (
            <div className="text-[10px] text-[var(--color-fg-muted)]">No data</div>
          )}
          {movers.gainers.map((m) => (
            <NavLink
              key={m.ticker}
              to={`/finance/${m.ticker}`}
              className="flex items-center justify-between py-0.5 text-[11px] hover:text-[var(--color-info)]"
            >
              <span className="font-mono font-semibold">{m.ticker}</span>
              <div className="flex items-center gap-2 font-mono tabular">
                <span className="text-[10px] text-[var(--color-fg-muted)]">
                  ${fmtPrice(m.price)}
                </span>
                <span className={cn('w-16 text-right', signColor(m.pct))}>{fmtPct(m.pct)}</span>
              </div>
            </NavLink>
          ))}
        </div>
        <div>
          <div className="mb-1 flex items-center gap-1 text-[10px] text-[var(--color-neg)]">
            <TrendingDown className="h-2.5 w-2.5" /> Top losers
          </div>
          {movers.losers.length === 0 && (
            <div className="text-[10px] text-[var(--color-fg-muted)]">No data</div>
          )}
          {movers.losers.map((m) => (
            <NavLink
              key={m.ticker}
              to={`/finance/${m.ticker}`}
              className="flex items-center justify-between py-0.5 text-[11px] hover:text-[var(--color-info)]"
            >
              <span className="font-mono font-semibold">{m.ticker}</span>
              <div className="flex items-center gap-2 font-mono tabular">
                <span className="text-[10px] text-[var(--color-fg-muted)]">
                  ${fmtPrice(m.price)}
                </span>
                <span className={cn('w-16 text-right', signColor(m.pct))}>{fmtPct(m.pct)}</span>
              </div>
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  )
}
