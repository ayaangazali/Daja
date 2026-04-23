// @vitest-environment node
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { existsSync, readFileSync, rmSync, mkdtempSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

// Mock electron's `app.getPath('userData')` to point at a throwaway tmp dir.
let TMP = ''

vi.mock('electron', () => ({
  app: {
    getPath: (): string => TMP
  }
}))

// Import AFTER the mock so createJsonStore picks it up.
import { createJsonStore } from './jsonStore'

describe('jsonStore', () => {
  beforeEach(() => {
    TMP = mkdtempSync(join(tmpdir(), 'daja-jsonstore-'))
  })
  afterEach(() => {
    try {
      rmSync(TMP, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  })

  it('returns defaults when no file exists', () => {
    const store = createJsonStore('test', { a: 1, b: 'hello' })
    expect(store.get('a')).toBe(1)
    expect(store.get('b')).toBe('hello')
  })

  it('persists via set + reloads from disk through a fresh store', async () => {
    const s1 = createJsonStore<{ count: number; label: string }>('prefs', { count: 0, label: 'x' })
    s1.set('count', 42)
    s1.set('label', 'hello')
    // Let the in-flight write chain settle
    await new Promise((r) => setTimeout(r, 50))
    // Verify file wrote via atomic-rename (no .tmp lingering)
    expect(existsSync(join(TMP, 'prefs.json'))).toBe(true)
    const content = JSON.parse(readFileSync(join(TMP, 'prefs.json'), 'utf8'))
    expect(content.count).toBe(42)
    expect(content.label).toBe('hello')
  })

  it('merges defaults over existing file (missing keys filled in)', async () => {
    const s1 = createJsonStore<{ a: number; b: number }>('merge', { a: 1, b: 2 })
    s1.set('a', 99)
    await new Promise((r) => setTimeout(r, 50))
    // Simulate the defaults changing between versions (new field `c`)
    const s2 = createJsonStore<{ a: number; b: number; c: number }>('merge', {
      a: 0,
      b: 0,
      c: 777
    })
    expect(s2.get('a')).toBe(99) // preserved
    expect(s2.get('b')).toBe(2) // default kept for missing-in-file
    expect(s2.get('c')).toBe(777) // new default surfaced
  })

  it('replace() swaps the whole document', async () => {
    const s = createJsonStore<{ x: number; y: number }>('replace', { x: 0, y: 0 })
    s.set('x', 5)
    s.replace({ x: 10, y: 20 })
    expect(s.get('x')).toBe(10)
    expect(s.get('y')).toBe(20)
  })

  it('getAll() returns a shallow copy (mutating does not affect store)', () => {
    const s = createJsonStore<{ a: number; b: number }>('copy', { a: 1, b: 2 })
    const snapshot = s.getAll()
    snapshot.a = 999
    expect(s.get('a')).toBe(1)
  })
})
