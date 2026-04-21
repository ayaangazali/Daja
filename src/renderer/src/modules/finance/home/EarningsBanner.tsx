import { useQuery } from '@tanstack/react-query'
import { Calendar } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '../../../lib/cn'

interface EarningsEntry {
  ticker: string
  companyName: string | null
  startDateFormatted: string
  startDateType: string | null
  epsEstimate: number | null
  epsActual: number | null
  epsSurprisePercent: number | null
}

export function EarningsBanner(): React.JSX.Element {
  const { data = [] } = useQuery<EarningsEntry[]>({
    queryKey: ['earnings_calendar'],
    queryFn: () => window.nexus.finance.earningsCalendar(7) as Promise<EarningsEntry[]>,
    staleTime: 30 * 60_000
  })

  if (data.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 border-b px-3 py-1.5 text-[11px]',
          'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
        )}
      >
        <Calendar className="h-3 w-3 text-[var(--color-warn)]" />
        <div className="text-[var(--color-fg-muted)]">No upcoming earnings.</div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 overflow-hidden border-b px-3 py-1.5',
        'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
      )}
    >
      <Calendar className="h-3 w-3 shrink-0 text-[var(--color-warn)]" />
      <div className="flex gap-4 overflow-x-auto whitespace-nowrap text-[11px]">
        {data.slice(0, 30).map((e) => (
          <NavLink
            key={e.ticker + e.startDateFormatted}
            to={`/finance/${e.ticker}`}
            className="flex items-center gap-2 hover:text-[var(--color-info)]"
          >
            <span className="font-mono font-semibold">{e.ticker}</span>
            <span className="text-[var(--color-fg-muted)]">
              {e.startDateFormatted}{' '}
              {e.startDateType === 'BMO' ? '· pre' : e.startDateType === 'AMC' ? '· post' : ''}
            </span>
            {e.epsEstimate != null && (
              <span className="text-[10px] text-[var(--color-fg-muted)]">
                est {e.epsEstimate.toFixed(2)}
              </span>
            )}
            {e.epsActual != null && (
              <span
                className={cn(
                  'text-[10px]',
                  (e.epsSurprisePercent ?? 0) >= 0
                    ? 'text-[var(--color-pos)]'
                    : 'text-[var(--color-neg)]'
                )}
              >
                act {e.epsActual.toFixed(2)}
                {e.epsSurprisePercent != null &&
                  ` (${e.epsSurprisePercent > 0 ? '+' : ''}${e.epsSurprisePercent.toFixed(1)}%)`}
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  )
}
