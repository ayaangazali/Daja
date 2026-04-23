import { Command } from 'cmdk'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen,
  Briefcase,
  Compass,
  Download,
  Flag,
  Home,
  LineChart,
  Moon,
  Newspaper,
  Pin,
  Radio,
  RefreshCw,
  Settings,
  Sparkles,
  Sun,
  Swords,
  TrendingUp
} from 'lucide-react'
import { MODULES } from '../lib/constants'
import { useUIStore } from '../stores/uiStore'
import { useSetTheme } from '../hooks/usePrefs'
import { useAddToWatchlist } from '../hooks/useWatchlist'
import { cn } from '../lib/cn'
import type { LucideIcon } from 'lucide-react'

interface PaletteAction {
  id: string
  label: string
  hint?: string
  icon: LucideIcon
  run: () => void | Promise<void>
}

export function CommandPalette(): React.JSX.Element {
  const open = useUIStore((s) => s.paletteOpen)
  const setOpen = useUIStore((s) => s.setPalette)
  const theme = useUIStore((s) => s.theme)
  const setThemeLocal = useUIStore((s) => s.setTheme)
  const alwaysOnTop = useUIStore((s) => s.alwaysOnTop)
  const toggleAOT = useUIStore((s) => s.toggleAlwaysOnTop)
  const setThemePref = useSetTheme()
  const addWatch = useAddToWatchlist()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  useEffect(() => {
    const h = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(!open)
      }
      if (e.key === 'Escape' && open) setOpen(false)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, setOpen])

  const close = (): void => {
    setOpen(false)
    setQuery('')
  }

  const go = (route: string): void => {
    navigate(route)
    close()
  }

  const navActions: PaletteAction[] = [
    { id: 'nav-home', label: 'Finance home', icon: Home, run: () => go('/finance') },
    {
      id: 'nav-portfolio',
      label: 'Portfolio',
      icon: Briefcase,
      run: () => go('/finance/portfolio')
    },
    { id: 'nav-strategies', label: 'Strategies', icon: Flag, run: () => go('/finance/strategies') },
    {
      id: 'nav-journal',
      label: 'Trade journal',
      icon: BookOpen,
      run: () => go('/finance/journal')
    },
    {
      id: 'nav-compare',
      label: 'Compare tickers',
      icon: Swords,
      run: () => go('/finance/compare')
    },
    { id: 'nav-screener', label: 'Screener', icon: Compass, run: () => go('/finance/screener') },
    {
      id: 'nav-briefing',
      label: 'Daily briefing',
      icon: Radio,
      run: () => go('/finance/briefing')
    },
    {
      id: 'nav-news',
      label: 'Market news (open last ticker)',
      icon: Newspaper,
      run: () => go('/finance')
    },
    ...MODULES.filter((m) => m.enabled && m.id !== 'finance').map((m) => ({
      id: `nav-${m.id}`,
      label: m.name,
      icon: m.icon,
      run: () => go(m.route)
    })),
    { id: 'nav-settings', label: 'Settings', icon: Settings, run: () => go('/settings') }
  ]

  const toolActions: PaletteAction[] = [
    {
      id: 'toggle-theme',
      label: theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
      icon: theme === 'dark' ? Sun : Moon,
      run: () => {
        const next = theme === 'dark' ? 'light' : 'dark'
        setThemeLocal(next)
        setThemePref.mutate(next)
        close()
      }
    },
    {
      id: 'toggle-aot',
      label: alwaysOnTop ? 'Disable always-on-top' : 'Pin window always-on-top',
      icon: Pin,
      run: () => {
        toggleAOT()
        close()
      }
    },
    {
      id: 'reload',
      label: 'Reload all data (refetch queries)',
      icon: RefreshCw,
      run: () => {
        window.location.reload()
      }
    }
  ]

  const ticker = query.trim().toUpperCase()
  const isLikelyTicker = /^[A-Z.\-^]{1,10}$/.test(ticker)

  const dynamicActions: PaletteAction[] = isLikelyTicker
    ? [
        {
          id: `open-${ticker}`,
          label: `Open stock detail ${ticker}`,
          icon: LineChart,
          run: () => go(`/finance/${ticker}`)
        },
        {
          id: `watch-${ticker}`,
          label: `Add ${ticker} to watchlist`,
          icon: TrendingUp,
          run: () => {
            addWatch.mutate({ ticker })
            close()
          }
        }
      ]
    : []

  if (!open) return <></>

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-24 backdrop-blur-md"
      onClick={close}
    >
      <div
        className={cn(
          'w-[620px] overflow-hidden rounded-2xl border shadow-2xl',
          'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="flex flex-col" shouldFilter>
          <Command.Input
            autoFocus
            value={query}
            onValueChange={setQuery}
            placeholder="Ticker, command, or action…"
            className={cn(
              'h-12 border-b bg-transparent px-4 text-sm outline-none',
              'border-[var(--color-border)] placeholder:text-[var(--color-fg-muted)]'
            )}
          />
          <Command.List className="max-h-96 overflow-y-auto p-2">
            <Command.Empty className="p-4 text-center text-xs text-[var(--color-fg-muted)]">
              No matches.
            </Command.Empty>
            {dynamicActions.length > 0 && (
              <Group heading={`${ticker}`}>
                {dynamicActions.map((a) => (
                  <Item key={a.id} action={a} />
                ))}
              </Group>
            )}
            <Group heading="Navigate">
              {navActions.map((a) => (
                <Item key={a.id} action={a} />
              ))}
            </Group>
            <Group heading="Tools">
              {toolActions.map((a) => (
                <Item key={a.id} action={a} />
              ))}
              <Item
                action={{
                  id: 'export-portfolio',
                  label: 'Export portfolio to CSV (via Portfolio page)',
                  icon: Download,
                  run: () => go('/finance/portfolio')
                }}
              />
              <Item
                action={{
                  id: 'ai-briefing',
                  label: 'Generate AI daily briefing',
                  icon: Sparkles,
                  run: () => go('/finance/briefing')
                }}
              />
            </Group>
          </Command.List>
        </Command>
      </div>
    </div>
  )
}

function Group({
  heading,
  children
}: {
  heading: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <Command.Group
      heading={heading}
      className="text-xs [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[var(--color-fg-muted)]"
    >
      {children}
    </Command.Group>
  )
}

function Item({ action }: { action: PaletteAction }): React.JSX.Element {
  const Icon = action.icon
  return (
    <Command.Item
      value={`${action.id} ${action.label}`}
      onSelect={() => void action.run()}
      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm data-[selected=true]:bg-[var(--color-accent)]/12 data-[selected=true]:text-[var(--color-fg)]"
    >
      <Icon className="h-4 w-4 text-[var(--color-fg-muted)]" />
      <span>{action.label}</span>
      {action.hint && (
        <span className="ml-auto text-[10px] text-[var(--color-fg-muted)]">{action.hint}</span>
      )}
    </Command.Item>
  )
}
