/**
 * Daja number-formatting conventions (keep consistent across widgets):
 * - Null/undefined/NaN/Infinity → '—' (em dash)
 * - Positive values ALWAYS get explicit '+' prefix for deltas (fmtPct, fmtSignedPrice)
 * - Negative uses standard leading '-' (no parentheses — cross-cultural friendlier)
 * - Currency symbol is NOT baked into fmtPrice; callers prepend '$' to allow
 *   different symbols (€, £) in future. See fmtUSD for convenience.
 * - K/M/B/T abbreviation via fmtLargeNum
 */
export function fmtPrice(v: number | null | undefined, digits = 2): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return v.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

/** Convenience: USD-prefixed price. Use this for new code instead of `$` + fmtPrice. */
export function fmtUSD(v: number | null | undefined, digits = 2): string {
  if (v == null || !Number.isFinite(v)) return '—'
  const abs = Math.abs(v)
  const s = abs.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  })
  return v < 0 ? `-$${s}` : `$${s}`
}

export function fmtPct(v: number | null | undefined, digits = 2): string {
  if (v == null || !Number.isFinite(v)) return '—'
  const sign = v > 0 ? '+' : ''
  return `${sign}${v.toFixed(digits)}%`
}

export function fmtSignedPrice(v: number | null | undefined, digits = 2): string {
  if (v == null || !Number.isFinite(v)) return '—'
  const sign = v > 0 ? '+' : ''
  return `${sign}${v.toFixed(digits)}`
}

export function fmtLargeNum(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  const abs = Math.abs(v)
  if (abs >= 1e12) return `${(v / 1e12).toFixed(2)}T`
  if (abs >= 1e9) return `${(v / 1e9).toFixed(2)}B`
  if (abs >= 1e6) return `${(v / 1e6).toFixed(2)}M`
  if (abs >= 1e3) return `${(v / 1e3).toFixed(2)}K`
  return v.toFixed(0)
}

export function signColor(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v) || v === 0) return 'text-[var(--color-fg-muted)]'
  return v > 0 ? 'text-[var(--color-pos)]' : 'text-[var(--color-neg)]'
}
