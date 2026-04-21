import { useEffect, useState } from 'react'
import { Circle, Database, Pin, Wifi, WifiOff } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { usePrefs } from '../hooks/usePrefs'
import { useKeys } from '../hooks/useKeyVault'
import { useUIStore } from '../stores/uiStore'
import { cn } from '../lib/cn'

// Market hours: NYSE opens 9:30, closes 16:00 ET, Mon-Fri
function useMarketStatus(): 'open' | 'pre' | 'post' | 'closed' {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const day = et.getDay()
  if (day === 0 || day === 6) return 'closed'
  const mins = et.getHours() * 60 + et.getMinutes()
  if (mins >= 9 * 60 + 30 && mins < 16 * 60) return 'open'
  if (mins >= 4 * 60 && mins < 9 * 60 + 30) return 'pre'
  if (mins >= 16 * 60 && mins < 20 * 60) return 'post'
  return 'closed'
}

function useNow(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

export function StatusBar(): React.JSX.Element {
  const market = useMarketStatus()
  const now = useNow()
  const { data: prefs } = usePrefs()
  const { data: keys = [] } = useKeys()
  const alwaysOnTop = useUIStore((s) => s.alwaysOnTop)
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const on = (): void => setOnline(true)
    const off = (): void => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  // Ping: ask main for a trivial response to measure round-trip (stubbed via any existing fast IPC)
  const { data: ping } = useQuery({
    queryKey: ['ping'],
    queryFn: async () => {
      const t0 = performance.now()
      try {
        await window.nexus.prefs.get()
      } catch {
        return -1
      }
      return Math.round(performance.now() - t0)
    },
    refetchInterval: 10_000,
    staleTime: 5_000
  })

  const marketColor = {
    open: 'text-[var(--color-pos)]',
    pre: 'text-[var(--color-warn)]',
    post: 'text-[var(--color-warn)]',
    closed: 'text-[var(--color-fg-muted)]'
  }[market]

  const configuredAi = keys.filter((k) =>
    ['anthropic', 'openai', 'gemini', 'grok', 'perplexity'].includes(k.provider) && k.configured
  ).length
  const configuredData = keys.filter((k) =>
    ['fmp', 'alpha_vantage', 'polygon', 'news_api'].includes(k.provider) && k.configured
  ).length

  const currentProvider =
    prefs?.aiByModule?.finance ?? prefs?.aiByModule?.assistant ?? 'anthropic'

  return (
    <footer
      className={cn(
        'flex h-6 shrink-0 items-center justify-between gap-3 border-t px-3 text-[9px]',
        'border-[var(--color-border)] bg-[var(--color-bg-elev)] text-[var(--color-fg-muted)]'
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Circle className={cn('h-2 w-2 fill-current', marketColor)} />
          <span className="uppercase">
            Market {market}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {online ? (
            <Wifi className="h-2.5 w-2.5 text-[var(--color-pos)]" />
          ) : (
            <WifiOff className="h-2.5 w-2.5 text-[var(--color-neg)]" />
          )}
          <span>{online ? 'Online' : 'Offline'}</span>
          {ping != null && ping >= 0 && (
            <span className="font-mono tabular">{ping}ms</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Database className="h-2.5 w-2.5" />
          <span>SQLite · local</span>
        </div>
      </div>
      <div className="flex items-center gap-3 font-mono tabular">
        <span>AI: {configuredAi}/5</span>
        <span>Data: {configuredData}/4</span>
        <span className="text-[var(--color-fg)]">{currentProvider}</span>
        {alwaysOnTop && (
          <span className="flex items-center gap-0.5 text-[var(--color-info)]">
            <Pin className="h-2.5 w-2.5" />
            Pinned
          </span>
        )}
        <span>
          {now.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })}
        </span>
      </div>
    </footer>
  )
}
