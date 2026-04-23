import { useMemo } from 'react'
import { TrendingUp } from 'lucide-react'
import { useQuotes, type Quote } from '../../../hooks/useFinance'
import { cn } from '../../../lib/cn'

const CURVE = [
  { ticker: '^IRX', label: '13W', months: 3 },
  { ticker: '^FVX', label: '5Y', months: 60 },
  { ticker: '^TNX', label: '10Y', months: 120 },
  { ticker: '^TYX', label: '30Y', months: 360 }
]

export function YieldCurve(): React.JSX.Element {
  const results = useQuotes(CURVE.map((c) => c.ticker))

  const { points, inverted } = useMemo(() => {
    const pts = CURVE.map((c, i) => {
      const q = results[i]?.data as Quote | undefined
      // Yahoo quotes ^TNX etc. as percentage points × 10 (e.g. 43.5 = 4.35%)
      // Actually ^TNX uses direct percent (e.g. 4.35 = 4.35%). Let's handle both.
      const raw = q?.price ?? null
      const yld = raw == null ? null : raw > 20 ? raw / 10 : raw
      return { label: c.label, months: c.months, yield: yld, change: q?.changePercent ?? null }
    })
    // Yield curve inversion: 10Y < 2Y surrogate (we use 5Y here since 2Y isn't in our list); use 10Y vs 5Y
    const short = pts.find((p) => p.label === '5Y')?.yield ?? null
    const long = pts.find((p) => p.label === '10Y')?.yield ?? null
    const inv = short != null && long != null && short > long
    return { points: pts, inverted: inv }
  }, [results])

  const valid = points.filter((p) => p.yield != null && Number.isFinite(p.yield))
  if (valid.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-4 text-[11px] text-[var(--color-fg-muted)]">
        Loading yield curve…
      </div>
    )
  }

  const minY = Math.min(...(valid.map((p) => p.yield!) as number[]))
  const maxY = Math.max(...(valid.map((p) => p.yield!) as number[]))
  const rangeY = Math.max(0.2, maxY - minY)
  const width = 440
  const height = 120
  const padX = 30
  const padY = 20

  const xOf = (months: number): number => {
    const maxM = 360
    const minM = 1
    const t = (Math.log(months) - Math.log(minM)) / (Math.log(maxM) - Math.log(minM))
    return padX + t * (width - 2 * padX)
  }
  const yOf = (yld: number): number =>
    padY + (1 - (yld - minY) / rangeY) * (height - 2 * padY)

  const path = points
    .filter((p) => p.yield != null)
    .map((p, i) => {
      const x = xOf(p.months)
      const y = yOf(p.yield as number)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <TrendingUp className="h-3 w-3" /> US Treasury yield curve
        </div>
        <div
          className={cn(
            'rounded-full px-2 py-0.5 font-mono text-[9px] uppercase',
            inverted
              ? 'bg-[var(--color-neg)]/15 text-[var(--color-neg)]'
              : 'bg-[var(--color-pos)]/15 text-[var(--color-pos)]'
          )}
          title="Yield curve inversion (5Y > 10Y) historically precedes recessions"
        >
          {inverted ? 'inverted' : 'normal'}
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        <path d={path} fill="none" stroke="var(--color-accent)" strokeWidth={2} />
        {points.map((p) => {
          if (p.yield == null) return null
          const x = xOf(p.months)
          const y = yOf(p.yield)
          return (
            <g key={p.label}>
              <circle cx={x} cy={y} r={3} fill="var(--color-accent)" />
              <text
                x={x}
                y={height - 4}
                textAnchor="middle"
                className="fill-[var(--color-fg-muted)] font-mono"
                style={{ fontSize: 9 }}
              >
                {p.label}
              </text>
              <text
                x={x}
                y={y - 6}
                textAnchor="middle"
                className="fill-[var(--color-fg)] font-mono"
                style={{ fontSize: 9 }}
              >
                {p.yield.toFixed(2)}%
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
