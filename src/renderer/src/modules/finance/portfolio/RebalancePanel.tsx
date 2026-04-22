import { useMemo, useState } from 'react'
import { Scale } from 'lucide-react'
import { useTrades } from '../../../hooks/useTrades'
import { useQuotes, type Quote } from '../../../hooks/useFinance'
import { computeTaxLotPositions, type TaxLotTrade } from '../../../lib/positionsFifo'
import { computeRebalance, type RebalancePosition } from '../../../lib/rebalance'
import { fmtLargeNum } from '../../../lib/format'
import { cn } from '../../../lib/cn'

export function RebalancePanel(): React.JSX.Element | null {
  const { data: trades = [] } = useTrades()
  const [cash, setCash] = useState('0')
  const [targets, setTargets] = useState<Record<string, string>>({})

  const positionsList = useMemo(() => {
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

  const tickers = positionsList.map((p) => p.ticker)
  const quotes = useQuotes(tickers)

  const result = useMemo(() => {
    const rebPositions: RebalancePosition[] = positionsList.map((p, i) => {
      const q = quotes[i]?.data as Quote | undefined
      const price = q?.price ?? 0
      return {
        ticker: p.ticker,
        price,
        currentValue: price * p.qty,
        targetWeight: (Number(targets[p.ticker] ?? 0) || 0) / 100
      }
    })
    return computeRebalance(rebPositions, { cash: Number(cash) || 0 })
  }, [positionsList, quotes, cash, targets])

  if (positionsList.length === 0) return null

  const setEqual = (): void => {
    const n = positionsList.length
    const w = (100 / n).toFixed(2)
    const m: Record<string, string> = {}
    for (const p of positionsList) m[p.ticker] = w
    setTargets(m)
  }

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <Scale className="h-3 w-3" /> Rebalance calculator
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <button
            onClick={setEqual}
            className="rounded border border-[var(--color-border)] px-2 py-0.5 hover:bg-[var(--color-bg)]"
          >
            Equal weight
          </button>
          <label className="flex items-center gap-1 text-[var(--color-fg-muted)]">
            + Cash $
            <input
              type="number"
              value={cash}
              onChange={(e) => setCash(e.target.value)}
              className="w-20 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-1 py-0.5 text-right font-mono text-[10px]"
            />
          </label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead className="text-[10px] uppercase text-[var(--color-fg-muted)]">
            <tr>
              <th className="px-2 py-1 text-left">Ticker</th>
              <th className="px-2 py-1 text-right">Value</th>
              <th className="px-2 py-1 text-right">Cur %</th>
              <th className="px-2 py-1 text-right">Target %</th>
              <th className="px-2 py-1 text-right">Δ $</th>
              <th className="px-2 py-1 text-right">Δ shares</th>
              <th className="px-2 py-1 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {result.actions.map((a) => (
              <tr
                key={a.ticker}
                className="border-t border-[var(--color-border)] font-mono tabular"
              >
                <td className="px-2 py-1 font-semibold">{a.ticker}</td>
                <td className="px-2 py-1 text-right">${fmtLargeNum(a.currentValue)}</td>
                <td className="px-2 py-1 text-right">{(a.currentWeight * 100).toFixed(1)}%</td>
                <td className="px-2 py-1 text-right">
                  <input
                    type="number"
                    value={targets[a.ticker] ?? ''}
                    onChange={(e) =>
                      setTargets((prev) => ({ ...prev, [a.ticker]: e.target.value }))
                    }
                    placeholder="0"
                    className="w-14 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-1 py-0.5 text-right font-mono text-[11px]"
                  />
                </td>
                <td
                  className={cn(
                    'px-2 py-1 text-right',
                    a.deltaValue > 0
                      ? 'text-[var(--color-pos)]'
                      : a.deltaValue < 0
                        ? 'text-[var(--color-neg)]'
                        : 'text-[var(--color-fg-muted)]'
                  )}
                >
                  {a.deltaValue >= 0 ? '+' : ''}${fmtLargeNum(a.deltaValue)}
                </td>
                <td
                  className={cn(
                    'px-2 py-1 text-right',
                    a.deltaShares > 0
                      ? 'text-[var(--color-pos)]'
                      : a.deltaShares < 0
                        ? 'text-[var(--color-neg)]'
                        : 'text-[var(--color-fg-muted)]'
                  )}
                >
                  {a.deltaShares >= 0 ? '+' : ''}
                  {a.deltaShares.toFixed(2)}
                </td>
                <td className="px-2 py-1 text-center">
                  <span
                    className={cn(
                      'rounded px-1 py-0.5 text-[9px] uppercase',
                      a.action === 'buy' && 'bg-[var(--color-pos)]/15 text-[var(--color-pos)]',
                      a.action === 'sell' && 'bg-[var(--color-neg)]/15 text-[var(--color-neg)]',
                      a.action === 'hold' && 'text-[var(--color-fg-muted)]'
                    )}
                  >
                    {a.action}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--color-fg-muted)]">
        <span>
          {result.totalTrades} trades · ${fmtLargeNum(result.totalVolume)} volume · max drift{' '}
          {(result.outOfWhackMax * 100).toFixed(1)}%
        </span>
        {Math.abs(result.unallocatedWeight) > 0.001 && (
          <span
            className={
              result.unallocatedWeight > 0 ? 'text-[var(--color-warn)]' : 'text-[var(--color-neg)]'
            }
          >
            Targets sum to {((1 - result.unallocatedWeight) * 100).toFixed(1)}%
            {result.unallocatedWeight > 0 ? ' (under 100%)' : ' (over 100%)'}
          </span>
        )}
      </div>
    </div>
  )
}
