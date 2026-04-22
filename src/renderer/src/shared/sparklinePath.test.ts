import { describe, expect, it } from 'vitest'
import { sparklineColor, sparklinePath } from './sparklinePath'

const size = { width: 100, height: 20 }

describe('sparklinePath', () => {
  it('empty for 0 or 1 point', () => {
    expect(sparklinePath([], size)).toBe('')
    expect(sparklinePath([5], size)).toBe('')
  })
  it('empty for zero/neg dimensions', () => {
    expect(sparklinePath([1, 2, 3], { width: 0, height: 20 })).toBe('')
    expect(sparklinePath([1, 2, 3], { width: 100, height: -1 })).toBe('')
  })
  it('first command is always M', () => {
    const d = sparklinePath([1, 2, 3], size)
    expect(d.startsWith('M')).toBe(true)
  })
  it('subsequent commands are L', () => {
    const d = sparklinePath([1, 2, 3], size)
    expect(
      d
        .split(' ')
        .slice(1)
        .every((seg) => seg.startsWith('L'))
    ).toBe(true)
  })
  it('evenly distributes x across width', () => {
    const d = sparklinePath([0, 1, 2, 3], { width: 90, height: 10 })
    const xs = d.split(' ').map((seg) => parseFloat(seg.slice(1).split(',')[0]))
    expect(xs[0]).toBe(0)
    expect(xs[xs.length - 1]).toBe(90)
  })
  it('min value maps to bottom (y = height), max to top (y = 0)', () => {
    const d = sparklinePath([5, 10, 5], { width: 100, height: 100 })
    const ys = d.split(' ').map((seg) => parseFloat(seg.split(',')[1]))
    // First and last should be max-y (bottom = 100), middle should be 0 (top)
    expect(ys[0]).toBeCloseTo(100, 1)
    expect(ys[1]).toBeCloseTo(0, 1)
  })
  it('flat series produces path at bottom', () => {
    const d = sparklinePath([5, 5, 5, 5], { width: 100, height: 50 })
    const ys = d.split(' ').map((seg) => parseFloat(seg.split(',')[1]))
    // When range is 0, division fallback is 1 — all y values equal height
    expect(ys.every((y) => y === 50)).toBe(true)
  })
  it('returns non-empty path for long series', () => {
    const pts = Array.from({ length: 100 }, (_, i) => Math.sin(i))
    const d = sparklinePath(pts, size)
    expect(d.length).toBeGreaterThan(200)
  })
})

describe('sparklineColor', () => {
  it('pos when last >= first', () => {
    expect(sparklineColor([1, 2, 3], 'pos', 'neg')).toBe('pos')
    expect(sparklineColor([5, 5], 'pos', 'neg')).toBe('pos')
  })
  it('neg when last < first', () => {
    expect(sparklineColor([3, 2, 1], 'pos', 'neg')).toBe('neg')
  })
  it('pos fallback for degenerate input', () => {
    expect(sparklineColor([], 'pos', 'neg')).toBe('pos')
    expect(sparklineColor([5], 'pos', 'neg')).toBe('pos')
  })
})
