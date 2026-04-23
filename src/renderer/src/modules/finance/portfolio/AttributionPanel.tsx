import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { BarChart4 } from 'lucide-react'
import { useTrades } from '../../../hooks/useTrades'
import { useQuotes, useQuote, type Quote } from '../../../hooks/useFinance'
import type { Fundamentals } from '../../../hooks/useFundamentals'
import { computeTaxLotPositions, type TaxLotTrade } from '../../../lib/positionsFifo'
import { attributePerformance, type PerfPosition } from '../../../lib/performanceAttribution'
import { fmtLargeNum, fmtPct } from '../../../lib/format'
import { cn } from '../../../lib/cn'

export function AttributionPanel(): React.JSX.Element | null {
  const { data: trades = [] } = useTrades()
  const openPositions = useMemo(() => {
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
    return computeTaxLotPositions(taxLotTrades).filter((p) => p.qty > 0.0001)
  }, [trades])

  const tickers = openPositions.map((p) => p.ticker)
  const quotes = useQuotes(tickers)
  const fundQueries = useQueries({
    queries: tickers.map((t) => ({
      queryKey: ['fundamentals', t],
      queryFn: () => window.daja.finance.fundamentals(t) as Promise<Fundamentals>,
      staleTime: 15 * 60_000
    }))
  })
  const { data: spy } = useQuote('SPY')

  const result = useMemo(() => {
    const perfPositions: PerfPosition[] = openPositions.map((p, i) => {
      const q = quotes[i]?.data as Quote | undefined
      const f = fundQueries[i]?.data
      return {
        ticker: p.ticker,
        shares: p.qty,
        avgCost: p.avgCost,
        currentPrice: q?.price ?? p.avgCost,
        sector: f?.sector ?? null
      }
    })
    const benchmark = spy?.changePercent ?? 0
    return attributePerformance(perfPositions, benchmark)
  }, [openPositions, quotes, fundQueries, spy])

  if (openPositions.length === 0) return null

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <BarChart4 className="h-3 w-3" /> Performance attribution
        </div>
        <span className="text-[9px] text-[var(--color-fg-muted)]">
          Contribution = weight × position return
        </span>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat
          label="Total P&L"
          value={`$${fmtLargeNum(result.totalPnl)}`}
          tone={result.totalPnl >= 0 ? 'pos' : 'neg'}
        />
        <Stat
          label="Return"
          value={fmtPct(result.totalReturnPct)}
          tone={result.totalReturnPct >= 0 ? 'pos' : 'neg'}
        />
        <Stat label="Benchmark (SPY 1d)" value={fmtPct(result.benchmarkReturnPct)} />
        <Stat label="Alpha" value={fmtPct(result.alpha)} tone={result.alpha >= 0 ? 'pos' : 'neg'} />
      </div>

      {result.best && result.worst && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-[var(--color-pos)]/30 bg-[var(--color-pos)]/5 p-2.5">
            <div className="text-[9px] uppercase text-[var(--color-pos)]">Top contributor</div>
            <div className="font-mono text-[13px] font-semibold tabular">{result.best.ticker}</div>
            <div className="text-[10px] text-[var(--color-fg-muted)]">
              +${fmtLargeNum(result.best.pnl)} · {fmtPct(result.best.pnlPct)}
            </div>
          </div>
          <div className="rounded-lg border border-[var(--color-neg)]/30 bg-[var(--color-neg)]/5 p-2.5">
            <div className="text-[9px] uppercase text-[var(--color-neg)]">Biggest drag</div>
            <div className="font-mono text-[13px] font-semibold tabular">{result.worst.ticker}</div>
            <div className="text-[10px] text-[var(--color-fg-muted)]">
              ${fmtLargeNum(result.worst.pnl)} · {fmtPct(result.worst.pnlPct)}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
            By position (sorted by contribution)
          </div>
          <table className="w-full text-[10px]">
            <thead className="text-[9px] uppercase text-[var(--color-fg-muted)]">
              <tr>
                <th className="text-left">Ticker</th>
                <th className="text-right">Weight</th>
                <th className="text-right">Return</th>
                <th className="text-right">Contrib</th>
              </tr>
            </thead>
            <tbody>
              {result.positions
                .slice()
                .sort((a, b) => b.contribution - a.contribution)
                .map((p) => (
                  <tr
                    key={p.ticker}
                    className="border-t border-[var(--color-border)] font-mono tabular"
                  >
                    <td className="py-0.5 font-semibold">{p.ticker}</td>
                    <td className="py-0.5 text-right">{p.weightBegin.toFixed(1)}%</td>
                    <td
                      className={cn(
                        'py-0.5 text-right',
                        p.pnlPct >= 0 ? 'text-[var(--color-pos)]' : 'text-[var(--color-neg)]'
                      )}
                    >
                      {fmtPct(p.pnlPct)}
                    </td>
                    <td
                      className={cn(
                        'py-0.5 text-right',
                        p.contribution >= 0 ? 'text-[var(--color-pos)]' : 'text-[var(--color-neg)]'
                      )}
                    >
                      {fmtPct(p.contribution)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
            By sector
          </div>
          <table className="w-full text-[10px]">
            <thead className="text-[9px] uppercase text-[var(--color-fg-muted)]">
              <tr>
                <th className="text-left">Sector</th>
                <th className="text-right">Weight</th>
                <th className="text-right">Return</th>
                <th className="text-right">Contrib</th>
              </tr>
            </thead>
            <tbody>
              {result.sectors.map((s) => (
                <tr
                  key={s.sector}
                  className="border-t border-[var(--color-border)] font-mono tabular"
                >
                  <td className="py-0.5">{s.sector}</td>
                  <td className="py-0.5 text-right">{s.weight.toFixed(1)}%</td>
                  <td
                    className={cn(
                      'py-0.5 text-right',
                      s.return >= 0 ? 'text-[var(--color-pos)]' : 'text-[var(--color-neg)]'
                    )}
                  >
                    {fmtPct(s.return)}
                  </td>
                  <td
                    className={cn(
                      'py-0.5 text-right',
                      s.contribution >= 0 ? 'text-[var(--color-pos)]' : 'text-[var(--color-neg)]'
                    )}
                  >
                    {fmtPct(s.contribution)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
  tone?: 'pos' | 'neg'
}): React.JSX.Element {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-2.5">
      <div className="text-[9px] uppercase text-[var(--color-fg-muted)]">{label}</div>
      <div
        className={cn(
          'font-mono text-[14px] font-semibold tabular',
          tone === 'pos' && 'text-[var(--color-pos)]',
          tone === 'neg' && 'text-[var(--color-neg)]'
        )}
      >
        {value}
      </div>
    </div>
  )
}
