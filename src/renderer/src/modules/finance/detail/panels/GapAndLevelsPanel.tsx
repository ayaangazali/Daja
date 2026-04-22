import { useMemo } from 'react'
import { Layers } from 'lucide-react'
import { useHistorical, useQuote } from '../../../../hooks/useFinance'
import { detectGaps, gapFillStats, type OHLCVBar } from '../../../../lib/gapAnalysis'
import { detectSRLevels } from '../../../../lib/supportResistance'
import { fmtPrice } from '../../../../lib/format'
import { cn } from '../../../../lib/cn'

export function GapAndLevelsPanel({ ticker }: { ticker: string }): React.JSX.Element {
  const { data: bars = [] } = useHistorical(ticker, '1y')
  const { data: quote } = useQuote(ticker)

  const { gaps, gapStats, levels, datesByIndex } = useMemo(() => {
    const ohlc: OHLCVBar[] = bars.map((b) => ({
      time: b.time,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
      volume: b.volume
    }))
    const datesByIndex = bars.map((b) => new Date(b.time * 1000).toISOString().slice(0, 10))
    const gaps = detectGaps(ohlc, 1.5)
    const gapStats = gapFillStats(gaps)
    const highs = bars.map((b) => b.high ?? b.close ?? 0)
    const lows = bars.map((b) => b.low ?? b.close ?? 0)
    const levels = detectSRLevels(highs, lows, {
      radius: 3,
      tolerancePct: 1,
      minTouches: 2,
      topN: 8
    })
    return { gaps, gapStats, levels, datesByIndex }
  }, [bars])

  const currentPrice = quote?.price

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <Layers className="h-3 w-3" /> Support/resistance + gap analysis
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] p-2">
          <div className="mb-1 text-[9px] uppercase text-[var(--color-fg-muted)]">
            Key levels (swing clusters, 1y)
          </div>
          {levels.length === 0 ? (
            <div className="text-[10px] text-[var(--color-fg-muted)]">No clustered levels.</div>
          ) : (
            <table className="w-full text-[10px]">
              <thead className="text-[9px] uppercase text-[var(--color-fg-muted)]">
                <tr>
                  <th className="px-1 py-0.5 text-left">Type</th>
                  <th className="px-1 py-0.5 text-right">Price</th>
                  <th className="px-1 py-0.5 text-right">Touches</th>
                  <th className="px-1 py-0.5 text-right">Δ%</th>
                </tr>
              </thead>
              <tbody>
                {levels.map((l, i) => {
                  const delta =
                    currentPrice != null ? ((l.price - currentPrice) / currentPrice) * 100 : null
                  return (
                    <tr
                      key={`lv-${i}`}
                      className="border-t border-[var(--color-border)] font-mono tabular"
                    >
                      <td
                        className={cn(
                          'px-1 py-0.5 font-semibold uppercase',
                          l.type === 'resistance'
                            ? 'text-[var(--color-neg)]'
                            : 'text-[var(--color-pos)]'
                        )}
                      >
                        {l.type === 'resistance' ? 'R' : 'S'}
                      </td>
                      <td className="px-1 py-0.5 text-right">${fmtPrice(l.price)}</td>
                      <td className="px-1 py-0.5 text-right">{l.touches}</td>
                      <td
                        className={cn(
                          'px-1 py-0.5 text-right',
                          delta != null && delta > 0
                            ? 'text-[var(--color-neg)]'
                            : 'text-[var(--color-pos)]'
                        )}
                      >
                        {delta != null ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)}%` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] p-2">
          <div className="mb-1 flex items-center justify-between text-[9px] uppercase text-[var(--color-fg-muted)]">
            <span>Gap events (≥1.5%, 1y)</span>
            <span className="normal-case">
              {gapStats.total} gaps · {gapStats.fillRate.toFixed(0)}% filled · median fill{' '}
              {gapStats.medianDaysToFill != null ? `${gapStats.medianDaysToFill}d` : '—'}
            </span>
          </div>
          {gaps.length === 0 ? (
            <div className="text-[10px] text-[var(--color-fg-muted)]">No notable gaps.</div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-[10px]">
                <thead className="sticky top-0 bg-[var(--color-bg)] text-[9px] uppercase text-[var(--color-fg-muted)]">
                  <tr>
                    <th className="px-1 py-0.5 text-left">Date</th>
                    <th className="px-1 py-0.5 text-left">Type</th>
                    <th className="px-1 py-0.5 text-right">%</th>
                    <th className="px-1 py-0.5 text-right">Fill</th>
                  </tr>
                </thead>
                <tbody>
                  {[...gaps].reverse().map((g, i) => (
                    <tr
                      key={`g-${i}`}
                      className="border-t border-[var(--color-border)] font-mono tabular"
                    >
                      <td className="px-1 py-0.5">{datesByIndex[g.index] ?? ''}</td>
                      <td
                        className={cn(
                          'px-1 py-0.5 font-semibold uppercase',
                          g.type === 'gap_up'
                            ? 'text-[var(--color-pos)]'
                            : 'text-[var(--color-neg)]'
                        )}
                      >
                        {g.type === 'gap_up' ? '↑' : '↓'}
                      </td>
                      <td
                        className={cn(
                          'px-1 py-0.5 text-right',
                          g.type === 'gap_up'
                            ? 'text-[var(--color-pos)]'
                            : 'text-[var(--color-neg)]'
                        )}
                      >
                        {g.pct > 0 ? '+' : ''}
                        {g.pct.toFixed(1)}%
                      </td>
                      <td className="px-1 py-0.5 text-right">
                        {g.filled ? (
                          `${g.daysToFill}d`
                        ) : (
                          <span className="text-[var(--color-warn)]">open</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
