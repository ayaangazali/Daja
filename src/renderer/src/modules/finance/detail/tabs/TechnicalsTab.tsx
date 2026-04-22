import { useMemo } from 'react'
import { useHistorical } from '../../../../hooks/useFinance'
import { cn } from '../../../../lib/cn'
import { SeasonalityPanel } from '../panels/SeasonalityPanel'
import { CrossSignals } from '../panels/CrossSignals'
import { IndicatorsPanel } from '../panels/IndicatorsPanel'
import { OscillatorsPanel } from '../panels/OscillatorsPanel'

function sma(arr: number[], p: number): number | null {
  if (arr.length < p) return null
  return arr.slice(-p).reduce((a, b) => a + b, 0) / p
}

function ema(arr: number[], p: number): number | null {
  if (arr.length < p) return null
  const k = 2 / (p + 1)
  let val = arr.slice(0, p).reduce((a, b) => a + b, 0) / p
  for (let i = p; i < arr.length; i++) val = arr[i] * k + val * (1 - k)
  return val
}

function rsi(arr: number[], p = 14): number | null {
  if (arr.length <= p) return null
  let gains = 0
  let losses = 0
  for (let i = arr.length - p; i < arr.length; i++) {
    const d = arr[i] - arr[i - 1]
    if (d >= 0) gains += d
    else losses -= d
  }
  if (losses === 0) return 100
  return 100 - 100 / (1 + gains / losses)
}

function macd(arr: number[]): { macd: number; signal: number; hist: number } | null {
  const e12 = ema(arr, 12)
  const e26 = ema(arr, 26)
  if (e12 == null || e26 == null) return null
  const m = e12 - e26
  const macdLine: number[] = []
  for (let i = 26; i <= arr.length; i++) {
    const a = ema(arr.slice(0, i), 12)
    const b = ema(arr.slice(0, i), 26)
    if (a != null && b != null) macdLine.push(a - b)
  }
  const sig = ema(macdLine, 9) ?? 0
  return { macd: m, signal: sig, hist: m - sig }
}

function stochastic(high: number[], low: number[], close: number[], p = 14): number | null {
  if (close.length < p) return null
  const hi = Math.max(...high.slice(-p))
  const lo = Math.min(...low.slice(-p))
  if (hi === lo) return 50
  return ((close[close.length - 1] - lo) / (hi - lo)) * 100
}

function williamsR(high: number[], low: number[], close: number[], p = 14): number | null {
  const s = stochastic(high, low, close, p)
  if (s == null) return null
  return s - 100
}

function atr(high: number[], low: number[], close: number[], p = 14): number | null {
  if (close.length < p + 1) return null
  const trs: number[] = []
  for (let i = 1; i < close.length; i++) {
    trs.push(
      Math.max(high[i] - low[i], Math.abs(high[i] - close[i - 1]), Math.abs(low[i] - close[i - 1]))
    )
  }
  return trs.slice(-p).reduce((a, b) => a + b, 0) / p
}

function pivots(
  high: number,
  low: number,
  close: number
): {
  classic: { R3: number; R2: number; R1: number; P: number; S1: number; S2: number; S3: number }
  fibonacci: { R3: number; R2: number; R1: number; P: number; S1: number; S2: number; S3: number }
} {
  const P = (high + low + close) / 3
  const range = high - low
  return {
    classic: {
      R3: high + 2 * (P - low),
      R2: P + (high - low),
      R1: 2 * P - low,
      P,
      S1: 2 * P - high,
      S2: P - (high - low),
      S3: low - 2 * (high - P)
    },
    fibonacci: {
      R3: P + range,
      R2: P + 0.618 * range,
      R1: P + 0.382 * range,
      P,
      S1: P - 0.382 * range,
      S2: P - 0.618 * range,
      S3: P - range
    }
  }
}

function score(
  v: number | null,
  buyIf: (x: number) => boolean,
  sellIf: (x: number) => boolean
): 'buy' | 'sell' | 'neutral' {
  if (v == null) return 'neutral'
  if (buyIf(v)) return 'buy'
  if (sellIf(v)) return 'sell'
  return 'neutral'
}

