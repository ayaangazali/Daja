import { describe, expect, it } from 'vitest'
import { toCsv, fromCsv } from './csv'

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

describe('fromCsv round-trip', () => {
  it('toCsv then fromCsv preserves data incl commas, quotes, newlines', () => {
    const rows = [
      { ticker: 'AAPL', qty: '100', price: '150.25', notes: 'buy, core' },
      { ticker: 'MSFT', qty: '50', price: '340.5', notes: 'with "quotes"' },
      { ticker: 'TSLA', qty: '25', price: '210.75', notes: 'line\nwith newline' }
    ]
    const csv = toCsv(rows)
    const parsed = fromCsv(csv)
    expect(parsed.header).toEqual(['ticker', 'qty', 'price', 'notes'])
    expect(parsed.rows).toHaveLength(3)
    expect(parsed.rows[0].notes).toBe('buy, core')
    expect(parsed.rows[1].notes).toBe('with "quotes"')
    expect(parsed.rows[2].notes).toBe('line\nwith newline')
  })
  it('strips UTF-8 BOM', () => {
    expect(fromCsv('\uFEFFa,b\n1,2').header).toEqual(['a', 'b'])
  })
  it('handles CRLF line endings', () => {
    const r = fromCsv('a,b\r\n1,2\r\n3,4')
    expect(r.rows).toHaveLength(2)
    expect(r.rows[1].a).toBe('3')
  })
  it('ignores empty trailing line', () => {
    expect(fromCsv('a,b\n1,2\n').rows).toHaveLength(1)
  })
})
