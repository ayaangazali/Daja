import { useMemo } from 'react'
import { Gauge } from 'lucide-react'
import { useHistorical, useQuote, type HistoricalBar } from '../../../hooks/useFinance'
import { computeFearGreed } from '../../../lib/fearGreed'
import { cn } from '../../../lib/cn'

export function FearGreedPanel(): React.JSX.Element {
  const { data: spyBars = [] } = useHistorical('SPY', '1y')
  // 3mo window ensures >= 21 trading days for chg20() even around holidays
  // and provider gaps (2mo often returns 38-41 calendar days = ~27-29 trading).
  const { data: hygBars = [] } = useHistorical('HYG', '3mo')
  const { data: tltBars = [] } = useHistorical('TLT', '3mo')
  const { data: spyQuote } = useQuote('SPY')
  const { data: vixQuote } = useQuote('^VIX')

  const result = useMemo(() => {
    const closes = (spyBars as HistoricalBar[])
      .map((b) => b.close)
      .filter((v): v is number => v != null && Number.isFinite(v))

    const chg20 = (bars: HistoricalBar[]): number | null => {
      const vals = bars
        .map((b) => b.close)
        .filter((v): v is number => v != null && Number.isFinite(v))
      if (vals.length < 21) return null
      const last = vals[vals.length - 1]
      const past = vals[vals.length - 21]
      return ((last - past) / past) * 100
    }

    return computeFearGreed({
      spyCloses: closes,
      spy52wHigh: spyQuote?.fiftyTwoWeekHigh ?? null,
      spy52wLow: spyQuote?.fiftyTwoWeekLow ?? null,
      vix: vixQuote?.price ?? null,
      hygChange20d: chg20(hygBars as HistoricalBar[]),
      tltChange20d: chg20(tltBars as HistoricalBar[])
    })
  }, [spyBars, hygBars, tltBars, spyQuote, vixQuote])

  const toneClass =
    result.score >= 75
      ? 'text-[var(--color-pos)]'
      : result.score >= 55
        ? 'text-[var(--color-info)]'
        : result.score >= 45
          ? 'text-[var(--color-fg-muted)]'
          : result.score >= 25
            ? 'text-[var(--color-warn)]'
            : 'text-[var(--color-neg)]'

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <Gauge className="h-3 w-3" /> Fear & Greed index
        </div>
        <span className={cn('font-mono text-[10px] font-semibold uppercase', toneClass)}>
          {result.label}
        </span>
      </div>

      {/* Gauge */}
      <div className="mb-3 flex items-center gap-4">
        <div className="relative flex h-[110px] w-[110px] items-center justify-center">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle
              cx={50}
              cy={50}
              r={42}
              stroke="var(--color-border)"
              strokeWidth={8}
              fill="none"
            />
            <circle
              cx={50}
              cy={50}
              r={42}
              stroke="currentColor"
              strokeWidth={8}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${(result.score / 100) * (Math.PI * 2 * 42)} ${Math.PI * 2 * 42}`}
              className={toneClass}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className={cn('font-mono text-3xl font-bold tabular', toneClass)}>
              {result.score}
            </span>
            <span className="text-[8px] uppercase text-[var(--color-fg-muted)]">/100</span>
          </div>
        </div>
        <div className="flex-1 text-[10px] text-[var(--color-fg-muted)]">
          Composite sentiment gauge. 0 = extreme fear (bottoms). 100 = extreme greed (tops).
          Contrarian signal — best buys often at {'<'} 20, profit-take zone above 80.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
        {result.components.map((c) => (
          <div
            key={c.name}
            className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-[10px]"
          >
            <span className="text-[var(--color-fg-muted)]">{c.name}</span>
            <div className="flex items-center gap-2">
              <div className="h-1 w-16 overflow-hidden rounded bg-[var(--color-bg-elev)]">
                <div
                  className={cn(
                    'h-full',
                    c.value >= 75
                      ? 'bg-[var(--color-pos)]'
                      : c.value >= 55
                        ? 'bg-[var(--color-info)]'
                        : c.value >= 45
                          ? 'bg-[var(--color-fg-muted)]'
                          : c.value >= 25
                            ? 'bg-[var(--color-warn)]'
                            : 'bg-[var(--color-neg)]'
                  )}
                  style={{ width: `${c.value}%` }}
                />
              </div>
              <span className="w-8 text-right font-mono tabular">{c.value.toFixed(0)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
