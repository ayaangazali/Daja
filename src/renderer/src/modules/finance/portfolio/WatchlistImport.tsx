import { useState } from 'react'
import { Upload } from 'lucide-react'
import { useAddToWatchlist } from '../../../hooks/useWatchlist'
import { cn } from '../../../lib/cn'

export function WatchlistImport({ onClose }: { onClose?: () => void }): React.JSX.Element {
  const add = useAddToWatchlist()
  const [raw, setRaw] = useState('')
  const [result, setResult] = useState<string | null>(null)

  const parse = (): string[] => {
    return Array.from(
      new Set(
        raw
          .split(/[\s,;\n]+/)
          .map((t) => t.trim().toUpperCase())
          .filter((t) => /^[A-Z.\-^]{1,10}$/.test(t))
      )
    )
  }

  const submit = async (): Promise<void> => {
    const tickers = parse()
    if (tickers.length === 0) {
      setResult('No valid tickers detected')
      return
    }
    let added = 0
    for (const ticker of tickers) {
      try {
        await add.mutateAsync({ ticker })
        added++
      } catch {
        // skip dupes/errors silently
      }
    }
    setResult(`Imported ${added} of ${tickers.length} tickers`)
    setTimeout(() => {
      setResult(null)
      onClose?.()
    }, 2000)
  }

  const tickers = parse()

  return (
    <div
      className={cn(
        'rounded-md border p-3',
        'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
      )}
    >
      <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
        <Upload className="h-3 w-3" /> Bulk import tickers
      </div>
      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder="Paste CSV, comma-separated, or one-per-line: AAPL, MSFT, NVDA, TSLA…"
        rows={4}
        className="w-full resize-none rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 font-mono text-[11px]"
      />
      <div className="mt-2 flex items-center justify-between">
        <div className="text-[10px] text-[var(--color-fg-muted)]">
          {tickers.length > 0 ? (
            <>
              Detected {tickers.length}:{' '}
              <span className="font-mono">{tickers.slice(0, 10).join(', ')}</span>
              {tickers.length > 10 && `, +${tickers.length - 10} more`}
            </>
          ) : (
            'Enter tickers above'
          )}
        </div>
        <div className="flex gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="rounded border border-[var(--color-border)] px-3 py-1 text-[11px] hover:bg-[var(--color-bg)]"
            >
              Cancel
            </button>
          )}
          <button
            onClick={submit}
            disabled={tickers.length === 0 || add.isPending}
            className="rounded bg-[var(--color-info)] px-3 py-1 text-[11px] font-medium text-white disabled:opacity-40"
          >
            Import {tickers.length || ''}
          </button>
        </div>
      </div>
      {result && (
        <div className="mt-2 rounded bg-[var(--color-pos)]/10 p-2 text-[11px] text-[var(--color-pos)]">
          {result}
        </div>
      )}
    </div>
  )
}
