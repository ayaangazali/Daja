import { ipcMain } from 'electron'
import { z } from 'zod'
import { repos } from '../db/repos'

const DbCallPayload = z.object({
  repo: z.string().min(1),
  method: z.string().min(1),
  args: z.array(z.unknown()).default([])
})

const ALLOWED: Record<string, Set<string>> = {
  watchlist: new Set(['list', 'listAllNames', 'add', 'remove', 'reorder']),
  trades: new Set(['list', 'byTicker', 'add', 'remove']),
  strategies: new Set(['list', 'listActive', 'get', 'add', 'update', 'remove']),
  journal: new Set(['list', 'byTicker', 'add', 'remove']),
  userContext: new Set(['list', 'add', 'remove']),
  health: new Set(['list', 'recent', 'add', 'remove']),
  medications: new Set(['list', 'add', 'setActive', 'remove']),
  layouts: new Set(['list', 'get', 'save', 'remove']),
  conversations: new Set(['list', 'get', 'add', 'update', 'remove'])
}

export const DB_CALL_CHANNEL = 'db:call'

export function registerDbIpc(): void {
  ipcMain.handle(DB_CALL_CHANNEL, async (_e, raw) => {
    const { repo, method, args } = DbCallPayload.parse(raw)
    if (!(repo in repos) || !ALLOWED[repo]?.has(method)) {
      throw new Error(`Forbidden db call: ${repo}.${method}`)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = (repos as unknown as Record<string, Record<string, (...a: any[]) => unknown>>)[repo]
    const fn = r[method]
    if (typeof fn !== 'function') throw new Error(`Method not fn: ${repo}.${method}`)
    return fn(...args)
  })
}
