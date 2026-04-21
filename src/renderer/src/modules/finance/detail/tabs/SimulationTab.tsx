import { useMemo, useState } from 'react'
import { useHistorical } from '../../../../hooks/useFinance'
import { fmtPrice, fmtPct } from '../../../../lib/format'
import { Sparkline } from '../../../../shared/Sparkline'
import { cn } from '../../../../lib/cn'

function logReturns(close: number[]): number[] {
  const r: number[] = []
  for (let i = 1; i < close.length; i++) {
    if (close[i - 1] > 0 && close[i] > 0) r.push(Math.log(close[i] / close[i - 1]))
  }
  return r
}

function stats(arr: number[]): { mean: number; std: number } {
  if (arr.length === 0) return { mean: 0, std: 0 }
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length
  const variance = arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length
  return { mean, std: Math.sqrt(variance) }
}

function randn(): number {
  let u = 0
  let v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function monteCarlo(
  start: number,
  mean: number,
  std: number,
  days: number,
  paths: number
): number[][] {
  const out: number[][] = []
  for (let p = 0; p < paths; p++) {
    const path: number[] = [start]
    for (let d = 0; d < days; d++) {
      path.push(path[d] * Math.exp(mean + std * randn()))
    }
    out.push(path)
  }
  return out
}

interface BacktestResult {
  finalEquity: number
  trades: number
  winRate: number
  maxDrawdown: number
  returnPct: number
  buyHoldReturnPct: number
  equity: number[]
}

function backtestSMA(close: number[], fast: number, slow: number): BacktestResult {
  if (close.length < slow) {
    return {
      finalEquity: 10000,
      trades: 0,
      winRate: 0,
      maxDrawdown: 0,
      returnPct: 0,
      buyHoldReturnPct: 0,
      equity: [10000]
    }
  }
  const sma = (idx: number, p: number): number =>
    close.slice(idx - p + 1, idx + 1).reduce((a, b) => a + b, 0) / p
  let position = 0 // shares
  let cash = 10000
  let entry = 0
  let wins = 0
  let trades = 0
  const equity: number[] = []
  for (let i = slow; i < close.length; i++) {
    const f = sma(i, fast)
    const s = sma(i, slow)
    const pf = sma(i - 1, fast)
    const ps = sma(i - 1, slow)
    const crossUp = pf <= ps && f > s
    const crossDn = pf >= ps && f < s
    if (crossUp && position === 0) {
      position = cash / close[i]
      entry = close[i]
      cash = 0
      trades += 1
    } else if (crossDn && position > 0) {
      cash = position * close[i]
      if (close[i] > entry) wins += 1
      position = 0
    }
    equity.push(cash + position * close[i])
  }
  const final = equity[equity.length - 1] ?? 10000
  let peak = equity[0] ?? 10000
  let dd = 0
  for (const e of equity) {
    if (e > peak) peak = e
    const d = (peak - e) / peak
    if (d > dd) dd = d
  }
  const bh = ((close[close.length - 1] - close[slow]) / close[slow]) * 100
  return {
    finalEquity: final,
    trades,
    winRate: trades === 0 ? 0 : (wins / trades) * 100,
    maxDrawdown: -dd * 100,
    returnPct: ((final - 10000) / 10000) * 100,
    buyHoldReturnPct: bh,
    equity
  }
}

export function SimulationTab({ ticker }: { ticker: string }): React.JSX.Element {
  const { data: bars = [], isLoading } = useHistorical(ticker, '5y')
  const [days, setDays] = useState(60)
  const [paths, setPaths] = useState(50)
  const [fast, setFast] = useState(20)
  const [slow, setSlow] = useState(50)

  const close = useMemo(
    () => bars.map((b) => b.close).filter((c): c is number => c != null),
    [bars]
  )
  const returns = useMemo(() => logReturns(close), [close])
  const { mean, std } = useMemo(() => stats(returns), [returns])
  const mcResults = useMemo(
    () => (close.length === 0 ? [] : monteCarlo(close[close.length - 1], mean, std, days, paths)),
    [close, mean, std, days, paths]
  )
  const finals = mcResults.map((p) => p[p.length - 1])
  const meanFinal = finals.length === 0 ? 0 : finals.reduce((a, b) => a + b, 0) / finals.length
  const sortedFinals = [...finals].sort((a, b) => a - b)
  const p10 = sortedFinals[Math.floor(sortedFinals.length * 0.1)] ?? 0
  const p50 = sortedFinals[Math.floor(sortedFinals.length * 0.5)] ?? 0
  const p90 = sortedFinals[Math.floor(sortedFinals.length * 0.9)] ?? 0

  const bt = useMemo(() => backtestSMA(close, fast, slow), [close, fast, slow])

  if (isLoading || close.length === 0) {
    return <div className="p-4 text-[11px] text-[var(--color-fg-muted)]">Loading data…</div>
  }

  const spot = close[close.length - 1]

  return (
    <div className="space-y-3 p-3">
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[10px] font-semibold uppercase text-[var(--color-fg-muted)]">
            Monte Carlo ({paths} paths × {days} days)
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <label>Days</label>
            <input
              type="range"
              min={10}
              max={252}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            />
            <span className="w-8 text-right font-mono tabular">{days}</span>
            <label>Paths</label>
            <input
              type="range"
              min={20}
              max={200}
              step={10}
              value={paths}
              onChange={(e) => setPaths(Number(e.target.value))}
            />
            <span className="w-8 text-right font-mono tabular">{paths}</span>
          </div>
        </div>
        <div className="mb-2 flex h-28 overflow-hidden rounded bg-[var(--color-bg)]">
          <svg viewBox={`0 0 ${days} 100`} preserveAspectRatio="none" className="h-full w-full">
            {mcResults.slice(0, 50).map((path, i) => {
              const min = Math.min(...path)
              const max = Math.max(...path)
              const d = path
                .map((v, idx) => {
                  const x = idx
                  const y = 100 - ((v - min) / (max - min || 1)) * 100
                  return `${idx === 0 ? 'M' : 'L'}${x},${y.toFixed(2)}`
                })
                .join(' ')
              return (
                <path
                  key={i}
                  d={d}
                  fill="none"
                  stroke={path[path.length - 1] > spot ? '#1d9e7533' : '#e24b4a33'}
                  strokeWidth={0.5}
                />
              )
            })}
          </svg>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Stat label="Spot" value={`$${fmtPrice(spot)}`} />
          <Stat
            label={`Median (${days}d)`}
            value={`$${fmtPrice(p50)}`}
            tone={p50 > spot ? 'pos' : 'neg'}
            sub={fmtPct(((p50 - spot) / spot) * 100)}
          />
          <Stat
            label={`10th pct`}
            value={`$${fmtPrice(p10)}`}
            tone="neg"
            sub={fmtPct(((p10 - spot) / spot) * 100)}
          />
          <Stat
            label={`90th pct`}
            value={`$${fmtPrice(p90)}`}
            tone="pos"
            sub={fmtPct(((p90 - spot) / spot) * 100)}
          />
        </div>
        <div className="mt-2 text-[9px] text-[var(--color-fg-muted)]">
          Mean daily return {(mean * 100).toFixed(3)}% · Daily σ {(std * 100).toFixed(2)}% · Mean
          final ${fmtPrice(meanFinal)}
        </div>
      </div>

      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[10px] font-semibold uppercase text-[var(--color-fg-muted)]">
            SMA Crossover Backtest
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <label>Fast</label>
            <input
              type="number"
              min={2}
              max={50}
              value={fast}
              onChange={(e) => setFast(Number(e.target.value))}
              className="w-12 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-1 py-0.5 font-mono"
            />
            <label>Slow</label>
            <input
              type="number"
              min={5}
              max={250}
              value={slow}
              onChange={(e) => setSlow(Number(e.target.value))}
              className="w-12 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-1 py-0.5 font-mono"
            />
          </div>
        </div>
        <div className="flex h-20 items-center overflow-hidden rounded bg-[var(--color-bg)] px-1">
          <Sparkline points={bt.equity} width={800} height={70} className="h-full w-full" />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-5">
          <Stat
            label="Strategy Return"
            value={fmtPct(bt.returnPct)}
            tone={bt.returnPct >= 0 ? 'pos' : 'neg'}
          />
          <Stat
            label="Buy & Hold"
            value={fmtPct(bt.buyHoldReturnPct)}
            tone={bt.buyHoldReturnPct >= 0 ? 'pos' : 'neg'}
          />
          <Stat label="Trades" value={bt.trades.toString()} />
          <Stat label="Win Rate" value={fmtPct(bt.winRate, 1)} />
          <Stat label="Max DD" value={fmtPct(bt.maxDrawdown, 1)} tone="neg" />
        </div>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  tone,
  sub
}: {
  label: string
  value: string
  tone?: 'pos' | 'neg'
  sub?: string
}): React.JSX.Element {
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-2">
      <div className="text-[9px] text-[var(--color-fg-muted)]">{label}</div>
      <div
        className={cn(
          'font-mono text-sm font-semibold tabular',
          tone === 'pos' && 'text-[var(--color-pos)]',
          tone === 'neg' && 'text-[var(--color-neg)]'
        )}
      >
        {value}
      </div>
      {sub && <div className="text-[9px] text-[var(--color-fg-muted)] tabular">{sub}</div>}
    </div>
  )
}
