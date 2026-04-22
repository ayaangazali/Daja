import { useMemo } from 'react'
import { Zap } from 'lucide-react'
import { useHistorical } from '../../../../hooks/useFinance'
import { detectCrosses } from '../../../../lib/maCross'
import { cn } from '../../../../lib/cn'

export function CrossSignals({ ticker }: { ticker: string }): React.JSX.Element | null {
  const { data: bars = [] } = useHistorical(ticker, '2y')
  const crosses = useMemo(() => {
    const closes = bars.map((b) => b.close).filter((v): v is number => v != null)
    const times = bars.filter((b) => b.close != null).map((b) => b.time)
    return detectCrosses(closes, times, 50, 200)
  }, [bars])

  if (crosses.length === 0) return null

  const latest = crosses[crosses.length - 1]
  const daysAgo = Math.floor((Date.now() / 1000 - latest.date) / 86400)

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <Zap className="h-3 w-3" /> Golden / Death cross history (50 × 200 SMA, 2y)
        </div>
        <div
          className={cn(
            'rounded px-2 py-0.5 font-mono text-[10px] uppercase',
            latest.type === 'golden'
              ? 'bg-[var(--color-pos)]/15 text-[var(--color-pos)]'
              : 'bg-[var(--color-neg)]/15 text-[var(--color-neg)]'
          )}
        >
          Latest: {latest.type} cross · {daysAgo}d ago
        </div>
      </div>
      <div className="flex flex-wrap gap-1 text-[10px]">
        {crosses.map((c) => {
          const date = new Date(c.date * 1000).toISOString().slice(0, 10)
          return (
            <span
              key={`${c.date}-${c.type}`}
              className={cn(
                'rounded px-2 py-0.5 font-mono tabular',
                c.type === 'golden'
                  ? 'bg-[var(--color-pos)]/10 text-[var(--color-pos)]'
                  : 'bg-[var(--color-neg)]/10 text-[var(--color-neg)]'
              )}
              title={`${c.type}: SMA50=${c.fastSma.toFixed(2)} crossed SMA200=${c.slowSma.toFixed(2)}`}
            >
              {c.type === 'golden' ? '✓' : '✗'} {date}
            </span>
          )
        })}
      </div>
    </div>
  )
}
