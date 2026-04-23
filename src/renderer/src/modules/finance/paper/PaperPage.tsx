import { useMemo, useState } from 'react'
import { RotateCcw, Trash2 } from 'lucide-react'
import {
  useAddPaperTrade,
  usePaperTrades,
  useRemovePaperTrade,
  useResetPaperTrades,
  type PaperTrade
} from '../../../hooks/usePaperTrades'
import { useQuote } from '../../../hooks/useFinance'
import { useQuotes } from '../../../hooks/useFinance'
import { fmtLargeNum, fmtPct, fmtPrice, signColor } from '../../../lib/format'
import { PageHeader } from '../../../shared/PageHeader'
import { cn } from '../../../lib/cn'

const STARTING_CASH = 100000

interface PaperPosition {
  ticker: string
  qty: number
  avgCost: number
  costBasis: number
  realized: number
}

function computePaperPositions(trades: PaperTrade[]): PaperPosition[] {
  const map = new Map<string, PaperPosition>()
  const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date))
  for (const t of sorted) {
    const p = map.get(t.ticker) ?? {
      ticker: t.ticker,
      qty: 0,
      avgCost: 0,
      costBasis: 0,
      realized: 0
    }
    // Paper-trading P&L model:
    // - Fees are pro-rated into cost basis on buy (inflates effective entry)
    //   and netted from sell proceeds (reduces realized P&L).
    // - Long-only simplified: selling more than owned clamps at current qty.
    //   Unmatched excess is ignored (user's input error, not a short).
    // - Short positions + cover trades tracked as separate follow-up.
    if (t.side === 'buy') {
      const newQty = p.qty + t.quantity
      p.costBasis += t.quantity * t.price + t.fees
      p.qty = newQty
      p.avgCost = newQty > 0 ? p.costBasis / newQty : 0
    } else {
      const sellQty = Math.min(t.quantity, p.qty)
      if (p.qty > 0 && sellQty > 0) {
        const avg = p.costBasis / p.qty
        // Fee prorated to the qty actually sold vs the qty requested,
        // matching how brokers charge on partial fills.
        const feeShare = t.quantity > 0 ? t.fees * (sellQty / t.quantity) : 0
        p.realized += (t.price - avg) * sellQty - feeShare
        p.costBasis -= avg * sellQty
      }
      p.qty -= sellQty
      p.avgCost = p.qty > 0 ? p.costBasis / p.qty : 0
    }
    map.set(t.ticker, p)
  }
  return [...map.values()].filter((p) => p.qty > 0 || p.realized !== 0)
}

