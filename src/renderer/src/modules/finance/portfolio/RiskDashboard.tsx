import { useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, Shield } from 'lucide-react'
import { type Trade } from '../../../hooks/useTrades'
import { useQuotes, type HistoricalBar } from '../../../hooks/useFinance'
import { beta, correlation, logReturns, maxDrawdown, sharpeRatio } from '../../../lib/indicators'
import { computePositions } from './positions'
import { fmtLargeNum, fmtPct, signColor } from '../../../lib/format'
import { cn } from '../../../lib/cn'

async function fetchHist(ticker: string, range = '1y'): Promise<HistoricalBar[]> {
  return window.daja.finance.historical(ticker, range) as Promise<HistoricalBar[]>
}

function alignSeries(
  a: { time: number; value: number }[],
  b: { time: number; value: number }[]
): { a: number[]; b: number[] } {
  const bMap = new Map(b.map((x) => [x.time, x.value]))
  const out = { a: [] as number[], b: [] as number[] }
  for (const p of a) {
    const bv = bMap.get(p.time)
    if (bv != null) {
      out.a.push(p.value)
      out.b.push(bv)
    }
  }
  return out
}

interface PortfolioRisk {
  beta: number | null
  sharpe: number
  drawdown: number
  top: { ticker: string; pct: number }[]
  concentrationRisk: number
  totalValue: number
  hhi: number
  effectiveN: number
}

