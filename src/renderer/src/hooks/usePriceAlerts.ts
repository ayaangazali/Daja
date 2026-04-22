import { useEffect, useRef } from 'react'
import type { Quote } from './useFinance'
import type { WatchlistItem } from './useWatchlist'

// Keyed by ticker+threshold so changing the threshold re-enables firing.
const FIRED = new Set<string>()

export function usePriceAlerts(watchlist: WatchlistItem[], quotes: { data?: Quote }[]): void {
  const inited = useRef(false)
  useEffect(() => {
    // avoid firing on first render (might be stale data)
    if (!inited.current) {
      inited.current = true
      return
    }
    // Prune stale FIRED entries so raising/lowering a threshold re-enables notification
    const active = new Set<string>()
    for (const item of watchlist) {
      if (item.alert_above != null) active.add(`${item.ticker}-above-${item.alert_above}`)
      if (item.alert_below != null) active.add(`${item.ticker}-below-${item.alert_below}`)
    }
    for (const k of FIRED) if (!active.has(k)) FIRED.delete(k)

    for (let i = 0; i < watchlist.length; i++) {
      const item = watchlist[i]
      const q = quotes[i]?.data
      if (!q || q.price == null) continue
      if (item.alert_above != null && q.price >= item.alert_above) {
        const key = `${item.ticker}-above-${item.alert_above}`
        if (!FIRED.has(key)) {
          FIRED.add(key)
          void window.daja.system.notify({
            title: `${item.ticker} hit $${item.alert_above.toFixed(2)}`,
            body: `Current price $${q.price.toFixed(2)} (+${((q.price / item.alert_above - 1) * 100).toFixed(2)}%)`
          })
        }
      }
      if (item.alert_below != null && q.price <= item.alert_below) {
        const key = `${item.ticker}-below-${item.alert_below}`
        if (!FIRED.has(key)) {
          FIRED.add(key)
          void window.daja.system.notify({
            title: `${item.ticker} dropped to $${item.alert_below.toFixed(2)}`,
            body: `Current price $${q.price.toFixed(2)} (${((q.price / item.alert_below - 1) * 100).toFixed(2)}%)`
          })
        }
      }
    }
  }, [watchlist, quotes])
}
