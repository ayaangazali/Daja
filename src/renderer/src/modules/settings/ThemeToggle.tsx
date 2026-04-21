import { Moon, Sun } from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'
import { useSetTheme } from '../../hooks/usePrefs'
import { cn } from '../../lib/cn'

export function ThemeToggle(): React.JSX.Element {
  const theme = useUIStore((s) => s.theme)
  const setTheme = useUIStore((s) => s.setTheme)
  const persist = useSetTheme()

  const toggle = (): void => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    persist.mutate(next)
  }

  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold">Appearance</h2>
      <div
        className={cn(
          'mt-3 flex items-center gap-3 rounded-md border px-3 py-2',
          'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
        )}
      >
        <div className="flex-1 text-xs">
          Theme: <span className="font-mono">{theme}</span>
        </div>
        <button
          onClick={toggle}
          className="flex items-center gap-1 rounded border border-[var(--color-border)] px-2 py-1 text-xs hover:bg-[var(--color-bg)]"
        >
          {theme === 'dark' ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
          Toggle
        </button>
      </div>
    </section>
  )
}
