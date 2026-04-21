import { describe, expect, it } from 'vitest'
import { marketStatusAt } from './marketHours'

// Helper to build an ET date reliably from a fixed ISO string.
// Note: ET offset varies w/ DST so we use fixed-offset strings tied to a known period.
function etDate(iso: string): Date {
  // iso looks like '2026-03-16T14:00:00-04:00' (EDT) — pass through to Date.
  return new Date(iso)
}

describe('marketStatusAt', () => {
  it('Sunday → closed', () => {
    expect(marketStatusAt(etDate('2026-03-15T10:00:00-04:00'))).toBe('closed')
  })
  it('Saturday → closed', () => {
    expect(marketStatusAt(etDate('2026-03-14T10:00:00-04:00'))).toBe('closed')
  })
  it('Weekday 10:00 ET → open', () => {
    expect(marketStatusAt(etDate('2026-03-16T14:00:00+00:00'))).toBe('open')
  })
  it('Weekday 09:29 ET → pre', () => {
    // 09:29 EDT = 13:29 UTC
    expect(marketStatusAt(etDate('2026-03-16T13:29:00+00:00'))).toBe('pre')
  })
  it('Weekday 09:30 ET exactly → open', () => {
    expect(marketStatusAt(etDate('2026-03-16T13:30:00+00:00'))).toBe('open')
  })
  it('Weekday 16:00 ET exactly → post', () => {
    expect(marketStatusAt(etDate('2026-03-16T20:00:00+00:00'))).toBe('post')
  })
  it('Weekday 19:59 ET → post', () => {
    expect(marketStatusAt(etDate('2026-03-16T23:59:00+00:00'))).toBe('post')
  })
  it('Weekday 20:00 ET → closed', () => {
    expect(marketStatusAt(etDate('2026-03-17T00:00:00+00:00'))).toBe('closed')
  })
  it('Weekday 03:59 ET → closed', () => {
    expect(marketStatusAt(etDate('2026-03-16T07:59:00+00:00'))).toBe('closed')
  })
  it('Weekday 04:00 ET → pre', () => {
    expect(marketStatusAt(etDate('2026-03-16T08:00:00+00:00'))).toBe('pre')
  })
})
