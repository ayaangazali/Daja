/**
 * Minimal reusable SVG chart primitives — no external deps.
 * Used across technical indicator panels + financial charts.
 */

export interface SeriesSpec {
  values: (number | null)[]
  color: string
  strokeWidth?: number
  label?: string
  dashed?: boolean
}

export interface BarSpec {
  values: (number | null)[]
  colorPos?: string
  colorNeg?: string
  label?: string
}

function pathFrom(
  values: (number | null)[],
  x: (i: number) => number,
  y: (v: number) => number
): string {
  const parts: string[] = []
  let started = false
  for (let i = 0; i < values.length; i++) {
    const v = values[i]
    if (v == null || !Number.isFinite(v)) {
      started = false
      continue
    }
    parts.push(`${started ? 'L' : 'M'}${x(i).toFixed(2)},${y(v).toFixed(2)}`)
    started = true
  }
  return parts.join(' ')
}

/** Multi-line chart with common domain (x = index, y = auto-fit from all series). */
export function MultiLineChart({
  series,
  height = 140,
  yPad = 4,
  yLabels = 3,
  horizontalLines = [],
  title
}: {
  series: SeriesSpec[]
  height?: number
  yPad?: number
  yLabels?: number
  horizontalLines?: { y: number; color: string; label?: string; dashed?: boolean }[]
  title?: string
}): React.JSX.Element {
  const width = 600
  const padL = 36
  const padB = 18
  const padT = 10
  const padR = 8
  const plotW = width - padL - padR
  const plotH = height - padT - padB

  const flat: number[] = []
  for (const s of series) {
    for (const v of s.values) if (v != null && Number.isFinite(v)) flat.push(v)
  }
  for (const hl of horizontalLines) flat.push(hl.y)
  if (flat.length === 0) {
    return <div className="p-2 text-[10px] text-[var(--color-fg-muted)]">No data.</div>
  }
  const yMin = Math.min(...flat) - yPad
  const yMax = Math.max(...flat) + yPad
  const yRange = yMax - yMin || 1
  const maxLen = Math.max(...series.map((s) => s.values.length))

  const x = (i: number): number => padL + (i / Math.max(1, maxLen - 1)) * plotW
  const y = (v: number): number => padT + plotH - ((v - yMin) / yRange) * plotH

  const yTicks = Array.from({ length: yLabels }, (_, i) => yMin + (i * yRange) / (yLabels - 1))

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      {title && (
        <text
          x={padL}
          y={padT - 2}
          className="fill-[var(--color-fg-muted)] font-mono"
          style={{ fontSize: 9 }}
        >
          {title}
        </text>
      )}
      {yTicks.map((v) => (
        <g key={`yt-${v}`}>
          <line
            x1={padL}
            x2={width - padR}
            y1={y(v)}
            y2={y(v)}
            stroke="var(--color-border)"
            strokeWidth={0.25}
          />
          <text
            x={padL - 2}
            y={y(v)}
            textAnchor="end"
            alignmentBaseline="middle"
            className="fill-[var(--color-fg-muted)] font-mono"
            style={{ fontSize: 8 }}
          >
            {v.toFixed(1)}
          </text>
        </g>
      ))}
      {horizontalLines.map((hl) => (
        <g key={`hl-${hl.y}-${hl.color}`}>
          <line
            x1={padL}
            x2={width - padR}
            y1={y(hl.y)}
            y2={y(hl.y)}
            stroke={hl.color}
            strokeWidth={0.5}
            strokeDasharray={hl.dashed ? '3 3' : undefined}
            opacity={0.7}
          />
          {hl.label && (
            <text
              x={width - padR - 2}
              y={y(hl.y) - 2}
              textAnchor="end"
              className="fill-[var(--color-fg-muted)] font-mono"
              style={{ fontSize: 8 }}
            >
              {hl.label}
            </text>
          )}
        </g>
      ))}
      {series.map((s, si) => (
        <path
          key={`s-${si}`}
          d={pathFrom(s.values, x, y)}
          fill="none"
          stroke={s.color}
          strokeWidth={s.strokeWidth ?? 1.2}
          strokeDasharray={s.dashed ? '3 3' : undefined}
        />
      ))}
    </svg>
  )
}

/** Histogram/bar chart around zero axis. */
export function ZeroBarChart({
  values,
  height = 60,
  colorPos = 'var(--color-pos)',
  colorNeg = 'var(--color-neg)',
  title
}: {
  values: (number | null)[]
  height?: number
  colorPos?: string
  colorNeg?: string
  title?: string
}): React.JSX.Element {
  const width = 600
  const padL = 36
  const padR = 8
  const padT = 8
  const padB = 10
  const plotW = width - padL - padR
  const plotH = height - padT - padB

  const flat = values.filter((v): v is number => v != null && Number.isFinite(v))
  if (flat.length === 0) {
    return <div className="p-2 text-[10px] text-[var(--color-fg-muted)]">No data.</div>
  }
  const maxAbs = Math.max(...flat.map(Math.abs)) || 1
  const step = plotW / Math.max(1, values.length)
  const zeroY = padT + plotH / 2

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      {title && (
        <text
          x={padL}
          y={padT - 1}
          className="fill-[var(--color-fg-muted)] font-mono"
          style={{ fontSize: 9 }}
        >
          {title}
        </text>
      )}
      <line
        x1={padL}
        x2={width - padR}
        y1={zeroY}
        y2={zeroY}
        stroke="var(--color-border)"
        strokeWidth={0.5}
      />
      {values.map((v, i) => {
        if (v == null || !Number.isFinite(v)) return null
        const h = (Math.abs(v) / maxAbs) * (plotH / 2)
        const barY = v >= 0 ? zeroY - h : zeroY
        return (
          <rect
            key={`b-${i}`}
            x={padL + i * step}
            y={barY}
            width={Math.max(1, step * 0.8)}
            height={h}
            fill={v >= 0 ? colorPos : colorNeg}
            opacity={0.8}
          />
        )
      })}
    </svg>
  )
}

/** Simple bar chart (all positive, bottom-up). */
export function BarChart({
  values,
  height = 60,
  color = 'var(--color-info)',
  title
}: {
  values: (number | null)[]
  height?: number
  color?: string
  title?: string
}): React.JSX.Element {
  const width = 600
  const padL = 36
  const padR = 8
  const padT = 8
  const padB = 10
  const plotW = width - padL - padR
  const plotH = height - padT - padB

  const flat = values.filter((v): v is number => v != null && Number.isFinite(v))
  if (flat.length === 0) {
    return <div className="p-2 text-[10px] text-[var(--color-fg-muted)]">No data.</div>
  }
  const max = Math.max(...flat) || 1
  const step = plotW / Math.max(1, values.length)

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      {title && (
        <text
          x={padL}
          y={padT - 1}
          className="fill-[var(--color-fg-muted)] font-mono"
          style={{ fontSize: 9 }}
        >
          {title}
        </text>
      )}
      {values.map((v, i) => {
        if (v == null || !Number.isFinite(v)) return null
        const h = (v / max) * plotH
        return (
          <rect
            key={`b-${i}`}
            x={padL + i * step}
            y={padT + plotH - h}
            width={Math.max(1, step * 0.8)}
            height={h}
            fill={color}
            opacity={0.75}
          />
        )
      })}
    </svg>
  )
}
