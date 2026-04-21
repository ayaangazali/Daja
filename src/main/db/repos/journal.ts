import { getDb } from '../client'

export interface JournalEntry {
  id: number
  trade_id: number | null
  ticker: string
  entry_type: 'entry' | 'exit' | 'update' | 'note'
  thesis: string | null
  conviction: number | null
  target_price: number | null
  stop_loss: number | null
  risk_reward_ratio: number | null
  lessons: string | null
  emotions: string | null
  tags: string | null
  screenshots: string | null
  created_at: string
  updated_at: string
}

export const journalRepo = {
  list(): JournalEntry[] {
    return getDb()
      .prepare('SELECT * FROM journal_entries ORDER BY created_at DESC')
      .all() as JournalEntry[]
  },
  byTicker(ticker: string): JournalEntry[] {
    return getDb()
      .prepare('SELECT * FROM journal_entries WHERE ticker = ? ORDER BY created_at DESC')
      .all(ticker.toUpperCase()) as JournalEntry[]
  },
  add(j: Omit<JournalEntry, 'id' | 'created_at' | 'updated_at'>): JournalEntry {
    const info = getDb()
      .prepare(
        `INSERT INTO journal_entries (trade_id, ticker, entry_type, thesis, conviction, target_price, stop_loss, risk_reward_ratio, lessons, emotions, tags, screenshots)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
      )
      .run(
        j.trade_id,
        j.ticker.toUpperCase(),
        j.entry_type,
        j.thesis,
        j.conviction,
        j.target_price,
        j.stop_loss,
        j.risk_reward_ratio,
        j.lessons,
        j.emotions,
        j.tags,
        j.screenshots
      )
    return getDb()
      .prepare('SELECT * FROM journal_entries WHERE id = ?')
      .get(info.lastInsertRowid) as JournalEntry
  },
  remove(id: number): void {
    getDb().prepare('DELETE FROM journal_entries WHERE id = ?').run(id)
  }
}
