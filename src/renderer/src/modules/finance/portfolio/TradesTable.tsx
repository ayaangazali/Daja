import { Trash2 } from 'lucide-react'
import { useTrades, useRemoveTrade } from '../../../hooks/useTrades'
import { fmtPrice } from '../../../lib/format'
import { cn } from '../../../lib/cn'

export function TradesTable(): React.JSX.Element {
  const { data: trades = [] } = useTrades()
  const remMut = useRemoveTrade()
  return (
    <div
      className={cn(
        'overflow-hidden rounded-md border',
        'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
      )}
    >
      <div className="border-b border-[var(--color-border)] px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
        Trade Log
      </div>
      <table className="w-full text-[11px]">
        <thead className="text-[10px] uppercase text-[var(--color-fg-muted)]">
          <tr>
            <th className="px-2 py-1 text-left">Date</th>
            <th className="px-2 py-1 text-left">Ticker</th>
            <th className="px-2 py-1 text-left">Side</th>
            <th className="px-2 py-1 text-right">Qty</th>
            <th className="px-2 py-1 text-right">Price</th>
            <th className="px-2 py-1 text-right">Fees</th>
            <th className="px-2 py-1 text-right">Total</th>
            <th className="px-2 py-1"></th>
          </tr>
        </thead>
        <tbody>
          {trades.length === 0 && (
            <tr>
              <td
                colSpan={8}
                className="px-2 py-4 text-center text-[11px] text-[var(--color-fg-muted)]"
              >
                No trades logged.
              </td>
            </tr>
          )}
          {trades.map((t) => {
            const total = t.quantity * t.price + (t.side === 'buy' ? t.fees : -t.fees)
            return (
              <tr
                key={t.id}
                className="border-t border-[var(--color-border)] hover:bg-[var(--color-bg)]"
              >
                <td className="px-2 py-1 tabular">{t.date}</td>
                <td className="px-2 py-1 font-mono font-semibold">{t.ticker}</td>
                <td
                  className={cn(
                    'px-2 py-1 uppercase',
                    t.side === 'buy' ? 'text-[var(--color-pos)]' : 'text-[var(--color-neg)]'
                  )}
                >
                  {t.side}
                </td>
                <td className="px-2 py-1 text-right font-mono tabular">{t.quantity}</td>
                <td className="px-2 py-1 text-right font-mono tabular">${fmtPrice(t.price)}</td>
                <td className="px-2 py-1 text-right font-mono tabular">${t.fees.toFixed(2)}</td>
                <td className="px-2 py-1 text-right font-mono tabular">${total.toFixed(2)}</td>
                <td className="px-2 py-1 text-right">
                  <button
                    onClick={() => remMut.mutate(t.id)}
                    className="text-[var(--color-fg-muted)] hover:text-[var(--color-neg)]"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
