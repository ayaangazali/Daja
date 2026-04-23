import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { join } from 'path'

export interface JsonStore<T extends Record<string, unknown>> {
  get<K extends keyof T>(key: K): T[K]
  set<K extends keyof T>(key: K, value: T[K]): void
  getAll(): T
  replace(all: T): void
}

export function createJsonStore<T extends Record<string, unknown>>(
  name: string,
  defaults: T
): JsonStore<T> {
  const dir = app.getPath('userData')
  const file = join(dir, `${name}.json`)
  let cache: T | null = null

  const load = (): T => {
    if (cache) return cache
    try {
      if (existsSync(file)) {
        const parsed = JSON.parse(readFileSync(file, 'utf8')) as T
        cache = { ...defaults, ...parsed }
        return cache
      }
    } catch {
      // fallthrough
    }
    cache = { ...defaults }
    return cache
  }

  // Serialize concurrent writes via an in-flight promise chain. Combined with
  // write-then-atomic-rename, this eliminates torn writes when the Electron
  // main process fans out multiple setters on the same tick (e.g. user flips
  // two prefs in adjacent handlers).
  let writeChain: Promise<void> = Promise.resolve()

  const persist = (data: T): void => {
    // Update cache synchronously so subsequent reads see the new value
    // immediately. Disk writes remain serialized + atomic.
    cache = data
    const snapshot = JSON.stringify(data, null, 2)
    writeChain = writeChain
      .catch(() => {
        /* swallow previous errors so chain stays alive */
      })
      .then(() => {
        try {
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
          const tmp = `${file}.${process.pid}.${Date.now()}.tmp`
          writeFileSync(tmp, snapshot, 'utf8')
          // Atomic rename — POSIX guarantees readers see either old or new,
          // never partial.
          renameSync(tmp, file)
        } catch (err) {
          console.error(`JsonStore persist failed for ${name}:`, err)
        }
      })
  }

  return {
    get<K extends keyof T>(key: K): T[K] {
      return load()[key]
    },
    set<K extends keyof T>(key: K, value: T[K]): void {
      const data = { ...load(), [key]: value } as T
      persist(data)
    },
    getAll(): T {
      return { ...load() }
    },
    replace(all: T): void {
      persist({ ...all })
    }
  }
}
