import { useMemo, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useHistorical } from '../../../../hooks/useFinance'
import { logReturns } from '../../../../lib/indicators'
import { estimateDriftVol, simulateGBM } from '../../../../lib/monteCarlo'
import { MultiLineChart } from '../../../../components/charts/ChartPrimitives'
import { fmtPct } from '../../../../lib/format'
import { cn } from '../../../../lib/cn'

export function MonteCarloPanel({ ticker }: { ticker: string }): React.JSX.Element {
  const [horizon, setHorizon] = useState<30 | 90 | 252 | 504>(252)
  const [nPaths] = useState(500)
  const { data: bars = [], isLoading } = useHistorical(ticker, '2y')

  const sim = useMemo(() => {
    const closes = bars.map((b) => b.close).filter((v): v is number => v != null)
    if (closes.length < 60) return null
    const rets = logReturns(closes)
    const { mu, sigma } = estimateDriftVol(rets)
    const startPrice = closes[closes.length - 1]
    const result = simulateGBM({
      startPrice,
      mu,
      sigma,
      nSteps: horizon,
      nPaths,
      seed: 1337
    })
    // Forward return percentiles at horizon
    const final = {
      p05: (result.p05[horizon] / startPrice - 1) * 100,
      p25: (result.p25[horizon] / startPrice - 1) * 100,
      p50: (result.p50[horizon] / startPrice - 1) * 100,
      p75: (result.p75[horizon] / startPrice - 1) * 100,
      p95: (result.p95[horizon] / startPrice - 1) * 100,
      mean: (result.mean[horizon] / startPrice - 1) * 100
    }
    // Prob below start
    const finalPrices = result.paths.map((p) => p[horizon])
    const belowStart = finalPrices.filter((p) => p < startPrice).length / finalPrices.length
    const above20pct = finalPrices.filter((p) => p > startPrice * 1.2).length / finalPrices.length
    const below20pct = finalPrices.filter((p) => p < startPrice * 0.8).length / finalPrices.length
    return {
      result,
      final,
      startPrice,
      annualMu: mu * 252 * 100,
      annualSigma: sigma * Math.sqrt(252) * 100,
      belowStart: belowStart * 100,
      above20pct: above20pct * 100,
      below20pct: below20pct * 100
    }
  }, [bars, horizon, nPaths])

  if (isLoading) {
    return (
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3 text-[11px] text-[var(--color-fg-muted)]">
        Loading Monte Carlo…
      </div>
    )
  }
  if (!sim) {
    return (
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3 text-[11px] text-[var(--color-fg-muted)]">
        Not enough history for Monte Carlo.
      </div>
    )
  }

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <Sparkles className="h-3 w-3" /> Monte Carlo projection ({nPaths} paths)
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          {([30, 90, 252, 504] as const).map((h) => (
            <button
              key={h}
              onClick={() => setHorizon(h)}
              className={cn(
                'rounded border px-2 py-0.5 font-mono',
                horizon === h
                  ? 'border-[var(--color-info)] bg-[var(--color-info)]/15 text-[var(--color-info)]'
                  : 'border-[var(--color-border)] text-[var(--color-fg-muted)]'
              )}
            >
              {h === 252 ? '1y' : h === 504 ? '2y' : `${h}d`}
            </button>
          ))}
        </div>
      </div>

      <MultiLineChart
        series={[
          {
            values: sim.result.p05 as (number | null)[],
            color: 'rgba(239,68,68,0.5)',
            dashed: true
          },
          { values: sim.result.p25 as (number | null)[], color: 'rgba(239,68,68,0.3)' },
          { values: sim.result.p50 as (number | null)[], color: '#60a5fa', strokeWidth: 1.4 },
          { values: sim.result.p75 as (number | null)[], color: 'rgba(34,197,94,0.3)' },
          {
            values: sim.result.p95 as (number | null)[],
            color: 'rgba(34,197,94,0.5)',
            dashed: true
          },
          { values: sim.result.mean as (number | null)[], color: '#fbbf24', strokeWidth: 1 }
        ]}
        height={160}
        title="Percentile fans (5/25/50/75/95) + mean"
      />

      <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label="Start" value={`$${sim.startPrice.toFixed(2)}`} />
        <Stat
          label="Ann μ"
          value={fmtPct(sim.annualMu)}
          tone={sim.annualMu > 0 ? 'text-[var(--color-pos)]' : 'text-[var(--color-neg)]'}
        />
        <Stat label="Ann σ" value={fmtPct(sim.annualSigma)} />
        <Stat
          label="Median ret"
          value={fmtPct(sim.final.p50)}
          tone={sim.final.p50 > 0 ? 'text-[var(--color-pos)]' : 'text-[var(--color-neg)]'}
        />
        <Stat label="P5 ret" value={fmtPct(sim.final.p05)} tone="text-[var(--color-neg)]" />
        <Stat label="P95 ret" value={fmtPct(sim.final.p95)} tone="text-[var(--color-pos)]" />
        <Stat label="Prob > +20%" value={fmtPct(sim.above20pct)} tone="text-[var(--color-pos)]" />
        <Stat label="Prob < -20%" value={fmtPct(sim.below20pct)} tone="text-[var(--color-neg)]" />
      </div>
      <div className="mt-1 text-[9px] text-[var(--color-fg-muted)]">
        GBM simulation with drift/vol estimated from 2y daily log returns. Not a forecast —
        probabilistic scenario analysis under normality assumption.
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
