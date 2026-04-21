import { describe, expect, it } from 'vitest'
import { STRATEGY_TEMPLATES } from './templates'

describe('STRATEGY_TEMPLATES', () => {
  it('exports at least 6 templates', () => {
    expect(STRATEGY_TEMPLATES.length).toBeGreaterThanOrEqual(6)
  })
  it('every template has a unique key', () => {
    const keys = STRATEGY_TEMPLATES.map((t) => t.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
  it('every template has name, description, rules, natural_language', () => {
    for (const t of STRATEGY_TEMPLATES) {
      expect(t.name).toBeTruthy()
      expect(t.description).toBeTruthy()
      expect(t.natural_language).toBeTruthy()
      expect(t.rules.length).toBeGreaterThan(0)
    }
  })
  it('all rule operators are valid', () => {
    const valid = new Set(['>', '>=', '<', '<=', '==', '!=', 'between'])
    for (const t of STRATEGY_TEMPLATES) {
      for (const r of t.rules) {
        expect(valid.has(r.operator)).toBe(true)
      }
    }
  })
  it('between rules carry a [lo, hi] tuple', () => {
    for (const t of STRATEGY_TEMPLATES) {
      for (const r of t.rules) {
        if (r.operator === 'between') {
          expect(Array.isArray(r.value)).toBe(true)
          expect((r.value as number[]).length).toBe(2)
        }
      }
    }
  })
  it('non-between rules carry a number', () => {
    for (const t of STRATEGY_TEMPLATES) {
      for (const r of t.rules) {
        if (r.operator !== 'between') {
          expect(typeof r.value).toBe('number')
        }
      }
    }
  })
  it('buffett_value has ROE, D/E, P/E constraints', () => {
    const t = STRATEGY_TEMPLATES.find((x) => x.key === 'buffett_value')
    expect(t).toBeDefined()
    const metrics = t!.rules.map((r) => r.metric)
    expect(metrics).toContain('roe')
    expect(metrics).toContain('d_e')
    expect(metrics).toContain('pe')
  })
  it('lynch_growth enforces PEG < 1', () => {
    const t = STRATEGY_TEMPLATES.find((x) => x.key === 'lynch_growth')!
    const peg = t.rules.find((r) => r.metric === 'peg')!
    expect(peg.operator).toBe('<')
    expect(peg.value).toBe(1)
  })
  it('dividend_income requires div_yield > 0', () => {
    const t = STRATEGY_TEMPLATES.find((x) => x.key === 'dividend_income')!
    const y = t.rules.find((r) => r.metric === 'div_yield')!
    expect(y.operator).toBe('>')
    expect(y.value as number).toBeGreaterThan(0)
  })
})
