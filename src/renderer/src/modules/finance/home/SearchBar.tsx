import { Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSearch } from '../../../hooks/useFinance'
import { cn } from '../../../lib/cn'

export function SearchBar(): React.JSX.Element {
  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 180)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    const onClick = (e: MouseEvent): void => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const { data: results = [] } = useSearch(debounced)

  const go = (symbol: string): void => {
    navigate(`/finance/${symbol}`)
    setQ('')
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <div
        className={cn(
          'flex h-10 items-center gap-2 rounded-md border px-3',
          'border-[var(--color-border)] bg-[var(--color-bg-elev)]',
          'focus-within:border-[var(--color-info)]'
        )}
      >
        <Search className="h-4 w-4 text-[var(--color-fg-muted)]" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && results[0]) go(results[0].symbol)
            if (e.key === 'Escape') setOpen(false)
          }}
          placeholder="Search for stocks, ETFs, crypto, and more…"
          className="flex-1 bg-transparent text-xs outline-none placeholder:text-[var(--color-fg-muted)]"
        />
      </div>
      {open && debounced && results.length > 0 && (
        <div
          className={cn(
            'absolute bottom-12 left-0 right-0 z-20 max-h-80 overflow-y-auto rounded-md border shadow-xl',
            'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
          )}
        >
          {results.map((r) => (
            <button
              key={r.symbol}
              onClick={() => go(r.symbol)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-[var(--color-bg)]"
            >
              <div>
                <div className="font-mono font-semibold">{r.symbol}</div>
                <div className="truncate text-[10px] text-[var(--color-fg-muted)]">{r.name}</div>
              </div>
              <div className="ml-2 shrink-0 text-[10px] text-[var(--color-fg-muted)]">
                {r.typeDisp} · {r.exchange}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
