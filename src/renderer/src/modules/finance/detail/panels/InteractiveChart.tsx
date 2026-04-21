import { useEffect, useRef, useState } from 'react'
import {
  AreaSeries,
  CandlestickSeries,
  HistogramSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type Time
} from 'lightweight-charts'
import { useHistorical, type HistoricalBar } from '../../../../hooks/useFinance'
import { cn } from '../../../../lib/cn'

const RANGES = ['1D', '5D', '1M', '3M', '6M', 'YTD', '1Y', '5Y', 'MAX'] as const
const MAP: Record<(typeof RANGES)[number], string> = {
  '1D': '1d',
  '5D': '5d',
  '1M': '1mo',
  '3M': '3mo',
  '6M': '6mo',
  YTD: 'ytd',
  '1Y': '1y',
  '5Y': '5y',
  MAX: 'max'
}
const TYPES = ['Area', 'Candle'] as const

export function InteractiveChart({ ticker }: { ticker: string }): React.JSX.Element {
  const [range, setRange] = useState<(typeof RANGES)[number]>('1Y')
  const [kind, setKind] = useState<(typeof TYPES)[number]>('Area')
  const { data: bars = [], isLoading } = useHistorical(ticker, MAP[range])

  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const priceSeriesRef = useRef<ISeriesApi<'Area' | 'Candlestick'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { color: 'transparent' },
        textColor: '#8b95a3',
        fontSize: 10
      },
      grid: {
        vertLines: { color: '#1f252d' },
        horzLines: { color: '#1f252d' }
      },
      rightPriceScale: { borderColor: '#1f252d' },
      timeScale: { borderColor: '#1f252d', timeVisible: true, secondsVisible: false },
      crosshair: { mode: 1 }
    })
    chartRef.current = chart
    const volume = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
      color: '#8b95a355'
    })
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 }
    })
    volumeSeriesRef.current = volume
    return () => {
      chart.remove()
      chartRef.current = null
      priceSeriesRef.current = null
      volumeSeriesRef.current = null
    }
  }, [])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    if (priceSeriesRef.current) {
      chart.removeSeries(priceSeriesRef.current)
      priceSeriesRef.current = null
    }
    if (kind === 'Area') {
      const s = chart.addSeries(AreaSeries, {
        lineColor: '#1d9e75',
        topColor: '#1d9e7566',
        bottomColor: '#1d9e7511',
        lineWidth: 2,
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 }
      })
      priceSeriesRef.current = s
    } else {
      const s = chart.addSeries(CandlestickSeries, {
        upColor: '#1d9e75',
        downColor: '#e24b4a',
        borderUpColor: '#1d9e75',
        borderDownColor: '#e24b4a',
        wickUpColor: '#1d9e75',
        wickDownColor: '#e24b4a'
      })
      priceSeriesRef.current = s
    }
  }, [kind])

  useEffect(() => {
    const priceSeries = priceSeriesRef.current
    const volumeSeries = volumeSeriesRef.current
    if (!priceSeries || !volumeSeries || bars.length === 0) return
    if (kind === 'Area') {
      const data = bars
        .filter((b): b is HistoricalBar & { close: number } => b.close != null)
        .map((b) => ({ time: b.time as Time, value: b.close }))
      ;(priceSeries as ISeriesApi<'Area'>).setData(data)
    } else {
      const data = bars
        .filter(
          (b): b is HistoricalBar & { open: number; high: number; low: number; close: number } =>
            b.open != null && b.high != null && b.low != null && b.close != null
        )
        .map((b) => ({
          time: b.time as Time,
          open: b.open,
          high: b.high,
          low: b.low,
          close: b.close
        }))
      ;(priceSeries as ISeriesApi<'Candlestick'>).setData(data)
    }
    const volData = bars
      .filter((b): b is HistoricalBar & { volume: number; close: number } => b.volume != null)
      .map((b) => ({
        time: b.time as Time,
        value: b.volume as number,
        color:
          b.close != null && b.open != null && b.close >= b.open ? '#1d9e7555' : '#e24b4a55'
      }))
    volumeSeries.setData(volData)
    chartRef.current?.timeScale().fitContent()
  }, [bars, kind])

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-2 py-1">
        <div className="flex items-center gap-0.5">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                'rounded px-1.5 py-0.5 font-mono text-[10px]',
                range === r
                  ? 'bg-[var(--color-info)] text-white'
                  : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
              )}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-0.5">
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setKind(t)}
              className={cn(
                'rounded px-1.5 py-0.5 text-[10px]',
                kind === t
                  ? 'bg-[var(--color-bg)] text-[var(--color-fg)]'
                  : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div ref={containerRef} className="flex-1" />
      {isLoading && (
        <div className="p-2 text-[10px] text-[var(--color-fg-muted)]">Loading chart…</div>
      )}
    </div>
  )
}