export function RiskDashboard({ trades }: { trades: Trade[] }): React.JSX.Element {
  const positions = useMemo(() => computePositions(trades).filter((p) => p.qty > 0), [trades])
  const tickers = positions.map((p) => p.ticker)
  const quotes = useQuotes(tickers)

  const [hist, setHist] = useState<{
    benchReturns: number[]
    assetReturns: Map<string, number[]>
  }>({ benchReturns: [], assetReturns: new Map() })

  const tickerKey = [...tickers].sort().join(',')
  useEffect(() => {
    if (tickers.length === 0) {
      setHist({ benchReturns: [], assetReturns: new Map() })
      return
    }
    let cancelled = false
    ;(async (): Promise<void> => {
      try {
        const results = await Promise.all([
          fetchHist('SPY', '1y'),
          ...tickers.map((t) => fetchHist(t, '1y'))
        ])
        if (cancelled) return
        const [bench, ...assetBars] = results
        const benchClose = bench
          .filter((b) => b.close != null)
          .map((b) => ({ time: b.time, value: b.close as number }))
        // Derive SPY returns from raw closes (not per-asset aligned) to avoid misalignment
        const benchReturns = logReturns(benchClose.map((b) => b.value))
        const assetReturns = new Map<string, number[]>()
        tickers.forEach((tk, i) => {
          const bars = assetBars[i]
          const closes = bars
            .filter((b) => b.close != null)
            .map((b) => ({ time: b.time, value: b.close as number }))
          const aligned = alignSeries(closes, benchClose)
          assetReturns.set(tk, logReturns(aligned.a))
        })
        if (!cancelled) setHist({ benchReturns, assetReturns })
      } catch {
        if (!cancelled) setHist({ benchReturns: [], assetReturns: new Map() })
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickerKey])

  const risk = useMemo<PortfolioRisk>(() => {
    if (positions.length === 0) {
      return {
        beta: null,
        sharpe: 0,
        drawdown: 0,
        top: [],
        concentrationRisk: 0,
        totalValue: 0,
        hhi: 0,
        effectiveN: 0
      }
    }
    const values = positions.map((p, i) => {
      const price = quotes[i]?.data?.price ?? p.avgCost
      return { ticker: p.ticker, value: price * p.qty }
    })
    const totalValue = values.reduce((s, v) => s + v.value, 0)
    const weights = values.map((v) => (totalValue > 0 ? v.value / totalValue : 0))
    const top = values
      .map((v) => ({ ticker: v.ticker, pct: totalValue > 0 ? (v.value / totalValue) * 100 : 0 }))
      .sort((a, b) => b.pct - a.pct)
    const concentrationRisk = top.slice(0, 3).reduce((s, x) => s + x.pct, 0)
    const hhi = weights.reduce((s, w) => s + w * w, 0)
    const effectiveN = hhi > 0 ? 1 / hhi : 0

    // Weighted portfolio returns
    const minLen = Math.min(
      ...[...hist.assetReturns.values()].map((a) => a.length),
      hist.benchReturns.length || Infinity
    )
    if (!Number.isFinite(minLen) || minLen < 2) {
      return {
        beta: null,
        sharpe: 0,
        drawdown: 0,
        top,
        concentrationRisk,
        totalValue,
        hhi,
        effectiveN
      }
    }
    const portfolioReturns: number[] = []
    for (let i = 0; i < minLen; i++) {
      let r = 0
      positions.forEach((p, idx) => {
        const series = hist.assetReturns.get(p.ticker)
        if (series && series.length >= minLen) {
          const offset = series.length - minLen
          r += series[offset + i] * weights[idx]
        }
      })
      portfolioReturns.push(r)
    }
    // Convert log returns to equity curve starting at 100
    const equity: number[] = [100]
    for (const r of portfolioReturns) equity.push(equity[equity.length - 1] * Math.exp(r))

    return {
      beta: beta(portfolioReturns, hist.benchReturns.slice(-minLen)),
      sharpe: sharpeRatio(portfolioReturns),
      drawdown: maxDrawdown(equity),
      top,
      concentrationRisk,
      totalValue,
      hhi,
      effectiveN
    }
  }, [positions, quotes, hist])

  if (positions.length === 0) {
    return (
      <div
        className={cn(
          'rounded-md border p-4 text-center text-[11px] text-[var(--color-fg-muted)]',
          'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
        )}
      >
        No open positions — log trades to see risk metrics.
      </div>
    )
  }

  // Correlation matrix — memoized. O(N²) in position count × O(T) series length.
  // With 50+ positions, unmemoized recompute on every render caused layout thrash.
  // Also exploit symmetry: corr(a,b) == corr(b,a), so we compute upper triangle
  // and mirror.
  const tickerPairs: string[] = positions.map((p) => p.ticker)
  const corrMatrix = useMemo(() => {
    const n = tickerPairs.length
    const matrix: (number | null)[][] = Array.from({ length: n }, () => Array(n).fill(null))
    for (let i = 0; i < n; i++) {
      matrix[i][i] = 1
      for (let j = i + 1; j < n; j++) {
        const a = hist.assetReturns.get(tickerPairs[i])
        const b = hist.assetReturns.get(tickerPairs[j])
        if (a && b) {
          const c = correlation(a, b)
          matrix[i][j] = c
          matrix[j][i] = c
        }
      }
    }
    return matrix
    // tickerPairs is derived from positions each render but stable by content;
    // use join() as a stable dep string.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickerPairs.join(','), hist.assetReturns])

  // Surface history shortfall so users know beta/sharpe are provisional.
  const shortHistoryTickers = positions
    .map((p) => ({ ticker: p.ticker, len: hist.assetReturns.get(p.ticker)?.length ?? 0 }))
    .filter((x) => x.len > 0 && x.len < 200) // ~8mo trading days = too little for beta
    .map((x) => x.ticker)

  return (
    <div className="space-y-3">
      {shortHistoryTickers.length > 0 && (
        <div className="rounded-md border border-[var(--color-warn)]/40 bg-[var(--color-warn)]/10 p-3 text-[11px] text-[var(--color-warn)]">
          <span className="font-semibold">Limited price history:</span>{' '}
          {shortHistoryTickers.join(', ')} {shortHistoryTickers.length === 1 ? 'has' : 'have'} less
          than ~8 months of data. Beta, Sharpe, and correlation numbers below under-weight these
          names and may be unreliable until more history accumulates.
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          icon={<Shield className="h-3 w-3" />}
          label="Portfolio Beta (vs SPY)"
          value={risk.beta != null ? risk.beta.toFixed(2) : '—'}
          tone={
            risk.beta == null
              ? null
              : risk.beta > 1.3
                ? 'neg'
                : risk.beta > 1.1
                  ? 'warn'
                  : risk.beta < 0.8
                    ? 'pos'
                    : null
          }
          sub={
            risk.beta == null
              ? 'Need more history'
              : risk.beta > 1
                ? 'More volatile than SPY'
                : 'Less volatile than SPY'
          }
        />
        <Stat
          icon={<Activity className="h-3 w-3" />}
          label="Sharpe (ann.)"
          value={risk.sharpe !== 0 ? risk.sharpe.toFixed(2) : '—'}
          tone={risk.sharpe > 1 ? 'pos' : risk.sharpe > 0 ? 'warn' : 'neg'}
        />
        <Stat
          icon={<AlertTriangle className="h-3 w-3" />}
          label="Max drawdown"
          value={risk.drawdown !== 0 ? fmtPct(risk.drawdown) : '—'}
          tone="neg"
        />
        <Stat
          label="Top-3 concentration"
          value={fmtPct(risk.concentrationRisk)}
          tone={risk.concentrationRisk > 80 ? 'neg' : risk.concentrationRisk > 60 ? 'warn' : null}
          sub={
            risk.concentrationRisk > 80
              ? 'Highly concentrated'
              : risk.concentrationRisk > 60
                ? 'Concentrated'
                : 'Diversified'
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label="HHI"
          value={risk.hhi > 0 ? risk.hhi.toFixed(3) : '—'}
          tone={risk.hhi > 0.25 ? 'neg' : risk.hhi > 0.15 ? 'warn' : 'pos'}
          sub={
            risk.hhi > 0.25
              ? 'Highly concentrated (>0.25)'
              : risk.hhi > 0.15
                ? 'Moderately concentrated'
                : 'Diversified (<0.15)'
          }
        />
        <Stat
          label="Effective positions"
          value={risk.effectiveN > 0 ? risk.effectiveN.toFixed(1) : '—'}
          sub={`of ${positions.length} actual · 1/HHI`}
        />
        <Stat
          label="Largest position"
          value={risk.top[0] ? fmtPct(risk.top[0].pct) : '—'}
          tone={risk.top[0]?.pct > 40 ? 'neg' : risk.top[0]?.pct > 25 ? 'warn' : null}
          sub={risk.top[0]?.ticker}
        />
        <Stat
          label="Positions held"
          value={positions.length.toString()}
          sub={
            positions.length < 10
              ? 'Below typical 10-20 range'
              : positions.length > 30
                ? 'Over-diversified — watch ETF overlap'
                : 'Standard range'
          }
        />
      </div>

      {positions.length >= 2 && (
        <div
          className={cn(
            'rounded-md border p-3',
            'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
          )}
        >
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
            Correlation matrix (1y log returns)
          </div>
          <div className="overflow-x-auto">
            <table className="text-[10px]">
              <thead>
                <tr>
                  <th className="px-1 py-0.5"></th>
                  {tickerPairs.map((t) => (
                    <th key={t} className="px-1 py-0.5 font-mono">
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tickerPairs.map((row, i) => (
                  <tr key={row}>
                    <td className="px-1 py-0.5 font-mono font-semibold">{row}</td>
                    {tickerPairs.map((_col, j) => {
                      const v = corrMatrix[i][j]
                      const bg =
                        v == null
                          ? 'bg-[var(--color-bg)]'
                          : v >= 0.7
                            ? 'bg-[var(--color-neg)]/30'
                            : v >= 0.4
                              ? 'bg-[var(--color-warn)]/25'
                              : v >= 0
                                ? 'bg-[var(--color-bg)]'
                                : 'bg-[var(--color-pos)]/25'
                      return (
                        <td
                          key={`${i}-${j}`}
                          className={cn('px-1 py-0.5 text-center font-mono tabular', bg)}
                        >
                          {v != null ? v.toFixed(2) : '—'}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2 text-[9px] text-[var(--color-fg-muted)]">
            High correlation (&gt;0.7) = positions move together — diversification fail.
          </div>
        </div>
      )}

      <div
        className={cn(
          'rounded-md border p-3',
          'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
        )}
      >
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          Position weights · Total ${fmtLargeNum(risk.totalValue)}
        </div>
        <div className="space-y-1">
          {risk.top.map((p) => (
            <div key={p.ticker} className="flex items-center gap-2 text-[11px]">
              <span className="w-14 font-mono font-semibold">{p.ticker}</span>
              <div className="flex-1">
                <div
                  className={cn(
                    'h-3 rounded',
                    p.pct > 40
                      ? 'bg-[var(--color-neg)]'
                      : p.pct > 20
                        ? 'bg-[var(--color-warn)]'
                        : 'bg-[var(--color-info)]'
                  )}
                  style={{ width: `${p.pct}%` }}
                />
              </div>
              <span className="w-14 text-right font-mono tabular">{p.pct.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Stat({
  icon,
  label,
  value,
  tone,
  sub
}: {
  icon?: React.ReactNode
  label: string
  value: string
  tone?: 'pos' | 'neg' | 'warn' | null
  sub?: string
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'rounded-md border p-3',
        'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
      )}
    >
      <div className="flex items-center gap-1 text-[10px] text-[var(--color-fg-muted)]">
        {icon}
        <span>{label}</span>
      </div>
      <div
        className={cn(
          'mt-1 font-mono text-lg font-semibold tabular',
          tone === 'pos' && 'text-[var(--color-pos)]',
          tone === 'neg' && 'text-[var(--color-neg)]',
          tone === 'warn' && 'text-[var(--color-warn)]'
        )}
      >
        {value}
      </div>
      {sub && <div className="text-[9px] text-[var(--color-fg-muted)]">{sub}</div>}
    </div>
  )
}

// Empty placeholder to suppress unused warnings when imports shift
export function _typeGuard(_trades: Trade[]): void {
  void _trades
  void signColor
}
