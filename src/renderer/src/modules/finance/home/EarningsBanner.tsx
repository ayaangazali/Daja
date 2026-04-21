import { Calendar } from 'lucide-react'
import { cn } from '../../../lib/cn'

export function EarningsBanner(): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex items-center gap-2 border-b px-3 py-1.5 text-[11px]',
        'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
      )}
    >
      <Calendar className="h-3 w-3 text-[var(--color-warn)]" />
      <div className="text-[var(--color-fg-muted)]">
        <span className="text-[var(--color-fg)]">Upcoming earnings</span> — wire to earnings API in
        Phase 2. Placeholder.
      </div>
    </div>
  )
}
