import { useMemo, useState } from 'react'
import { Activity } from 'lucide-react'
import { useHistorical } from '../../../../hooks/useFinance'
import {
  bollingerSeries,
  donchianChannels,
  emaSeries,
  ichimoku,
  keltnerChannels,
  macdSeries,
  obv,
  rsiSeries,
  smaSeries,
  vwap
} from '../../../../lib/indicators2'
import {
  MultiLineChart,
  ZeroBarChart,
  BarChart
} from '../../../../components/charts/ChartPrimitives'
import { cn } from '../../../../lib/cn'

type Overlay =
  | 'sma20'
  | 'sma50'
  | 'sma200'
  | 'ema9'
  | 'ema21'
  | 'bollinger'
  | 'vwap'
  | 'keltner'
  | 'donchian'
  | 'ichimoku'

const OVERLAYS: { key: Overlay; label: string; color: string }[] = [
  { key: 'sma20', label: 'SMA 20', color: '#60a5fa' },
  { key: 'sma50', label: 'SMA 50', color: '#fbbf24' },
  { key: 'sma200', label: 'SMA 200', color: '#f87171' },
  { key: 'ema9', label: 'EMA 9', color: '#c084fc' },
  { key: 'ema21', label: 'EMA 21', color: '#34d399' },
  { key: 'bollinger', label: 'Bollinger', color: '#a78bfa' },
  { key: 'vwap', label: 'VWAP', color: '#fb923c' },
  { key: 'keltner', label: 'Keltner', color: '#38bdf8' },
  { key: 'donchian', label: 'Donchian', color: '#facc15' },
  { key: 'ichimoku', label: 'Ichimoku', color: '#22d3ee' }
]

