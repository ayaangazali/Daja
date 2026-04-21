import { Command } from 'cmdk'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MODULES, SETTINGS_ENTRY } from '../lib/constants'
import { useUIStore } from '../stores/uiStore'
import { cn } from '../lib/cn'

export function CommandPalette(): React.JSX.Element {
  const open = useUIStore((s) => s.paletteOpen)
  const setOpen = useUIStore((s) => s.setPalette)
  const navigate = useNavigate()

  useEffect(() => {
    const h = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(!open)
      }
      if (e.key === 'Escape' && open) setOpen(false)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, setOpen])

  if (!open) return <></>

  const go = (route: string): void => {
    navigate(route)
    setOpen(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-24"
      onClick={() => setOpen(false)}
    >
      <div
        className={cn(
          'w-[560px] rounded-lg border shadow-2xl',
          'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="flex flex-col">
          <Command.Input
            autoFocus
            placeholder="Type a command or search…"
            className={cn(
              'h-12 border-b bg-transparent px-4 text-sm outline-none',
              'border-[var(--color-border)] placeholder:text-[var(--color-fg-muted)]'
            )}
          />
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="p-4 text-center text-xs text-[var(--color-fg-muted)]">
              No results.
            </Command.Empty>
            <Command.Group
              heading="Modules"
              className="text-xs [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[var(--color-fg-muted)]"
            >
              {MODULES.filter((m) => m.enabled).map((m) => (
                <Command.Item
                  key={m.id}
                  value={`${m.name} ${m.route}`}
                  onSelect={() => go(m.route)}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm data-[selected=true]:bg-[var(--color-bg)]"
                >
                  <m.icon className="h-4 w-4 text-[var(--color-fg-muted)]" />
                  <span>{m.name}</span>
                </Command.Item>
              ))}
              <Command.Item
                value="Settings"
                onSelect={() => go(SETTINGS_ENTRY.route)}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm data-[selected=true]:bg-[var(--color-bg)]"
              >
                <SETTINGS_ENTRY.icon className="h-4 w-4 text-[var(--color-fg-muted)]" />
                <span>Settings</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  )
}
