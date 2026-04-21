import { useEffect, useRef, useState } from 'react'
import { cn } from '../lib/cn'
import { fmtPrice } from '../lib/format'

export function FlashPrice({
  value,
  digits = 2,
  className,
  prefix = ''
}: {
  value: number | null | undefined
  digits?: number
  className?: string
  prefix?: string
}): React.JSX.Element {
  const prev = useRef<number | null | undefined>(value)
  const [flash, setFlash] = useState<'up' | 'down' | null>(null)

  useEffect(() => {
    if (
      prev.current != null &&
      value != null &&
      prev.current !== value &&
      Number.isFinite(prev.current) &&
      Number.isFinite(value)
    ) {
      setFlash(value > prev.current ? 'up' : 'down')
      const t = setTimeout(() => setFlash(null), 600)
      return () => clearTimeout(t)
    }
    prev.current = value
    return
  }, [value])

  useEffect(() => {
    if (value != null) prev.current = value
  }, [value])

  return (
    <span
      className={cn(
        'tabular transition-colors duration-500',
        flash === 'up' && 'bg-[var(--color-pos)]/25 text-[var(--color-pos)]',
        flash === 'down' && 'bg-[var(--color-neg)]/25 text-[var(--color-neg)]',
        className
      )}
    >
      {prefix}
      {fmtPrice(value, digits)}
    </span>
  )
}
