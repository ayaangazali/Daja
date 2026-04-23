import { useMemo } from 'react'
import { Ruler } from 'lucide-react'
import { useHistorical, useQuote } from '../../../../hooks/useFinance'
import { fibonacciRetracement } from '../../../../lib/pivots'
import { fmtPrice } from '../../../../lib/format'
import { cn } from '../../../../lib/cn'

export function FibRetracementPanel({ ticker }: { ticker: string }): React.JSX.Element {
  const { data: bars = [] } = useHistorical(ticker, '6mo')
  const { data: quote } = useQuote(ticker)

  const analysis = useMemo(() => {
    if (bars.length < 20) return null
    let hi = -Infinity
    let lo = Infinity
    let hiIdx = 0
    let loIdx = 0
    for (let i = 0; i < bars.length; i++) {
      const h = bars[i].high
      const l = bars[i].low
      if (h != null && h > hi) {
        hi = h
        hiIdx = i
      }
      if (l != null && l < lo) {
        lo = l
        loIdx = i
      }
    }
    if (!Number.isFinite(hi) || !Number.isFinite(lo) || hi <= lo) return null
    const direction: 'up' | 'down' = hiIdx > loIdx ? 'up' : 'down'
    const levels = fibonacciRetracement(hi, lo)
    const hiDate = new Date(bars[hiIdx].time * 1000).toISOString().slice(0, 10)
    const loDate = new Date(bars[loIdx].time * 1000).toISOString().slice(0, 10)
    return { hi, lo, hiIdx, loIdx, hiDate, loDate, direction, levels }
  }, [bars])

  if (!analysis) {
    return (
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3 text-[11px] text-[var(--color-fg-muted)]">
        Loading fib retracement…
      </div>
    )
  }

  const current = quote?.price ?? null
  const targetLabels = ['38.2%', '50%', '61.8%']
  const keyTargets = analysis.levels.filter((l) => targetLabels.includes(l.label))

  let nearest: { label: string; value: number; distPct: number } | null = null
  if (current != null) {
    for (const l of analysis.levels) {
      const distPct = Math.abs((l.value - current) / current) * 100
      if (!nearest || distPct < nearest.distPct) {
        nearest = { label: l.label, value: l.value, distPct }
      }
    }
  }

  const swingRange = analysis.hi - analysis.lo
  const swingPct = (swingRange / analysis.lo) * 100

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <Ruler className="h-3 w-3" /> Fibonacci retracement · 6mo swing
        </div>
        <div className="font-mono text-[10px] tabular text-[var(--color-fg-muted)]">
          {analysis.direction === 'up' ? 'uptrend' : 'downtrend'} · range{' '}
          <span className="text-[var(--color-fg)]">{swingPct.toFixed(1)}%</span>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-2 gap-2 md:grid-cols-4">
        <SmallStat label={`High · ${analysis.hiDate}`} value={`$${fmtPrice(analysis.hi)}`} />
        <SmallStat label={`Low · ${analysis.loDate}`} value={`$${fmtPrice(analysis.lo)}`} />
        <SmallStat
          label="Current"
          value={current != null ? `$${fmtPrice(current)}` : '—'}
        />
        <SmallStat
          label="Nearest level"
          value={
            nearest
              ? `${nearest.label} · ${nearest.distPct.toFixed(2)}%`
              : '—'
          }
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead className="text-[10px] uppercase text-[var(--color-fg-muted)]">
            <tr>
              <th className="px-2 py-1 text-left">Level</th>
              <th className="px-2 py-1 text-right">Price</th>
              <th className="px-2 py-1 text-right">Δ vs current</th>
              <th className="px-2 py-1 text-left">Meaning</th>
            </tr>
          </thead>
          <tbody>
            {analysis.levels.map((l) => {
              const delta = current != null ? ((l.value - current) / current) * 100 : null
              const isKey = ['38.2%', '50%', '61.8%'].includes(l.label)
              const isExt = ['127.2%', '161.8%'].includes(l.label)
              const near =
                current != null && Math.abs((l.value - current) / current) < 0.015
              return (
                <tr
                  key={l.label}
                  className={cn(
                    'border-t border-[var(--color-border)] font-mono tabular',
                    near && 'bg-[var(--color-info)]/10'
                  )}
                >
                  <td
                    className={cn(
                      'px-2 py-1 font-semibold',
                      isKey && 'text-[var(--color-info)]',
                      isExt && 'text-[var(--color-warn)]'
                    )}
                  >
                    {l.label}
                  </td>
                  <td className="px-2 py-1 text-right">${fmtPrice(l.value)}</td>
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
                  <td className="px-2 py-1 text-[10px] text-[var(--color-fg-muted)]">
                    {meaningFor(l.label)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-2 text-[10px] text-[var(--color-fg-muted)]">
        Key support/resistance cluster: {keyTargets.map((l) => l.label).join(' · ')}. Price reacting
        at 38.2% = shallow pullback (strong trend). 61.8% = deep pullback (weakening). Below 78.6%
        = trend likely invalidated.
      </div>
    </div>
  )
}

function meaningFor(label: string): string {
  switch (label) {
    case '0%':
      return 'Swing high anchor'
    case '23.6%':
      return 'Shallow pullback'
    case '38.2%':
      return 'Strong-trend pullback'
    case '50%':
      return 'Neutral midpoint'
    case '61.8%':
      return 'Golden ratio — deep pullback'
    case '78.6%':
      return 'Last defense of trend'
    case '100%':
      return 'Swing low anchor'
    case '127.2%':
      return 'Minor extension target'
    case '161.8%':
      return 'Golden extension target'
    default:
      return ''
  }
}

function SmallStat({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-2">
      <div className="text-[9px] uppercase text-[var(--color-fg-muted)]">{label}</div>
      <div className="font-mono text-[12px] font-semibold tabular">{value}</div>
    </div>
  )
}
