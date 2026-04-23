import { useState, type ReactNode } from 'react'
import { GLOSSARY } from '../lib/copy'

/**
 * Hover/focus-visible tooltip with keyboard accessibility.
 * Use the `term` variant to show a glossary definition.
 * The wrapped content gains a dotted underline to hint tooltip availability.
 */
interface TooltipProps {
  /** Pre-defined glossary term from lib/copy GLOSSARY. Overrides `text`. */
  term?: string
  /** Custom tooltip text. */
  text?: string
  children: ReactNode
  className?: string
}

export function Tooltip({ term, text, children, className }: TooltipProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const body = term ? GLOSSARY[term] : text
  if (!body) return <>{children}</>
  return (
    <span
      className={`relative inline-flex cursor-help underline decoration-dotted decoration-[var(--color-fg-muted)] underline-offset-2 ${className ?? ''}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      tabIndex={0}
      role="button"
      aria-describedby={open ? 'tooltip-body' : undefined}
    >
      {children}
      {open && (
        <span
          id="tooltip-body"
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-2 text-[11px] leading-snug text-[var(--color-fg)] shadow-lg"
        >
          {body}
        </span>
      )}
    </span>
  )
}
