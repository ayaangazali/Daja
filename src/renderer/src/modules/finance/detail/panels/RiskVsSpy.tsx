import { useMemo } from 'react'
import { Gauge } from 'lucide-react'
import { useHistorical, type HistoricalBar } from '../../../../hooks/useFinance'
import {
  beta,
  correlation,
  logReturns,
  maxDrawdown,
  sharpeRatio,
  stddev
} from '../../../../lib/indicators'
import { fmtPct } from '../../../../lib/format'
import { cn } from '../../../../lib/cn'

function closes(bars: HistoricalBar[] | undefined): number[] {
  if (!bars) return []
  return bars.map((b) => b.close).filter((v): v is number => v != null && Number.isFinite(v))
}

export function RiskVsSpy({ ticker }: { ticker: string }): React.JSX.Element {
  const { data: stockBars, isLoading: sLoad } = useHistorical(ticker, '2y')
  const { data: spyBars, isLoading: mLoad } = useHistorical(
    ticker === 'SPY' ? '^GSPC' : 'SPY',
    '2y'
  )

  const metrics = useMemo(() => {
    const s = closes(stockBars)
    const m = closes(spyBars)
    if (s.length < 30 || m.length < 30) return null

    // Align by count — take the trailing common length
    const n = Math.min(s.length, m.length)
    const sT = s.slice(-n)
    const mT = m.slice(-n)

    const sR = logReturns(sT)
    const mR = logReturns(mT)

    // Annualize: ~252 trading days
    const ann = Math.sqrt(252)
    const vol = stddev(sR) * ann * 100
    const marketVol = stddev(mR) * ann * 100
    const b = beta(sR, mR)
    const c = correlation(sR, mR)
    // Risk-free ~4.5% annualized → daily
    const rfDaily = 0.045 / 252
    const sharpe = sharpeRatio(sR, rfDaily)
    const dd = maxDrawdown(sT)

    // Return vs market
    const stockRet = (sT[sT.length - 1] / sT[0] - 1) * 100
    const marketRet = (mT[mT.length - 1] / mT[0] - 1) * 100
    const alpha = stockRet - (b ?? 1) * marketRet

    return { vol, marketVol, b, c, sharpe, dd, stockRet, marketRet, alpha }
  }, [stockBars, spyBars])

  if (sLoad || mLoad) {
    return (
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3 text-[11px] text-[var(--color-fg-muted)]">
        Loading risk metrics…
      </div>
    )
  }
  if (!metrics) {
    return (
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3 text-[11px] text-[var(--color-fg-muted)]">
        Not enough price history for risk analysis.
      </div>
    )
  }

  const betaTone =
    metrics.b == null
      ? ''
      : metrics.b > 1.3
        ? 'text-[var(--color-warn)]'
        : metrics.b < 0.7
          ? 'text-[var(--color-pos)]'
          : 'text-[var(--color-fg)]'

  const spyLabel = ticker === 'SPY' ? '^GSPC' : 'SPY'

  return (
    <div
      className={cn(
        'rounded-md border p-3',
        'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
      )}
    >
      <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
        <Gauge className="h-3 w-3" /> Risk / Return (2y vs {spyLabel})
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat
          label="Beta"
          value={metrics.b != null ? metrics.b.toFixed(2) : '—'}
          tone={betaTone}
        />
        <Stat
          label="Correl"
          value={metrics.c != null ? metrics.c.toFixed(2) : '—'}
        />
        <Stat label="Ann Vol" value={fmtPct(metrics.vol)} />
        <Stat label="Sharpe" value={metrics.sharpe.toFixed(2)} />
        <Stat
          label="Max DD"
          value={fmtPct(metrics.dd)}
          tone={metrics.dd < -30 ? 'text-[var(--color-neg)]' : ''}
        />
        <Stat
          label="2y Return"
          value={fmtPct(metrics.stockRet)}
          tone={metrics.stockRet > 0 ? 'text-[var(--color-pos)]' : 'text-[var(--color-neg)]'}
        />
        <Stat
          label="Mkt 2y Ret"
          value={fmtPct(metrics.marketRet)}
          tone={metrics.marketRet > 0 ? 'text-[var(--color-pos)]' : 'text-[var(--color-neg)]'}
        />
        <Stat
          label="Alpha"
          value={fmtPct(metrics.alpha)}
          tone={metrics.alpha > 0 ? 'text-[var(--color-pos)]' : 'text-[var(--color-neg)]'}
        />
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
  tone?: string
}): React.JSX.Element {
  return (
    <div className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] p-1.5">
      <div className="text-[9px] uppercase text-[var(--color-fg-muted)]">{label}</div>
      <div className={cn('font-mono text-[12px] font-semibold tabular', tone)}>{value}</div>
    </div>
  )
}