export function IndicatorsPanel({ ticker }: { ticker: string }): React.JSX.Element {
  const [range, setRange] = useState<'3mo' | '6mo' | '1y' | '2y'>('6mo')
  const { data: bars = [], isLoading } = useHistorical(ticker, range)
  const [active, setActive] = useState<Set<Overlay>>(new Set(['sma20', 'sma50', 'bollinger']))

  const closes = useMemo(
    () => bars.map((b) => b.close).filter((v): v is number => v != null && Number.isFinite(v)),
    [bars]
  )
  const highs = useMemo(() => bars.map((b) => b.high ?? b.close ?? 0), [bars])
  const lows = useMemo(() => bars.map((b) => b.low ?? b.close ?? 0), [bars])
  const vols = useMemo(() => bars.map((b) => b.volume ?? 0), [bars])

  const overlaySeries = useMemo(() => {
    const out: { key: Overlay; values: (number | null)[]; color: string; label: string }[] = []
    for (const o of OVERLAYS) {
      if (!active.has(o.key)) continue
      if (o.key === 'sma20') out.push({ ...o, values: smaSeries(closes, 20) })
      else if (o.key === 'sma50') out.push({ ...o, values: smaSeries(closes, 50) })
      else if (o.key === 'sma200') out.push({ ...o, values: smaSeries(closes, 200) })
      else if (o.key === 'ema9') out.push({ ...o, values: emaSeries(closes, 9) })
      else if (o.key === 'ema21') out.push({ ...o, values: emaSeries(closes, 21) })
      else if (o.key === 'vwap') out.push({ ...o, values: vwap(highs, lows, closes, vols) })
    }
    return out
  }, [closes, highs, lows, vols, active])

  const bollinger = useMemo(
    () => (active.has('bollinger') ? bollingerSeries(closes, 20, 2) : null),
    [closes, active]
  )
  const keltner = useMemo(
    () => (active.has('keltner') ? keltnerChannels(highs, lows, closes, 20, 2) : null),
    [highs, lows, closes, active]
  )
  const donchian = useMemo(
    () => (active.has('donchian') ? donchianChannels(highs, lows, 20) : null),
    [highs, lows, active]
  )
  const ichi = useMemo(
    () => (active.has('ichimoku') ? ichimoku(highs, lows, closes) : null),
    [highs, lows, closes, active]
  )

  const rsi = useMemo(() => rsiSeries(closes, 14), [closes])
  const macd = useMemo(() => macdSeries(closes, 12, 26, 9), [closes])
  const obvSeries = useMemo(() => obv(closes, vols), [closes, vols])

  const toggle = (o: Overlay): void => {
    setActive((prev) => {
      const next = new Set(prev)
      if (next.has(o)) next.delete(o)
      else next.add(o)
      return next
    })
  }

  if (isLoading || closes.length === 0) {
    return (
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3 text-[11px] text-[var(--color-fg-muted)]">
        Loading indicators…
      </div>
    )
  }

  const priceSeries = [
    { values: closes as (number | null)[], color: 'var(--color-fg)', strokeWidth: 1.4 },
    ...overlaySeries.map((o) => ({
      values: o.values,
      color: o.color,
      strokeWidth: 1
    })),
    ...(bollinger
      ? [
          { values: bollinger.upper, color: '#a78bfa', strokeWidth: 0.8, dashed: true },
          { values: bollinger.middle, color: '#a78bfa', strokeWidth: 0.8 },
          { values: bollinger.lower, color: '#a78bfa', strokeWidth: 0.8, dashed: true }
        ]
      : []),
    ...(keltner
      ? [
          { values: keltner.upper, color: '#38bdf8', strokeWidth: 0.8, dashed: true },
          { values: keltner.lower, color: '#38bdf8', strokeWidth: 0.8, dashed: true }
        ]
      : []),
    ...(donchian
      ? [
          { values: donchian.upper, color: '#facc15', strokeWidth: 0.8, dashed: true },
          { values: donchian.lower, color: '#facc15', strokeWidth: 0.8, dashed: true }
        ]
      : []),
    ...(ichi
      ? [
          { values: ichi.tenkan, color: '#f87171', strokeWidth: 0.9 },
          { values: ichi.kijun, color: '#60a5fa', strokeWidth: 0.9 },
          { values: ichi.senkouA, color: '#4ade80', strokeWidth: 0.7 },
          { values: ichi.senkouB, color: '#fb923c', strokeWidth: 0.7 },
          { values: ichi.chikou, color: '#c084fc', strokeWidth: 0.7, dashed: true }
        ]
      : [])
  ]

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <Activity className="h-3 w-3" /> Indicator chart suite
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          {(['3mo', '6mo', '1y', '2y'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                'rounded border px-2 py-0.5 font-mono',
                range === r
                  ? 'border-[var(--color-info)] bg-[var(--color-info)]/15 text-[var(--color-info)]'
                  : 'border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-2 flex flex-wrap gap-1 text-[10px]">
        {OVERLAYS.map((o) => (
          <button
            key={o.key}
            onClick={() => toggle(o.key)}
            className={cn(
              'rounded border px-2 py-0.5 font-mono',
              active.has(o.key)
                ? 'border-[var(--color-border)] bg-[var(--color-bg)]'
                : 'border-[var(--color-border)] text-[var(--color-fg-muted)]'
            )}
            style={active.has(o.key) ? { color: o.color, borderColor: o.color } : {}}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="space-y-1">
        <div className="border-b border-[var(--color-border)] pb-1">
          <MultiLineChart series={priceSeries} height={180} title="Price + overlays" />
        </div>
        <div className="border-b border-[var(--color-border)] pb-1">
          <BarChart values={vols.map((v) => v || null)} height={50} title="Volume" />
        </div>
        <div className="border-b border-[var(--color-border)] pb-1">
          <MultiLineChart
            series={[{ values: rsi, color: '#60a5fa' }]}
            height={90}
            yPad={2}
            title="RSI (14)"
            horizontalLines={[
              { y: 70, color: 'var(--color-neg)', label: '70', dashed: true },
              { y: 50, color: 'var(--color-fg-muted)', dashed: true },
              { y: 30, color: 'var(--color-pos)', label: '30', dashed: true }
            ]}
          />
        </div>
        <div className="border-b border-[var(--color-border)] pb-1">
          <div className="relative">
            <MultiLineChart
              series={[
                { values: macd.macd, color: '#60a5fa', strokeWidth: 1.2 },
                { values: macd.signal, color: '#f87171', strokeWidth: 1 }
              ]}
              height={90}
              title="MACD (12, 26, 9)"
              horizontalLines={[{ y: 0, color: 'var(--color-fg-muted)', dashed: true }]}
            />
            <div className="-mt-[50px]">
              <ZeroBarChart values={macd.hist} height={50} title="" />
            </div>
          </div>
        </div>
        <div>
          <MultiLineChart
            series={[{ values: obvSeries as (number | null)[], color: '#c084fc' }]}
            height={70}
            title="OBV"
          />
        </div>
      </div>
    </div>
  )
}
