import { Bell, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '../../../lib/cn'

interface Props {
  ticker: string
  currentPrice: number | undefined
  currentAbove: number | null
  currentBelow: number | null
  onClose: () => void
  onSave: (above: number | null, below: number | null) => void
}

export function AlertsModal({
  ticker,
  currentPrice,
  currentAbove,
  currentBelow,
  onClose,
  onSave
}: Props): React.JSX.Element {
  const [above, setAbove] = useState(currentAbove?.toString() ?? '')
  const [below, setBelow] = useState(currentBelow?.toString() ?? '')

  useEffect(() => {
    const h = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const save = (): void => {
    const a = above.trim() ? Number(above) : null
    const b = below.trim() ? Number(below) : null
    onSave(a != null && Number.isFinite(a) ? a : null, b != null && Number.isFinite(b) ? b : null)
    onClose()
  }

  const qp = (v: number): void => setAbove(v.toString())
  const qpBelow = (v: number): void => setBelow(v.toString())

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={cn(
          'w-[400px] rounded-lg border p-4 shadow-xl',
          'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-[var(--color-warn)]" />
            <span className="text-sm font-semibold">
              Price alerts for <span className="font-mono">{ticker}</span>
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {currentPrice != null && (
          <div className="mb-3 text-[11px] text-[var(--color-fg-muted)]">
            Current price:{' '}
            <span className="font-mono tabular text-[var(--color-fg)]">
              ${currentPrice.toFixed(2)}
            </span>
          </div>
        )}
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-[var(--color-fg-muted)]">Alert when price ≥</label>
            <div className="mt-1 flex items-center gap-1">
              <span className="font-mono">$</span>
              <input
                type="number"
                step="0.01"
                value={above}
                onChange={(e) => setAbove(e.target.value)}
                placeholder="—"
                className="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 font-mono text-[11px]"
              />
              {currentPrice != null && (
                <div className="flex gap-1">
                  <button
                    onClick={() => qp(currentPrice * 1.05)}
                    className="rounded border border-[var(--color-border)] px-2 py-0.5 text-[9px] hover:bg-[var(--color-bg)]"
                  >
                    +5%
                  </button>
                  <button
                    onClick={() => qp(currentPrice * 1.1)}
                    className="rounded border border-[var(--color-border)] px-2 py-0.5 text-[9px] hover:bg-[var(--color-bg)]"
                  >
                    +10%
                  </button>
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="text-[10px] text-[var(--color-fg-muted)]">Alert when price ≤</label>
            <div className="mt-1 flex items-center gap-1">
              <span className="font-mono">$</span>
              <input
                type="number"
                step="0.01"
                value={below}
                onChange={(e) => setBelow(e.target.value)}
                placeholder="—"
                className="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 font-mono text-[11px]"
              />
              {currentPrice != null && (
                <div className="flex gap-1">
                  <button
                    onClick={() => qpBelow(currentPrice * 0.95)}
                    className="rounded border border-[var(--color-border)] px-2 py-0.5 text-[9px] hover:bg-[var(--color-bg)]"
                  >
                    -5%
                  </button>
                  <button
                    onClick={() => qpBelow(currentPrice * 0.9)}
                    className="rounded border border-[var(--color-border)] px-2 py-0.5 text-[9px] hover:bg-[var(--color-bg)]"
                  >
                    -10%
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded border border-[var(--color-border)] px-3 py-1.5 text-[11px] hover:bg-[var(--color-bg)]"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="rounded bg-[var(--color-info)] px-3 py-1.5 text-[11px] font-medium text-white"
          >
            Save alerts
          </button>
        </div>
      </div>
    </div>
  )
}
