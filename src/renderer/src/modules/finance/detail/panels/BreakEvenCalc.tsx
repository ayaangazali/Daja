import { useState } from 'react'
import { Target } from 'lucide-react'
import { useQuote } from '../../../../hooks/useFinance'
import { fmtPct, fmtPrice } from '../../../../lib/format'
import { cn } from '../../../../lib/cn'

export function BreakEvenCalc({ ticker }: { ticker: string }): React.JSX.Element {
  const { data: quote } = useQuote(ticker)
  const [entry, setEntry] = useState('')
  const [shares, setShares] = useState('')
  const [fees, setFees] = useState('0')

  const entryN = Number(entry) || quote?.price || 0
  const sharesN = Number(shares) || 0
  const feesN = Number(fees) || 0
  const cost = sharesN * entryN + feesN
  const breakEven = sharesN > 0 ? cost / sharesN : 0
  const currentPrice = quote?.price ?? 0
  const unrealized = sharesN * (currentPrice - breakEven)
  const unrealizedPct = breakEven > 0 ? ((currentPrice - breakEven) / breakEven) * 100 : 0

  // P&L at different future prices
  const scenarios = [-20, -10, -5, 0, 5, 10, 20, 50].map((pct) => {
    const price = breakEven * (1 + pct / 100)
    const pnl = sharesN * (price - breakEven)
    return { pct, price, pnl }
  })

  return (
    <div
      className={cn(
        'rounded-md border p-3',
        'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
      )}
    >
      <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
        <Target className="h-3 w-3" />
        Break-even & P&amp;L scenarios
      </div>
      <div className="grid grid-cols-3 gap-2">
        <label className="block">
          <div className="mb-0.5 text-[9px] text-[var(--color-fg-muted)]">Entry ($)</div>
          <input
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            placeholder={currentPrice ? fmtPrice(currentPrice) : ''}
            type="number"
            step="0.01"
            className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 font-mono text-[11px]"
          />
        </label>
        <label className="block">
          <div className="mb-0.5 text-[9px] text-[var(--color-fg-muted)]">Shares</div>
          <input
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            placeholder="100"
            type="number"
            className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 font-mono text-[11px]"
          />
        </label>
        <label className="block">
          <div className="mb-0.5 text-[9px] text-[var(--color-fg-muted)]">Fees ($)</div>
          <input
            value={fees}
            onChange={(e) => setFees(e.target.value)}
            type="number"
            step="0.01"
            className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 font-mono text-[11px]"
          />
        </label>
      </div>

      {sharesN > 0 && (
        <>
          <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
            <Stat label="Break-even" value={`$${fmtPrice(breakEven)}`} />
            <Stat label="Current" value={`$${fmtPrice(currentPrice)}`} />
            <Stat
              label="Unrealized"
              value={`${unrealized >= 0 ? '+' : ''}$${unrealized.toFixed(2)} (${fmtPct(unrealizedPct)})`}
              tone={unrealized >= 0 ? 'pos' : 'neg'}
            />
          </div>
          <div className="mt-2">
            <div className="mb-1 text-[9px] uppercase text-[var(--color-fg-muted)]">
              P&amp;L at future prices
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead className="text-[9px] uppercase text-[var(--color-fg-muted)]">
                  <tr>
                    <th className="px-1 py-0.5 text-right">%</th>
                    <th className="px-1 py-0.5 text-right">Price</th>
                    <th className="px-1 py-0.5 text-right">P&amp;L</th>
                  </tr>
                </thead>
                <tbody>
                  {scenarios.map((s) => (
                    <tr
                      key={s.pct}
                      className={cn(
                        'border-t border-[var(--color-border)] font-mono tabular',
                        s.pct === 0 && 'bg-[var(--color-warn)]/10'
                      )}
                    >
                      <td
                        className={cn(
                          'px-1 py-0.5 text-right',
                          s.pct > 0 && 'text-[var(--color-pos)]',
                          s.pct < 0 && 'text-[var(--color-neg)]'
                        )}
                      >
                        {s.pct > 0 ? '+' : ''}
                        {s.pct}%
                      </td>
                      <td className="px-1 py-0.5 text-right">${fmtPrice(s.price)}</td>
                      <td
                        className={cn(
                          'px-1 py-0.5 text-right',
                          s.pnl > 0 && 'text-[var(--color-pos)]',
                          s.pnl < 0 && 'text-[var(--color-neg)]'
                        )}
                      >
                        {s.pnl >= 0 ? '+' : ''}${s.pnl.toFixed(0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
    <div className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] p-2">
      <div className="text-[9px] text-[var(--color-fg-muted)]">{label}</div>
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
