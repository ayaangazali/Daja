import { getDb } from '../client'

export interface PaperTrade {
  id: number
  ticker: string
  side: 'buy' | 'sell'
  quantity: number
  price: number
  fees: number
  date: string
  notes: string | null
  created_at: string
}

export const paperTradesRepo = {
  list(): PaperTrade[] {
    return getDb()
      .prepare('SELECT * FROM paper_trades ORDER BY date DESC, id DESC')
      .all() as PaperTrade[]
  },
  byTicker(ticker: string): PaperTrade[] {
    return getDb()
      .prepare('SELECT * FROM paper_trades WHERE ticker = ? ORDER BY date ASC, id ASC')
      .all(ticker.toUpperCase()) as PaperTrade[]
  },
  add(
    t: Omit<PaperTrade, 'id' | 'created_at' | 'fees' | 'notes'> & {
      fees?: number
      notes?: string | null
    }
  ): PaperTrade {
    const info = getDb()
      .prepare(
        `INSERT INTO paper_trades (ticker, side, quantity, price, fees, date, notes)
         VALUES (?,?,?,?,?,?,?)`
      )
      .run(
        t.ticker.toUpperCase(),
        t.side,
        t.quantity,
        t.price,
        t.fees ?? 0,
        t.date,
        t.notes ?? null
      )
    return getDb()
      .prepare('SELECT * FROM paper_trades WHERE id = ?')
      .get(info.lastInsertRowid) as PaperTrade
  },
  remove(id: number): void {
    getDb().prepare('DELETE FROM paper_trades WHERE id = ?').run(id)
  },
  reset(): void {
    getDb().prepare('DELETE FROM paper_trades').run()
  }
}
