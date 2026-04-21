import { useQuotes } from '../../../hooks/useFinance'
import { cn } from '../../../lib/cn'
import { fmtPct, signColor } from '../../../lib/format'

// Sector ETFs as proxies (SPDR Select Sector)
const SECTORS = [
  { etf: 'XLK', label: 'Tech' },
  { etf: 'XLF', label: 'Financials' },
  { etf: 'XLV', label: 'Healthcare' },
  { etf: 'XLE', label: 'Energy' },
  { etf: 'XLY', label: 'Cons Disc' },
  { etf: 'XLP', label: 'Cons Staples' },
  { etf: 'XLI', label: 'Industrials' },
  { etf: 'XLU', label: 'Utilities' },
  { etf: 'XLB', label: 'Materials' },
  { etf: 'XLRE', label: 'Real Estate' },
  { etf: 'XLC', label: 'Comm Svcs' }
]

function colorFor(pct: number | null | undefined): string {
  if (pct == null) return 'bg-[var(--color-fg-muted)]/10'
  const clamped = Math.max(-3, Math.min(3, pct))
  if (clamped > 0) {
    const intensity = Math.round((clamped / 3) * 100)
    return `bg-[color-mix(in_srgb,var(--color-pos)_${intensity}%,var(--color-bg-elev))]`
  }
  if (clamped < 0) {
    const intensity = Math.round((-clamped / 3) * 100)
    return `bg-[color-mix(in_srgb,var(--color-neg)_${intensity}%,var(--color-bg-elev))]`
  }
  return 'bg-[var(--color-bg-elev)]'
}

export function SectorHeatmap(): React.JSX.Element {
  const quotes = useQuotes(SECTORS.map((s) => s.etf))
  return (
    <div
      className={cn(
        'rounded-md border p-3',
        'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          Sector heatmap (SPDR ETFs)
        </div>
        <div className="text-[9px] text-[var(--color-fg-muted)]">Intraday %</div>
      </div>
      <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 lg:grid-cols-6">
        {SECTORS.map((s, i) => {
          const q = quotes[i]?.data
          const pct = q?.changePercent
          return (
            <div
              key={s.etf}
              className={cn(
                'rounded border border-[var(--color-border)] p-2 text-center transition-colors',
                colorFor(pct)
              )}
              title={`${s.label} (${s.etf})`}
            >
              <div className="font-mono text-[9px] font-semibold">{s.etf}</div>
              <div className="text-[10px] text-[var(--color-fg-muted)] truncate">{s.label}</div>
              <div className={cn('mt-0.5 font-mono text-[11px] tabular', signColor(pct))}>
                {fmtPct(pct)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
