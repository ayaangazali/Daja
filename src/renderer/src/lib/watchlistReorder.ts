export interface HasId {
  id: number
}

/**
 * Reorder an array by moving the item at `fromIdx` to `toIdx`.
 * Non-mutating — returns a new array.
 * Indices outside bounds are clamped/no-op.
 */
export function moveInList<T>(arr: T[], fromIdx: number, toIdx: number): T[] {
  if (fromIdx === toIdx) return [...arr]
  if (fromIdx < 0 || fromIdx >= arr.length) return [...arr]
  if (toIdx < 0 || toIdx >= arr.length) return [...arr]
  const copy = [...arr]
  const [moved] = copy.splice(fromIdx, 1)
  copy.splice(toIdx, 0, moved)
  return copy
}

export function sortOrdersAfterMove(ids: number[]): { id: number; sort_order: number }[] {
  return ids.map((id, idx) => ({ id, sort_order: idx }))
}
