import { getDb } from '../client'

export interface AIConversation {
  id: number
  module: string
  provider: string
  model: string | null
  title: string | null
  messages: string
  context_ticker: string | null
  summary: string | null
  created_at: string
  updated_at: string
}

export const conversationsRepo = {
  list(module?: string): AIConversation[] {
    if (module) {
      return getDb()
        .prepare('SELECT * FROM ai_conversations WHERE module = ? ORDER BY updated_at DESC')
        .all(module) as AIConversation[]
    }
    return getDb()
      .prepare('SELECT * FROM ai_conversations ORDER BY updated_at DESC')
      .all() as AIConversation[]
  },
  get(id: number): AIConversation | null {
    return (
      (getDb().prepare('SELECT * FROM ai_conversations WHERE id = ?').get(id) as
        | AIConversation
        | undefined) ?? null
    )
  },
  add(c: {
    module: string
    provider: string
    model?: string
    title?: string
    messages: unknown
    context_ticker?: string
    summary?: string
  }): AIConversation {
    const info = getDb()
      .prepare(
        `INSERT INTO ai_conversations (module, provider, model, title, messages, context_ticker, summary)
         VALUES (?,?,?,?,?,?,?)`
      )
      .run(
        c.module,
        c.provider,
        c.model ?? null,
        c.title ?? null,
        JSON.stringify(c.messages),
        c.context_ticker ?? null,
        c.summary ?? null
      )
    return this.get(info.lastInsertRowid as number) as AIConversation
  },
  update(id: number, patch: { title?: string; messages?: unknown; summary?: string }): void {
    const cur = this.get(id)
    if (!cur) return
    getDb()
      .prepare(
        "UPDATE ai_conversations SET title = ?, messages = ?, summary = ?, updated_at = datetime('now') WHERE id = ?"
      )
      .run(
        patch.title ?? cur.title,
        patch.messages != null ? JSON.stringify(patch.messages) : cur.messages,
        patch.summary ?? cur.summary,
        id
      )
  },
  remove(id: number): void {
    getDb().prepare('DELETE FROM ai_conversations WHERE id = ?').run(id)
  }
}
