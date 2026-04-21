import { Command, Search, Settings2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useUIStore } from '../stores/uiStore'
import { cn } from '../lib/cn'

export function TopBar(): React.JSX.Element {
  const togglePalette = useUIStore((s) => s.togglePalette)
  const navigate = useNavigate()
  return (
    <header
      className={cn(
        'flex h-12 shrink-0 items-center justify-between border-b px-3',
        'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
      )}
    >
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--color-info)] text-xs font-bold text-white">
          N
        </div>
        <span className="text-sm font-semibold tracking-tight">NexusHub</span>
      </div>
      <button
        onClick={togglePalette}
        className={cn(
          'flex h-8 w-80 items-center gap-2 rounded-md border px-3 text-xs',
          'border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-fg-muted)]',
          'transition-colors hover:text-[var(--color-fg)]'
        )}
      >
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">Search tickers, actions…</span>
        <kbd className="flex items-center gap-0.5 rounded border border-[var(--color-border)] px-1 py-0.5 text-[10px]">
          <Command className="h-2.5 w-2.5" />K
        </kbd>
      </button>
      <button
        onClick={() => navigate('/settings')}
        className="rounded-md p-1.5 text-[var(--color-fg-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-fg)]"
        title="Settings"
      >
        <Settings2 className="h-4 w-4" />
      </button>
    </header>
  )
}
