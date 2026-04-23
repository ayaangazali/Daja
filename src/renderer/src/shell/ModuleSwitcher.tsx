import { NavLink } from 'react-router-dom'
import { LayoutGrid } from 'lucide-react'
import { MODULES } from '../lib/constants'
import { cn } from '../lib/cn'

export function ModuleSwitcher(): React.JSX.Element {
  return (
    <nav
      className={cn(
        'flex w-14 shrink-0 flex-col items-center gap-1 border-r py-3',
        'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
      )}
    >
      <NavLink
        to="/"
        end
        title="Launchpad (⌘H)"
        className={({ isActive }) =>
          cn(
            'mb-1 flex h-10 w-10 items-center justify-center rounded-md transition-colors',
            isActive
              ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
              : 'text-[var(--color-fg-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-fg)]'
          )
        }
      >
        <LayoutGrid className="h-5 w-5" />
      </NavLink>
      <div className="my-1 h-px w-6 bg-[var(--color-border)]" />
      {MODULES.map((m) => {
        const Icon = m.icon
        return (
          <NavLink
            key={m.id}
            to={m.enabled ? m.route : '#'}
            onClick={(e) => {
              if (!m.enabled) e.preventDefault()
            }}
            title={m.enabled ? m.name : `${m.name} — Coming Soon`}
            className={({ isActive }) =>
              cn(
                'flex h-10 w-10 items-center justify-center rounded-md transition-colors',
                m.enabled
                  ? 'text-[var(--color-fg-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-fg)]'
                  : 'cursor-not-allowed text-[var(--color-fg-muted)]/40',
                isActive && m.enabled && 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
              )
            }
          >
            <Icon className="h-5 w-5" />
          </NavLink>
        )
      })}
    </nav>
  )
}
