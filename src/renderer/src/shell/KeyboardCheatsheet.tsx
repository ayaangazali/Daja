import { Keyboard, X } from 'lucide-react'
import { useEffect } from 'react'
import { cn } from '../lib/cn'

interface Props {
  open: boolean
  onClose: () => void
}

const SHORTCUTS = [
  { category: 'Global', items: [
    ['Cmd/Ctrl + K', 'Open command palette'],
    ['?', 'Show this cheatsheet'],
    ['Esc', 'Close palette / cheatsheet / modals']
  ]},
  { category: 'Navigate', items: [
    ['g then f', 'Finance home'],
    ['g then p', 'Portfolio'],
    ['g then r', 'Strategies'],
    ['g then j', 'Journal'],
    ['g then c', 'Compare'],
    ['g then n', 'Screener'],
    ['g then b', 'Briefing'],
    ['g then s', 'Settings'],
    ['g then a', 'AI Assistant'],
    ['g then h', 'Health tracker'],
    ['g then o', 'Sports'],
    ['g then d', 'PDF toolkit']
  ]},
  { category: 'Watchlist', items: [
    ['j', 'Next ticker in watchlist'],
    ['k', 'Previous ticker in watchlist']
  ]},
  { category: 'Window', items: [
    ['Topbar pin', 'Always on top'],
    ['Topbar maximize', 'Focus mode (hide chrome)'],
    ['Topbar sun/moon', 'Toggle dark/light']
  ]}
]

export function KeyboardCheatsheet({ open, onClose }: Props): React.JSX.Element | null {
  useEffect(() => {
    const h = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    if (open) {
      window.addEventListener('keydown', h)
      return () => window.removeEventListener('keydown', h)
    }
    return
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={cn(
          'w-[600px] rounded-lg border shadow-2xl',
          'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <div className="flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-[var(--color-info)]" />
            <span className="text-sm font-semibold">Keyboard shortcuts</span>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid max-h-[70vh] grid-cols-2 gap-3 overflow-y-auto p-4">
          {SHORTCUTS.map((group) => (
            <div
              key={group.category}
              className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] p-3"
            >
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
                {group.category}
              </div>
              <div className="space-y-1">
                {group.items.map(([keys, desc]) => (
                  <div key={keys} className="flex items-center justify-between text-[11px]">
                    <span className="text-[var(--color-fg-muted)]">{desc}</span>
                    <kbd className="rounded border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-1.5 py-0.5 font-mono text-[10px]">
                      {keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-[var(--color-border)] px-4 py-2 text-[10px] text-[var(--color-fg-muted)]">
          Press <kbd className="rounded border border-[var(--color-border)] px-1 py-0.5">?</kbd> anywhere to toggle this.
        </div>
      </div>
    </div>
  )
}
