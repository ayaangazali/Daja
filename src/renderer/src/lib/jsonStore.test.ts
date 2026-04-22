import { describe, expect, it } from 'vitest'

// Pure parsing tests — the actual JsonStore requires Electron app path.
// These verify the serialization contract: always produce valid JSON + safely merge defaults.

function mergeWithDefaults<T extends Record<string, unknown>>(defaults: T, stored: unknown): T {
  if (stored == null || typeof stored !== 'object' || Array.isArray(stored)) return { ...defaults }
  return { ...defaults, ...(stored as Record<string, unknown>) } as T
}

describe('JsonStore merge semantics', () => {
  it('null stored returns defaults', () => {
    expect(mergeWithDefaults({ a: 1, b: 2 }, null)).toEqual({ a: 1, b: 2 })
  })
  it('empty object preserves all defaults', () => {
    expect(mergeWithDefaults({ a: 1, b: 2 }, {})).toEqual({ a: 1, b: 2 })
  })
  it('stored keys override defaults', () => {
    expect(mergeWithDefaults({ a: 1, b: 2 }, { a: 100 })).toEqual({ a: 100, b: 2 })
  })
  it('rejects array as stored (malformed)', () => {
    expect(mergeWithDefaults({ a: 1 }, [1, 2, 3])).toEqual({ a: 1 })
  })
  it('extra stored keys are preserved (forward compat)', () => {
    const r = mergeWithDefaults({ a: 1 }, { a: 2, newField: 'x' }) as Record<string, unknown>
    expect(r.a).toBe(2)
    expect(r.newField).toBe('x')
  })
})

describe('JSON safety roundtrip', () => {
  it('strings roundtrip unchanged', () => {
    const orig = { msg: 'hello world' }
    expect(JSON.parse(JSON.stringify(orig))).toEqual(orig)
  })
  it('special chars survive', () => {
    const orig = { s: 'line1\nline2\t"quoted"' }
    expect(JSON.parse(JSON.stringify(orig))).toEqual(orig)
  })
  it('nested objects', () => {
    const orig = { a: { b: { c: [1, 2, 3] } } }
    expect(JSON.parse(JSON.stringify(orig))).toEqual(orig)
  })
  it('undefined values are dropped', () => {
    const orig: Record<string, unknown> = { a: 1, b: undefined }
    const rt = JSON.parse(JSON.stringify(orig))
    expect('b' in rt).toBe(false)
  })
  it('null values preserved', () => {
    expect(JSON.parse(JSON.stringify({ a: null }))).toEqual({ a: null })
  })
})
