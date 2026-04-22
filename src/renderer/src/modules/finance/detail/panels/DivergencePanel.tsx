import { useMemo } from 'react'
import { Zap } from 'lucide-react'
import { useHistorical } from '../../../../hooks/useFinance'
import { detectDivergences } from '../../../../lib/divergence'
import { rsiSeries } from '../../../../lib/indicators2'
import { cn } from '../../../../lib/cn'

export function DivergencePanel({ ticker }: { ticker: string }): React.JSX.Element | null {
  const { data: bars = [] } = useHistorical(ticker, '6mo')

  const { hits, barCount, dates } = useMemo(() => {
    const closes = bars.map((b) => b.close).filter((v): v is number => v != null)
    const dates = bars
      .filter((b) => b.close != null)
      .map((b) => new Date(b.time * 1000).toISOString().slice(0, 10))
    const rsi = rsiSeries(closes, 14)
    return {
      hits: detectDivergences(closes, rsi, 40, 3),
      barCount: closes.length,
      dates
    }
  }, [bars])

  if (barCount < 30) return null

  // Keep recent hits only (last 40 bars)
  const recent = hits.filter((h) => h.secondIdx >= barCount - 40)

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <Zap className="h-3 w-3" /> Price / RSI divergences (6mo)
        </div>
        <span className="font-mono text-[10px] text-[var(--color-fg-muted)]">
          {recent.length} signal{recent.length === 1 ? '' : 's'} in last 40 bars
        </span>
      </div>
      {recent.length === 0 ? (
        <div className="py-2 text-[11px] text-[var(--color-fg-muted)]">
          No notable divergences in recent window.
        </div>
      ) : (
        <div className="space-y-1 text-[10px]">
          {recent.slice(-8).map((h, i) => {
            const firstDate = dates[h.firstIdx] ?? `#${h.firstIdx}`
            const secondDate = dates[h.secondIdx] ?? `#${h.secondIdx}`
            const barsAgo = Math.max(0, barCount - 1 - h.secondIdx)
            const isBull = h.type === 'bullish' || h.type === 'hidden_bull'
            const label =
              h.type === 'bullish'
                ? 'Bullish divergence (lower low price, higher low RSI)'
                : h.type === 'bearish'
                  ? 'Bearish divergence (higher high price, lower high RSI)'
                  : h.type === 'hidden_bull'
                    ? 'Hidden bullish (higher low price, lower low RSI) — trend continuation'
                    : 'Hidden bearish (lower high price, higher high RSI) — trend continuation'
            return (
              <div
                key={i}
                className={cn(
                  'flex items-start gap-2 rounded border px-2 py-1 font-mono',
                  isBull
                    ? 'border-[var(--color-pos)]/30 text-[var(--color-pos)]'
                    : 'border-[var(--color-neg)]/30 text-[var(--color-neg)]'
                )}
              >
                <span className="font-semibold">{h.type.replace('_', ' ')}</span>
                <span className="flex-1 text-[var(--color-fg-muted)]">{label}</span>
                <span className="text-[9px] tabular">
                  {firstDate} → {secondDate} ({barsAgo}d ago)
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
