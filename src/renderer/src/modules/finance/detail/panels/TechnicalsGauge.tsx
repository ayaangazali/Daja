import { useMemo } from 'react'
import { useHistorical } from '../../../../hooks/useFinance'
import { cn } from '../../../../lib/cn'

function sma(arr: number[], period: number): number | null {
  if (arr.length < period) return null
  const slice = arr.slice(-period)
  return slice.reduce((a, b) => a + b, 0) / period
}

function rsi(arr: number[], period = 14): number | null {
  if (arr.length <= period) return null
  let gains = 0
  let losses = 0
  for (let i = arr.length - period; i < arr.length; i++) {
    const diff = arr[i] - arr[i - 1]
    if (diff >= 0) gains += diff
    else losses -= diff
  }
  if (losses === 0) return 100
  const rs = gains / losses
  return 100 - 100 / (1 + rs)
}

interface Signal {
  name: string
  value: string
  signal: 'buy' | 'sell' | 'neutral'
}

export function TechnicalsGauge({ ticker }: { ticker: string }): React.JSX.Element {
  const { data: bars = [] } = useHistorical(ticker, '1y')

  const signals = useMemo((): { items: Signal[]; score: number } => {
    const closes = bars.map((b) => b.close).filter((c): c is number => c != null)
    if (closes.length === 0) return { items: [], score: 0 }
    const price = closes[closes.length - 1]
    const s20 = sma(closes, 20)
    const s50 = sma(closes, 50)
    const s100 = sma(closes, 100)
    const s200 = sma(closes, 200)
    const r = rsi(closes, 14)
    const items: Signal[] = []

    const pushMA = (name: string, v: number | null): void => {
      if (v == null) return
      items.push({
        name,
        value: v.toFixed(2),
        signal: price > v ? 'buy' : price < v ? 'sell' : 'neutral'
      })
    }
    pushMA('SMA 20', s20)
    pushMA('SMA 50', s50)
    pushMA('SMA 100', s100)
    pushMA('SMA 200', s200)
    if (r != null) {
      items.push({
        name: 'RSI 14',
        value: r.toFixed(2),
        signal: r > 70 ? 'sell' : r < 30 ? 'buy' : 'neutral'
      })
    }
    const buys = items.filter((i) => i.signal === 'buy').length
    const sells = items.filter((i) => i.signal === 'sell').length
    const score = items.length === 0 ? 0 : ((buys - sells) / items.length) * 100
    return { items, score }
  }, [bars])

  const label =
    signals.score >= 40
      ? 'BUY'
      : signals.score >= 10
        ? 'LEAN BUY'
        : signals.score <= -40
          ? 'SELL'
          : signals.score <= -10
            ? 'LEAN SELL'
            : 'NEUTRAL'
  const color =
    signals.score >= 10
      ? 'text-[var(--color-pos)]'
      : signals.score <= -10
        ? 'text-[var(--color-neg)]'
        : 'text-[var(--color-warn)]'

  const norm = Math.max(-100, Math.min(100, signals.score))
  const angle = ((norm + 100) / 200) * 180 - 90
  return (
    <div
      className={cn(
        'rounded-md border p-3',
        'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
      )}
    >
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
        Technicals
      </div>
      <div className="flex items-center gap-3">
        <svg viewBox="0 0 100 60" width="120" height="72">
          <path d="M 10 55 A 40 40 0 0 1 90 55" fill="none" stroke="#1f252d" strokeWidth="6" />
          <path
            d="M 10 55 A 40 40 0 0 1 90 55"
            fill="none"
            stroke="url(#gauge)"
            strokeWidth="6"
            strokeDasharray={`${Math.abs(norm) * 1.25} 200`}
            strokeDashoffset={norm < 0 ? 0 : 0}
          />
          <defs>
            <linearGradient id="gauge" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#e24b4a" />
              <stop offset="50%" stopColor="#ba7517" />
              <stop offset="100%" stopColor="#1d9e75" />
            </linearGradient>
          </defs>
          <line
            x1="50"
            y1="55"
            x2={50 + Math.cos(((angle - 90) * Math.PI) / 180) * 35}
            y2={55 + Math.sin(((angle - 90) * Math.PI) / 180) * 35}
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <circle cx="50" cy="55" r="3" fill="currentColor" />
        </svg>
        <div>
          <div className={cn('text-lg font-bold', color)}>{label}</div>
          <div className="text-[10px] text-[var(--color-fg-muted)] tabular">
            Score {signals.score.toFixed(0)}
          </div>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-1 gap-0.5 text-[10px]">
        {signals.items.map((s) => (
          <div key={s.name} className="flex items-center justify-between">
            <span className="text-[var(--color-fg-muted)]">{s.name}</span>
            <div className="flex items-center gap-2">
              <span className="font-mono tabular">{s.value}</span>
              <span
                className={cn(
                  'rounded px-1 py-0.5 text-[9px] font-semibold uppercase',
                  s.signal === 'buy' && 'bg-[var(--color-pos)]/20 text-[var(--color-pos)]',
                  s.signal === 'sell' && 'bg-[var(--color-neg)]/20 text-[var(--color-neg)]',
                  s.signal === 'neutral' &&
                    'bg-[var(--color-fg-muted)]/10 text-[var(--color-fg-muted)]'
                )}
              >
                {s.signal}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
