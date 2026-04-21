import { useState } from 'react'
import { Swords } from 'lucide-react'
import { useQuote } from '../../../hooks/useFinance'
import { useFundamentals, type Fundamentals } from '../../../hooks/useFundamentals'
import { fmtLargeNum, fmtPct, fmtPrice, signColor } from '../../../lib/format'
import { Sparkline } from '../../../shared/Sparkline'
import { cn } from '../../../lib/cn'

export function ComparePage(): React.JSX.Element {
  const [a, setA] = useState('AAPL')
  const [b, setB] = useState('MSFT')
  const [inputA, setInputA] = useState('AAPL')
  const [inputB, setInputB] = useState('MSFT')

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
        <div className="flex items-center gap-3">
          <Swords className="h-4 w-4 text-[var(--color-info)]" />
          <span className="text-sm font-semibold">Compare</span>
          <div className="flex items-center gap-2">
            <input
              value={inputA}
              onChange={(e) => setInputA(e.target.value.toUpperCase())}
              onBlur={() => setA(inputA)}
              onKeyDown={(e) => e.key === 'Enter' && setA(inputA)}
              className="w-24 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 font-mono text-[11px]"
            />
            <span className="text-[var(--color-fg-muted)]">vs</span>
            <input
              value={inputB}
              onChange={(e) => setInputB(e.target.value.toUpperCase())}
              onBlur={() => setB(inputB)}
              onKeyDown={(e) => e.key === 'Enter' && setB(inputB)}
              className="w-24 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 font-mono text-[11px]"
            />
          </div>
        </div>
      </div>
      <div className="flex flex-1 min-h-0 divide-x divide-[var(--color-border)]">
        <div className="min-h-0 w-1/2 overflow-y-auto">
          <Panel ticker={a} />
        </div>
        <div className="min-h-0 w-1/2 overflow-y-auto">
          <Panel ticker={b} />
        </div>
      </div>
      <div className="border-t border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
        <CompareTable a={a} b={b} />
      </div>
    </div>
  )
}

function Panel({ ticker }: { ticker: string }): React.JSX.Element {
  const { data: quote } = useQuote(ticker)
  const { data: fund } = useFundamentals(ticker)
  return (
    <div className="p-4">
      <div className="flex items-baseline gap-2">
        <div className="font-mono text-xl font-semibold">{ticker}</div>
        {fund?.name && (
          <div className="truncate text-[11px] text-[var(--color-fg-muted)]">{fund.name}</div>
        )}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <div className="font-mono text-2xl tabular">${fmtPrice(quote?.price)}</div>
        <div className={cn('font-mono text-sm tabular', signColor(quote?.changePercent))}>
          {fmtPct(quote?.changePercent)}
        </div>
      </div>
      {quote?.spark && quote.spark.length > 0 && (
        <div className="mt-2 h-20">
          <Sparkline points={quote.spark} width={400} height={80} className="w-full" />
        </div>
      )}
      {fund?.description && (
        <div className="mt-3 line-clamp-6 text-[11px] leading-relaxed text-[var(--color-fg-muted)]">
          {fund.description}
        </div>
      )}
    </div>
  )
}

function CompareTable({ a, b }: { a: string; b: string }): React.JSX.Element {
  const { data: fA } = useFundamentals(a)
  const { data: fB } = useFundamentals(b)
  const rows: { label: string; pick: (f: Fundamentals) => number | null | undefined; higherBetter: boolean; fmt?: (v: number) => string }[] = [
    { label: 'Market Cap', pick: (f) => f.marketCap, higherBetter: true, fmt: (v) => `$${fmtLargeNum(v)}` },
    { label: 'P/E', pick: (f) => f.trailingPE, higherBetter: false },
    { label: 'Fwd P/E', pick: (f) => f.forwardPE, higherBetter: false },
    { label: 'PEG', pick: (f) => f.pegRatio, higherBetter: false },
    { label: 'Rev Growth', pick: (f) => (f.revenueGrowth != null ? f.revenueGrowth * 100 : null), higherBetter: true, fmt: (v) => fmtPct(v) },
    { label: 'EPS Growth', pick: (f) => (f.earningsGrowth != null ? f.earningsGrowth * 100 : null), higherBetter: true, fmt: (v) => fmtPct(v) },
    { label: 'Gross Margin', pick: (f) => (f.grossMargins != null ? f.grossMargins * 100 : null), higherBetter: true, fmt: (v) => fmtPct(v) },
    { label: 'Net Margin', pick: (f) => (f.profitMargins != null ? f.profitMargins * 100 : null), higherBetter: true, fmt: (v) => fmtPct(v) },
    { label: 'ROE', pick: (f) => (f.returnOnEquity != null ? f.returnOnEquity * 100 : null), higherBetter: true, fmt: (v) => fmtPct(v) },
    { label: 'D/E', pick: (f) => f.debtToEquity, higherBetter: false },
    { label: 'Div Yield', pick: (f) => (f.dividendYield != null ? f.dividendYield * 100 : null), higherBetter: true, fmt: (v) => fmtPct(v) }
  ]

  return (
    <table className="w-full text-[11px]">
      <thead className="text-[10px] uppercase text-[var(--color-fg-muted)]">
        <tr>
          <th className="px-2 py-1 text-left">Metric</th>
          <th className="px-2 py-1 text-right font-mono">{a}</th>
          <th className="px-2 py-1 text-right font-mono">{b}</th>
          <th className="px-2 py-1 text-right">Winner</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const vA = fA ? r.pick(fA) : null
          const vB = fB ? r.pick(fB) : null
          let winner: 'A' | 'B' | null = null
          if (vA != null && vB != null) {
            if (r.higherBetter) winner = vA > vB ? 'A' : vA < vB ? 'B' : null
            else winner = vA < vB ? 'A' : vA > vB ? 'B' : null
          }
          return (
            <tr key={r.label} className="border-t border-[var(--color-border)]">
              <td className="px-2 py-1 text-[var(--color-fg-muted)]">{r.label}</td>
              <td
                className={cn(
                  'px-2 py-1 text-right font-mono tabular',
                  winner === 'A' && 'text-[var(--color-pos)] font-semibold'
                )}
              >
                {vA != null ? (r.fmt ? r.fmt(vA) : vA.toFixed(2)) : '—'}
              </td>
              <td
                className={cn(
                  'px-2 py-1 text-right font-mono tabular',
                  winner === 'B' && 'text-[var(--color-pos)] font-semibold'
                )}
              >
                {vB != null ? (r.fmt ? r.fmt(vB) : vB.toFixed(2)) : '—'}
              </td>
              <td className="px-2 py-1 text-right text-[10px] font-mono">
                {winner === 'A' ? a : winner === 'B' ? b : '—'}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
