import { ipcMain } from 'electron'
import { z } from 'zod'
import { repos, type RepoName } from '../db/repos'

const DbCallPayload = z.object({
  repo: z.string().min(1),
  method: z.string().min(1),
  args: z.array(z.unknown()).default([])
})

/**
 * Derive the allowlist directly from the typed `repos` object — every exported
 * method on every repo is automatically callable. No manual string list to
 * drift out of sync. Security comes from: (1) the repo boundary being the
 * full surface we intend to expose, (2) Zod validation at the IPC edge, and
 * (3) the `repo in repos` check preventing prototype-pollution-style escapes.
 */
type RepoObj = Record<string, unknown>

function isRepoName(name: string): name is RepoName {
  return Object.prototype.hasOwnProperty.call(repos, name)
}

function methodFor(repo: RepoName, method: string): ((...a: unknown[]) => unknown) | null {
  const obj = repos[repo] as RepoObj
  if (!Object.prototype.hasOwnProperty.call(obj, method)) return null
  const fn = obj[method]
  return typeof fn === 'function' ? (fn as (...a: unknown[]) => unknown) : null
}

export const DB_CALL_CHANNEL = 'db:call'

export function registerDbIpc(): void {
  ipcMain.handle(DB_CALL_CHANNEL, async (_e, raw) => {
    const { repo, method, args } = DbCallPayload.parse(raw)
    if (!isRepoName(repo)) throw new Error(`Forbidden db call: unknown repo "${repo}"`)
    const fn = methodFor(repo, method)
    if (!fn) throw new Error(`Forbidden db call: ${repo}.${method} is not a method`)
    return fn(...args)
  })
}
