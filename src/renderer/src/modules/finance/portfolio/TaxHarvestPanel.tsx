import { useMemo, useState } from 'react'
import { Scissors, AlertTriangle } from 'lucide-react'
import { useTrades } from '../../../hooks/useTrades'
import { useQuotes } from '../../../hooks/useFinance'
import { computeTaxLotPositions, type TaxLotTrade } from '../../../lib/positionsFifo'
import { findHarvestCandidates } from '../../../lib/taxLossHarvest'
import { fmtLargeNum, fmtPct } from '../../../lib/format'
import { cn } from '../../../lib/cn'

export function TaxHarvestPanel(): React.JSX.Element {
  const { data: trades = [] } = useTrades()
  const [stRate, setStRate] = useState('32')
  const [ltRate, setLtRate] = useState('15')

  const tickers = useMemo(() => Array.from(new Set(trades.map((t) => t.ticker))), [trades])
  const quotes = useQuotes(tickers)
  const priceMap: Record<string, number | null> = {}
  tickers.forEach((t, i) => {
    priceMap[t] = quotes[i]?.data?.price ?? null
  })

  const summary = useMemo(() => {
    if (trades.length === 0) return null
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
    const positions = computeTaxLotPositions(taxLotTrades)
    return findHarvestCandidates(positions, priceMap, taxLotTrades, {
      shortTermRate: Number(stRate) / 100,
      longTermRate: Number(ltRate) / 100
    })
  }, [trades, priceMap, stRate, ltRate])

  if (!summary) return <></>

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <Scissors className="h-3 w-3" /> Tax-loss harvest scanner
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <label className="flex items-center gap-1 text-[var(--color-fg-muted)]">
            ST rate
            <input
              type="number"
              value={stRate}
              onChange={(e) => setStRate(e.target.value)}
              className="w-12 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-1 py-0.5 text-right font-mono text-[10px]"
            />
            %
          </label>
          <label className="flex items-center gap-1 text-[var(--color-fg-muted)]">
            LT rate
            <input
              type="number"
              value={ltRate}
              onChange={(e) => setLtRate(e.target.value)}
              className="w-12 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-1 py-0.5 text-right font-mono text-[10px]"
            />
            %
          </label>
        </div>
      </div>
      {summary.candidates.length === 0 ? (
        <div className="py-2 text-[11px] text-[var(--color-fg-muted)]">
          No lots underwater beyond 2% — nothing to harvest right now.
        </div>
      ) : (
        <>
          <div className="mb-2 grid grid-cols-2 gap-2 md:grid-cols-4">
            <Stat label="ST losses" value={`$${fmtLargeNum(summary.shortTermLoss)}`} tone="neg" />
            <Stat label="LT losses" value={`$${fmtLargeNum(summary.longTermLoss)}`} tone="neg" />
            <Stat label="Total loss" value={`$${fmtLargeNum(summary.totalLoss)}`} tone="neg" />
            <Stat
              label="Est tax saved"
              value={`$${fmtLargeNum(summary.totalTaxSaving)}`}
              tone="pos"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead className="text-[10px] uppercase text-[var(--color-fg-muted)]">
                <tr>
                  <th className="px-2 py-1 text-left">Ticker</th>
                  <th className="px-2 py-1 text-left">Bought</th>
                  <th className="px-2 py-1 text-right">Qty</th>
                  <th className="px-2 py-1 text-right">Basis</th>
                  <th className="px-2 py-1 text-right">Price</th>
                  <th className="px-2 py-1 text-right">Loss</th>
                  <th className="px-2 py-1 text-right">Loss %</th>
                  <th className="px-2 py-1 text-left">Term</th>
                  <th className="px-2 py-1 text-right">Tax saved</th>
                  <th className="px-2 py-1 text-left">Wash risk</th>
                </tr>
              </thead>
              <tbody>
                {summary.candidates.map((c, i) => (
                  <tr
                    key={`${c.ticker}-${c.lot.date}-${i}`}
                    className="border-t border-[var(--color-border)] font-mono tabular"
                  >
                    <td className="px-2 py-1 font-semibold">{c.ticker}</td>
                    <td className="px-2 py-1">{c.lot.date}</td>
                    <td className="px-2 py-1 text-right">{c.lot.qty}</td>
                    <td className="px-2 py-1 text-right">${c.lot.price.toFixed(2)}</td>
                    <td className="px-2 py-1 text-right">${c.marketPrice.toFixed(2)}</td>
                    <td className="px-2 py-1 text-right text-[var(--color-neg)]">
                      ${c.unrealizedLoss.toFixed(0)}
                    </td>
                    <td className="px-2 py-1 text-right text-[var(--color-neg)]">
                      {fmtPct(c.unrealizedPct)}
                    </td>
                    <td
                      className={cn(
                        'px-2 py-1 text-[10px] uppercase',
                        c.term === 'long' ? 'text-[var(--color-pos)]' : 'text-[var(--color-warn)]'
                      )}
                    >
                      {c.term}
                    </td>
                    <td className="px-2 py-1 text-right text-[var(--color-pos)]">
                      ${c.estimatedTaxSaving.toFixed(0)}
                    </td>
                    <td className="px-2 py-1">
                      {c.washSaleRisk ? (
                        <span className="flex items-center gap-1 text-[var(--color-warn)]">
                          <AlertTriangle className="h-3 w-3" /> yes
                        </span>
                      ) : (
                        <span className="text-[var(--color-fg-muted)]">no</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2 text-[9px] text-[var(--color-fg-muted)]">
            Wash-sale risk = you bought this ticker within the last 30 days. Selling now would
            trigger IRS §1091 and defer the loss. Rates default: ST 32% · LT 15%. Adjust above.
          </div>
        </>
      )}
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
    <div className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] p-1.5">
      <div className="text-[9px] uppercase text-[var(--color-fg-muted)]">{label}</div>
      <div
        className={cn(
          'font-mono text-[12px] font-semibold tabular',
          tone === 'pos' && 'text-[var(--color-pos)]',
          tone === 'neg' && 'text-[var(--color-neg)]'
        )}
      >
        {value}
      </div>
    </div>
  )
}
