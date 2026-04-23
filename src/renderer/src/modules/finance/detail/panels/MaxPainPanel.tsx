import { useMemo } from 'react'
import { Target, TrendingDown, TrendingUp } from 'lucide-react'
import { useOptions } from '../../../../hooks/useStatements'
import { computeMaxPain } from '../../../../lib/maxPain'
import { fmtPrice } from '../../../../lib/format'
import { cn } from '../../../../lib/cn'

export function MaxPainPanel({ ticker }: { ticker: string }): React.JSX.Element {
  const { data } = useOptions(ticker)

  const result = useMemo(() => {
    if (!data) return null
    return computeMaxPain(data.calls, data.puts, data.underlyingPrice)
  }, [data])

  if (!result) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3 text-[11px] text-[var(--color-fg-muted)]">
        Loading max pain…
      </div>
    )
  }

  const direction = result.distanceToPain > 0 ? 'down' : 'up'

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <Target className="h-3 w-3" /> Options max pain
        </div>
        <span className="text-[9px] text-[var(--color-fg-muted)]">
          Expiry{' '}
          {data?.currentExpiration
            ? new Date(data.currentExpiration * 1000).toISOString().slice(0, 10)
            : ''}
        </span>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-2.5">
          <div className="text-[9px] uppercase text-[var(--color-fg-muted)]">Max pain</div>
          <div className="font-mono text-[14px] font-semibold tabular text-[var(--color-accent)]">
            ${fmtPrice(result.maxPainStrike ?? 0)}
          </div>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-2.5">
          <div className="text-[9px] uppercase text-[var(--color-fg-muted)]">Underlying</div>
          <div className="font-mono text-[14px] font-semibold tabular">
            ${fmtPrice(result.currentPrice)}
          </div>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-2.5">
          <div className="text-[9px] uppercase text-[var(--color-fg-muted)]">Distance</div>
          <div
            className={cn(
              'flex items-center gap-1 font-mono text-[14px] font-semibold tabular',
              direction === 'down' ? 'text-[var(--color-neg)]' : 'text-[var(--color-pos)]'
            )}
          >
            {direction === 'down' ? (
              <TrendingDown className="h-3 w-3" />
            ) : (
              <TrendingUp className="h-3 w-3" />
            )}
            {result.distanceToPain > 0 ? '-' : '+'}
            {Math.abs(result.distanceToPain).toFixed(2)}%
          </div>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-2.5">
          <div className="text-[9px] uppercase text-[var(--color-fg-muted)]">P/C ratio (OI)</div>
          <div className="font-mono text-[14px] font-semibold tabular">
            {result.putCallRatio.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="text-[10px] text-[var(--color-fg-muted)]">
        Max pain = strike at which the aggregate open-interest intrinsic value of all outstanding
        calls + puts is minimized. Theory: market makers hedging flows can pull price toward this
        level into expiry. Not gospel — treat as one of many signals.
      </div>
    </div>
  )
}
