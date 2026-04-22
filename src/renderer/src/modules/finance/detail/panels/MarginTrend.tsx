import { useMemo } from 'react'
import { TrendingUp } from 'lucide-react'
import { useStatements } from '../../../../hooks/useStatements'
import { fmtPct } from '../../../../lib/format'
import { cn } from '../../../../lib/cn'

interface MarginPoint {
  date: string
  gross: number | null
  operating: number | null
  net: number | null
}

export function MarginTrend({ ticker }: { ticker: string }): React.JSX.Element {
  const { data: stmts } = useStatements(ticker)

  const points: MarginPoint[] = useMemo(() => {
    if (!stmts) return []
    // Use annual income statement rows, reversed so oldest first
    const rows = [...stmts.incomeAnnual].reverse()
    return rows.map((r) => {
      const rev = r.revenue
      const gross =
        rev != null && rev > 0 && r.grossProfit != null
          ? (r.grossProfit / rev) * 100
          : null
      const op =
        rev != null && rev > 0 && r.operatingIncome != null
          ? (r.operatingIncome / rev) * 100
          : null
      const net =
        rev != null && rev > 0 && r.netIncome != null ? (r.netIncome / rev) * 100 : null
      return { date: r.date, gross, operating: op, net }
    })
  }, [stmts])

  if (points.length === 0) {
    return (
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3 text-[11px] text-[var(--color-fg-muted)]">
        No annual margin data available.
      </div>
    )
  }

  // Build SVG line chart
  const width = 600
  const height = 120
  const padL = 30
  const padB = 20
  const padT = 8
  const padR = 8
  const plotW = width - padL - padR
  const plotH = height - padT - padB

  const allValues = points.flatMap((p) => [p.gross, p.operating, p.net]).filter(
    (v): v is number => v != null && Number.isFinite(v)
  )
  const yMin = Math.min(0, Math.min(...allValues))
  const yMax = Math.max(...allValues, 0)
  const yRange = yMax - yMin || 1

  const x = (i: number): number =>
    points.length === 1 ? padL + plotW / 2 : padL + (i / (points.length - 1)) * plotW
  const y = (v: number): number => padT + plotH - ((v - yMin) / yRange) * plotH

  const buildPath = (getter: (p: MarginPoint) => number | null): string =>
    points
      .map((p, i) => {
        const v = getter(p)
        return v != null ? `${i === 0 ? 'M' : 'L'}${x(i).toFixed(2)},${y(v).toFixed(2)}` : ''
      })
      .filter((s) => s)
      .join(' ')

  return (
    <div
      className={cn(
        'rounded-md border p-3',
        'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <TrendingUp className="h-3 w-3" /> Margin trend
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <Legend color="var(--color-pos)" label="Gross" />
          <Legend color="var(--color-info)" label="Operating" />
          <Legend color="var(--color-warn)" label="Net" />
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        {/* Zero line */}
        {yMin < 0 && (
          <line
            x1={padL}
            x2={width - padR}
            y1={y(0)}
            y2={y(0)}
            stroke="var(--color-fg-muted)"
            strokeWidth={0.5}
            strokeDasharray="2 2"
            opacity={0.5}
          />
        )}
        {/* Y-axis labels */}
        {[yMin, (yMin + yMax) / 2, yMax].map((v, i) => (
          <g key={i}>
            <line
              x1={padL}
              x2={width - padR}
              y1={y(v)}
              y2={y(v)}
              stroke="var(--color-border)"
              strokeWidth={0.25}
            />
            <text
              x={padL - 4}
              y={y(v)}
              textAnchor="end"
              alignmentBaseline="middle"
              className="fill-[var(--color-fg-muted)] font-mono"
              style={{ fontSize: 8 }}
            >
              {v.toFixed(0)}%
            </text>
          </g>
        ))}
        {/* X-axis dates */}
        {points.map((p, i) => (
          <text
            key={i}
            x={x(i)}
            y={height - 6}
            textAnchor="middle"
            className="fill-[var(--color-fg-muted)] font-mono"
            style={{ fontSize: 8 }}
          >
            {p.date.slice(0, 4)}
          </text>
        ))}
        {/* Lines */}
        <path
          d={buildPath((p) => p.gross)}
          fill="none"
          stroke="var(--color-pos)"
          strokeWidth={1.5}
        />
        <path
          d={buildPath((p) => p.operating)}
          fill="none"
          stroke="var(--color-info)"
          strokeWidth={1.5}
        />
        <path
          d={buildPath((p) => p.net)}
          fill="none"
          stroke="var(--color-warn)"
          strokeWidth={1.5}
        />
        {/* Point dots */}
        {points.map((p, i) => (
          <g key={i}>
            {p.gross != null && (
              <circle cx={x(i)} cy={y(p.gross)} r={2} fill="var(--color-pos)" />
            )}
            {p.operating != null && (
              <circle cx={x(i)} cy={y(p.operating)} r={2} fill="var(--color-info)" />
            )}
            {p.net != null && (
              <circle cx={x(i)} cy={y(p.net)} r={2} fill="var(--color-warn)" />
            )}
          </g>
        ))}
      </svg>
      {/* Latest values table */}
      {points.length > 0 && (
        <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
          <Metric label="Gross" value={points[points.length - 1]?.gross} color="var(--color-pos)" />
          <Metric label="Operating" value={points[points.length - 1]?.operating} color="var(--color-info)" />
          <Metric label="Net" value={points[points.length - 1]?.net} color="var(--color-warn)" />
        </div>
      )}
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }): React.JSX.Element {
  return (
    <div className="flex items-center gap-1">
      <span className="inline-block h-0.5 w-3" style={{ background: color }} />
      <span className="text-[var(--color-fg-muted)]">{label}</span>
    </div>
  )
}

function Metric({
  label,
  value,
  color
}: {
  label: string
  value: number | null | undefined
  color: string
}): React.JSX.Element {
  return (
    <div className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] p-1.5">
      <div className="text-[9px] uppercase" style={{ color }}>
        {label}
      </div>
      <div className="font-mono text-[12px] font-semibold tabular">{fmtPct(value)}</div>
    </div>
  )
}
