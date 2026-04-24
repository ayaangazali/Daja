import { Trash2, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { useMemo } from 'react'
import { useHealthLogs, useRemoveHealthLog } from '../../hooks/useHealth'
import { Sparkline } from '../../shared/Sparkline'
import { cn } from '../../lib/cn'

interface TrendStats {
  points: number[]
  current: number | null
  avg7: number | null
  avg30: number | null
  direction: 'up' | 'down' | 'flat' | 'n/a'
}

function computeTrend(raw: (number | null)[]): TrendStats {
  const points = raw.filter((v): v is number => v != null && v > 0 && Number.isFinite(v))
  if (points.length === 0) {
    return { points: [], current: null, avg7: null, avg30: null, direction: 'n/a' }
  }
  const current = points[points.length - 1]
  const avg7 =
    points.length >= 2
      ? points.slice(-7).reduce((s, v) => s + v, 0) / Math.min(7, points.length)
      : current
  const avg30 =
    points.length >= 2
      ? points.slice(-30).reduce((s, v) => s + v, 0) / Math.min(30, points.length)
      : current
  let direction: TrendStats['direction'] = 'flat'
  if (avg7 != null && avg30 != null) {
    const delta = (avg7 - avg30) / avg30
    if (delta > 0.02) direction = 'up'
    else if (delta < -0.02) direction = 'down'
  }
  return { points, current, avg7, avg30, direction }
}

export function HealthTimeline(): React.JSX.Element {
  const { data: logs = [] } = useHealthLogs()
  const rem = useRemoveHealthLog()

  const series = useMemo(() => {
    const ordered = [...logs].reverse()
    return {
      mood: computeTrend(ordered.map((l) => l.mood ?? null)),
      energy: computeTrend(ordered.map((l) => l.energy ?? null)),
      sleep: computeTrend(ordered.map((l) => l.sleep_hours ?? null)),
      weight: computeTrend(ordered.map((l) => l.weight ?? null)),
      hr: computeTrend(ordered.map((l) => l.heart_rate ?? null))
    }
  }, [logs])

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Chart label="Mood" stats={series.mood} />
        <Chart label="Energy" stats={series.energy} />
        <Chart label="Sleep (h)" stats={series.sleep} />
        <Chart label="Weight" stats={series.weight} />
        <Chart label="Heart Rate" stats={series.hr} />
      </div>
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)]">
        <div className="border-b border-[var(--color-border)] px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          Recent logs
        </div>
        {logs.length === 0 && (
          <div className="p-4 text-center text-[11px] text-[var(--color-fg-muted)]">
            No entries yet.
          </div>
        )}
        {logs.slice(0, 30).map((l) => (
          <div
            key={l.id}
            className="group flex items-center justify-between border-b border-[var(--color-border)] px-3 py-2 text-[11px] last:border-0"
          >
            <div className="flex items-center gap-3">
              <span className="w-20 font-mono tabular text-[var(--color-fg-muted)]">{l.date}</span>
              {l.symptoms && <span className="truncate max-w-sm">{l.symptoms}</span>}
              <div className="flex items-center gap-2 text-[10px] text-[var(--color-fg-muted)]">
                {l.mood != null && <span>M{l.mood}</span>}
                {l.energy != null && <span>E{l.energy}</span>}
                {l.sleep_hours != null && <span>{l.sleep_hours}h</span>}
                {l.heart_rate != null && <span>HR {l.heart_rate}</span>}
                {l.blood_pressure_systolic != null && (
                  <span>
                    BP {l.blood_pressure_systolic}/{l.blood_pressure_diastolic}
                  </span>
                )}
                {l.weight != null && (
                  <span>
                    {l.weight} {l.weight_unit}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => rem.mutate(l.id)}
              className="opacity-0 transition-opacity group-hover:opacity-100"
            >
              <Trash2 className="h-3 w-3 text-[var(--color-fg-muted)] hover:text-[var(--color-neg)]" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function Chart({ label, stats }: { label: string; stats: TrendStats }): React.JSX.Element {
  const fmt = (v: number | null): string => {
    if (v == null || !Number.isFinite(v)) return '—'
    return v.toFixed(v % 1 === 0 ? 0 : 1)
  }
  const trendIcon =
    stats.direction === 'up' ? (
      <TrendingUp className="h-2.5 w-2.5" />
    ) : stats.direction === 'down' ? (
      <TrendingDown className="h-2.5 w-2.5" />
    ) : stats.direction === 'flat' ? (
      <Minus className="h-2.5 w-2.5" />
    ) : null
  // Tone is contextual — for weight, 'up' often isn't a win, but we keep it neutral here.
  const trendClass =
    stats.direction === 'up'
      ? 'text-[var(--color-pos)]'
      : stats.direction === 'down'
        ? 'text-[var(--color-neg)]'
        : 'text-[var(--color-fg-muted)]'
  return (
    <div
      className={cn(
        'rounded-md border p-3',
        'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
      )}
      title={
        stats.direction !== 'n/a'
          ? `7-day avg ${fmt(stats.avg7)} vs 30-day avg ${fmt(stats.avg30)} · direction: ${stats.direction}`
          : 'Not enough data yet'
      }
    >
      <div className="flex items-center justify-between text-[10px] text-[var(--color-fg-muted)]">
        <span>{label}</span>
        {trendIcon && <span className={trendClass}>{trendIcon}</span>}
      </div>
      <div className="font-mono text-base font-semibold tabular">{fmt(stats.current)}</div>
      <Sparkline points={stats.points} width={120} height={24} className="w-full" />
      <div className="mt-1 flex items-center justify-between text-[9px] text-[var(--color-fg-muted)]">
        <span>7d {fmt(stats.avg7)}</span>
        <span>30d {fmt(stats.avg30)}</span>
      </div>
    </div>
  )
}
