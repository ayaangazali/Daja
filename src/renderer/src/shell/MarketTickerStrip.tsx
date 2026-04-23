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
  return (
    <div className="mx-auto mb-8 flex max-w-3xl flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px]">
      {SYMBOLS.map((s, i) => {
        const q = quotes[i]?.data as Quote | undefined
        const pct = q?.changePercent ?? null
        const price = q?.price
        const up = pct != null && pct > 0
        const down = pct != null && pct < 0
        return (
          <div key={s.symbol} className="flex items-center gap-1.5 font-mono tabular">
            <span className="text-[var(--color-fg-muted)]">{s.label}</span>
            <span className="text-[var(--color-fg)]">{price != null ? price.toFixed(2) : '—'}</span>
            <span
              className={cn(
                'text-[10px]',
                up && 'text-[var(--color-pos)]',
                down && 'text-[var(--color-neg)]',
                !up && !down && 'text-[var(--color-fg-muted)]'
              )}
            >
              {pct != null ? `${pct > 0 ? '+' : ''}${fmtPct(pct)}` : ''}
            </span>
          </div>
        )
      })}
    </div>
  )
}
