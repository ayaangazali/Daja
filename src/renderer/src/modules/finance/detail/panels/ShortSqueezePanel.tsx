import { useMemo } from 'react'
import { Zap } from 'lucide-react'
import { useFundamentals } from '../../../../hooks/useFundamentals'
import { useHistorical } from '../../../../hooks/useFinance'
import { assessShortSqueeze } from '../../../../lib/shortSqueeze'
import { fmtLargeNum } from '../../../../lib/format'
import { cn } from '../../../../lib/cn'

export function ShortSqueezePanel({ ticker }: { ticker: string }): React.JSX.Element {
  const { data: fund } = useFundamentals(ticker)
  const { data: bars = [] } = useHistorical(ticker, '3mo')

  const result = useMemo(() => {
    if (!fund) return null
    let priceChange1m: number | null = null
    const closes = bars.map((b) => b.close).filter((c): c is number => c != null)
    if (closes.length >= 21) {
      const last = closes[closes.length - 1]
      const prior = closes[closes.length - 21]
      priceChange1m = (last - prior) / prior
    }
    return assessShortSqueeze({
      shortPercent: fund.shortPercent,
      sharesShort: fund.sharesShort,
      sharesShortPriorMonth: fund.sharesShortPriorMonth,
      shortRatio: fund.shortRatio,
      priceChange1m
    })
  }, [fund, bars])

  if (!result) {
    return (
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3 text-[11px] text-[var(--color-fg-muted)]">
        Loading short squeeze data…
      </div>
    )
  }

  const tierTone =
    result.tier === 'extreme' || result.tier === 'high'
      ? 'text-[var(--color-warn)]'
      : result.tier === 'elevated'
        ? 'text-[var(--color-accent)]'
        : 'text-[var(--color-fg-muted)]'

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <Zap className="h-3 w-3" /> Short squeeze assessment
        </div>
        <div className={cn('font-mono text-[11px] font-semibold uppercase', tierTone)}>
          {result.tier} · {result.score}/100
        </div>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat
          label="Short % of float"
          value={result.shortPercentPct != null ? `${result.shortPercentPct.toFixed(1)}%` : '—'}
          tone={result.shortPercentPct != null && result.shortPercentPct >= 20 ? 'warn' : undefined}
        />
        <Stat
          label="Days to cover"
          value={result.daysToCover != null ? result.daysToCover.toFixed(1) : '—'}
          tone={result.daysToCover != null && result.daysToCover >= 5 ? 'warn' : undefined}
        />
        <Stat
          label="MoM short Δ"
          value={
            result.momShortDeltaPct != null
              ? `${result.momShortDeltaPct >= 0 ? '+' : ''}${result.momShortDeltaPct.toFixed(1)}%`
              : '—'
          }
          tone={
            result.momShortDeltaPct != null && result.momShortDeltaPct >= 10
              ? 'warn'
              : result.momShortDeltaPct != null && result.momShortDeltaPct <= -10
                ? 'pos'
                : undefined
          }
        />
        <Stat
          label="Shares short"
          value={fund?.sharesShort != null ? fmtLargeNum(fund.sharesShort) : '—'}
        />
      </div>
      {result.rationale.length > 0 && (
        <div className="space-y-1">
          {result.rationale.map((r, i) => (
            <div
              key={i}
              className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-[10px] text-[var(--color-fg-muted)]"
            >
              · {r}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  tone
}: {
  label: string
  value: string
  tone?: 'pos' | 'neg' | 'warn'
}): React.JSX.Element {
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-2">
      <div className="text-[9px] uppercase text-[var(--color-fg-muted)]">{label}</div>
      <div
        className={cn(
          'font-mono text-[13px] font-semibold tabular',
          tone === 'pos' && 'text-[var(--color-pos)]',
          tone === 'neg' && 'text-[var(--color-neg)]',
          tone === 'warn' && 'text-[var(--color-warn)]'
        )}
      >
        {value}
      </div>
    </div>
  )
}
