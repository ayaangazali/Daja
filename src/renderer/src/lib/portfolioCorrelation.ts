import { correlation, logReturns } from './indicators'

export interface CorrelationCell {
  a: string
  b: string
  value: number | null
}

/**
 * Pairwise correlation of daily log returns across tickers.
 * Series are aligned by trailing common length before correlation is computed.
 */
export function correlationMatrix(
  series: Record<string, number[]>
): { tickers: string[]; matrix: CorrelationCell[][] } {
  const tickers = Object.keys(series).filter((t) => (series[t]?.length ?? 0) >= 30)
  const returnsMap: Record<string, number[]> = {}
  for (const t of tickers) {
    returnsMap[t] = logReturns(series[t])
  }

  const matrix: CorrelationCell[][] = tickers.map((a) =>
    tickers.map((b) => {
      if (a === b) return { a, b, value: 1 }
      const ra = returnsMap[a]
      const rb = returnsMap[b]
      if (!ra || !rb) return { a, b, value: null }
      const n = Math.min(ra.length, rb.length)
      if (n < 30) return { a, b, value: null }
      return { a, b, value: correlation(ra.slice(-n), rb.slice(-n)) }
    })
  )
  return { tickers, matrix }
}

/**
 * Summary diversification score: average off-diagonal correlation.
 * Lower is better (more diversification). Null if < 2 tickers.
 */
export function avgOffDiagonal(matrix: CorrelationCell[][]): number | null {
  const vals: number[] = []
  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix[i].length; j++) {
      if (i === j) continue
      const v = matrix[i][j].value
      if (v == null) continue
      vals.push(v)
    }
  }
  if (vals.length === 0) return null
  return vals.reduce((s, v) => s + v, 0) / vals.length
}