export function TechnicalsTab({ ticker }: { ticker: string }): React.JSX.Element {
  const { data: bars = [], isLoading } = useHistorical(ticker, '1y')

  const computed = useMemo(() => {
    const close = bars.map((b) => b.close).filter((c): c is number => c != null)
    const high = bars.map((b) => b.high ?? b.close ?? 0)
    const low = bars.map((b) => b.low ?? b.close ?? 0)
    if (close.length === 0) return null
    const last = close[close.length - 1]
    return {
      last,
      mas: {
        sma5: sma(close, 5),
        sma10: sma(close, 10),
        sma20: sma(close, 20),
        sma50: sma(close, 50),
        sma100: sma(close, 100),
        sma200: sma(close, 200),
        ema20: ema(close, 20),
        ema50: ema(close, 50)
      },
      osc: {
        rsi14: rsi(close, 14),
        stoch14: stochastic(high, low, close, 14),
        williams14: williamsR(high, low, close, 14),
        macd: macd(close),
        atr14: atr(high, low, close, 14)
      },
      pivots: pivots(
        Math.max(...high.slice(-20)),
        Math.min(...low.slice(-20)),
        close[close.length - 1]
      )
    }
  }, [bars])

  if (isLoading || !computed) {
    return <div className="p-4 text-[11px] text-[var(--color-fg-muted)]">Computing technicals…</div>
  }

  const maRows = [
    ['SMA 5', computed.mas.sma5],
    ['SMA 10', computed.mas.sma10],
    ['SMA 20', computed.mas.sma20],
    ['SMA 50', computed.mas.sma50],
    ['SMA 100', computed.mas.sma100],
    ['SMA 200', computed.mas.sma200],
    ['EMA 20', computed.mas.ema20],
    ['EMA 50', computed.mas.ema50]
  ] as const

  return (
    <div className="space-y-3 p-3">
      <IndicatorsPanel ticker={ticker} />
      <OscillatorsPanel ticker={ticker} />
      <CrossSignals ticker={ticker} />
      <SeasonalityPanel ticker={ticker} />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card title="Moving Averages">
          <table className="w-full text-[11px]">
            <tbody>
              {maRows.map(([name, v]) => {
                const sig =
                  v == null
                    ? 'neutral'
                    : computed.last > v
                      ? 'buy'
                      : computed.last < v
                        ? 'sell'
                        : 'neutral'
                return (
                  <tr key={name} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="py-1 text-[var(--color-fg-muted)]">{name}</td>
                    <td className="py-1 text-right font-mono tabular">{v?.toFixed(2) ?? '—'}</td>
                    <td className="py-1 pl-2 text-right">
                      <SigPill sig={sig} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
        <Card title="Oscillators">
          <table className="w-full text-[11px]">
            <tbody>
              <tr className="border-b border-[var(--color-border)]">
                <td className="py-1 text-[var(--color-fg-muted)]">RSI 14</td>
                <td className="py-1 text-right font-mono tabular">
                  {computed.osc.rsi14?.toFixed(2) ?? '—'}
                </td>
                <td className="py-1 pl-2 text-right">
                  <SigPill
                    sig={score(
                      computed.osc.rsi14,
                      (x) => x < 30,
                      (x) => x > 70
                    )}
                  />
                </td>
              </tr>
              <tr className="border-b border-[var(--color-border)]">
                <td className="py-1 text-[var(--color-fg-muted)]">Stoch %K</td>
                <td className="py-1 text-right font-mono tabular">
                  {computed.osc.stoch14?.toFixed(2) ?? '—'}
                </td>
                <td className="py-1 pl-2 text-right">
                  <SigPill
                    sig={score(
                      computed.osc.stoch14,
                      (x) => x < 20,
                      (x) => x > 80
                    )}
                  />
                </td>
              </tr>
              <tr className="border-b border-[var(--color-border)]">
                <td className="py-1 text-[var(--color-fg-muted)]">Williams %R</td>
                <td className="py-1 text-right font-mono tabular">
                  {computed.osc.williams14?.toFixed(2) ?? '—'}
                </td>
                <td className="py-1 pl-2 text-right">
                  <SigPill
                    sig={score(
                      computed.osc.williams14,
                      (x) => x < -80,
                      (x) => x > -20
                    )}
                  />
                </td>
              </tr>
              <tr className="border-b border-[var(--color-border)]">
                <td className="py-1 text-[var(--color-fg-muted)]">MACD</td>
                <td className="py-1 text-right font-mono tabular">
                  {computed.osc.macd?.macd.toFixed(3) ?? '—'}
                </td>
                <td className="py-1 pl-2 text-right">
                  <SigPill
                    sig={
                      computed.osc.macd == null
                        ? 'neutral'
                        : computed.osc.macd.hist > 0
                          ? 'buy'
                          : 'sell'
                    }
                  />
                </td>
              </tr>
              <tr>
                <td className="py-1 text-[var(--color-fg-muted)]">ATR 14</td>
                <td className="py-1 text-right font-mono tabular">
                  {computed.osc.atr14?.toFixed(2) ?? '—'}
                </td>
                <td className="py-1 pl-2 text-right">—</td>
              </tr>
            </tbody>
          </table>
        </Card>
        <Card title="Pivot Points (20d)">
          <div className="space-y-2 text-[11px]">
            <div>
              <div className="mb-1 text-[10px] uppercase text-[var(--color-fg-muted)]">Classic</div>
              <PivotList values={computed.pivots.classic} last={computed.last} />
            </div>
            <div>
              <div className="mb-1 text-[10px] uppercase text-[var(--color-fg-muted)]">
                Fibonacci
              </div>
              <PivotList values={computed.pivots.fibonacci} last={computed.last} />
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

function Card({
  title,
  children
}: {
  title: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
        {title}
      </div>
      {children}
    </div>
  )
}

function SigPill({ sig }: { sig: 'buy' | 'sell' | 'neutral' }): React.JSX.Element {
  return (
    <span
      className={cn(
        'rounded px-1 py-0.5 text-[9px] font-semibold uppercase',
        sig === 'buy' && 'bg-[var(--color-pos)]/20 text-[var(--color-pos)]',
        sig === 'sell' && 'bg-[var(--color-neg)]/20 text-[var(--color-neg)]',
        sig === 'neutral' && 'bg-[var(--color-fg-muted)]/10 text-[var(--color-fg-muted)]'
      )}
    >
      {sig}
    </span>
  )
}

function PivotList({
  values,
  last
}: {
  values: { R3: number; R2: number; R1: number; P: number; S1: number; S2: number; S3: number }
  last: number
}): React.JSX.Element {
  const rows: [string, number][] = [
    ['R3', values.R3],
    ['R2', values.R2],
    ['R1', values.R1],
    ['P', values.P],
    ['S1', values.S1],
    ['S2', values.S2],
    ['S3', values.S3]
  ]
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
      {rows.map(([label, v]) => (
        <div key={label} className="flex items-center justify-between">
          <span className="text-[var(--color-fg-muted)]">{label}</span>
          <span
            className={cn(
              'font-mono tabular',
              Math.abs(last - v) / v < 0.005 && 'text-[var(--color-warn)]'
            )}
          >
            {v.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  )
}
