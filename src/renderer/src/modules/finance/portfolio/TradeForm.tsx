import { useState } from 'react'
import { useAddTrade } from '../../../hooks/useTrades'
import { cn } from '../../../lib/cn'

export function TradeForm(): React.JSX.Element {
  const addMut = useAddTrade()
  const [ticker, setTicker] = useState('')
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [qty, setQty] = useState('')
  const [price, setPrice] = useState('')
  const [fees, setFees] = useState('0')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')

  const submit = (): void => {
    if (!ticker.trim() || !qty || !price) return
    addMut.mutate(
      {
        ticker: ticker.toUpperCase(),
        side,
        quantity: Number(qty),
        price: Number(price),
        fees: Number(fees || 0),
        date,
        notes: notes || null
      },
      {
        onSuccess: () => {
          setTicker('')
          setQty('')
          setPrice('')
          setFees('0')
          setNotes('')
        }
      }
    )
  }

  return (
    <div
      className={cn(
        'rounded-md border p-3',
        'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
      )}
    >
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
        Log Trade
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
        <select
          value={side}
          onChange={(e) => setSide(e.target.value as 'buy' | 'sell')}
          className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-[11px]"
        >
          <option value="buy">Buy</option>
          <option value="sell">Sell</option>
        </select>
        <input
          data-testid="trade-ticker-input"
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          placeholder="Ticker (e.g. AAPL)"
          className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 font-mono text-[11px]"
        />
        <input
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          placeholder="Qty"
          className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 font-mono text-[11px]"
        />
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Price"
          className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 font-mono text-[11px]"
        />
        <input
          value={fees}
          onChange={(e) => setFees(e.target.value)}
          placeholder="Fees"
          className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 font-mono text-[11px]"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-[11px]"
        />
      </div>
      <div className="mt-2 flex gap-2">
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          className="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-[11px]"
        />
        <button
          onClick={submit}
          disabled={!ticker || !qty || !price || addMut.isPending}
          className="rounded bg-[var(--color-info)] px-3 py-1 text-[11px] font-medium text-white disabled:opacity-40"
        >
          Save
        </button>
      </div>
      {addMut.isError && (
        <div className="mt-2 text-[10px] text-[var(--color-neg)]">{addMut.error?.message}</div>
      )}
    </div>
  )
}
