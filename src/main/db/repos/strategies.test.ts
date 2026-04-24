// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { parseStrategyRules, StrategyRuleSchema } from './strategies'

describe('strategies zod schema', () => {
  it('accepts a simple scalar comparison', () => {
    const r = parseStrategyRules([{ metric: 'trailingPE', operator: '<', value: 20 }])
    expect(r[0].metric).toBe('trailingPE')
  })

  it('accepts a between range', () => {
    const r = parseStrategyRules([
      { metric: 'dividendYield', operator: 'between', value: [0.02, 0.06] }
    ])
    expect(r[0].value).toEqual([0.02, 0.06])
  })

  it('rejects unknown metric', () => {
    expect(() =>
      parseStrategyRules([{ metric: 'unknown_metric', operator: '<', value: 5 }])
    ).toThrow(/metric/)
  })

  it('rejects invalid operator', () => {
    expect(() =>
      parseStrategyRules([{ metric: 'trailingPE', operator: 'hmm', value: 5 }])
    ).toThrow(/operator/)
  })

  it('rejects scalar value with between operator', () => {
    expect(() =>
      parseStrategyRules([{ metric: 'trailingPE', operator: 'between', value: 5 }])
    ).toThrow(/between/)
  })

  it('rejects tuple value with scalar operator', () => {
    expect(() =>
      parseStrategyRules([{ metric: 'trailingPE', operator: '<', value: [5, 10] }])
    ).toThrow(/scalar/)
  })

  it('rejects between with min > max', () => {
    expect(() =>
      parseStrategyRules([
        { metric: 'trailingPE', operator: 'between', value: [100, 5] }
      ])
    ).toThrow(/min/)
  })

  it('StrategyRuleSchema.safeParse works standalone', () => {
    const r = StrategyRuleSchema.safeParse({
      metric: 'marketCap',
      operator: '>=',
      value: 1_000_000_000
    })
    expect(r.success).toBe(true)
  })
})
