import { useEffect } from 'react'
import { Moon, Sun, Monitor } from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'
import { useSetTheme } from '../../hooks/usePrefs'
import { useAccent, ACCENTS, type AccentId } from '../../stores/accentStore'
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
      <AccentPicker />
    </section>
  )
}

function AccentPicker(): React.JSX.Element {
  const accent = useAccent((s) => s.accent)
  const setAccent = useAccent((s) => s.setAccent)
  return (
    <div className="mt-4">
      <h3 className="text-[12px] font-semibold">Accent color</h3>
      <p className="mt-0.5 text-[11px] text-[var(--color-fg-muted)]">
        Accent drives buttons, selection rings, and launchpad tile focus. Applies live.
      </p>
      <div
        role="radiogroup"
        aria-label="Accent color"
        className="mt-3 flex flex-wrap items-center gap-2"
      >
        {ACCENTS.map((a) => {
          const active = accent === a.id
          return (
            <button
              key={a.id}
              role="radio"
              aria-checked={active}
              onClick={() => setAccent(a.id as AccentId)}
              className={cn(
                'flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] transition-colors',
                active
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
                  : 'border-[var(--color-border)] hover:bg-[var(--color-bg)]'
              )}
            >
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{
                  background: `linear-gradient(135deg, ${a.main}, ${a.soft})`,
                  boxShadow: `0 0 0 1px ${a.main}33`
                }}
                aria-hidden="true"
              />
              {a.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
