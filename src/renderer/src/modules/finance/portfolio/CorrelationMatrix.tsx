import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { Network } from 'lucide-react'
import { useTrades } from '../../../hooks/useTrades'
import { computeTaxLotPositions, type TaxLotTrade } from '../../../lib/positionsFifo'
import { avgOffDiagonal, correlationMatrix } from '../../../lib/portfolioCorrelation'
import type { HistoricalBar } from '../../../hooks/useFinance'

function corrColor(v: number | null): string {
  if (v == null) return 'var(--color-bg)'
  // map v in [-1,1] to red(-1) → gray(0) → green(1)
  if (v > 0) {
    const a = Math.min(1, v)
    return `rgba(34, 197, 94, ${0.15 + a * 0.6})`
  } else {
    const a = Math.min(1, -v)
    return `rgba(239, 68, 68, ${0.15 + a * 0.6})`
  }
}

export function CorrelationMatrix(): React.JSX.Element | null {
  const { data: trades = [] } = useTrades()

  const tickers = useMemo(() => {
    const taxLotTrades: TaxLotTrade[] = trades
      .filter(
        (t): t is typeof t & { side: 'buy' | 'sell' } => t.side === 'buy' || t.side === 'sell'
      )
      .map((t) => ({
        date: t.date,
        ticker: t.ticker,
        side: t.side,
        quantity: t.quantity,
        price: t.price,
        fees: t.fees ?? 0
      }))
    const pos = computeTaxLotPositions(taxLotTrades)
    return pos.filter((p) => p.qty > 0.0001).map((p) => p.ticker)
  }, [trades])

  const historical = useQueries({
    queries: tickers.map((t) => ({
      queryKey: ['historical', t, '1y'],
      queryFn: () => window.nexus.finance.historical(t, '1y') as Promise<HistoricalBar[]>,
      staleTime: 30 * 60_000
    }))
  })

  const { matrix, avg, resolvedTickers } = useMemo(() => {
    const series: Record<string, number[]> = {}
    tickers.forEach((t, i) => {
      const bars = historical[i]?.data
      if (bars) {
        series[t] = bars
          .map((b) => b.close)
          .filter((v): v is number => v != null && Number.isFinite(v))
      }
    })
    const { tickers: rt, matrix: m } = correlationMatrix(series)
    return { matrix: m, avg: avgOffDiagonal(m), resolvedTickers: rt }
  }, [tickers, historical])

  if (tickers.length < 2) return null

  const loading = historical.some((h) => h.isLoading)
  if (loading && resolvedTickers.length < 2) {
    return (
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3 text-[11px] text-[var(--color-fg-muted)]">
        Loading correlation matrix…
      </div>
    )
  }

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <Network className="h-3 w-3" /> Correlation matrix (1y daily returns)
        </div>
        {avg != null && (
          <div className="font-mono text-[10px] tabular">
            Avg off-diagonal:{' '}
            <span
              className={
                avg < 0.4
                  ? 'text-[var(--color-pos)]'
                  : avg < 0.7
                    ? 'text-[var(--color-warn)]'
                    : 'text-[var(--color-neg)]'
              }
            >
              {avg.toFixed(2)}
            </span>
            <span className="ml-2 text-[var(--color-fg-muted)]">
              {avg < 0.4 ? '✓ diversified' : avg < 0.7 ? 'mid correlation' : '⚠ concentrated'}
            </span>
          </div>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="text-[10px]">
          <thead>
            <tr>
              <th className="px-2 py-1"></th>
              {resolvedTickers.map((t) => (
                <th
                  key={t}
                  className="px-2 py-1 text-center font-mono font-semibold"
                  style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                >
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, i) => (
              <tr key={resolvedTickers[i]}>
                <td className="px-2 py-1 text-right font-mono font-semibold">
                  {resolvedTickers[i]}
                </td>
                {row.map((cell, j) => (
                  <td
                    key={`${cell.a}-${cell.b}`}
                    className="px-2 py-1 text-center font-mono tabular"
                    style={{ background: corrColor(cell.value) }}
                    title={`${cell.a} vs ${cell.b}: ${cell.value?.toFixed(2) ?? 'n/a'}`}
                  >
                    {i === j ? '—' : cell.value != null ? cell.value.toFixed(2) : 'n/a'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
