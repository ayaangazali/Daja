export interface AlertThresholds {
  above: number | null
  below: number | null
}

/**
 * Returns true when the CURRENT price has crossed a threshold but the PREVIOUS
 * price had not yet (edge-trigger). Used to fire-once notification logic.
 */
export function isCrossedAbove(
  current: number | null | undefined,
  previous: number | null | undefined,
  above: number | null
): boolean {
  if (above == null) return false
  if (current == null || !Number.isFinite(current)) return false
  if (previous == null || !Number.isFinite(previous)) {
    return current >= above
  }
  return previous < above && current >= above
}

export function isCrossedBelow(
  current: number | null | undefined,
  previous: number | null | undefined,
  below: number | null
): boolean {
  if (below == null) return false
  if (current == null || !Number.isFinite(current)) return false
  if (previous == null || !Number.isFinite(previous)) {
    return current <= below
  }
  return previous > below && current <= below
}

export function validateThreshold(
  above: number | null,
  below: number | null,
  current: number | null | undefined
): string[] {
  const errs: string[] = []
  if (above != null && below != null && below >= above) {
    errs.push('Below threshold must be less than above threshold')
  }
  if (current != null && above != null && above <= current) {
    errs.push('Above threshold is already at/below current price')
  }
  if (current != null && below != null && below >= current) {
    errs.push('Below threshold is already at/above current price')
  }
  return errs
}
