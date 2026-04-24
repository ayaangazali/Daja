import { useMemo } from 'react'
import { Bell, BellOff, TrendingDown, TrendingUp } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useWatchlist } from '../../../hooks/useWatchlist'
import { useQuotes } from '../../../hooks/useFinance'
import { cn } from '../../../lib/cn'

/**
 * Alerts summary — one row per watchlist ticker with an alert set.
 * Shows distance to threshold as percentage, colors by how close (<=1% hot,
 * <=5% warm, else cool). Triggered alerts (price already crossed) pulse.
 */
export function AlertsPanel(): React.JSX.Element | null {
  const { data: items = [] } = useWatchlist()
  // Stable ticker array — react-query uses the array as queryKey. Without
  // useMemo we'd spawn spurious refetches on every parent render.
  const tickers = useMemo(() => items.map((i) => i.ticker), [items])
  const quotes = useQuotes(tickers)

  const alerts = useMemo(() => {
    const safePct = (num: number, denom: number): number | null =>
      denom > 0 && Number.isFinite(num / denom) ? (num / denom) * 100 : null
    return items
      .map((item, i) => {
        const q = quotes[i]?.data
        const price = q?.price != null && Number.isFinite(q.price) && q.price > 0 ? q.price : null
        const above = item.alert_above
        const below = item.alert_below
        if (above == null && below == null) return null
        const aboveDist = price != null && above != null ? safePct(above - price, price) : null
        const belowDist = price != null && below != null ? safePct(price - below, price) : null
        const nearestDist =
          aboveDist != null && belowDist != null
            ? Math.min(Math.abs(aboveDist), Math.abs(belowDist))
            : aboveDist != null
              ? Math.abs(aboveDist)
              : belowDist != null
                ? Math.abs(belowDist)
                : null
        return {
          ticker: item.ticker,
          price,
          above,
          below,
          aboveDist,
          belowDist,
          aboveTriggered: aboveDist != null && aboveDist <= 0,
          belowTriggered: belowDist != null && belowDist <= 0,
          nearestDist
        }
      })
      .filter((x): x is NonNullable<typeof x> => x != null)
      .sort((a, b) => {
        // Triggered first, then by proximity
        const aTrig = a.aboveTriggered || a.belowTriggered ? 0 : 1
        const bTrig = b.aboveTriggered || b.belowTriggered ? 0 : 1
        if (aTrig !== bTrig) return aTrig - bTrig
        return (a.nearestDist ?? Infinity) - (b.nearestDist ?? Infinity)
      })
  }, [items, quotes])

  if (alerts.length === 0) {
    return (
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
        <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <BellOff className="h-3 w-3" /> Price alerts
        </div>
        <div className="text-[11px] text-[var(--color-fg-muted)]">
          No active alerts. Open a ticker + click Alerts on the watchlist row to set one.
        </div>
      </div>
    )
  }

  const firedCount = alerts.filter((a) => a.aboveTriggered || a.belowTriggered).length

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <Bell className="h-3 w-3" /> Price alerts ({alerts.length})
        </div>
        {firedCount > 0 && (
          <span className="rounded-full bg-[var(--color-neg)]/15 px-2 py-0.5 font-mono text-[9px] text-[var(--color-neg)]">
            {firedCount} triggered
          </span>
        )}
      </div>
      <div className="space-y-1">
        {alerts.map((a) => {
          const triggered = a.aboveTriggered || a.belowTriggered
          const hot = !triggered && a.nearestDist != null && a.nearestDist <= 1
          const warm = !triggered && a.nearestDist != null && a.nearestDist <= 5
          return (
            <NavLink
              key={a.ticker}
              to={`/finance/${a.ticker}`}
              className={cn(
                'flex items-center justify-between rounded px-2 py-1 text-[11px] hover:bg-[var(--color-bg)]',
                triggered && 'bg-[var(--color-neg)]/10'
              )}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold">{a.ticker}</span>
                <span className="text-[var(--color-fg-muted)]">
                  {a.price != null ? `$${a.price.toFixed(2)}` : '—'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono tabular">
                {a.above != null && (
                  <span
                    className={cn(
                      'flex items-center gap-0.5',
                      a.aboveTriggered
                        ? 'text-[var(--color-pos)]'
                        : hot && a.aboveDist != null && a.aboveDist > 0
                          ? 'text-[var(--color-warn)]'
                          : 'text-[var(--color-fg-muted)]'
                    )}
                    title={`Alert when price >= $${a.above.toFixed(2)}`}
                  >
                    <TrendingUp className="h-2.5 w-2.5" /> ${a.above.toFixed(2)}
                    {a.aboveDist != null && !a.aboveTriggered && (
                      <span className="ml-0.5">({a.aboveDist >= 0 ? '+' : ''}{a.aboveDist.toFixed(1)}%)</span>
                    )}
                    {a.aboveTriggered && <span className="ml-0.5 font-semibold">HIT</span>}
                  </span>
                )}
                {a.below != null && (
                  <span
                    className={cn(
                      'flex items-center gap-0.5',
                      a.belowTriggered
                        ? 'text-[var(--color-neg)]'
                        : (hot || warm) && a.belowDist != null && a.belowDist > 0
                          ? 'text-[var(--color-warn)]'
                          : 'text-[var(--color-fg-muted)]'
                    )}
                    title={`Alert when price <= $${a.below.toFixed(2)}`}
                  >
                    <TrendingDown className="h-2.5 w-2.5" /> ${a.below.toFixed(2)}
                    {a.belowDist != null && !a.belowTriggered && (
                      <span className="ml-0.5">(-{a.belowDist.toFixed(1)}%)</span>
                    )}
                    {a.belowTriggered && <span className="ml-0.5 font-semibold">HIT</span>}
                  </span>
                )}
              </div>
            </NavLink>
          )
        })}
      </div>
    </div>
  )
}
