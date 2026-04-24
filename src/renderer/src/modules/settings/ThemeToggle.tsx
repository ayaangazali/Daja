import { useEffect } from 'react'
import { Moon, Sun, Monitor } from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'
import { useSetTheme } from '../../hooks/usePrefs'
import { cn } from '../../lib/cn'

type ThemeChoice = 'dark' | 'light' | 'system'

function resolveSystemTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeToggle(): React.JSX.Element {
  const theme = useUIStore((s) => s.theme)
  const setTheme = useUIStore((s) => s.setTheme)
  const persist = useSetTheme()

  // Read the saved choice out of localStorage so we remember 'system' vs
  // 'dark'/'light'. The uiStore only tracks resolved 'dark'/'light'.
  const saved =
    (typeof localStorage !== 'undefined'
      ? (localStorage.getItem('daja-theme-choice') as ThemeChoice | null)
      : null) ?? 'dark'

  // When choice is 'system', follow OS preference changes live.
  useEffect(() => {
    if (saved !== 'system' || typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = (): void => {
      const next: 'dark' | 'light' = mql.matches ? 'dark' : 'light'
      setTheme(next)
      persist.mutate(next)
    }
    apply()
    mql.addEventListener('change', apply)
    return () => mql.removeEventListener('change', apply)
  }, [saved, setTheme, persist])

  const choose = (c: ThemeChoice): void => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('daja-theme-choice', c)
    }
    const resolved = c === 'system' ? resolveSystemTheme() : c
    setTheme(resolved)
    persist.mutate(resolved)
    // Force re-read on next render
    window.dispatchEvent(new Event('theme-choice-changed'))
  }

  return (
    <section>
      <h2 className="text-sm font-semibold">Appearance</h2>
      <p className="mt-0.5 text-xs text-[var(--color-fg-muted)]">
        Theme preference. 'System' follows your OS light/dark setting automatically.
      </p>
      <div
        className={cn(
          'mt-3 flex items-center gap-2 rounded-md border px-3 py-2',
          'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
        )}
      >
        <div className="flex-1 text-xs">
          Current: <span className="font-mono">{theme}</span>
          {saved === 'system' && (
            <span className="ml-1 text-[var(--color-fg-muted)]">(following system)</span>
          )}
        </div>
        <div className="flex overflow-hidden rounded border border-[var(--color-border)]">
          {(
            [
              { id: 'light', label: 'Light', icon: Sun },
              { id: 'dark', label: 'Dark', icon: Moon },
              { id: 'system', label: 'System', icon: Monitor }
            ] as const
          ).map((opt) => {
            const Icon = opt.icon
            const active = saved === opt.id
            return (
              <button
                key={opt.id}
                onClick={() => choose(opt.id)}
                aria-pressed={active}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 text-[11px]',
                  active
                    ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                    : 'text-[var(--color-fg-muted)] hover:bg-[var(--color-bg)]'
                )}
              >
                <Icon className="h-3 w-3" />
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
