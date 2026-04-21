import { useEffect, useState } from 'react'
import { useTrades, type Trade } from '../../../hooks/useTrades'
import { type HistoricalBar } from '../../../hooks/useFinance'
import { Sparkline } from '../../../shared/Sparkline'
import { cn } from '../../../lib/cn'
import { fmtLargeNum, fmtPct, signColor } from '../../../lib/format'

interface Point {
  date: string
  portfolio: number
  benchmark: number
}

async function fetchHist(ticker: string, range: string): Promise<HistoricalBar[]> {
  return window.nexus.finance.historical(ticker, range) as Promise<HistoricalBar[]>
}

function aggregate(
  trades: Trade[],
  ticker: string
): { buys: Map<string, number>; sells: Map<string, number> } {
  const buys = new Map<string, number>()
  const sells = new Map<string, number>()
  for (const t of trades) {
    if (t.ticker !== ticker) continue
    const target = t.side === 'buy' ? buys : t.side === 'sell' ? sells : null
    if (!target) continue
    target.set(t.date, (target.get(t.date) ?? 0) + t.quantity)
  }
  return { buys, sells }
}

export function EquityCurve(): React.JSX.Element {
  const { data: trades = [] } = useTrades()
  const [points, setPoints] = useState<Point[]>([])
  const [loading, setLoading] = useState(false)
  const [range, setRange] = useState<'3mo' | '6mo' | '1y' | 'ytd' | '5y'>('1y')

  useEffect(() => {
    if (trades.length === 0) {
      setPoints([])
      return
    }
    let cancelled = false
    ;(async (): Promise<void> => {
      setLoading(true)
      try {
        const tickers = Array.from(new Set(trades.map((t) => t.ticker)))
        const histMap = new Map<string, HistoricalBar[]>()
        const bench = await fetchHist('SPY', range)
        for (const tk of tickers) {
          histMap.set(tk, await fetchHist(tk, range))
        }
        if (cancelled) return
        const dateMap = new Map<number, Map<string, number>>()
        for (const [tk, bars] of histMap) {
          for (const b of bars) {
            if (b.close == null) continue
            const day = Math.floor(b.time / 86400) * 86400
            if (!dateMap.has(day)) dateMap.set(day, new Map())
            dateMap.get(day)!.set(tk, b.close)
          }
        }
        const benchMap = new Map<number, number>()
        for (const b of bench) {
          if (b.close == null) continue
          benchMap.set(Math.floor(b.time / 86400) * 86400, b.close)
        }
        const allDays = [...dateMap.keys()].sort((a, b) => a - b)
        const out: Point[] = []
        let firstPort: number | null = null
        let firstBench: number | null = null
        for (const day of allDays) {
          const dayStr = new Date(day * 1000).toISOString().slice(0, 10)
          let value = 0
          for (const tk of tickers) {
            const agg = aggregate(trades, tk)
            let qty = 0
            for (const [d, q] of agg.buys) if (d <= dayStr) qty += q
            for (const [d, q] of agg.sells) if (d <= dayStr) qty -= q
            if (qty > 0) {
              const price = dateMap.get(day)?.get(tk) ?? 0
              value += qty * price
            }
          }
          const benchVal = benchMap.get(day)
          if (benchVal == null) continue
          if (value === 0) continue
          if (firstPort == null) firstPort = value
          if (firstBench == null) firstBench = benchVal
          out.push({
            date: dayStr,
            portfolio: (value / firstPort) * 100,
            benchmark: (benchVal / firstBench) * 100
          })
        }
        setPoints(out)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [trades, range])

  const last = points[points.length - 1]
  const returnPct = last ? last.portfolio - 100 : 0
  const benchReturn = last ? last.benchmark - 100 : 0
  const alpha = returnPct - benchReturn

  return (
    <div
      className={cn(
        'rounded-md border p-3',
        'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          Equity Curve vs SPY
        </div>
        <div className="flex items-center gap-0.5">
          {(['3mo', '6mo', '1y', 'ytd', '5y'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                'rounded px-1.5 py-0.5 font-mono text-[10px]',
                range === r
                  ? 'bg-[var(--color-info)] text-white'
                  : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
              )}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      {loading && (
        <div className="text-[10px] text-[var(--color-fg-muted)]">Computing equity curve…</div>
      )}
      {!loading && points.length === 0 && (
        <div className="py-4 text-center text-[10px] text-[var(--color-fg-muted)]">
          No trades or historical data.
        </div>
      )}
      {!loading && points.length > 0 && (
        <>
          <div className="relative h-40">
            <Sparkline
              points={points.map((p) => p.portfolio)}
              stroke="#185FA5"
              width={800}
              height={160}
              className="absolute inset-0 w-full"
            />
            <Sparkline
              points={points.map((p) => p.benchmark)}
              stroke="#8b95a3"
              width={800}
              height={160}
              className="absolute inset-0 w-full"
            />
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <Leg
              label="Portfolio"
              value={fmtPct(returnPct)}
              color="#185FA5"
              tone={returnPct >= 0 ? 'pos' : 'neg'}
            />
            <Leg
              label="SPY"
              value={fmtPct(benchReturn)}
              color="#8b95a3"
              tone={benchReturn >= 0 ? 'pos' : 'neg'}
            />
            <Leg
              label="Alpha"
              value={fmtPct(alpha)}
              color="#1D9E75"
              tone={alpha >= 0 ? 'pos' : 'neg'}
            />
          </div>
          <div className="mt-1 text-[9px] text-[var(--color-fg-muted)] tabular">
            {points[0]?.date} → {last?.date} · {points.length} bars · Base 100 · Final portfolio
            value ${fmtLargeNum(last?.portfolio)}
          </div>
        </>
      )}
    </div>
  )
}

function Leg({
  label,
  value,
  color,
  tone
}: {
  label: string
  value: string
  color: string
  tone: 'pos' | 'neg'
}): React.JSX.Element {
  return (
    <div className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] p-2">
      <div className="flex items-center gap-1 text-[9px] text-[var(--color-fg-muted)]">
        <span style={{ background: color }} className="inline-block h-1.5 w-3 rounded-sm" />
        {label}
      </div>
      <div
        className={cn(
          'font-mono text-sm font-semibold tabular',
          signColor(tone === 'pos' ? 1 : -1)
        )}
      >
        {value}
      </div>
    </div>
  )
}
