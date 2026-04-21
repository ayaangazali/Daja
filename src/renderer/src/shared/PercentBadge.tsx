import { fmtPct, signColor } from '../lib/format'
import { cn } from '../lib/cn'

export function PercentBadge({
  value,
  className
}: {
  value: number | null | undefined
  className?: string
}): React.JSX.Element {
  return (
    <span className={cn('tabular text-[11px] font-medium', signColor(value), className)}>
      {fmtPct(value)}
    </span>
  )
}
