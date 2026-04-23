import { useMemo } from 'react'
import { Gauge } from 'lucide-react'
import { useHistorical } from '../../../../hooks/useFinance'
import { computeRollingBeta } from '../../../../lib/rollingBeta'
import { cn } from '../../../../lib/cn'

export function RollingBetaPanel({ ticker }: { ticker: string }): React.JSX.Element {
  const { data: stockBars = [] } = useHistorical(ticker, '1y')
  const { data: spyBars = [] } = useHistorical('SPY', '1y')

  const result = useMemo(() => {
    const a = stockBars.map((b) => b.close).filter((x): x is number => x != null)
    const b = spyBars.map((x) => x.close).filter((x): x is number => x != null)
    return computeRollingBeta(a, b, 60)
  }, [stockBars, spyBars])

  if (!result || result.points.length === 0) {
    return (
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3 text-[11px] text-[var(--color-fg-muted)]">
        {result?.rationale ?? 'Computing rolling beta…'}
      </div>
    )
  }

  const W = 600
  const H = 120
  const PAD = 24
  const min = Math.min(...result.points.map((p) => p.beta ?? 0), 0)
  const max = Math.max(...result.points.map((p) => p.beta ?? 0), 1.5)
  const toX = (i: number): number =>
    PAD + (i / Math.max(1, result.points.length - 1)) * (W - 2 * PAD)
  const toY = (v: number): number =>
    H - PAD - ((v - min) / Math.max(0.01, max - min)) * (H - 2 * PAD)
  const linePath = result.points
    .map((p, i) => {
      const v = p.beta ?? 0
      return `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`
    })
    .join(' ')

  const regimeTone =
    result.regime === 'risk-on'
      ? 'text-[var(--color-pos)]'
      : result.regime === 'defensive'
        ? 'text-[var(--color-info)]'
        : result.regime === 'risk-off'
          ? 'text-[var(--color-neg)]'
          : 'text-[var(--color-fg-muted)]'

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <Gauge className="h-3 w-3" /> Rolling beta · 60d vs SPY
        </div>
        <span className={cn('font-mono text-[11px] font-semibold', regimeTone)}>
          {result.regime.replace('-', ' ')} · trend {result.trend}
        </span>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label="Current β" value={result.currentBeta?.toFixed(2) ?? '—'} />
        <Stat
          label="Current ρ"
          value={result.currentCorr != null ? result.currentCorr.toFixed(2) : '—'}
        />
        <Stat label="Avg β" value={result.avgBeta?.toFixed(2) ?? '—'} />
        <Stat
          label="β range"
          value={
            result.minBeta != null && result.maxBeta != null
              ? `${result.minBeta.toFixed(2)}–${result.maxBeta.toFixed(2)}`
              : '—'
          }
        />
      </div>
      <div className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] p-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-[120px] w-full">
          <line
            x1={PAD}
            x2={W - PAD}
            y1={toY(1)}
            y2={toY(1)}
            stroke="var(--color-fg-muted)"
            strokeDasharray="2,3"
            strokeOpacity="0.3"
          />
          <line x1={PAD} x2={W - PAD} y1={toY(0)} y2={toY(0)} stroke="var(--color-border)" />
          <path d={linePath} fill="none" stroke="var(--color-accent)" strokeWidth="1.5" />
          <text
            x={W - PAD}
            y={toY(1) - 2}
            fontSize="8"
            fill="var(--color-fg-muted)"
            textAnchor="end"
          >
            β=1
          </text>
        </svg>
      </div>
      <div className="mt-2 text-[10px] text-[var(--color-fg-muted)]">{result.rationale}</div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] p-2">
      <div className="text-[9px] uppercase text-[var(--color-fg-muted)]">{label}</div>
      <div className="font-mono text-[12px] font-semibold tabular">{value}</div>
    </div>
  )
}
