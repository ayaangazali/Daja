import { useQuotes, type Quote } from '../hooks/useFinance'
import { fmtPct } from '../lib/format'
import { cn } from '../lib/cn'

const SYMBOLS: { symbol: string; label: string }[] = [
  { symbol: 'SPY', label: 'S&P 500' },
  { symbol: 'QQQ', label: 'Nasdaq' },
  { symbol: 'DIA', label: 'Dow' },
  { symbol: '^VIX', label: 'VIX' },
  { symbol: 'BTC-USD', label: 'BTC' },
  { symbol: '^TNX', label: '10Y' }
]

export function MarketTickerStrip(): React.JSX.Element {
  const quotes = useQuotes(SYMBOLS.map((s) => s.symbol))
  // Aggregate load state so the whole strip shows a single loading placeholder
  // rather than a half-empty row — matches real finance terminals that gate on
  // all indices before showing the tape.
  const anyLoading = quotes.some((q) => q.isLoading)
  const allErrored = quotes.every((q) => q.isError)
  const anyErrored = quotes.some((q) => q.isError)

  if (allErrored) {
    return (
      <div className="mx-auto mb-8 max-w-3xl text-center text-[10px] text-[var(--color-fg-muted)]">
        Market data temporarily unavailable.
      </div>
    )
  }
  return (
    <div
      className="mx-auto mb-8 flex max-w-3xl flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px]"
      role="status"
      aria-live="polite"
      aria-label="Live market indices"
    >
      {SYMBOLS.map((s, i) => {
        const q = quotes[i]?.data as Quote | undefined
        const pct = q?.changePercent ?? null
        const price = q?.price
        const loading = quotes[i]?.isLoading
        const errored = quotes[i]?.isError
        const up = pct != null && Number.isFinite(pct) && pct > 0
        const down = pct != null && Number.isFinite(pct) && pct < 0
        return (
          <div key={s.symbol} className="flex items-center gap-1.5 font-mono tabular">
            <span className="text-[var(--color-fg-muted)]">{s.label}</span>
            <span
              className={cn(
                errored ? 'text-[var(--color-fg-muted)]/60' : 'text-[var(--color-fg)]',
                loading && 'opacity-60'
              )}
              title={errored ? 'Failed to fetch — retrying next refresh' : undefined}
            >
              {price != null && Number.isFinite(price) ? price.toFixed(2) : '—'}
            </span>
            <span
              className={cn(
                'text-[10px]',
                up && 'text-[var(--color-pos)]',
                down && 'text-[var(--color-neg)]',
                !up && !down && 'text-[var(--color-fg-muted)]'
              )}
            >
              {pct != null && Number.isFinite(pct) ? `${pct > 0 ? '+' : ''}${fmtPct(pct)}` : ''}
            </span>
          </div>
        )
      })}
      {anyErrored && !allErrored && (
        <span
          className="text-[9px] text-[var(--color-warn)]"
          title="Some symbols failed to load — others are live"
        >
          · partial
        </span>
      )}
      {anyLoading && !anyErrored && (
        <span className="text-[9px] text-[var(--color-fg-muted)]">· loading</span>
      )}
    </div>
  )
}
