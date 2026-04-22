import { useMemo } from 'react'
import { Activity } from 'lucide-react'
import { useFundamentals } from '../../../../hooks/useFundamentals'
import { useHistorical } from '../../../../hooks/useFinance'
import { analyzeEarningsReactions } from '../../../../lib/earningsReaction'
import { fmtPct } from '../../../../lib/format'
import { cn } from '../../../../lib/cn'

export function EarningsReactionPanel({
  ticker
}: {
  ticker: string
}): React.JSX.Element | null {
  const { data: fund } = useFundamentals(ticker)
  const { data: bars = [] } = useHistorical(ticker, '5y')

  const summary = useMemo(() => {
    if (!fund || bars.length === 0) return null
    const dates = fund.earningsHistory
      .map((h) => h.quarter)
      .filter((q): q is string => !!q)
    const barsClean = bars
      .filter((b) => b.close != null)
      .map((b) => ({ time: b.time, close: b.close as number }))
    return analyzeEarningsReactions({ earningsDates: dates, bars: barsClean })
  }, [fund, bars])

  if (!summary || summary.events.length === 0) return null

  const toneBy = (v: number | null): string =>
    v == null ? '' : v > 0 ? 'text-[var(--color-pos)]' : 'text-[var(--color-neg)]'

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <Activity className="h-3 w-3" /> Post-earnings drift (last {summary.events.length} reports)
        </div>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label="Avg 1d" value={summary.avg1d != null ? fmtPct(summary.avg1d) : '—'} tone={toneBy(summary.avg1d)} />
        <Stat label="Avg 3d" value={summary.avg3d != null ? fmtPct(summary.avg3d) : '—'} tone={toneBy(summary.avg3d)} />
        <Stat label="Avg 5d" value={summary.avg5d != null ? fmtPct(summary.avg5d) : '—'} tone={toneBy(summary.avg5d)} />
        <Stat label="Avg 10d" value={summary.avg10d != null ? fmtPct(summary.avg10d) : '—'} tone={toneBy(summary.avg10d)} />
        <Stat
          label="1d hit rate"
          value={`${summary.hitRate1d.toFixed(0)}%`}
          tone={summary.hitRate1d >= 50 ? 'text-[var(--color-pos)]' : 'text-[var(--color-neg)]'}
        />
        <Stat
          label="5d hit rate"
          value={`${summary.hitRate5d.toFixed(0)}%`}
          tone={summary.hitRate5d >= 50 ? 'text-[var(--color-pos)]' : 'text-[var(--color-neg)]'}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead className="text-[9px] uppercase text-[var(--color-fg-muted)]">
            <tr>
              <th className="px-2 py-1 text-left">Quarter</th>
              <th className="px-2 py-1 text-right">+1d</th>
              <th className="px-2 py-1 text-right">+3d</th>
              <th className="px-2 py-1 text-right">+5d</th>
              <th className="px-2 py-1 text-right">+10d</th>
            </tr>
          </thead>
          <tbody>
            {summary.events.slice(-12).reverse().map((e) => (
              <tr key={e.date} className="border-t border-[var(--color-border)] font-mono tabular">
                <td className="px-2 py-0.5">{e.date}</td>
                <td className={cn('px-2 py-0.5 text-right', toneBy(e.r1d))}>
                  {e.r1d != null ? fmtPct(e.r1d) : '—'}
                </td>
                <td className={cn('px-2 py-0.5 text-right', toneBy(e.r3d))}>
                  {e.r3d != null ? fmtPct(e.r3d) : '—'}
                </td>
                <td className={cn('px-2 py-0.5 text-right', toneBy(e.r5d))}>
                  {e.r5d != null ? fmtPct(e.r5d) : '—'}
                </td>
                <td className={cn('px-2 py-0.5 text-right', toneBy(e.r10d))}>
                  {e.r10d != null ? fmtPct(e.r10d) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
  tone?: string
}): React.JSX.Element {
  return (
    <div className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] p-1.5">
      <div className="text-[9px] uppercase text-[var(--color-fg-muted)]">{label}</div>
      <div className={cn('font-mono text-[12px] font-semibold tabular', tone)}>{value}</div>
    </div>
  )
}
