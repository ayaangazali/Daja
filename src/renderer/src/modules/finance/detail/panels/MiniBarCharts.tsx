import { useState } from 'react'
import type { Fundamentals } from '../../../../hooks/useFundamentals'
import { cn } from '../../../../lib/cn'
import { fmtLargeNum } from '../../../../lib/format'

interface MiniSeries {
  title: string
  annual: { date: string; value: number | null }[]
  quarterly: { date: string; value: number | null }[]
  fmt?: (v: number) => string
}

function Bars({
  data,
  fmt
}: {
  data: { date: string; value: number | null }[]
  fmt: (v: number) => string
}): React.JSX.Element {
  const values = data.map((d) => d.value ?? 0)
  const max = Math.max(...values.map((v) => Math.abs(v)), 1)
  return (
    <svg viewBox={`0 0 ${data.length * 12 + 4} 60`} width="100%" height="60">
      {data.map((d, i) => {
        const v = d.value ?? 0
        const h = (Math.abs(v) / max) * 50
        const color = v >= 0 ? '#1d9e75' : '#e24b4a'
        return (
          <g key={i} transform={`translate(${i * 12 + 2}, 0)`}>
            <rect x="0" y={55 - h} width="8" height={h} fill={color} />
            <title>{`${d.date}: ${fmt(v)}`}</title>
          </g>
        )
      })}
    </svg>
  )
}

function Mini({ series }: { series: MiniSeries }): React.JSX.Element {
  const [mode, setMode] = useState<'annual' | 'quarterly'>('annual')
  const data = mode === 'annual' ? series.annual : series.quarterly
  const fmt = series.fmt ?? fmtLargeNum
  const latest = data[data.length - 1]?.value
  return (
    <div
      className={cn(
        'rounded-md border p-2',
        'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          {series.title}
        </div>
        <div className="flex items-center gap-0.5">
          {(['annual', 'quarterly'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                'rounded px-1 py-0.5 text-[9px]',
                mode === m
                  ? 'bg-[var(--color-bg)] text-[var(--color-fg)]'
                  : 'text-[var(--color-fg-muted)]'
              )}
            >
              {m === 'annual' ? 'A' : 'Q'}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-1 font-mono text-sm font-semibold tabular">
        {latest != null ? fmt(latest) : '—'}
      </div>
      {data.length > 0 ? (
        <Bars data={data} fmt={fmt} />
      ) : (
        <div className="py-4 text-center text-[10px] text-[var(--color-fg-muted)]">No data</div>
      )}
    </div>
  )
}

export function MiniBarCharts({ data }: { data: Fundamentals }): React.JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
      <Mini series={{ title: 'EPS', annual: data.epsAnnual, quarterly: data.epsQuarterly }} />
      <Mini
        series={{
          title: 'Revenue',
          annual: data.revenueAnnual,
          quarterly: data.revenueQuarterly
        }}
      />
      <Mini
        series={{
          title: 'Earnings Surprise %',
          annual: data.earningsHistory.map((h) => ({
            date: h.quarter,
            value: h.surprisePercent != null ? h.surprisePercent * 100 : null
          })),
          quarterly: data.earningsHistory.map((h) => ({
            date: h.quarter,
            value: h.surprisePercent != null ? h.surprisePercent * 100 : null
          })),
          fmt: (v) => `${v > 0 ? '+' : ''}${v.toFixed(2)}%`
        }}
      />
    </div>
  )
}
