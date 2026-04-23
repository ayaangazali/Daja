import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'
import { cn } from '../lib/cn'

interface Props {
  /** Short description of what's missing. */
  title: string
  /** Optional hint on next action (e.g., "Log a trade to see metrics"). */
  hint?: string
  /** Optional call-to-action button or link. */
  action?: ReactNode
  /** Icon shown above the title. Defaults to Inbox. */
  icon?: LucideIcon
  /** Compact variant for small inline contexts. */
  compact?: boolean
  /** Extra className for the outer container. */
  className?: string
}

/**
 * Shared empty-state component. Use everywhere instead of ad-hoc "No data" divs.
 *
 * Examples:
 *   <EmptyState title="No open positions" hint="Log a trade to see metrics." />
 *   <EmptyState title="No earnings this week" icon={Calendar} compact />
 */
export function EmptyState({
  title,
  hint,
  action,
  icon,
  compact,
  className
}: Props): React.JSX.Element {
  const Icon = icon ?? Inbox
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        'text-[var(--color-fg-muted)]',
        compact ? 'gap-1.5 py-3' : 'gap-2 py-8',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <Icon className={compact ? 'h-4 w-4 opacity-60' : 'h-8 w-8 opacity-60'} aria-hidden="true" />
      <div className={compact ? 'text-[11px] font-medium' : 'text-[13px] font-medium'}>{title}</div>
      {hint && <div className={compact ? 'text-[10px]' : 'text-[11px] max-w-sm'}>{hint}</div>}
      {action && <div className={compact ? 'mt-1' : 'mt-2'}>{action}</div>}
    </div>
  )
}
