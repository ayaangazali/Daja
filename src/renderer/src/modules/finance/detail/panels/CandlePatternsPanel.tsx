import { useMemo } from 'react'
import { Lightbulb } from 'lucide-react'
import { useHistorical } from '../../../../hooks/useFinance'
import {
  detectPatterns,
  summarizePatterns,
  type Candle
} from '../../../../lib/candlePatterns'
import { cn } from '../../../../lib/cn'

export function CandlePatternsPanel({ ticker }: { ticker: string }): React.JSX.Element {
  const { data: bars = [] } = useHistorical(ticker, '3mo')

  const { hits, summary, datesByIndex, barCount } = useMemo(() => {
    const candles: Candle[] = []
    const datesByIndex: string[] = []
    for (const b of bars) {
      if (
        b.open != null &&
        b.high != null &&
        b.low != null &&
        b.close != null &&
        Number.isFinite(b.open) &&
        Number.isFinite(b.close)
      ) {
        candles.push({ open: b.open, high: b.high, low: b.low, close: b.close })
        datesByIndex.push(new Date(b.time * 1000).toISOString().slice(0, 10))
      }
    }
    const hits = detectPatterns(candles)
    const summary = summarizePatterns(hits, 20, candles.length)
    return { hits, summary, datesByIndex, barCount: candles.length }
  }, [bars])

  const recent = hits.slice(-12).reverse()

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <Lightbulb className="h-3 w-3" /> Candle patterns (last 20 bars)
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] tabular">
          <span
            className={cn(
              'font-semibold uppercase',
              summary.net === 'bullish' && 'text-[var(--color-pos)]',
              summary.net === 'bearish' && 'text-[var(--color-neg)]',
              summary.net === 'neutral' && 'text-[var(--color-fg-muted)]'
            )}
          >
            {summary.net}
          </span>
          <span className="text-[var(--color-pos)]">+{summary.bullish}</span>
          <span className="text-[var(--color-neg)]">-{summary.bearish}</span>
          <span className="text-[var(--color-fg-muted)]">={summary.neutral}</span>
        </div>
      </div>
      {recent.length === 0 ? (
        <div className="py-2 text-[11px] text-[var(--color-fg-muted)]">
          No notable candle patterns detected.
        </div>
      ) : (
        <div className="flex flex-wrap gap-1">
          {recent.map((h, i) => {
            const date = datesByIndex[h.index] ?? `#${h.index}`
            const barsAgo = Math.max(0, barCount - 1 - h.index)
            return (
              <span
                key={`${h.index}-${h.pattern}-${i}`}
                className={cn(
                  'rounded px-2 py-0.5 font-mono text-[10px]',
                  h.bias === 'bullish'
                    ? 'bg-[var(--color-pos)]/15 text-[var(--color-pos)]'
                    : h.bias === 'bearish'
                      ? 'bg-[var(--color-neg)]/15 text-[var(--color-neg)]'
                      : 'bg-[var(--color-fg-muted)]/10 text-[var(--color-fg-muted)]'
                )}
                title={`${h.pattern} · ${date} · ${barsAgo}d ago`}
              >
                {h.pattern} ({barsAgo}d)
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
