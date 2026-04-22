/**
 * Composite quality scorecard. Combines Piotroski F-score, Altman Z-score,
 * ROIC, gross margin stability, FCF/NI conversion, and debt-to-equity into a
 * single 0..100 score with letter grade.
 */

export interface QualityInputs {
  piotroskiScore: number | null // 0..9
  altmanZ: number | null // > 3 safe, < 1.8 distress
  roicPct: number | null // return on invested capital
  grossMarginStdev: number | null // lower = more stable
  fcfConversionPct: number | null // FCF/NI %
  debtToEquity: number | null
  revenueCagr3y: number | null // %
  epsCagr3y: number | null // %
}

export interface QualityScoreResult {
  score: number // 0..100
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'
  breakdown: { name: string; points: number; max: number; note: string }[]
}

function scoreLinear(
  val: number | null,
  goodAt: number,
  badAt: number,
  max: number
): { points: number; note: string } {
  if (val == null) return { points: 0, note: 'n/a' }
  if (Number.isNaN(val)) return { points: 0, note: 'n/a' }
  const clampedVal = Math.max(Math.min(val, Math.max(goodAt, badAt)), Math.min(goodAt, badAt))
  let pct = 0
  if (goodAt > badAt) {
    pct = (clampedVal - badAt) / (goodAt - badAt)
  } else {
    pct = 1 - (clampedVal - goodAt) / (badAt - goodAt)
  }
  pct = Math.max(0, Math.min(1, pct))
  return { points: pct * max, note: `${val.toFixed(2)}` }
}

export function qualityScore(i: QualityInputs): QualityScoreResult {
  const breakdown: { name: string; points: number; max: number; note: string }[] = []

  // Piotroski (0..9) → 0..20 pts
  if (i.piotroskiScore != null) {
    breakdown.push({
      name: 'Piotroski',
      points: (i.piotroskiScore / 9) * 20,
      max: 20,
      note: `${i.piotroskiScore}/9`
    })
  } else {
    breakdown.push({ name: 'Piotroski', points: 0, max: 20, note: 'n/a' })
  }

  // Altman Z: z=3 or more → 15 pts, z≤1.8 → 0 pts, linear between
  const z = scoreLinear(i.altmanZ, 3, 1.8, 15)
  breakdown.push({ name: 'Altman Z', points: z.points, max: 15, note: z.note })

  // ROIC: 20% or more → 20 pts, 0% → 0 pts
  const roic = scoreLinear(i.roicPct, 20, 0, 20)
  breakdown.push({ name: 'ROIC', points: roic.points, max: 20, note: `${roic.note}%` })

  // Gross margin stdev (as pct) — 0 stdev = perfect, 10+ = 0 pts
  const gm = scoreLinear(i.grossMarginStdev, 0, 10, 10)
  breakdown.push({
    name: 'Gross margin stability',
    points: gm.points,
    max: 10,
    note: `σ=${gm.note}`
  })

  // FCF conversion: 100%+ = 10 pts, <30% = 0 pts
  const fcfc = scoreLinear(i.fcfConversionPct, 100, 30, 10)
  breakdown.push({
    name: 'FCF conversion',
    points: fcfc.points,
    max: 10,
    note: `${fcfc.note}%`
  })

  // Debt/Equity: <0.5 = 10 pts, >2 = 0 pts (inverse)
  const de = scoreLinear(i.debtToEquity, 0.5, 2, 10)
  breakdown.push({ name: 'Debt / Equity', points: de.points, max: 10, note: de.note })

  // Revenue CAGR 3y: 15%+ = 10 pts, 0% = 0
  const rCagr = scoreLinear(i.revenueCagr3y, 15, 0, 10)
  breakdown.push({
    name: 'Revenue CAGR (3y)',
    points: rCagr.points,
    max: 10,
    note: `${rCagr.note}%`
  })

  // EPS CAGR 3y: 15%+ = 5 pts
  const eCagr = scoreLinear(i.epsCagr3y, 15, 0, 5)
  breakdown.push({
    name: 'EPS CAGR (3y)',
    points: eCagr.points,
    max: 5,
    note: `${eCagr.note}%`
  })

  const total = breakdown.reduce((a, b) => a + b.points, 0)
  const score = Math.round(total)

  let grade: QualityScoreResult['grade'] = 'F'
  if (score >= 85) grade = 'A+'
  else if (score >= 75) grade = 'A'
  else if (score >= 60) grade = 'B'
  else if (score >= 45) grade = 'C'
  else if (score >= 30) grade = 'D'

  return { score, grade, breakdown }
}

/** Standard deviation of a number array as % of mean (coefficient of variation). */
export function coefficientOfVariation(vals: number[]): number | null {
  if (vals.length < 2) return null
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length
  if (mean === 0) return null
  const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length
  const sd = Math.sqrt(variance)
  return (sd / Math.abs(mean)) * 100
}
