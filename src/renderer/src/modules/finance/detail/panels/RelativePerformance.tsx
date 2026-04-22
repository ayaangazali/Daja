import { useMemo, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { LineChart } from 'lucide-react'
import { MultiLineChart } from '../../../../components/charts/ChartPrimitives'
import type { HistoricalBar } from '../../../../hooks/useFinance'
import { fmtPct } from '../../../../lib/format'
import { cn } from '../../../../lib/cn'

const BENCH_COLORS: Record<string, string> = {
  SPY: '#60a5fa',
  QQQ: '#fbbf24',
  DIA: '#a78bfa',
  IWM: '#4ade80',
  GLD: '#facc15',
  TLT: '#c084fc',
  XLK: '#38bdf8',
  XLE: '#fb923c',
  XLV: '#f87171',
  XLF: '#34d399'
}

const BENCH_LABEL: Record<string, string> = {
  SPY: 'S&P 500',
  QQQ: 'Nasdaq 100',
  DIA: 'Dow',
  IWM: 'Russell 2000',
  GLD: 'Gold',
  TLT: '20y Bonds',
  XLK: 'Tech',
  XLE: 'Energy',
  XLV: 'Healthcare',
  XLF: 'Financials'
}

export function RelativePerformance({ ticker }: { ticker: string }): React.JSX.Element {
  const [range, setRange] = useState<'3mo' | '6mo' | '1y' | '2y' | '5y'>('1y')
  const [selected, setSelected] = useState<Set<string>>(new Set(['SPY', 'QQQ']))

  const symbols = [ticker, ...Array.from(selected)]
  const queries = useQueries({
    queries: symbols.map((s) => ({
      queryKey: ['historical', s, range],
      queryFn: () => window.nexus.finance.historical(s, range) as Promise<HistoricalBar[]>,
      staleTime: 30 * 60_000
    }))
  })

  const { series, finalReturns } = useMemo(() => {
    const series: { values: (number | null)[]; color: string; label: string }[] = []
    const finalReturns: { symbol: string; pct: number }[] = []
    queries.forEach((q, i) => {
      const bars = q.data
      if (!bars || bars.length < 2) return
      const closes = bars.map((b) => b.close).filter((v): v is number => v != null)
      if (closes.length === 0) return
      const base = closes[0]
      const normalized: (number | null)[] = closes.map((c) => ((c - base) / base) * 100)
      const sym = symbols[i]
      const color = sym === ticker ? '#fbbf24' : (BENCH_COLORS[sym] ?? '#60a5fa')
      series.push({
        values: normalized,
        color,
        label: sym === ticker ? ticker : (BENCH_LABEL[sym] ?? sym)
      })
      finalReturns.push({ symbol: sym, pct: normalized[normalized.length - 1] ?? 0 })
    })
    return { series, finalReturns }
  }, [queries, symbols, ticker])

  const toggleBench = (b: string): void => {
    setSelected((prev) => {
      const n = new Set(prev)
      if (n.has(b)) n.delete(b)
      else n.add(b)
      return n
    })
  }

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <LineChart className="h-3 w-3" /> Relative performance (normalized)
        </div>
        <div className="flex items-center gap-1 text-[10px]">
          {(['3mo', '6mo', '1y', '2y', '5y'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                'rounded border px-2 py-0.5 font-mono',
                range === r
                  ? 'border-[var(--color-info)] bg-[var(--color-info)]/15 text-[var(--color-info)]'
                  : 'border-[var(--color-border)] text-[var(--color-fg-muted)]'
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-2 flex flex-wrap gap-1 text-[10px]">
        {Object.keys(BENCH_COLORS).map((b) => (
          <button
            key={b}
            onClick={() => toggleBench(b)}
            className={cn(
              'rounded border px-2 py-0.5 font-mono',
              selected.has(b)
                ? 'border-[var(--color-border)] bg-[var(--color-bg)]'
                : 'border-[var(--color-border)] text-[var(--color-fg-muted)]'
            )}
            style={selected.has(b) ? { color: BENCH_COLORS[b], borderColor: BENCH_COLORS[b] } : {}}
          >
            {b}
          </button>
        ))}
      </div>
      <MultiLineChart
        series={series}
        height={200}
        horizontalLines={[{ y: 0, color: 'var(--color-fg-muted)', dashed: true }]}
      />
      <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
        {finalReturns.map((f) => (
          <div
            key={f.symbol}
            className="flex items-center justify-between rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1"
          >
            <span
              className="font-mono text-[10px] font-semibold"
              style={{
                color:
                  f.symbol === ticker
                    ? '#fbbf24'
                    : (BENCH_COLORS[f.symbol] ?? 'var(--color-fg)')
              }}
            >
              {f.symbol}
            </span>
            <span
              className={cn(
                'font-mono text-[11px] tabular',
                f.pct > 0 ? 'text-[var(--color-pos)]' : 'text-[var(--color-neg)]'
              )}
            >
              {fmtPct(f.pct)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
