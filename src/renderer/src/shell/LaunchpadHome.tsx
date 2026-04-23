import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LineChart,
  Briefcase,
  Sparkles,
  SquareActivity,
  FileText,
  HeartPulse,
  MessageSquare,
  Settings,
  BookOpen,
  GitCompareArrows,
  ListFilter,
  Calculator,
  Newspaper,
  FlaskConical,
  Search,
  Command,
  Moon,
  Sun,
  Settings2
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../lib/cn'
import { useUIStore } from '../stores/uiStore'
import { useSetTheme } from '../hooks/usePrefs'
import { useRecentTickers } from '../stores/recentTickersStore'
import { MarketTickerStrip } from './MarketTickerStrip'

type Hue = 'accent' | 'blue' | 'green' | 'amber' | 'rose' | 'violet' | 'teal' | 'slate'

interface AppTile {
  id: string
  name: string
  description: string
  route: string
  icon: LucideIcon
  hue: Hue
  group: 'finance' | 'tools' | 'system'
}

const APPS: AppTile[] = [
  {
    id: 'market',
    name: 'Market',
    description: 'Indices · movers · sector rotation',
    route: '/finance',
    icon: LineChart,
    hue: 'blue',
    group: 'finance'
  },
  {
    id: 'portfolio',
    name: 'Portfolio',
    description: 'Positions · exit signals · risk',
    route: '/finance/portfolio',
    icon: Briefcase,
    hue: 'accent',
    group: 'finance'
  },
  {
    id: 'briefing',
    name: 'Briefing',
    description: 'AI daily market summary',
    route: '/finance/briefing',
    icon: Newspaper,
    hue: 'amber',
    group: 'finance'
  },
  {
    id: 'screener',
    name: 'Screener',
    description: 'Filter stocks by fundamentals',
    route: '/finance/screener',
    icon: ListFilter,
    hue: 'teal',
    group: 'finance'
  },
  {
    id: 'compare',
    name: 'Compare',
    description: 'Side-by-side ticker analysis',
    route: '/finance/compare',
    icon: GitCompareArrows,
    hue: 'violet',
    group: 'finance'
  },
  {
    id: 'paper',
    name: 'Paper Trading',
    description: 'Practice orders, no capital risk',
    route: '/finance/paper',
    icon: FlaskConical,
    hue: 'green',
    group: 'finance'
  },
  {
    id: 'journal',
    name: 'Journal',
    description: 'Log trades + learn from history',
    route: '/finance/journal',
    icon: BookOpen,
    hue: 'rose',
    group: 'finance'
  },
  {
    id: 'strategies',
    name: 'Strategies',
    description: 'Build + backtest rules',
    route: '/finance/strategies',
    icon: Sparkles,
    hue: 'accent',
    group: 'finance'
  },
  {
    id: 'risk',
    name: 'Risk Calc',
    description: 'Position sizing · Kelly · R-multiple',
    route: '/finance/risk',
    icon: Calculator,
    hue: 'slate',
    group: 'finance'
  },
  {
    id: 'sports',
    name: 'Sports',
    description: 'NFL · NBA · EPL · MLB scores',
    route: '/sports',
    icon: SquareActivity,
    hue: 'green',
    group: 'tools'
  },
  {
    id: 'pdf',
    name: 'PDF Tools',
    description: 'Merge · split · info',
    route: '/pdf',
    icon: FileText,
    hue: 'rose',
    group: 'tools'
  },
  {
    id: 'health',
    name: 'Health',
    description: 'Workouts · sleep · weight log',
    route: '/health',
    icon: HeartPulse,
    hue: 'rose',
    group: 'tools'
  },
  {
    id: 'assistant',
    name: 'Assistant',
    description: 'AI chat across your data',
    route: '/assistant',
    icon: MessageSquare,
    hue: 'violet',
    group: 'tools'
  },
  {
    id: 'quicksetup',
    name: 'Quick setup',
    description: 'One API key · enables every AI feature',
    route: '/quick-setup',
    icon: Sparkles,
    hue: 'accent',
    group: 'system'
  },
  {
    id: 'settings',
    name: 'Settings',
    description: 'API keys · theme · AI providers',
    route: '/settings',
    icon: Settings,
    hue: 'slate',
    group: 'system'
  }
]

const RECENT_STORAGE_KEY = 'daja.launchpad.recent'
const MAX_RECENT = 4

