import { Trash2 } from 'lucide-react'
import { useMemo } from 'react'
import { useHealthLogs, useRemoveHealthLog } from '../../hooks/useHealth'
import { Sparkline } from '../../shared/Sparkline'
import { cn } from '../../lib/cn'

export function HealthTimeline(): React.JSX.Element {
  const { data: logs = [] } = useHealthLogs()
  const rem = useRemoveHealthLog()

  const series = useMemo(() => {
    const ordered = [...logs].reverse()
    return {
      mood: ordered.map((l) => l.mood ?? 0),
      energy: ordered.map((l) => l.energy ?? 0),
      sleep: ordered.map((l) => l.sleep_hours ?? 0),
      weight: ordered.map((l) => l.weight ?? 0).filter((v) => v > 0),
      hr: ordered.map((l) => l.heart_rate ?? 0).filter((v) => v > 0)
    }
  }, [logs])

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Chart label="Mood" points={series.mood} />
        <Chart label="Energy" points={series.energy} />
        <Chart label="Sleep (h)" points={series.sleep} />
        <Chart label="Weight" points={series.weight} />
        <Chart label="Heart Rate" points={series.hr} />
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
                {l.weight != null && <span>{l.weight} {l.weight_unit}</span>}
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

function Chart({ label, points }: { label: string; points: number[] }): React.JSX.Element {
  const last = points[points.length - 1]
  return (
    <div
      className={cn(
        'rounded-md border p-3',
        'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
      )}
    >
      <div className="text-[10px] text-[var(--color-fg-muted)]">{label}</div>
      <div className="font-mono text-base font-semibold tabular">
        {last != null ? last.toFixed(last % 1 === 0 ? 0 : 1) : '—'}
      </div>
      <Sparkline points={points} width={120} height={24} className="w-full" />
    </div>
  )
}
