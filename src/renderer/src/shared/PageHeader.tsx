import { ChevronLeft, LayoutGrid } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '../lib/cn'

interface Props {
  title: string
  subtitle?: string
  back?: string // optional route to navigate back to
  actions?: React.ReactNode
  className?: string
}

/**
 * Consistent Claude-style page header — serif title, muted subtitle,
 * optional back button (Launchpad icon if no `back` provided).
 */
export function PageHeader({ title, subtitle, back, actions, className }: Props): React.JSX.Element {
  const navigate = useNavigate()
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 border-b border-[var(--color-border)] px-5 py-4',
        'bg-[var(--color-bg-elev)]',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={() => (back ? navigate(back) : navigate('/'))}
          title={back ? 'Back' : 'Launchpad (⌘H)'}
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--color-fg-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-fg)]"
        >
          {back ? <ChevronLeft className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
        </button>
        <div>
          <h1 className="serif text-[22px] font-semibold leading-tight tracking-tight">{title}</h1>
          {subtitle && (
            <div className="mt-0.5 text-[12px] text-[var(--color-fg-muted)]">{subtitle}</div>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
