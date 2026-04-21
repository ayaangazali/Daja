export interface SparklineSize {
  width: number
  height: number
}

/**
 * Build an SVG path `d` attribute for a sparkline of the given points
 * constrained to width/height. Returns empty string for degenerate inputs.
 */
export function sparklinePath(points: number[], size: SparklineSize): string {
  if (!points || points.length < 2) return ''
  if (size.width <= 0 || size.height <= 0) return ''
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const stepX = size.width / (points.length - 1)
  return points
    .map((p, i) => {
      const x = i * stepX
      const y = size.height - ((p - min) / range) * size.height
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
}

export function sparklineColor(points: number[], pos: string, neg: string): string {
  if (!points || points.length < 2) return pos
  return points[points.length - 1] >= points[0] ? pos : neg
}
