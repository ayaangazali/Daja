import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'

describe('toCsv', () => {
  it('returns empty string on empty rows', () => {
    expect(toCsv([])).toBe('')
  })
  it('emits header + single row from keys of first row', () => {
    const out = toCsv([{ a: 1, b: 2 }])
    expect(out).toBe('a,b\n1,2')
  })
  it('honors explicit column order', () => {
    const out = toCsv([{ a: 1, b: 2, c: 3 }], ['c', 'a'])
    expect(out).toBe('c,a\n3,1')
  })
  it('quotes fields containing commas', () => {
    const out = toCsv([{ name: 'Smith, John', age: 30 }])
    expect(out).toBe('name,age\n"Smith, John",30')
  })
  it('quotes fields containing quotes and escapes them', () => {
    const out = toCsv([{ q: 'he said "hi"' }])
    expect(out).toBe('q\n"he said ""hi"""')
  })
  it('quotes fields containing newlines', () => {
    const out = toCsv([{ m: 'line1\nline2' }])
    expect(out).toContain('"line1\nline2"')
  })
  it('null becomes empty field', () => {
    const out = toCsv([{ a: null, b: 'x' }])
    expect(out).toBe('a,b\n,x')
  })
  it('undefined becomes empty field', () => {
    const out = toCsv([{ a: undefined, b: 'x' } as Record<string, unknown>])
    expect(out).toBe('a,b\n,x')
  })
  it('numbers serialize without quotes', () => {
    const out = toCsv([{ price: 123.45 }])
    expect(out).toBe('price\n123.45')
  })
  it('multiple rows separated by newlines', () => {
    const out = toCsv([
      { a: 1, b: 2 },
      { a: 3, b: 4 }
    ])
    expect(out).toBe('a,b\n1,2\n3,4')
  })
})
