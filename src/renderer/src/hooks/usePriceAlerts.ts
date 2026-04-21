import { useEffect, useRef } from 'react'
import type { Quote } from './useFinance'
import type { WatchlistItem } from './useWatchlist'

const FIRED = new Set<string>()

export function usePriceAlerts(watchlist: WatchlistItem[], quotes: { data?: Quote }[]): void {
  const inited = useRef(false)
  useEffect(() => {
    // avoid firing on first render (might be stale data)
    if (!inited.current) {
      inited.current = true
      return
    }
    for (let i = 0; i < watchlist.length; i++) {
      const item = watchlist[i]
      const q = quotes[i]?.data
      if (!q || q.price == null) continue
      if (item.alert_above != null && q.price >= item.alert_above) {
        const key = `${item.ticker}-above-${item.alert_above}`
        if (!FIRED.has(key)) {
          FIRED.add(key)
          void window.nexus.system.notify({
            title: `${item.ticker} hit $${item.alert_above.toFixed(2)}`,
            body: `Current price $${q.price.toFixed(2)} (+${((q.price / item.alert_above - 1) * 100).toFixed(2)}%)`
          })
        }
      }
      if (item.alert_below != null && q.price <= item.alert_below) {
        const key = `${item.ticker}-below-${item.alert_below}`
        if (!FIRED.has(key)) {
          FIRED.add(key)
          void window.nexus.system.notify({
            title: `${item.ticker} dropped to $${item.alert_below.toFixed(2)}`,
            body: `Current price $${q.price.toFixed(2)} (${((q.price / item.alert_below - 1) * 100).toFixed(2)}%)`
          })
        }
      }
    }
  }, [watchlist, quotes])
}
