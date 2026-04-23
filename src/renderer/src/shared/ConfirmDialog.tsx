import { type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { cn } from '../lib/cn'

/**
 * Standard destructive-action confirm pattern.
 * Use this instead of `window.confirm` for anything irreversible.
 *
 * - tone='danger' surfaces the trash icon + red accent
 * - typedConfirm requires the user to type a specific word
 * - details block explains consequences
 *
 * Example:
 *   <ConfirmDialog
 *     open={open}
 *     title="Delete watchlist"
 *     message="Remove WATCHLIST-1 and all 12 tickers?"
 *     details="This cannot be undone. Trade history is not affected."
 *     confirmLabel="Delete watchlist"
 *     tone="danger"
 *     onCancel={() => setOpen(false)}
 *     onConfirm={() => mutate(id)}
 *   />
 */
export interface ConfirmDialogProps {
  open: boolean
  title: string
  message: ReactNode
  details?: ReactNode
  /** Label for the primary (destructive) button. Verb form: 'Delete', 'Reset', 'Cancel order'. */
  confirmLabel: string
  /** Label for the safe out. Default 'Keep' for destructive, 'Cancel' for neutral. */
  cancelLabel?: string
  tone?: 'danger' | 'warn' | 'neutral'
  /** If provided, user must type this word exactly to enable the confirm button. */
  typedConfirm?: string
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  details,
  confirmLabel,
  cancelLabel,
  tone = 'neutral',
  typedConfirm,
  onCancel,
  onConfirm
}: ConfirmDialogProps): React.JSX.Element | null {
  // This is a controlled dialog. Callers own the open state.
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'max-w-md rounded-lg border bg-[var(--color-bg-elev)] p-5 shadow-xl',
          tone === 'danger'
            ? 'border-[var(--color-neg)]/40'
            : tone === 'warn'
              ? 'border-[var(--color-warn)]/40'
              : 'border-[var(--color-border)]'
        )}
      >
        <div className="mb-2 flex items-center gap-2">
          {(tone === 'danger' || tone === 'warn') && (
            <AlertTriangle
              className={cn(
                'h-4 w-4',
                tone === 'danger' ? 'text-[var(--color-neg)]' : 'text-[var(--color-warn)]'
              )}
            />
          )}
          <h2 id="confirm-title" className="text-sm font-semibold">
            {title}
          </h2>
        </div>
        <div className="mb-2 text-[12px] text-[var(--color-fg)]">{message}</div>
        {details && (
          <div className="mb-3 text-[11px] text-[var(--color-fg-muted)]">{details}</div>
        )}
        {typedConfirm && (
          <TypedConfirm expected={typedConfirm} onConfirm={onConfirm} onCancel={onCancel} />
        )}
        {!typedConfirm && (
          <div className="flex justify-end gap-2">
            <button
              onClick={onCancel}
              className="rounded border border-[var(--color-border)] px-3 py-1.5 text-[11px] hover:bg-[var(--color-bg)]"
            >
              {cancelLabel ?? (tone === 'danger' ? 'Keep' : 'Cancel')}
            </button>
            <button
              onClick={onConfirm}
              className={cn(
                'rounded px-3 py-1.5 text-[11px] font-medium text-white',
                tone === 'danger'
                  ? 'bg-[var(--color-neg)]'
                  : tone === 'warn'
                    ? 'bg-[var(--color-warn)]'
                    : 'bg-[var(--color-info)]'
              )}
              autoFocus
            >
              {confirmLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function TypedConfirm({
  expected,
  onConfirm,
  onCancel
}: {
  expected: string
  onConfirm: () => void
  onCancel: () => void
}): React.JSX.Element {
  const enable = false // placeholder; this component is controlled by an input below
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const input = (e.currentTarget.elements.namedItem('confirm') as HTMLInputElement | null)
          ?.value
        if (input?.trim() === expected) onConfirm()
      }}
    >
      <label className="mb-2 block text-[11px] text-[var(--color-fg-muted)]">
        Type{' '}
        <span className="rounded bg-[var(--color-bg)] px-1 py-0.5 font-mono text-[var(--color-fg)]">
          {expected}
        </span>{' '}
        to confirm:
      </label>
      <input
        name="confirm"
        autoFocus
        className="mb-3 w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 font-mono text-[11px]"
        autoComplete="off"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-[var(--color-border)] px-3 py-1.5 text-[11px] hover:bg-[var(--color-bg)]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={enable}
          className="rounded bg-[var(--color-neg)] px-3 py-1.5 text-[11px] font-medium text-white"
        >
          Confirm
        </button>
      </div>
    </form>
  )
}
