import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { Coins } from 'lucide-react'
import { useTrades } from '../../../hooks/useTrades'
import { computePositions } from './positions'
import { fmtLargeNum, fmtPct, fmtPrice } from '../../../lib/format'
import { Sparkline } from '../../../shared/Sparkline'
import { cn } from '../../../lib/cn'

interface DividendInfo {
  symbol: string
  yield: number | null
  rate: number | null
  exDate: string | null
  payDate: string | null
  history: { date: string; amount: number }[]
}

export function DividendTracker(): React.JSX.Element {
  const { data: trades = [] } = useTrades()
  const positions = useMemo(() => computePositions(trades).filter((p) => p.qty > 0), [trades])
  const tickers = positions.map((p) => p.ticker)

  const divQueries = useQueries({
    queries: tickers.map((t) => ({
      queryKey: ['dividends', t],
      queryFn: () => window.nexus.finance.dividends(t) as Promise<DividendInfo>,
      staleTime: 60 * 60_000
    }))
  })

  const rows = positions.map((p, i) => {
    const info = divQueries[i]?.data as DividendInfo | undefined
    const annualPerShare = info?.rate ?? 0
    const annualIncome = annualPerShare * p.qty
    const yieldOnCost = p.avgCost > 0 && annualPerShare > 0 ? (annualPerShare / p.avgCost) * 100 : 0
    return { ...p, info, annualPerShare, annualIncome, yieldOnCost }
  })

  const payers = rows.filter((r) => r.annualPerShare > 0)
  const totalIncome = rows.reduce((s, r) => s + r.annualIncome, 0)
  const totalYieldOnCost = rows.reduce((s, r) => s + r.costBasis, 0)
  const avgYoC = totalYieldOnCost > 0 ? (totalIncome / totalYieldOnCost) * 100 : 0

  return (
    <div
      className={cn('rounded-md border', 'border-[var(--color-border)] bg-[var(--color-bg-elev)]')}
    >
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-2">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <Coins className="h-3 w-3 text-[var(--color-warn)]" />
          Dividend Tracker
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="text-[var(--color-fg-muted)]">
            Payers:{' '}
            <span className="font-mono tabular text-[var(--color-fg)]">
              {payers.length}/{rows.length}
            </span>
          </span>
          <span className="text-[var(--color-fg-muted)]">
            Est. annual:{' '}
            <span className="font-mono tabular text-[var(--color-pos)]">
              ${fmtLargeNum(totalIncome)}
            </span>
          </span>
          <span className="text-[var(--color-fg-muted)]">
            YoC avg: <span className="font-mono tabular">{fmtPct(avgYoC)}</span>
          </span>
        </div>
      </div>
      {rows.length === 0 && (
        <div className="p-4 text-center text-[10px] text-[var(--color-fg-muted)]">
          No open positions.
        </div>
      )}
      {rows.length > 0 && (
        <table className="w-full text-[11px]">
          <thead className="text-[10px] uppercase text-[var(--color-fg-muted)]">
            <tr>
              <th className="px-2 py-1.5 text-left">Ticker</th>
              <th className="px-2 py-1.5 text-right">Shares</th>
              <th className="px-2 py-1.5 text-right">Div/Share</th>
              <th className="px-2 py-1.5 text-right">Yield</th>
              <th className="px-2 py-1.5 text-right">Yield on Cost</th>
              <th className="px-2 py-1.5 text-right">Est. Annual</th>
              <th className="px-2 py-1.5 text-right">Next Pay</th>
              <th className="px-2 py-1.5">History</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.ticker}
                className="border-t border-[var(--color-border)] hover:bg-[var(--color-bg)]"
              >
                <td className="px-2 py-1 font-mono font-semibold">{r.ticker}</td>
                <td className="px-2 py-1 text-right font-mono tabular">{r.qty}</td>
                <td className="px-2 py-1 text-right font-mono tabular">
                  {r.annualPerShare > 0 ? `$${fmtPrice(r.annualPerShare)}` : '—'}
                </td>
                <td className="px-2 py-1 text-right font-mono tabular">
                  {r.info?.yield != null ? fmtPct(r.info.yield) : '—'}
                </td>
                <td className="px-2 py-1 text-right font-mono tabular">
                  {r.yieldOnCost > 0 ? fmtPct(r.yieldOnCost) : '—'}
                </td>
                <td
                  className={cn(
                    'px-2 py-1 text-right font-mono tabular',
                    r.annualIncome > 0 && 'text-[var(--color-pos)]'
                  )}
                >
                  {r.annualIncome > 0 ? `$${fmtLargeNum(r.annualIncome)}` : '—'}
                </td>
                <td className="px-2 py-1 text-right font-mono tabular text-[10px]">
                  {r.info?.payDate ?? '—'}
                </td>
                <td className="px-2 py-1">
                  {r.info && r.info.history.length > 2 ? (
                    <Sparkline
                      points={r.info.history.slice(-20).map((h) => h.amount)}
                      width={80}
                      height={16}
                      stroke="var(--color-warn)"
                      className="w-20"
                    />
                  ) : (
                    <span className="text-[var(--color-fg-muted)]">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
