import { useMemo, useState } from 'react'
import { Receipt } from 'lucide-react'
import { useTrades } from '../../../hooks/useTrades'
import { computeTaxLotPositions, type LotMethod } from '../../../lib/positionsFifo'
import { fmtLargeNum, fmtPrice } from '../../../lib/format'
import { cn } from '../../../lib/cn'

export function TaxLotView(): React.JSX.Element {
  const { data: trades = [] } = useTrades()
  const [method, setMethod] = useState<LotMethod>('fifo')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const positions = useMemo(
    () =>
      computeTaxLotPositions(
        trades.map((t) => ({
          date: t.date,
          ticker: t.ticker,
          side: t.side === 'buy' ? 'buy' : 'sell',
          quantity: t.quantity,
          price: t.price,
          fees: t.fees
        })),
        method
      ),
    [trades, method]
  )

  const toggle = (ticker: string): void => {
    setExpanded((s) => {
      const next = new Set(s)
      if (next.has(ticker)) next.delete(ticker)
      else next.add(ticker)
      return next
    })
  }

  const totalRealized = positions.reduce((s, p) => s + p.realized, 0)
  const totalLT = positions.reduce((s, p) => s + p.realizedLongTerm, 0)
  const totalST = positions.reduce((s, p) => s + p.realizedShortTerm, 0)

  return (
    <div
      className={cn(
        'rounded-md border',
        'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] px-3 py-2">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <Receipt className="h-3 w-3" /> Tax lots
        </div>
        <div className="flex items-center gap-3">
          <div className="flex overflow-hidden rounded border border-[var(--color-border)]">
            {(['fifo', 'lifo', 'hifo'] as LotMethod[]).map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={cn(
                  'px-2 py-1 text-[10px] font-semibold uppercase',
                  method === m
                    ? 'bg-[var(--color-info)] text-white'
                    : 'text-[var(--color-fg-muted)]'
                )}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 font-mono text-[10px] tabular">
            <span>
              Realized:{' '}
              <span
                className={cn(
                  totalRealized >= 0
                    ? 'text-[var(--color-pos)]'
                    : 'text-[var(--color-neg)]'
                )}
              >
                {totalRealized >= 0 ? '+' : ''}${fmtLargeNum(totalRealized)}
              </span>
            </span>
            <span className="text-[var(--color-fg-muted)]">
              LT <span className={cn(totalLT >= 0 ? 'text-[var(--color-pos)]' : 'text-[var(--color-neg)]')}>${fmtLargeNum(totalLT)}</span>
            </span>
            <span className="text-[var(--color-fg-muted)]">
              ST <span className={cn(totalST >= 0 ? 'text-[var(--color-pos)]' : 'text-[var(--color-neg)]')}>${fmtLargeNum(totalST)}</span>
            </span>
          </div>
        </div>
      </div>
      {positions.length === 0 && (
        <div className="p-4 text-center text-[10px] text-[var(--color-fg-muted)]">
          No closed lots yet.
        </div>
      )}
      {positions.map((p) => {
        const isOpen = expanded.has(p.ticker)
        return (
          <div key={p.ticker} className="border-b border-[var(--color-border)] last:border-0">
            <div
              onClick={() => toggle(p.ticker)}
              className="flex cursor-pointer items-center justify-between px-3 py-2 text-[11px] hover:bg-[var(--color-bg)]"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold">{p.ticker}</span>
                <span className="text-[10px] text-[var(--color-fg-muted)]">
                  {p.openLots.length} open · {p.closedLots.length} closed
                </span>
              </div>
              <div className="flex items-center gap-3 font-mono text-[10px] tabular">
                <span>Qty {p.qty}</span>
                <span>Basis ${fmtLargeNum(p.costBasis)}</span>
                <span
                  className={cn(
                    p.realized >= 0 ? 'text-[var(--color-pos)]' : 'text-[var(--color-neg)]'
                  )}
                >
                  Realized ${p.realized.toFixed(0)}
                </span>
                <span className="text-[9px] text-[var(--color-fg-muted)]">{isOpen ? '▼' : '▶'}</span>
              </div>
            </div>
            {isOpen && (
              <div className="bg-[var(--color-bg)] px-3 py-2">
                {p.openLots.length > 0 && (
                  <>
                    <div className="mb-1 text-[9px] uppercase text-[var(--color-fg-muted)]">
                      Open lots ({p.openLots.length})
                    </div>
                    <table className="mb-3 w-full text-[10px]">
                      <thead className="text-[9px] uppercase text-[var(--color-fg-muted)]">
                        <tr>
                          <th className="px-1 py-0.5 text-left">Buy date</th>
                          <th className="px-1 py-0.5 text-right">Qty</th>
                          <th className="px-1 py-0.5 text-right">Cost/sh</th>
                          <th className="px-1 py-0.5 text-right">Basis</th>
                          <th className="px-1 py-0.5 text-right">Hold days</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.openLots.map((lot, i) => {
                          const days = Math.floor(
                            (Date.now() - new Date(lot.date).getTime()) / (1000 * 60 * 60 * 24)
                          )
                          return (
                            <tr
                              key={i}
                              className="border-t border-[var(--color-border)] font-mono tabular"
                            >
                              <td className="px-1 py-0.5">{lot.date}</td>
                              <td className="px-1 py-0.5 text-right">{lot.qty}</td>
                              <td className="px-1 py-0.5 text-right">${fmtPrice(lot.price)}</td>
                              <td className="px-1 py-0.5 text-right">
                                ${(lot.qty * lot.price).toFixed(0)}
                              </td>
                              <td
                                className={cn(
                                  'px-1 py-0.5 text-right',
                                  days > 365
                                    ? 'text-[var(--color-pos)]'
                                    : 'text-[var(--color-warn)]'
                                )}
                              >
                                {days}
                                {days > 365 ? ' · LT' : ' · ST'}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </>
                )}
                {p.closedLots.length > 0 && (
                  <>
                    <div className="mb-1 text-[9px] uppercase text-[var(--color-fg-muted)]">
                      Closed lots ({p.closedLots.length})
                    </div>
                    <table className="w-full text-[10px]">
                      <thead className="text-[9px] uppercase text-[var(--color-fg-muted)]">
                        <tr>
                          <th className="px-1 py-0.5 text-left">Open</th>
                          <th className="px-1 py-0.5 text-left">Close</th>
                          <th className="px-1 py-0.5 text-right">Qty</th>
                          <th className="px-1 py-0.5 text-right">Entry</th>
                          <th className="px-1 py-0.5 text-right">Exit</th>
                          <th className="px-1 py-0.5 text-right">Realized</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.closedLots.map((lot, i) => (
                          <tr
                            key={i}
                            className="border-t border-[var(--color-border)] font-mono tabular"
                          >
                            <td className="px-1 py-0.5">{lot.date}</td>
                            <td className="px-1 py-0.5">{lot.exitDate}</td>
                            <td className="px-1 py-0.5 text-right">{lot.qty}</td>
                            <td className="px-1 py-0.5 text-right">${fmtPrice(lot.price)}</td>
                            <td className="px-1 py-0.5 text-right">${fmtPrice(lot.exitPrice)}</td>
                            <td
                              className={cn(
                                'px-1 py-0.5 text-right',
                                lot.realized >= 0
                                  ? 'text-[var(--color-pos)]'
                                  : 'text-[var(--color-neg)]'
                              )}
                            >
                              {lot.realized >= 0 ? '+' : ''}${lot.realized.toFixed(0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
