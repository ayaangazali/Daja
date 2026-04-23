import { useMemo, useState } from 'react'
import { Zap } from 'lucide-react'
import { useHistorical } from '../../../../hooks/useFinance'
import { detectDivergences } from '../../../../lib/divergence'
import { rsiSeries, macdSeries } from '../../../../lib/indicators2'
import { cn } from '../../../../lib/cn'

type Mode = 'rsi' | 'macd'

export function DivergencePanel({ ticker }: { ticker: string }): React.JSX.Element | null {
  const [mode, setMode] = useState<Mode>('rsi')
  const { data: bars = [] } = useHistorical(ticker, '6mo')

  const { hits, barCount, dates } = useMemo(() => {
    const closes = bars.map((b) => b.close).filter((v): v is number => v != null)
    const dates = bars
      .filter((b) => b.close != null)
      .map((b) => new Date(b.time * 1000).toISOString().slice(0, 10))
    let osc: number[]
    if (mode === 'rsi') {
      osc = rsiSeries(closes, 14).map((v) => v ?? 50)
    } else {
      const m = macdSeries(closes)
      osc = m.hist.map((v) => v ?? 0)
    }
    return {
      hits: detectDivergences(closes, osc, 40, 3),
      barCount: closes.length,
      dates
    }
  }, [bars, mode])

  if (barCount < 30) return null

  const recent = hits.filter((h) => h.secondIdx >= barCount - 40)
  const oscLabel = mode === 'rsi' ? 'RSI' : 'MACD hist'

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <Zap className="h-3 w-3" /> Price / {oscLabel} divergences (6mo)
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[10px]">
            {(['rsi', 'macd'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  'rounded border px-2 py-0.5 font-mono uppercase',
                  mode === m
                    ? 'border-[var(--color-info)] bg-[var(--color-info)]/15 text-[var(--color-info)]'
                    : 'border-[var(--color-border)] text-[var(--color-fg-muted)]'
                )}
              >
                {m}
              </button>
            ))}
          </div>
          <span className="font-mono text-[10px] text-[var(--color-fg-muted)]">
            {recent.length} signal{recent.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>
      {recent.length === 0 ? (
        <div className="py-2 text-[11px] text-[var(--color-fg-muted)]">
          No notable {oscLabel} divergences in recent window.
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
                ? `Bullish divergence (lower low price, higher low ${oscLabel})`
                : h.type === 'bearish'
                  ? `Bearish divergence (higher high price, lower high ${oscLabel})`
                  : h.type === 'hidden_bull'
                    ? `Hidden bullish (higher low price, lower low ${oscLabel}) — trend continuation`
                    : `Hidden bearish (lower high price, higher high ${oscLabel}) — trend continuation`
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
