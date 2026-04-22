import { useMemo, useState } from 'react'
import { History } from 'lucide-react'
import { useHistorical } from '../../../../hooks/useFinance'
import { dateToSec, findIndexForDate, runBacktest } from '../../../../lib/backtest'
import { MultiLineChart } from '../../../../components/charts/ChartPrimitives'
import { fmtLargeNum, fmtPct } from '../../../../lib/format'
import { cn } from '../../../../lib/cn'

function daysAgoISO(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

export function BacktestPanel({ ticker }: { ticker: string }): React.JSX.Element {
  const [startDate, setStartDate] = useState(daysAgoISO(5 * 365))
  const [amount, setAmount] = useState('10000')
  const [dca, setDca] = useState('0')
  const { data: bars = [] } = useHistorical(ticker, 'max')

  const result = useMemo(() => {
    if (bars.length === 0) return null
    const closes = bars.map((b) => b.close).filter((v): v is number => v != null)
    const times = bars.filter((b) => b.close != null).map((b) => b.time)
    if (closes.length === 0) return null
    const startSec = dateToSec(startDate)
    const idx = findIndexForDate(times, startSec)
    return runBacktest({
      closes,
      times,
      startIndex: idx,
      initialAmount: Math.max(1, Number(amount) || 0),
      monthlyContribution: Number(dca) || 0
    })
  }, [bars, startDate, amount, dca])

  if (!result) {
    return (
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3 text-[11px] text-[var(--color-fg-muted)]">
        Loading backtest…
      </div>
    )
  }

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <History className="h-3 w-3" /> Backtest — {ticker} "what if I bought"
        </div>
        <div className="flex flex-wrap items-center gap-1 text-[10px]">
          <label className="flex items-center gap-1 text-[var(--color-fg-muted)]">
            Start
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-1 py-0.5 font-mono"
            />
          </label>
          <label className="flex items-center gap-1 text-[var(--color-fg-muted)]">
            $
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-24 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-1 py-0.5 text-right font-mono"
            />
          </label>
          <label className="flex items-center gap-1 text-[var(--color-fg-muted)]">
            +$/mo
            <input
              type="number"
              value={dca}
              onChange={(e) => setDca(e.target.value)}
              className="w-20 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-1 py-0.5 text-right font-mono"
            />
          </label>
        </div>
      </div>

      <MultiLineChart
        series={[
          { values: result.equity, color: '#4ade80', strokeWidth: 1.4 },
          { values: result.contributions, color: '#60a5fa', strokeWidth: 1 }
        ]}
        height={150}
      />

      <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat
          label="Final value"
          value={`$${fmtLargeNum(result.finalValue)}`}
          tone={result.finalValue > result.totalContributed ? 'pos' : 'neg'}
        />
        <Stat label="Invested" value={`$${fmtLargeNum(result.totalContributed)}`} />
        <Stat
          label="Total return"
          value={fmtPct(result.totalReturnPct)}
          tone={result.totalReturnPct > 0 ? 'pos' : 'neg'}
        />
        <Stat label="CAGR" value={fmtPct(result.cagr)} tone={result.cagr > 0 ? 'pos' : 'neg'} />
        <Stat label="Max DD" value={fmtPct(result.maxDrawdownPct)} tone="neg" />
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  tone
}: {
  label: string
  value: string
  tone?: 'pos' | 'neg'
}): React.JSX.Element {
  return (
    <div className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] p-1.5">
      <div className="text-[9px] uppercase text-[var(--color-fg-muted)]">{label}</div>
      <div
        className={cn(
          'font-mono text-[12px] font-semibold tabular',
          tone === 'pos' && 'text-[var(--color-pos)]',
          tone === 'neg' && 'text-[var(--color-neg)]'
        )}
      >
        {value}
      </div>
    </div>
  )
}
