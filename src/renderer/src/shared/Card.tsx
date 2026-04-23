import { cn } from '../lib/cn'

/**
 * Consistent Claude-style card surface.
 * - Rounded 12px (lg)
 * - Warm bg-elev background
 * - 1px hairline border with hover tint option
 */
export function Card({
  title,
  subtitle,
  icon,
  actions,
  children,
  className,
  compact = false
}: {
  title?: string
  subtitle?: string
  icon?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
  compact?: boolean
}): React.JSX.Element {
  return (
    <section
      className={cn(
        'rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev)]',
        compact ? 'p-3' : 'p-4',
        className
      )}
    >
      {(title || actions || icon) && (
        <header className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {icon && <span className="text-[var(--color-fg-muted)]">{icon}</span>}
            <div>
              {title && (
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="mt-0.5 text-[10px] text-[var(--color-fg-muted)]">{subtitle}</p>
              )}
            </div>
          </div>
          {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  )
}

/** Emphasized stat block. */
export function Stat({
  label,
  value,
  tone,
  hint
}: {
  label: string
  value: React.ReactNode
  tone?: 'pos' | 'neg' | 'warn' | 'info'
  hint?: string
}): React.JSX.Element {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-2.5">
      <div className="text-[9px] uppercase tracking-wide text-[var(--color-fg-muted)]">{label}</div>
      <div
        className={cn(
          'mt-0.5 font-mono text-[14px] font-semibold tabular',
          tone === 'pos' && 'text-[var(--color-pos)]',
          tone === 'neg' && 'text-[var(--color-neg)]',
          tone === 'warn' && 'text-[var(--color-warn)]',
          tone === 'info' && 'text-[var(--color-info)]'
        )}
      >
        {value}
      </div>
      {hint && <div className="mt-0.5 text-[9px] text-[var(--color-fg-muted)]">{hint}</div>}
    </div>
  )
}
