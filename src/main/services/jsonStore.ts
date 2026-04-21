import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
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

  const persist = (data: T): void => {
    try {
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
      writeFileSync(file, JSON.stringify(data, null, 2), 'utf8')
      cache = data
    } catch (err) {
      console.error(`JsonStore persist failed for ${name}:`, err)
    }
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
