import { fmtPrice } from '../lib/format'
import { cn } from '../lib/cn'

/**
 * Tiny inline range indicator: 52-week low ━━━●━━━ 52-week high, with a marker
 * at the current price position.
 */
export function Range52w({
  low,
  high,
  current,
  className
}: {
  low: number | null | undefined
  high: number | null | undefined
  current: number | null | undefined
  className?: string
}): React.JSX.Element | null {
  if (low == null || high == null || current == null || high <= low) return null
  const pct = Math.max(0, Math.min(100, ((current - low) / (high - low)) * 100))
  const tone = pct > 80 ? 'text-[var(--color-pos)]' : pct < 20 ? 'text-[var(--color-neg)]' : ''
  return (
    <div className={cn('flex items-center gap-1 font-mono text-[9px] tabular', className)}>
      <span className="text-[var(--color-fg-muted)]">${fmtPrice(low)}</span>
      <div className="relative h-1 w-24 rounded bg-[var(--color-bg)]">
        <div
          className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full border border-[var(--color-bg-elev)] bg-[var(--color-fg)]"
          style={{ left: `calc(${pct}% - 4px)` }}
          title={`${pct.toFixed(0)}% of 52w range`}
        />
      </div>
      <span className="text-[var(--color-fg-muted)]">${fmtPrice(high)}</span>
      <span className={cn('ml-1', tone)}>{pct.toFixed(0)}%</span>
    </div>
  )
}
