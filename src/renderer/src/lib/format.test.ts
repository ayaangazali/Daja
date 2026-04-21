import { describe, expect, it } from 'vitest'
import { fmtPrice, fmtPct, fmtSignedPrice, fmtLargeNum, signColor } from './format'

describe('fmtPrice', () => {
  it('formats typical stock prices with 2 decimals', () => {
    expect(fmtPrice(123.456)).toBe('123.46')
    expect(fmtPrice(0.01)).toBe('0.01')
  })
  it('handles negative numbers', () => {
    expect(fmtPrice(-5.5)).toBe('-5.50')
  })
  it('returns em-dash for null/undefined/NaN/Infinity', () => {
    expect(fmtPrice(null)).toBe('—')
    expect(fmtPrice(undefined)).toBe('—')
    expect(fmtPrice(NaN)).toBe('—')
    expect(fmtPrice(Infinity)).toBe('—')
    expect(fmtPrice(-Infinity)).toBe('—')
  })
  it('respects digits option', () => {
    expect(fmtPrice(3.14159, 4)).toBe('3.1416')
    expect(fmtPrice(1, 0)).toBe('1')
  })
  it('uses thousands separators', () => {
    expect(fmtPrice(1234567.89)).toBe('1,234,567.89')
  })
})

describe('fmtPct', () => {
  it('prepends + for positive', () => {
    expect(fmtPct(5.25)).toBe('+5.25%')
  })
  it('keeps negative sign', () => {
    expect(fmtPct(-3.1)).toBe('-3.10%')
  })
  it('zero is no prefix but formatted', () => {
    expect(fmtPct(0)).toBe('0.00%')
  })
  it('em-dash on null', () => {
    expect(fmtPct(null)).toBe('—')
    expect(fmtPct(undefined)).toBe('—')
  })
  it('respects digits', () => {
    expect(fmtPct(1.23456, 4)).toBe('+1.2346%')
  })
})

describe('fmtSignedPrice', () => {
  it('adds + for positive', () => {
    expect(fmtSignedPrice(2.5)).toBe('+2.50')
  })
  it('negative keeps -', () => {
    expect(fmtSignedPrice(-7)).toBe('-7.00')
  })
  it('em-dash null', () => {
    expect(fmtSignedPrice(null)).toBe('—')
  })
})

describe('fmtLargeNum', () => {
  it('formats billions', () => {
    expect(fmtLargeNum(3_500_000_000)).toBe('3.50B')
  })
  it('formats trillions', () => {
    expect(fmtLargeNum(1.234e12)).toBe('1.23T')
  })
  it('formats millions', () => {
    expect(fmtLargeNum(2_500_000)).toBe('2.50M')
  })
  it('formats thousands', () => {
    expect(fmtLargeNum(12_345)).toBe('12.35K')
  })
  it('sub-thousand stays integer', () => {
    expect(fmtLargeNum(999)).toBe('999')
    expect(fmtLargeNum(0)).toBe('0')
  })
  it('handles negatives', () => {
    expect(fmtLargeNum(-1_500_000)).toBe('-1.50M')
  })
  it('em-dash on null/NaN/Infinity', () => {
    expect(fmtLargeNum(null)).toBe('—')
    expect(fmtLargeNum(undefined)).toBe('—')
    expect(fmtLargeNum(NaN)).toBe('—')
    expect(fmtLargeNum(Infinity)).toBe('—')
  })
})

describe('signColor', () => {
  it('positive → pos class', () => {
    expect(signColor(1)).toContain('color-pos')
  })
  it('negative → neg class', () => {
    expect(signColor(-1)).toContain('color-neg')
  })
  it('zero/null → muted', () => {
    expect(signColor(0)).toContain('fg-muted')
    expect(signColor(null)).toContain('fg-muted')
    expect(signColor(undefined)).toContain('fg-muted')
  })
})
