import { getDb } from '../client'

export interface UserContext {
  id: number
  context_type: string
  content: string
  module: string
  created_at: string
  updated_at: string
}

export const userContextRepo = {
  list(module = 'finance'): UserContext[] {
    return getDb()
      .prepare('SELECT * FROM user_context WHERE module = ? ORDER BY updated_at DESC')
      .all(module) as UserContext[]
  },
  add(ctx: { context_type: string; content: string; module?: string }): UserContext {
    const info = getDb()
      .prepare('INSERT INTO user_context (context_type, content, module) VALUES (?,?,?)')
      .run(ctx.context_type, ctx.content, ctx.module ?? 'finance')
    return getDb()
      .prepare('SELECT * FROM user_context WHERE id = ?')
      .get(info.lastInsertRowid) as UserContext
  },
  remove(id: number): void {
    getDb().prepare('DELETE FROM user_context WHERE id = ?').run(id)
  }
}
