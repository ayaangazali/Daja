import { useMemo, useState } from 'react'
import { Target } from 'lucide-react'
import { useHistorical, useQuote } from '../../../../hooks/useFinance'
import {
  camarillaPivots,
  classicPivots,
  fibonacciPivots,
  woodiePivots,
  type PivotSet
} from '../../../../lib/pivots'
import { fmtPrice } from '../../../../lib/format'
import { cn } from '../../../../lib/cn'

type Kind = 'classic' | 'fibonacci' | 'camarilla' | 'woodie'

export function PivotPointsPanel({ ticker }: { ticker: string }): React.JSX.Element {
  const [kind, setKind] = useState<Kind>('classic')
  const { data: bars = [] } = useHistorical(ticker, '5d')
  const { data: quote } = useQuote(ticker)

  const pivots: (PivotSet & { refDate: string }) | null = useMemo(() => {
    if (bars.length < 2) return null
    // Use second-to-last bar as "yesterday" (last bar may be today's partial).
    const prev = bars[bars.length - 2]
    if (prev.high == null || prev.low == null || prev.close == null) return null
    const date = new Date(prev.time * 1000).toISOString().slice(0, 10)
    let p: PivotSet
    if (kind === 'classic') p = classicPivots(prev.high, prev.low, prev.close)
    else if (kind === 'fibonacci') p = fibonacciPivots(prev.high, prev.low, prev.close)
    else if (kind === 'camarilla') p = camarillaPivots(prev.high, prev.low, prev.close)
    else p = woodiePivots(prev.high, prev.low, prev.close)
    return { ...p, refDate: date }
  }, [bars, kind])

  if (!pivots) {
    return (
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3 text-[11px] text-[var(--color-fg-muted)]">
        Loading pivot points…
      </div>
    )
  }

  const current = quote?.price
  const rows: { label: string; value: number; tone: 'r' | 's' | 'p' }[] = []
  if (pivots.r4 != null) rows.push({ label: 'R4', value: pivots.r4, tone: 'r' })
  rows.push({ label: 'R3', value: pivots.r3, tone: 'r' })
  rows.push({ label: 'R2', value: pivots.r2, tone: 'r' })
  rows.push({ label: 'R1', value: pivots.r1, tone: 'r' })
  rows.push({ label: 'P', value: pivots.p, tone: 'p' })
  rows.push({ label: 'S1', value: pivots.s1, tone: 's' })
  rows.push({ label: 'S2', value: pivots.s2, tone: 's' })
  rows.push({ label: 'S3', value: pivots.s3, tone: 's' })
  if (pivots.s4 != null) rows.push({ label: 'S4', value: pivots.s4, tone: 's' })

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <Target className="h-3 w-3" /> Pivot points — ref {pivots.refDate}
        </div>
        <div className="flex items-center gap-1 text-[10px]">
          {(['classic', 'fibonacci', 'camarilla', 'woodie'] as Kind[]).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={cn(
                'rounded border px-2 py-0.5 font-mono uppercase',
                kind === k
                  ? 'border-[var(--color-info)] bg-[var(--color-info)]/15 text-[var(--color-info)]'
                  : 'border-[var(--color-border)] text-[var(--color-fg-muted)]'
              )}
            >
              {k}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead className="text-[10px] uppercase text-[var(--color-fg-muted)]">
            <tr>
              <th className="px-2 py-1 text-left">Level</th>
              <th className="px-2 py-1 text-right">Price</th>
              <th className="px-2 py-1 text-right">Δ vs current</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const delta = current != null ? ((r.value - current) / current) * 100 : null
              return (
                <tr
                  key={r.label}
                  className={cn(
                    'border-t border-[var(--color-border)] font-mono tabular',
                    current != null &&
                      Math.abs((r.value - current) / current) < 0.005 &&
                      'bg-[var(--color-info)]/10'
                  )}
                >
                  <td
                    className={cn(
                      'px-2 py-1 font-semibold',
                      r.tone === 'r' && 'text-[var(--color-neg)]',
                      r.tone === 's' && 'text-[var(--color-pos)]',
                      r.tone === 'p' && 'text-[var(--color-info)]'
                    )}
                  >
                    {r.label}
                  </td>
                  <td className="px-2 py-1 text-right">${fmtPrice(r.value)}</td>
                  <td
                    className={cn(
                      'px-2 py-1 text-right',
                      delta != null && delta > 0
                        ? 'text-[var(--color-neg)]'
                        : 'text-[var(--color-pos)]'
                    )}
                  >
                    {delta != null ? `${delta > 0 ? '+' : ''}${delta.toFixed(2)}%` : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
