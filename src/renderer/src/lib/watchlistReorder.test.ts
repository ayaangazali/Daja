import { describe, expect, it } from 'vitest'
import { moveInList, sortOrdersAfterMove } from './watchlistReorder'

describe('moveInList', () => {
  it('moves element forward', () => {
    expect(moveInList(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd'])
  })
  it('moves element backward', () => {
    expect(moveInList(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c'])
  })
  it('no-op when from === to', () => {
    expect(moveInList(['a', 'b'], 0, 0)).toEqual(['a', 'b'])
  })
  it('no-op on out-of-bounds from', () => {
    expect(moveInList(['a', 'b'], -1, 0)).toEqual(['a', 'b'])
    expect(moveInList(['a', 'b'], 5, 0)).toEqual(['a', 'b'])
  })
  it('no-op on out-of-bounds to', () => {
    expect(moveInList(['a', 'b'], 0, 5)).toEqual(['a', 'b'])
  })
  it('does not mutate input', () => {
    const input = ['x', 'y', 'z']
    moveInList(input, 0, 2)
    expect(input).toEqual(['x', 'y', 'z'])
  })
  it('handles single-element array', () => {
    expect(moveInList(['x'], 0, 0)).toEqual(['x'])
  })
  it('empty array returns empty copy', () => {
    expect(moveInList([], 0, 0)).toEqual([])
  })
  it('objects preserved by reference', () => {
    const a = { id: 1 }
    const b = { id: 2 }
    const result = moveInList([a, b], 0, 1)
    expect(result[0]).toBe(b)
    expect(result[1]).toBe(a)
  })
})

describe('sortOrdersAfterMove', () => {
  it('produces 0-indexed sort orders', () => {
    expect(sortOrdersAfterMove([10, 20, 30])).toEqual([
      { id: 10, sort_order: 0 },
      { id: 20, sort_order: 1 },
      { id: 30, sort_order: 2 }
    ])
  })
  it('empty → empty', () => {
    expect(sortOrdersAfterMove([])).toEqual([])
  })
})
