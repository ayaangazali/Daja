import { CalendarClock } from 'lucide-react'
import { getUpcomingMacroEvents, daysUntil, type MacroEvent } from '../../../lib/macroCalendar'
import { cn } from '../../../lib/cn'

const CATEGORY_COLOR: Record<MacroEvent['category'], string> = {
  fed: 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]',
  inflation: 'bg-[var(--color-warn)]/15 text-[var(--color-warn)]',
  jobs: 'bg-[var(--color-info)]/15 text-[var(--color-info)]',
  growth: 'bg-[var(--color-pos)]/15 text-[var(--color-pos)]',
  treasury: 'bg-[var(--color-fg-muted)]/15 text-[var(--color-fg-muted)]',
  consumer: 'bg-[var(--color-neg)]/15 text-[var(--color-neg)]'
}

export function MacroCalendar(): React.JSX.Element {
  const events = getUpcomingMacroEvents(new Date(), 90)

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <CalendarClock className="h-3 w-3" /> Macro calendar (next 90 days)
        </div>
        <span className="text-[9px] text-[var(--color-fg-muted)]">Fed · CPI · NFP · GDP</span>
      </div>
      {events.length === 0 ? (
        <div className="py-4 text-center text-[11px] text-[var(--color-fg-muted)]">
          No macro events in window.
        </div>
      ) : (
        <div className="space-y-1">
          {events.map((e) => {
            const d = daysUntil(e)
            return (
              <div
                key={e.date + e.name}
                className="flex items-start gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2"
              >
                <div className="min-w-[56px] text-center">
                  <div className="font-mono text-[16px] font-semibold tabular leading-none text-[var(--color-fg)]">
                    {e.date.slice(8, 10)}
                  </div>
                  <div className="text-[9px] uppercase text-[var(--color-fg-muted)]">
                    {new Date(e.date + 'T00:00:00Z').toLocaleDateString(undefined, {
                      month: 'short'
                    })}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold">{e.name}</span>
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.5 font-mono text-[8px] uppercase',
                        CATEGORY_COLOR[e.category]
                      )}
                    >
                      {e.category}
                    </span>
                    {e.impact === 'high' && (
                      <span className="rounded-full bg-[var(--color-neg)]/10 px-1.5 py-0.5 font-mono text-[8px] text-[var(--color-neg)]">
                        high impact
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[10px] text-[var(--color-fg-muted)]">
                    {e.description}
                  </div>
                </div>
                <div
                  className={cn(
                    'shrink-0 text-right font-mono text-[10px] tabular',
                    d <= 1
                      ? 'text-[var(--color-warn)]'
                      : d <= 7
                        ? 'text-[var(--color-info)]'
                        : 'text-[var(--color-fg-muted)]'
                  )}
                >
                  {d === 0 ? 'today' : d < 0 ? `${-d}d ago` : `in ${d}d`}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
