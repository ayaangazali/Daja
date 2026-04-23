import { describe, expect, it } from 'vitest'
import { daysUntil, getUpcomingMacroEvents, MACRO_EVENTS_2026 } from './macroCalendar'

describe('macroCalendar', () => {
  it('has a reasonable number of events', () => {
    expect(MACRO_EVENTS_2026.length).toBeGreaterThan(15)
  })
  it('all events have required fields', () => {
    for (const e of MACRO_EVENTS_2026) {
      expect(e.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(e.name.length).toBeGreaterThan(3)
      expect(['high', 'medium', 'low']).toContain(e.impact)
      expect(['fed', 'inflation', 'jobs', 'growth', 'treasury', 'consumer']).toContain(e.category)
    }
  })
  it('getUpcomingMacroEvents filters by window', () => {
    const ref = new Date('2026-04-01T00:00:00Z')
    const events = getUpcomingMacroEvents(ref, 30)
    expect(events.length).toBeGreaterThan(0)
    for (const e of events) {
      const d = daysUntil(e, ref)
      expect(d).toBeGreaterThanOrEqual(-1)
      expect(d).toBeLessThanOrEqual(30)
    }
  })
  it('daysUntil computes correct delta', () => {
    const ref = new Date('2026-03-01T00:00:00Z')
    const mar12 = MACRO_EVENTS_2026.find((e) => e.date === '2026-03-12')!
    expect(daysUntil(mar12, ref)).toBe(11)
  })
  it('events are sorted after getUpcomingMacroEvents', () => {
    const events = getUpcomingMacroEvents(new Date('2026-01-01T00:00:00Z'), 365)
    for (let i = 1; i < events.length; i++) {
      expect(events[i].date >= events[i - 1].date).toBe(true)
    }
  })
})
