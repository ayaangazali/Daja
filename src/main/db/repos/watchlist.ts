import { getDb } from '../client'

export interface WatchlistItem {
  id: number
  ticker: string
  asset_class: string
  list_name: string
  notes: string | null
  target_buy_price: number | null
  alert_above: number | null
  alert_below: number | null
  sort_order: number
  added_at: string
}

export const watchlistRepo = {
  list(listName = 'default'): WatchlistItem[] {
    return getDb()
      .prepare('SELECT * FROM watchlist WHERE list_name = ? ORDER BY sort_order ASC, added_at ASC')
      .all(listName) as WatchlistItem[]
  },
  listAllNames(): string[] {
    const rows = getDb()
      .prepare('SELECT DISTINCT list_name FROM watchlist ORDER BY list_name')
      .all() as { list_name: string }[]
    return rows.map((r) => r.list_name)
  },
  add(ticker: string, listName = 'default', assetClass = 'stock'): WatchlistItem {
    const info = getDb()
      .prepare('INSERT OR IGNORE INTO watchlist (ticker, list_name, asset_class) VALUES (?, ?, ?)')
      .run(ticker.toUpperCase(), listName, assetClass)
    if (info.changes === 0) {
      return getDb()
        .prepare('SELECT * FROM watchlist WHERE ticker = ? AND list_name = ?')
        .get(ticker.toUpperCase(), listName) as WatchlistItem
    }
    return getDb()
      .prepare('SELECT * FROM watchlist WHERE id = ?')
      .get(info.lastInsertRowid) as WatchlistItem
  },
  remove(ticker: string, listName = 'default'): void {
    getDb()
      .prepare('DELETE FROM watchlist WHERE ticker = ? AND list_name = ?')
      .run(ticker.toUpperCase(), listName)
  },
  reorder(ids: number[]): void {
    const stmt = getDb().prepare('UPDATE watchlist SET sort_order = ? WHERE id = ?')
    const tx = getDb().transaction((arr: number[]) => {
      arr.forEach((id, idx) => stmt.run(idx, id))
    })
    tx(ids)
  }
}
