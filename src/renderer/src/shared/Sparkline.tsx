interface Props {
  points: number[]
  width?: number
  height?: number
  stroke?: string
  className?: string
}

export function Sparkline({
  points,
  width = 80,
  height = 24,
  stroke,
  className
}: Props): React.JSX.Element {
  if (!points || points.length < 2) {
    return <svg width={width} height={height} className={className} />
  }
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const stepX = width / (points.length - 1)
  const d = points
    .map((p, i) => {
      const x = i * stepX
      const y = height - ((p - min) / range) * height
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
  const color =
    stroke ?? (points[points.length - 1] >= points[0] ? 'var(--color-pos)' : 'var(--color-neg)')
  return (
    <svg width={width} height={height} className={className} preserveAspectRatio="none">
      <path d={d} fill="none" stroke={color} strokeWidth={1.25} />
    </svg>
  )
}
