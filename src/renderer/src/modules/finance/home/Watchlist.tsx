import {
  Beaker,
  Bell,
  BookOpen,
  Briefcase,
  Compass,
  Flag,
  Home,
  Plus,
  Radio,
  Swords,
  X
} from 'lucide-react'
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  useWatchlist,
  useAddToWatchlist,
  useRemoveFromWatchlist,
  useSetWatchlistAlerts
} from '../../../hooks/useWatchlist'
import { AlertsModal } from '../alerts/AlertsModal'
import { TickerHoverCard } from './TickerHoverCard'
import { useQuotes } from '../../../hooks/useFinance'
import { PercentBadge } from '../../../shared/PercentBadge'
import { FlashPrice } from '../../../shared/FlashPrice'
import { cn } from '../../../lib/cn'

export function Watchlist(): React.JSX.Element {
  const { data: items = [] } = useWatchlist()
  const addMut = useAddToWatchlist()
  const remMut = useRemoveFromWatchlist()
  const alertsMut = useSetWatchlistAlerts()
  const [input, setInput] = useState('')
  const [alertTicker, setAlertTicker] = useState<string | null>(null)
  const [hover, setHover] = useState<{ ticker: string; x: number; y: number } | null>(null)
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  const tickers = items.map((i) => i.ticker)
  const quotes = useQuotes(tickers)

  const reorder = async (fromIdx: number, toIdx: number): Promise<void> => {
    if (fromIdx === toIdx) return
    const reordered = [...items]
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)
    await window.nexus.db.call('watchlist', 'reorder', [reordered.map((i) => i.id)])
    // optimistic: invalidate handled by next query refetch via hook
  }

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
      <div className="flex flex-wrap border-b border-[var(--color-border)]">
        {[
          { to: '/finance', label: 'Home', icon: <Home className="h-3 w-3" /> },
          { to: '/finance/portfolio', label: 'Portfolio', icon: <Briefcase className="h-3 w-3" /> },
          { to: '/finance/strategies', label: 'Strategies', icon: <Flag className="h-3 w-3" /> },
          { to: '/finance/journal', label: 'Journal', icon: <BookOpen className="h-3 w-3" /> },
          { to: '/finance/compare', label: 'Compare', icon: <Swords className="h-3 w-3" /> },
          { to: '/finance/screener', label: 'Screener', icon: <Compass className="h-3 w-3" /> },
          { to: '/finance/briefing', label: 'Briefing', icon: <Radio className="h-3 w-3" /> },
          { to: '/finance/paper', label: 'Paper', icon: <Beaker className="h-3 w-3" /> }
        ].map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.to === '/finance'}
            className={({ isActive }) =>
              cn(
                'flex flex-1 items-center justify-center gap-1 py-1.5 text-[9px]',
                isActive
                  ? 'border-b-2 border-[var(--color-info)] text-[var(--color-fg)]'
                  : 'text-[var(--color-fg-muted)]'
              )
            }
            title={t.label}
          >
            {t.icon}
          </NavLink>
        ))}
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
              draggable
              onDragStart={(e) => {
                setDragFrom(i)
                e.dataTransfer.effectAllowed = 'move'
              }}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                if (dragOver !== i) setDragOver(i)
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => {
                e.preventDefault()
                if (dragFrom != null && dragFrom !== i) {
                  void reorder(dragFrom, i)
                }
                setDragFrom(null)
                setDragOver(null)
              }}
              onDragEnd={() => {
                setDragFrom(null)
                setDragOver(null)
              }}
              onMouseEnter={(e) => setHover({ ticker: item.ticker, x: e.clientX, y: e.clientY })}
              onMouseMove={(e) => setHover({ ticker: item.ticker, x: e.clientX, y: e.clientY })}
              onMouseLeave={() => setHover(null)}
              className={({ isActive }) =>
                cn(
                  'group flex items-center justify-between border-b border-[var(--color-border)] px-2 py-1.5',
                  'hover:bg-[var(--color-bg)]',
                  isActive && 'bg-[var(--color-info)]/10',
                  dragOver === i && dragFrom !== i && 'border-t-2 border-t-[var(--color-info)]',
                  dragFrom === i && 'opacity-40'
                )
              }
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-mono text-[11px] font-semibold">{item.ticker}</div>
                <div className="text-[10px] text-[var(--color-fg-muted)]">
                  <FlashPrice value={q?.price} />
                </div>
              </div>
              <div className="flex items-center gap-1">
                <PercentBadge value={q?.changePercent} />
                {(item.alert_above != null || item.alert_below != null) && (
                  <span title="Has price alert">
                    <Bell className="h-2.5 w-2.5 text-[var(--color-warn)]" />
                  </span>
                )}
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setAlertTicker(item.ticker)
                  }}
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                  title="Set price alerts"
                >
                  <Bell className="h-3 w-3 text-[var(--color-fg-muted)] hover:text-[var(--color-warn)]" />
                </button>
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
      {hover && <TickerHoverCard ticker={hover.ticker} x={hover.x} y={hover.y} />}
      {alertTicker &&
        (() => {
          const idx = items.findIndex((it) => it.ticker === alertTicker)
          const item = items[idx]
          if (!item) return null
          const q = quotes[idx]?.data
          return (
            <AlertsModal
              ticker={alertTicker}
              currentPrice={q?.price}
              currentAbove={item.alert_above}
              currentBelow={item.alert_below}
              onClose={() => setAlertTicker(null)}
              onSave={(above, below) => alertsMut.mutate({ ticker: alertTicker, above, below })}
            />
          )
        })()}
    </aside>
  )
}
