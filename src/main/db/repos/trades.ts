import { getDb } from '../client'

export interface Trade {
  id: number
  ticker: string
  asset_class: string
  side: 'buy' | 'sell' | 'short' | 'cover'
  quantity: number
  price: number
  fees: number
  currency: string
  exchange: string | null
  date: string
  notes: string | null
  strategy_id: number | null
  journal_id: number | null
  created_at: string
  updated_at: string
}

export interface NewTrade {
  ticker: string
  asset_class?: string
  side: Trade['side']
  quantity: number
  price: number
  fees?: number
  currency?: string
  exchange?: string | null
  date: string
  notes?: string | null
  strategy_id?: number | null
  journal_id?: number | null
}

export const tradesRepo = {
  list(): Trade[] {
    return getDb().prepare('SELECT * FROM trades ORDER BY date DESC, id DESC').all() as Trade[]
  },
  byTicker(ticker: string): Trade[] {
    return getDb()
      .prepare('SELECT * FROM trades WHERE ticker = ? ORDER BY date ASC, id ASC')
      .all(ticker.toUpperCase()) as Trade[]
  },
  add(t: NewTrade): Trade {
    const info = getDb()
      .prepare(
        `INSERT INTO trades (ticker, asset_class, side, quantity, price, fees, currency, exchange, date, notes, strategy_id, journal_id)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
      )
      .run(
        t.ticker.toUpperCase(),
        t.asset_class ?? 'stock',
        t.side,
        t.quantity,
        t.price,
        t.fees ?? 0,
        t.currency ?? 'USD',
        t.exchange ?? null,
        t.date,
        t.notes ?? null,
        t.strategy_id ?? null,
        t.journal_id ?? null
      )
    return getDb().prepare('SELECT * FROM trades WHERE id = ?').get(info.lastInsertRowid) as Trade
  },
  remove(id: number): void {
    getDb().prepare('DELETE FROM trades WHERE id = ?').run(id)
  }
}
