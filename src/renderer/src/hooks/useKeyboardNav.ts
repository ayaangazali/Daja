import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWatchlist } from './useWatchlist'

// Global keyboard shortcuts for power users.
// j/k navigate watchlist, g+f home, g+p portfolio, g+s settings, ? open palette
export function useKeyboardNav(): void {
  const navigate = useNavigate()
  const { data: items = [] } = useWatchlist()

  useEffect(() => {
    let chord: string | null = null
    let chordTimer: ReturnType<typeof setTimeout> | null = null

    const isTyping = (): boolean => {
      const el = document.activeElement as HTMLElement | null
      if (!el) return false
      const tag = el.tagName.toLowerCase()
      return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable
    }

    const h = (e: KeyboardEvent): void => {
      if (isTyping()) return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      // Chord handling: g then f/p/s/c/j
      if (chord === 'g') {
        const map: Record<string, string> = {
          f: '/finance',
          p: '/finance/portfolio',
          s: '/settings',
          c: '/finance/compare',
          j: '/finance/journal',
          r: '/finance/strategies',
          n: '/finance/screener',
          b: '/finance/briefing',
          a: '/assistant',
          h: '/health',
          o: '/sports',
          d: '/pdf'
        }
        if (map[e.key]) {
          e.preventDefault()
          navigate(map[e.key])
        }
        chord = null
        if (chordTimer) clearTimeout(chordTimer)
        return
      }

      if (e.key === 'g' && !e.shiftKey) {
        chord = 'g'
        if (chordTimer) clearTimeout(chordTimer)
        chordTimer = setTimeout(() => {
          chord = null
        }, 1000)
        return
      }

      // j/k across watchlist
      if ((e.key === 'j' || e.key === 'k') && items.length > 0) {
        const pathMatch = window.location.hash.match(/#\/finance\/([^/]+)/)
        const current = pathMatch ? pathMatch[1] : null
        const idx = current ? items.findIndex((i) => i.ticker === current) : -1
        let next = idx
        if (e.key === 'j') next = Math.min(items.length - 1, idx + 1)
        if (e.key === 'k') next = idx < 0 ? 0 : Math.max(0, idx - 1)
        if (next >= 0 && next < items.length) {
          e.preventDefault()
          navigate(`/finance/${items[next].ticker}`)
        }
        return
      }
    }

    window.addEventListener('keydown', h)
    return () => {
      window.removeEventListener('keydown', h)
      if (chordTimer) clearTimeout(chordTimer)
    }
  }, [items, navigate])
}
