import { Command, Maximize2, Moon, Pin, Search, Settings2, Sun } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useUIStore } from '../stores/uiStore'
import { useSetTheme } from '../hooks/usePrefs'
import { cn } from '../lib/cn'

export function TopBar(): React.JSX.Element {
  const togglePalette = useUIStore((s) => s.togglePalette)
  const theme = useUIStore((s) => s.theme)
  const setLocalTheme = useUIStore((s) => s.setTheme)
  const alwaysOnTop = useUIStore((s) => s.alwaysOnTop)
  const toggleAOT = useUIStore((s) => s.toggleAlwaysOnTop)
  const toggleFocus = useUIStore((s) => s.toggleFocusMode)
  const setThemePref = useSetTheme()
  const navigate = useNavigate()

  const flipTheme = (): void => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setLocalTheme(next)
    setThemePref.mutate(next)
  }

  return (
    <header
      className={cn(
        'flex h-12 shrink-0 items-center justify-between gap-2 border-b px-3',
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
          'flex h-8 max-w-xl flex-1 items-center gap-2 rounded-md border px-3 text-xs',
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
      <div className="flex items-center gap-1">
        <button
          onClick={toggleFocus}
          title="Focus mode (hide shell chrome)"
          className="rounded-md p-1.5 text-[var(--color-fg-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-fg)]"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
        <button
          onClick={toggleAOT}
          title={alwaysOnTop ? 'Unpin window' : 'Always on top'}
          className={cn(
            'rounded-md p-1.5',
            alwaysOnTop
              ? 'bg-[var(--color-info)]/20 text-[var(--color-info)]'
              : 'text-[var(--color-fg-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-fg)]'
          )}
        >
          <Pin className="h-4 w-4" />
        </button>
        <button
          onClick={flipTheme}
          title="Toggle theme"
          className="rounded-md p-1.5 text-[var(--color-fg-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-fg)]"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <button
          onClick={() => navigate('/settings')}
          className="rounded-md p-1.5 text-[var(--color-fg-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-fg)]"
          title="Settings"
        >
          <Settings2 className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}