export function LaunchpadHome(): React.JSX.Element {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [focusIdx, setFocusIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const setPalette = useUIStore((s) => s.setPalette)
  const theme = useUIStore((s) => s.theme)
  const setLocalTheme = useUIStore((s) => s.setTheme)
  const setThemePref = useSetTheme()
  const flipTheme = (): void => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setLocalTheme(next)
    setThemePref.mutate(next)
  }

  const [recent, setRecent] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(RECENT_STORAGE_KEY)
      return raw ? (JSON.parse(raw) as string[]) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return APPS
    return APPS.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q)
    )
  }, [query])

  const orderedApps = useMemo(() => {
    if (query) return filtered
    // Without query: put recents first (in order), then the rest preserving group order
    const recentApps = recent
      .map((id) => APPS.find((a) => a.id === id))
      .filter((a): a is AppTile => !!a)
    const rest = APPS.filter((a) => !recent.includes(a.id))
    return [...recentApps, ...rest]
  }, [filtered, query, recent])

  const launch = (app: AppTile): void => {
    setRecent((prev) => {
      const next = [app.id, ...prev.filter((id) => id !== app.id)].slice(0, MAX_RECENT)
      try {
        localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
    navigate(app.route)
  }

  useEffect(() => {
    const h = (e: KeyboardEvent): void => {
      // Bail if focus is in a form control so we don't steal typing.
      const el = document.activeElement as HTMLElement | null
      const tag = el?.tagName.toLowerCase()
      const inForm = tag === 'input' || tag === 'textarea' || el?.isContentEditable === true
      if (e.key === 'Escape') {
        // Escape clears the search + returns focus to the search input.
        if (query) {
          e.preventDefault()
          setQuery('')
          setFocusIdx(0)
          inputRef.current?.focus()
        } else if (!inForm) {
          // No active search — Escape returns focus to search field.
          e.preventDefault()
          inputRef.current?.focus()
        }
        return
      }
      if (inForm) return // don't handle arrow/enter when typing
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        setFocusIdx((i) => Math.min(i + 1, orderedApps.length - 1))
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setFocusIdx((i) => Math.max(i - 1, 0))
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusIdx((i) => Math.min(i + 4, orderedApps.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusIdx((i) => Math.max(i - 4, 0))
      } else if (e.key === 'Enter') {
        const app = orderedApps[focusIdx]
        if (app) launch(app)
      } else if (e.key === 'Home') {
        e.preventDefault()
        setFocusIdx(0)
      } else if (e.key === 'End') {
        e.preventDefault()
        setFocusIdx(orderedApps.length - 1)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [orderedApps, focusIdx, query])

  useEffect(() => {
    if (focusIdx >= orderedApps.length) setFocusIdx(0)
  }, [orderedApps.length, focusIdx])

  return (
    <div className="launchpad-bg relative flex h-full flex-col overflow-auto">
      {/* Floating top-right controls */}
      <div className="absolute right-4 top-4 z-10 flex items-center gap-1">
        <button
          onClick={flipTheme}
          title="Toggle theme"
          aria-label={`Toggle theme (current: ${theme})`}
          className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elev)]/70 p-2 text-[var(--color-fg-muted)] backdrop-blur hover:text-[var(--color-fg)]"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <button
          onClick={() => navigate('/settings')}
          title="Settings"
          aria-label="Open settings"
          className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elev)]/70 p-2 text-[var(--color-fg-muted)] backdrop-blur hover:text-[var(--color-fg)]"
        >
          <Settings2 className="h-4 w-4" />
        </button>
      </div>
      <div className="mx-auto flex w-full max-w-5xl flex-col px-6 pt-8 pb-14">
        {/* Hero */}
        <LaunchpadHero />

        {/* Live market strip */}
        <MarketTickerStrip />

        {/* Search */}
        <div className="mx-auto mb-8 w-full max-w-md">
          <div className="flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-4 py-2.5 shadow-sm focus-within:border-[var(--color-accent)]">
            <Search className="h-4 w-4 text-[var(--color-fg-muted)]" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setFocusIdx(0)
              }}
              placeholder="Search apps…"
              className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-[var(--color-fg-muted)]"
            />
            <button
              onClick={() => setPalette(true)}
              title="Open command palette (⌘K)"
              className="flex items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-0.5 text-[10px] font-mono text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
            >
              <Command className="h-3 w-3" /> K
            </button>
          </div>
        </div>

        {/* Recent tickers */}
        {!query && <RecentTickersRow />}

        {/* Grid */}
        {orderedApps.length === 0 ? (
          <div className="mt-16 text-center text-[13px] text-[var(--color-fg-muted)]">
            No apps match “{query}”.
          </div>
        ) : query ? (
          // Search mode: flat grid, no groupings
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4" role="grid">
            {orderedApps.map((app, i) => (
              <Tile
                key={app.id}
                app={app}
                index={i}
                focused={i === focusIdx}
                onLaunch={launch}
                onFocus={() => setFocusIdx(i)}
              />
            ))}
          </div>
        ) : (
          // Default: grouped sections
          <div className="space-y-10">
            {(
              [
                { key: 'finance', label: 'Finance' },
                { key: 'tools', label: 'Everyday tools' },
                { key: 'system', label: 'System' }
              ] as const
            ).map((section) => {
              const tiles = orderedApps.filter((a) => a.group === section.key)
              if (tiles.length === 0) return null
              return (
                <div key={section.key}>
                  <div className="serif mb-4 text-[14px] font-medium tracking-tight text-[var(--color-fg-muted)]">
                    {section.label}
                  </div>
                  <div
                    className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                    role="grid"
                  >
                    {tiles.map((app) => {
                      const idx = orderedApps.indexOf(app)
                      return (
                        <Tile
                          key={app.id}
                          app={app}
                          index={idx}
                          focused={idx === focusIdx}
                          onLaunch={launch}
                          onFocus={() => setFocusIdx(idx)}
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-12 flex items-center justify-center gap-4 text-[10px] text-[var(--color-fg-muted)]">
          <span>↑↓←→ navigate</span>
          <span>·</span>
          <span>⏎ launch</span>
          <span>·</span>
          <span>⌘K palette</span>
          <span>·</span>
          <span>? help</span>
        </div>
      </div>
    </div>
  )
}

function LaunchpadHero(): React.JSX.Element {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  // NYSE market status
  const marketStatus = useMemo((): {
    label: string
    tone: 'open' | 'pre' | 'post' | 'closed'
  } => {
    const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
    const day = et.getDay()
    if (day === 0 || day === 6) return { label: 'Market closed · weekend', tone: 'closed' }
    const mins = et.getHours() * 60 + et.getMinutes()
    if (mins >= 9 * 60 + 30 && mins < 16 * 60)
      return { label: 'Market open · NYSE regular hours', tone: 'open' }
    if (mins >= 4 * 60 && mins < 9 * 60 + 30)
      return { label: 'Pre-market · opens 9:30 ET', tone: 'pre' }
    if (mins >= 16 * 60 && mins < 20 * 60)
      return { label: 'After-hours · closes 8 PM ET', tone: 'post' }
    return { label: 'Market closed · overnight', tone: 'closed' }
  }, [now])

  const greeting = useMemo(() => {
    const h = now.getHours()
    if (h < 5) return 'Up late'
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    if (h < 21) return 'Good evening'
    return 'Good night'
  }, [now])

  const date = now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  })

  return (
    <div className="mb-10 text-center">
      <div className="mb-2 text-[12px] font-medium uppercase tracking-[0.16em] text-[var(--color-fg-muted)]">
        {date}
      </div>
      <div className="serif mb-3 text-[48px] font-medium leading-[1.05] tracking-tight text-[var(--color-fg)]">
        {greeting}.
      </div>
      <div className="mx-auto flex max-w-xl items-center justify-center gap-2 text-[13px] text-[var(--color-fg-muted)]">
        <span
          className={cn(
            'inline-block h-2 w-2 rounded-full',
            marketStatus.tone === 'open' &&
              'bg-[var(--color-pos)] shadow-[0_0_6px_var(--color-pos)]',
            marketStatus.tone === 'pre' && 'bg-[var(--color-warn)]',
            marketStatus.tone === 'post' && 'bg-[var(--color-warn)]',
            marketStatus.tone === 'closed' && 'bg-[var(--color-fg-muted)]/50'
          )}
        />
        {marketStatus.label}
      </div>
    </div>
  )
}

function RecentTickersRow(): React.JSX.Element | null {
  const tickers = useRecentTickers((s) => s.tickers)
  const clear = useRecentTickers((s) => s.clear)
  const navigate = useNavigate()
  if (tickers.length === 0) return null
  return (
    <div className="mb-8">
      <div className="mb-2 flex items-center justify-between">
        <div className="serif text-[12px] font-medium tracking-tight text-[var(--color-fg-muted)]">
          Recent tickers
        </div>
        <button
          onClick={clear}
          className="text-[10px] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
        >
          Clear
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {tickers.map((t) => (
          <button
            key={t}
            onClick={() => navigate(`/finance/${t}`)}
            className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-1 font-mono text-[11px] font-semibold tabular text-[var(--color-fg)] transition hover:border-[var(--color-accent)] hover:bg-[var(--color-bg-tint)] hover:text-[var(--color-accent)]"
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  )
}

function Tile({
  app,
  index,
  focused,
  onLaunch,
  onFocus
}: {
  app: AppTile
  index: number
  focused: boolean
  onLaunch: (app: AppTile) => void
  onFocus: () => void
}): React.JSX.Element {
  const Icon = app.icon
  return (
    <div role="gridcell">
      <button
        onClick={() => onLaunch(app)}
        onFocus={onFocus}
        aria-label={`Open ${app.name} — ${app.description}`}
        aria-selected={focused}
        tabIndex={focused ? 0 : -1}
        className={cn(
          'launchpad-tile flex w-full flex-col items-center gap-3 rounded-2xl border p-5 text-center',
          'border-[var(--color-border)] bg-[var(--color-bg-elev)]',
          focused && 'border-[var(--color-accent)]/60 ring-2 ring-[var(--color-accent)]/25'
        )}
        style={{ animationDelay: `${Math.min(index, 20) * 25}ms` }}
      >
        <span
          className="launchpad-icon flex h-16 w-16 items-center justify-center"
          data-hue={app.hue}
          aria-hidden="true"
        >
          <Icon className="h-8 w-8" strokeWidth={1.6} />
        </span>
        <div>
          <div className="text-[13px] font-semibold text-[var(--color-fg)]">{app.name}</div>
          <div className="mt-0.5 text-[11px] leading-snug text-[var(--color-fg-muted)]">
            {app.description}
          </div>
        </div>
      </button>
    </div>
  )
}