export function PaperPage(): React.JSX.Element {
  const { data: trades = [] } = usePaperTrades()
  const add = useAddPaperTrade()
  const rem = useRemovePaperTrade()
  const reset = useResetPaperTrades()

  const positions = useMemo(() => computePaperPositions(trades), [trades])
  const tickers = positions.map((p) => p.ticker)
  const quotes = useQuotes(tickers)

  // compute cash = starting - all buy cost + all sell proceeds - fees
  const cash = useMemo(() => {
    let c = STARTING_CASH
    for (const t of trades) {
      if (t.side === 'buy') c -= t.quantity * t.price + t.fees
      else c += t.quantity * t.price - t.fees
    }
    return c
  }, [trades])

  const positionValue = positions.reduce((sum, p, i) => {
    const price = quotes[i]?.data?.price ?? p.avgCost
    return sum + price * p.qty
  }, 0)
  const totalEquity = cash + positionValue
  const totalReturnPct = ((totalEquity - STARTING_CASH) / STARTING_CASH) * 100

  const [ticker, setTicker] = useState('')
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [qty, setQty] = useState('')
  const { data: liveQuote } = useQuote(ticker.toUpperCase())
  const livePrice = liveQuote?.price

  const submit = (): void => {
    const t = ticker.trim().toUpperCase()
    const q = Number(qty)
    if (!t || !Number.isFinite(q) || q <= 0 || livePrice == null) return
    add.mutate(
      {
        ticker: t,
        side,
        quantity: q,
        price: livePrice,
        fees: 0,
        date: new Date().toISOString().slice(0, 10),
        notes: `Paper ${side} at live price`
      },
      {
        onSuccess: () => {
          setTicker('')
          setQty('')
        }
      }
    )
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Paper trading"
        subtitle="Practice orders with virtual capital — live quotes, no risk."
        actions={
          <button
            onClick={() => {
              const tradeCount = trades.length
              const msg =
                tradeCount === 0
                  ? 'Reset paper portfolio to $100,000 starting cash?'
                  : `Reset paper portfolio? This will PERMANENTLY DELETE ${tradeCount} order${tradeCount === 1 ? '' : 's'} — no undo. Type RESET to confirm.`
              if (tradeCount === 0) {
                if (confirm(msg)) reset.mutate()
                return
              }
              const typed = prompt(msg)
              if (typed === 'RESET') reset.mutate()
            }}
            className="flex items-center gap-1 rounded-md border border-[var(--color-border)] px-3 py-1.5 text-[11px] hover:bg-[var(--color-bg-tint)]"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-5xl space-y-3">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Total Equity" value={`$${fmtLargeNum(totalEquity)}`} />
            <Stat label="Cash" value={`$${fmtLargeNum(cash)}`} />
            <Stat label="Position Value" value={`$${fmtLargeNum(positionValue)}`} />
            <Stat
              label="Return"
              value={fmtPct(totalReturnPct)}
              tone={totalReturnPct >= 0 ? 'pos' : 'neg'}
            />
          </div>

          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
              Place simulated order (fills at live price)
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <select
                value={side}
                onChange={(e) => setSide(e.target.value as 'buy' | 'sell')}
                className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-[11px]"
              >
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>
              <input
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="Ticker"
                className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 font-mono text-[11px]"
              />
              <input
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="Shares"
                className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 font-mono text-[11px]"
              />
              <button
                onClick={submit}
                disabled={!ticker || !qty || livePrice == null || add.isPending}
                className={cn(
                  'rounded px-3 py-1 text-[11px] font-medium text-white disabled:opacity-40',
                  side === 'buy' ? 'bg-[var(--color-pos)]' : 'bg-[var(--color-neg)]'
                )}
              >
                {side.toUpperCase()} @ ${fmtPrice(livePrice)}
              </button>
            </div>
            {ticker && livePrice != null && qty && Number(qty) > 0 && (
              <div className="mt-1 text-[10px] text-[var(--color-fg-muted)]">
                Order value ≈ ${fmtLargeNum(Number(qty) * livePrice)}
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)]">
            <div className="border-b border-[var(--color-border)] px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
              Positions ({positions.length})
            </div>
            <table className="w-full text-[11px]">
              <thead className="text-[10px] uppercase text-[var(--color-fg-muted)]">
                <tr>
                  <th className="px-2 py-1 text-left">Ticker</th>
                  <th className="px-2 py-1 text-right">Qty</th>
                  <th className="px-2 py-1 text-right">Avg</th>
                  <th className="px-2 py-1 text-right">Mkt</th>
                  <th className="px-2 py-1 text-right">Value</th>
                  <th className="px-2 py-1 text-right">Unreal $</th>
                  <th className="px-2 py-1 text-right">Unreal %</th>
                  <th className="px-2 py-1 text-right">Realized</th>
                </tr>
              </thead>
              <tbody>
                {positions.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-2 py-4 text-center text-[10px] text-[var(--color-fg-muted)]"
                    >
                      No paper positions. Place your first simulated order above.
                    </td>
                  </tr>
                )}
                {positions.map((p, i) => {
                  const mkt = quotes[i]?.data?.price ?? 0
                  const value = mkt * p.qty
                  const unreal = p.qty > 0 ? (mkt - p.avgCost) * p.qty : 0
                  const unrealPct =
                    p.avgCost > 0 && p.qty > 0 ? ((mkt - p.avgCost) / p.avgCost) * 100 : 0
                  return (
                    <tr
                      key={p.ticker}
                      className="border-t border-[var(--color-border)] hover:bg-[var(--color-bg)]"
                    >
                      <td className="px-2 py-1 font-mono font-semibold">{p.ticker}</td>
                      <td className="px-2 py-1 text-right font-mono tabular">{p.qty}</td>
                      <td className="px-2 py-1 text-right font-mono tabular">
                        ${fmtPrice(p.avgCost)}
                      </td>
                      <td className="px-2 py-1 text-right font-mono tabular">${fmtPrice(mkt)}</td>
                      <td className="px-2 py-1 text-right font-mono tabular">
                        ${fmtLargeNum(value)}
                      </td>
                      <td
                        className={cn('px-2 py-1 text-right font-mono tabular', signColor(unreal))}
                      >
                        {unreal >= 0 ? '+' : ''}${unreal.toFixed(0)}
                      </td>
                      <td
                        className={cn(
                          'px-2 py-1 text-right font-mono tabular',
                          signColor(unrealPct)
                        )}
                      >
                        {fmtPct(unrealPct)}
                      </td>
                      <td
                        className={cn(
                          'px-2 py-1 text-right font-mono tabular',
                          signColor(p.realized)
                        )}
                      >
                        {p.realized >= 0 ? '+' : ''}${p.realized.toFixed(0)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)]">
            <div className="border-b border-[var(--color-border)] px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
              Order log ({trades.length})
            </div>
            {trades.length === 0 ? (
              <div className="p-4 text-center text-[10px] text-[var(--color-fg-muted)]">
                No orders.
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                {trades.map((t) => (
                  <div
                    key={t.id}
                    className="group flex items-center justify-between border-b border-[var(--color-border)] px-3 py-1.5 text-[11px] last:border-0 hover:bg-[var(--color-bg)]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-20 font-mono tabular text-[var(--color-fg-muted)]">
                        {t.date}
                      </span>
                      <span className="font-mono font-semibold">{t.ticker}</span>
                      <span
                        className={cn(
                          'rounded px-1 py-0.5 text-[9px] uppercase',
                          t.side === 'buy'
                            ? 'bg-[var(--color-pos)]/15 text-[var(--color-pos)]'
                            : 'bg-[var(--color-neg)]/15 text-[var(--color-neg)]'
                        )}
                      >
                        {t.side}
                      </span>
                      <span className="font-mono tabular text-[10px]">
                        {t.quantity} @ ${fmtPrice(t.price)}
                      </span>
                    </div>
                    <button
                      onClick={() => rem.mutate(t.id)}
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Trash2 className="h-3 w-3 text-[var(--color-fg-muted)] hover:text-[var(--color-neg)]" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
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
    <div
      className={cn(
        'rounded-md border p-3',
        'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
      )}
    >
      <div className="text-[10px] text-[var(--color-fg-muted)]">{label}</div>
      <div
        className={cn(
          'mt-1 font-mono text-lg font-semibold tabular',
          tone === 'pos' && 'text-[var(--color-pos)]',
          tone === 'neg' && 'text-[var(--color-neg)]'
        )}
      >
        {value}
      </div>
    </div>
  )
}
