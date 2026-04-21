import { useMemo } from 'react'
import { useTrades } from '../../../hooks/useTrades'
import { useQuotes } from '../../../hooks/useFinance'
import { computePositions } from './positions'
import { cn } from '../../../lib/cn'

const PALETTE = ['#185FA5', '#1D9E75', '#BA7517', '#9D3B9D', '#A43F5B', '#2E7E8E', '#7A5FC2']

export function AllocationBar(): React.JSX.Element | null {
  const { data: trades = [] } = useTrades()
  const positions = useMemo(() => computePositions(trades).filter((p) => p.qty > 0), [trades])
  const tickers = positions.map((p) => p.ticker)
  const quotes = useQuotes(tickers)

  const slices = positions
    .map((p, i) => ({
      ticker: p.ticker,
      value: (quotes[i]?.data?.price ?? p.avgCost) * p.qty
    }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value)

  const total = slices.reduce((s, x) => s + x.value, 0)
  if (total === 0) return null

  return (
    <div
      className={cn(
        'rounded-md border p-3',
        'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
      )}
    >
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
        Allocation
      </div>
      <div className="flex h-3 w-full overflow-hidden rounded">
        {slices.map((s, i) => (
          <div
            key={s.ticker}
            title={`${s.ticker}: ${((s.value / total) * 100).toFixed(1)}%`}
            style={{
              width: `${(s.value / total) * 100}%`,
              background: PALETTE[i % PALETTE.length]
            }}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px]">
        {slices.map((s, i) => (
          <div key={s.ticker} className="flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-sm"
              style={{ background: PALETTE[i % PALETTE.length] }}
            />
            <span className="font-mono">{s.ticker}</span>
            <span className="text-[var(--color-fg-muted)] tabular">
              {((s.value / total) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
