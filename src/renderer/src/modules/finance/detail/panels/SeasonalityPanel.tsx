import { useMemo } from 'react'
import { Calendar } from 'lucide-react'
import { useHistorical } from '../../../../hooks/useFinance'
import { analyzeSeasonality } from '../../../../lib/monthlyReturns'
import { fmtPct } from '../../../../lib/format'
import { cn } from '../../../../lib/cn'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function cellColor(v: number | null): string {
  if (v == null) return 'transparent'
  const cap = 10
  const mag = Math.min(Math.abs(v), cap) / cap
  if (v > 0) return `rgba(34, 197, 94, ${0.15 + mag * 0.55})`
  return `rgba(239, 68, 68, ${0.15 + mag * 0.55})`
}

export function SeasonalityPanel({ ticker }: { ticker: string }): React.JSX.Element {
  const { data: bars, isLoading } = useHistorical(ticker, '10y')

  const s = useMemo(() => {
    if (!bars) return null
    const pts = bars
      .filter((b) => b.close != null && Number.isFinite(b.close))
      .map((b) => ({
        date: new Date(b.time * 1000).toISOString().slice(0, 10),
        close: b.close as number
      }))
    return analyzeSeasonality(pts)
  }, [bars])

  if (isLoading) {
    return (
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3 text-[11px] text-[var(--color-fg-muted)]">
        Loading seasonality…
      </div>
    )
  }
  if (!s || s.years.length < 2) {
    return (
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3 text-[11px] text-[var(--color-fg-muted)]">
        Need ≥ 2 years of history for seasonality.
      </div>
    )
  }

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <Calendar className="h-3 w-3" /> Monthly returns heatmap
        </div>
        <div className="font-mono text-[10px] tabular">
          {s.bestMonth != null && (
            <span className="mr-3 text-[var(--color-pos)]">
              Best avg: {MONTHS[s.bestMonth - 1]}
            </span>
          )}
          {s.worstMonth != null && (
            <span className="text-[var(--color-neg)]">
              Worst avg: {MONTHS[s.worstMonth - 1]}
            </span>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="text-[10px]">
          <thead>
            <tr className="text-[9px] uppercase text-[var(--color-fg-muted)]">
              <th className="px-2 py-1 text-left">Year</th>
              {MONTHS.map((m) => (
                <th key={m} className="px-1 py-1 text-center">
                  {m}
                </th>
              ))}
              <th className="px-2 py-1 text-right">Yr</th>
            </tr>
          </thead>
          <tbody>
            {s.years.map((y, yi) => (
              <tr key={y}>
                <td className="px-2 py-0.5 font-mono font-semibold tabular">{y}</td>
                {s.grid[yi].map((v, mi) => (
                  <td
                    key={`${y}-${mi}`}
                    className="px-1 py-0.5 text-center font-mono tabular"
                    style={{ background: cellColor(v) }}
                    title={`${MONTHS[mi]} ${y}: ${v != null ? fmtPct(v) : '—'}`}
                  >
                    {v != null ? v.toFixed(1) : ''}
                  </td>
                ))}
                <td
                  className={cn(
                    'px-2 py-0.5 text-right font-mono font-semibold tabular',
                    s.annualByYear[yi] != null && s.annualByYear[yi]! > 0
                      ? 'text-[var(--color-pos)]'
                      : 'text-[var(--color-neg)]'
                  )}
                >
                  {s.annualByYear[yi] != null ? fmtPct(s.annualByYear[yi]!) : '—'}
                </td>
              </tr>
            ))}
            <tr className="border-t border-[var(--color-border)]">
              <td className="px-2 py-1 text-[9px] uppercase text-[var(--color-fg-muted)]">
                Avg
              </td>
              {s.avgByMonth.map((v, mi) => (
                <td
                  key={`avg-${mi}`}
                  className={cn(
                    'px-1 py-1 text-center font-mono font-semibold tabular',
                    v != null && v > 0
                      ? 'text-[var(--color-pos)]'
                      : v != null
                        ? 'text-[var(--color-neg)]'
                        : 'text-[var(--color-fg-muted)]'
                  )}
                >
                  {v != null ? v.toFixed(1) : '—'}
                </td>
              ))}
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
