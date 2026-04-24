// @vitest-environment node
// Pure-logic tests — no native sqlite binding required. Uses an in-memory stub
// that implements the minimal `pragma` / `transaction` surface runMigrations
// touches. Real DB behavior covered by integration tests in dev.
import { describe, expect, it } from 'vitest'
import { runMigrations, MIGRATIONS, type Migration } from './migrations'

interface PragmaOpts {
  simple?: boolean
}

function makeStubDb(): {
  version: number
  pragma: (sql: string, opts?: PragmaOpts) => unknown
  transaction: <T>(fn: () => T) => () => T
  exec: (sql: string) => void
  prepare: (sql: string) => {
    run: (...args: unknown[]) => unknown
    all: (...args: unknown[]) => unknown[]
  }
} {
  const state = { version: 0 as number }
  return {
    get version() {
      return state.version
    },
    pragma(sql: string, opts?: PragmaOpts): unknown {
      const m = /^\s*user_version\s*=\s*(\d+)\s*$/i.exec(sql)
      if (m) {
        state.version = Number(m[1])
        return undefined
      }
      if (/^\s*user_version\s*$/i.test(sql)) {
        return opts?.simple ? state.version : [{ user_version: state.version }]
      }
      return undefined
    },
    transaction<T>(fn: () => T): () => T {
      const snapshot = state.version
      return (): T => {
        try {
          return fn()
        } catch (err) {
          state.version = snapshot // rollback
          throw err
        }
      }
    },
    exec(_sql: string): void {
      /* stub — real DDL never run here */
    },
    prepare(_sql: string) {
      return {
        run: (..._args: unknown[]) => undefined,
        all: (..._args: unknown[]) => [] as unknown[]
      }
    }
  }
}

describe('migrations framework (stub-db)', () => {
  it('baseline migration is numbered v1 and runs on v0 db', () => {
    expect(MIGRATIONS.length).toBeGreaterThan(0)
    expect(MIGRATIONS[0].version).toBe(1)
    const db = makeStubDb()
    // Using 'unknown' cast since stub implements only the slice runMigrations touches
    const r = runMigrations(db as unknown as Parameters<typeof runMigrations>[0])
    expect(r.fromVersion).toBe(0)
    expect(r.toVersion).toBe(MIGRATIONS[MIGRATIONS.length - 1].version)
    expect(r.applied.length).toBe(MIGRATIONS.length)
  })

  it('re-running is a no-op — applied is empty', () => {
    const db = makeStubDb()
    runMigrations(db as unknown as Parameters<typeof runMigrations>[0])
    const second = runMigrations(db as unknown as Parameters<typeof runMigrations>[0])
    expect(second.applied).toHaveLength(0)
    expect(second.fromVersion).toBe(second.toVersion)
  })

  it('failing migration throws and rolls back user_version', () => {
    const db = makeStubDb()
    runMigrations(db as unknown as Parameters<typeof runMigrations>[0]) // now at baseline
    const before = db.version
    const failing: Migration = {
      version: 999,
      description: 'intentionally failing test migration',
      up: () => {
        throw new Error('boom')
      }
    }
    MIGRATIONS.push(failing)
    try {
      expect(() => runMigrations(db as unknown as Parameters<typeof runMigrations>[0])).toThrow(
        /v999/
      )
    } finally {
      const idx = MIGRATIONS.indexOf(failing)
      if (idx >= 0) MIGRATIONS.splice(idx, 1)
    }
    expect(db.version).toBe(before) // rolled back
  })

  it('MIGRATIONS is ordered by version when sorted', () => {
    const versions = MIGRATIONS.map((m) => m.version)
    const sorted = [...versions].sort((a, b) => a - b)
    expect(versions).toEqual(sorted)
  })

  it('no duplicate version numbers', () => {
    const versions = MIGRATIONS.map((m) => m.version)
    const unique = new Set(versions)
    expect(unique.size).toBe(versions.length)
  })
})
