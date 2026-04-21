import { Briefcase, Home, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  useWatchlist,
  useAddToWatchlist,
  useRemoveFromWatchlist
} from '../../../hooks/useWatchlist'
import { useQuotes } from '../../../hooks/useFinance'
import { PercentBadge } from '../../../shared/PercentBadge'
import { fmtPrice } from '../../../lib/format'
import { cn } from '../../../lib/cn'

export function Watchlist(): React.JSX.Element {
  const { data: items = [] } = useWatchlist()
  const addMut = useAddToWatchlist()
  const remMut = useRemoveFromWatchlist()
  const [input, setInput] = useState('')

  const tickers = items.map((i) => i.ticker)
  const quotes = useQuotes(tickers)

  const submit = (): void => {
    const v = input.trim().toUpperCase()
    if (!v) return
    addMut.mutate({ ticker: v }, { onSuccess: () => setInput('') })
  }

  return (
    <aside
      className={cn(
        'flex w-44 shrink-0 flex-col border-r',
        'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
      )}
    >
      <div className="flex border-b border-[var(--color-border)]">
        <NavLink
          to="/finance"
          end
          className={({ isActive }) =>
            cn(
              'flex flex-1 items-center justify-center gap-1 py-1.5 text-[10px]',
              isActive
                ? 'border-b-2 border-[var(--color-info)] text-[var(--color-fg)]'
                : 'text-[var(--color-fg-muted)]'
            )
          }
        >
          <Home className="h-3 w-3" /> Home
        </NavLink>
        <NavLink
          to="/finance/portfolio"
          className={({ isActive }) =>
            cn(
              'flex flex-1 items-center justify-center gap-1 py-1.5 text-[10px]',
              isActive
                ? 'border-b-2 border-[var(--color-info)] text-[var(--color-fg)]'
                : 'text-[var(--color-fg-muted)]'
            )
          }
        >
          <Briefcase className="h-3 w-3" /> Portfolio
        </NavLink>
      </div>
      <div className="border-b border-[var(--color-border)] p-2">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          Watchlist
        </div>
        <div className="flex gap-1">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="AAPL"
            className={cn(
              'h-6 flex-1 rounded border bg-[var(--color-bg)] px-1.5 text-[11px] outline-none',
              'border-[var(--color-border)] placeholder:text-[var(--color-fg-muted)]'
            )}
          />
          <button
            onClick={submit}
            disabled={addMut.isPending}
            className="rounded bg-[var(--color-info)] p-1 text-white disabled:opacity-40"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 && (
          <div className="p-3 text-[10px] text-[var(--color-fg-muted)]">
            Empty. Add a ticker above.
          </div>
        )}
        {items.map((item, i) => {
          const q = quotes[i]?.data as { price: number; changePercent: number } | undefined
          return (
            <NavLink
              key={item.id}
              to={`/finance/${item.ticker}`}
              className={({ isActive }) =>
                cn(
                  'group flex items-center justify-between border-b border-[var(--color-border)] px-2 py-1.5',
                  'hover:bg-[var(--color-bg)]',
                  isActive && 'bg-[var(--color-info)]/10'
                )
              }
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-mono text-[11px] font-semibold">{item.ticker}</div>
                <div className="text-[10px] text-[var(--color-fg-muted)] tabular">
                  {fmtPrice(q?.price)}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <PercentBadge value={q?.changePercent} />
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    remMut.mutate({ ticker: item.ticker })
                  }}
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                  title="Remove"
                >
                  <X className="h-3 w-3 text-[var(--color-fg-muted)] hover:text-[var(--color-neg)]" />
                </button>
              </div>
            </NavLink>
          )
        })}
      </div>
    </aside>
  )
}
