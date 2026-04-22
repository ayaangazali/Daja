import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { Rotate3d } from 'lucide-react'
import type { HistoricalBar } from '../../../hooks/useFinance'
import { cn } from '../../../lib/cn'
import { fmtPct } from '../../../lib/format'

const SECTORS: { ticker: string; label: string }[] = [
  { ticker: 'XLK', label: 'Technology' },
  { ticker: 'XLF', label: 'Financials' },
  { ticker: 'XLE', label: 'Energy' },
  { ticker: 'XLV', label: 'Healthcare' },
  { ticker: 'XLY', label: 'Consumer Disc.' },
  { ticker: 'XLP', label: 'Consumer Stpl.' },
  { ticker: 'XLI', label: 'Industrials' },
  { ticker: 'XLU', label: 'Utilities' },
  { ticker: 'XLRE', label: 'Real Estate' },
  { ticker: 'XLB', label: 'Materials' },
  { ticker: 'XLC', label: 'Communication' },
  { ticker: 'SPY', label: 'S&P 500 (bench)' }
]

const WINDOWS = [
  { label: '1D', bars: 1 },
  { label: '1W', bars: 5 },
  { label: '1M', bars: 21 },
  { label: '3M', bars: 63 },
  { label: '6M', bars: 126 },
  { label: '1Y', bars: 252 },
  { label: 'YTD', bars: -1 }
]

function cellColor(pct: number | null): string {
  if (pct == null) return 'transparent'
  const cap = 10
  const mag = Math.min(Math.abs(pct), cap) / cap
  if (pct > 0) return `rgba(34, 197, 94, ${0.15 + mag * 0.55})`
  return `rgba(239, 68, 68, ${0.15 + mag * 0.55})`
}

function ytdBars(bars: HistoricalBar[]): number {
  const year = new Date().getFullYear()
  for (let i = 0; i < bars.length; i++) {
    if (new Date(bars[i].time * 1000).getFullYear() === year) {
      return bars.length - i
    }
  }
  return bars.length
}

export function SectorRotation(): React.JSX.Element {
  const queries = useQueries({
    queries: SECTORS.map((s) => ({
      queryKey: ['historical', s.ticker, '1y'],
      queryFn: () => window.daja.finance.historical(s.ticker, '1y') as Promise<HistoricalBar[]>,
      staleTime: 30 * 60_000
    }))
  })

  const grid = useMemo(() => {
    return SECTORS.map((sec, i) => {
      const bars = queries[i]?.data ?? []
      const closes = bars
        .map((b) => b.close)
        .filter((v): v is number => v != null && Number.isFinite(v))
      if (closes.length === 0) return { sector: sec, returns: Array(WINDOWS.length).fill(null) }
      const last = closes[closes.length - 1]
      const returns = WINDOWS.map((w) => {
        const bcount = w.bars === -1 ? ytdBars(bars) : w.bars
        const idx = Math.max(0, closes.length - 1 - bcount)
        const past = closes[idx]
        if (past <= 0) return null
        return ((last - past) / past) * 100
      })
      return { sector: sec, returns }
    })
  }, [queries])

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <Rotate3d className="h-3 w-3" /> Sector rotation heatmap
        </div>
        <div className="font-mono text-[10px] text-[var(--color-fg-muted)]">
          Sector SPDR ETFs vs multiple time frames
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead className="text-[9px] uppercase text-[var(--color-fg-muted)]">
            <tr>
              <th className="px-2 py-1 text-left">Sector</th>
              {WINDOWS.map((w) => (
                <th key={w.label} className="px-2 py-1 text-right">
                  {w.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row) => (
              <tr key={row.sector.ticker} className="border-t border-[var(--color-border)]">
                <td className="px-2 py-1 font-mono">
                  <span className="font-semibold">{row.sector.ticker}</span>{' '}
                  <span className="text-[9px] text-[var(--color-fg-muted)]">
                    {row.sector.label}
                  </span>
                </td>
                {row.returns.map((ret, i) => (
                  <td
                    key={i}
                    className={cn(
                      'px-2 py-1 text-right font-mono tabular',
                      ret != null && ret > 0 && 'text-[var(--color-pos)]',
                      ret != null && ret < 0 && 'text-[var(--color-neg)]'
                    )}
                    style={{ background: cellColor(ret) }}
                  >
                    {ret != null ? fmtPct(ret, 1) : '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
