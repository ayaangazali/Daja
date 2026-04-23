import { useMemo } from 'react'
import { Waves } from 'lucide-react'
import { useHistorical } from '../../../../hooks/useFinance'
import {
  atrSeries,
  cciSeries,
  rocSeries,
  stochasticSeries,
  williamsRSeries
} from '../../../../lib/indicators2'
import { MultiLineChart } from '../../../../components/charts/ChartPrimitives'
import { useTechnicalsRange, type TechnicalsRange } from '../../../../stores/technicalsRangeStore'
import { cn } from '../../../../lib/cn'

export function OscillatorsPanel({ ticker }: { ticker: string }): React.JSX.Element {
  const rangeStore = useTechnicalsRange()
  const range = rangeStore.range as '3mo' | '6mo' | '1y' | '2y'
  const setRange = (r: '3mo' | '6mo' | '1y' | '2y'): void =>
    rangeStore.setRange(r as TechnicalsRange)
  const { data: bars = [], isLoading } = useHistorical(ticker, range)

  const { stoch, will, cci14, atr, roc } = useMemo(() => {
    const h = bars.map((b) => b.high ?? b.close ?? 0)
    const l = bars.map((b) => b.low ?? b.close ?? 0)
    const c = bars.map((b) => b.close ?? 0)
    return {
      stoch: stochasticSeries(h, l, c, 14),
      will: williamsRSeries(h, l, c, 14),
      cci14: cciSeries(h, l, c, 20),
      atr: atrSeries(h, l, c, 14),
      roc: rocSeries(c, 12)
    }
  }, [bars])

  if (isLoading || bars.length === 0) {
    return (
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3 text-[11px] text-[var(--color-fg-muted)]">
        Loading oscillators…
      </div>
    )
  }

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <Waves className="h-3 w-3" /> Oscillators + volatility
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
                  : 'border-[var(--color-border)] text-[var(--color-fg-muted)]'
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <div className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] p-2">
          <div className="mb-1 text-[9px] uppercase text-[var(--color-fg-muted)]">
            Stochastic %K (14)
          </div>
          <MultiLineChart
            series={[{ values: stoch, color: '#60a5fa' }]}
            height={90}
            horizontalLines={[
              { y: 80, color: 'var(--color-neg)', label: '80', dashed: true },
              { y: 20, color: 'var(--color-pos)', label: '20', dashed: true }
            ]}
          />
        </div>
        <div className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] p-2">
          <div className="mb-1 text-[9px] uppercase text-[var(--color-fg-muted)]">
            Williams %R (14)
          </div>
          <MultiLineChart
            series={[{ values: will, color: '#c084fc' }]}
            height={90}
            horizontalLines={[
              { y: -20, color: 'var(--color-neg)', label: '-20', dashed: true },
              { y: -80, color: 'var(--color-pos)', label: '-80', dashed: true }
            ]}
          />
        </div>
        <div className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] p-2">
          <div className="mb-1 text-[9px] uppercase text-[var(--color-fg-muted)]">CCI (20)</div>
          <MultiLineChart
            series={[{ values: cci14, color: '#fbbf24' }]}
            height={90}
            horizontalLines={[
              { y: 100, color: 'var(--color-neg)', label: '+100', dashed: true },
              { y: 0, color: 'var(--color-fg-muted)', dashed: true },
              { y: -100, color: 'var(--color-pos)', label: '-100', dashed: true }
            ]}
          />
        </div>
        <div className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] p-2">
          <div className="mb-1 text-[9px] uppercase text-[var(--color-fg-muted)]">
            Rate of Change (12) %
          </div>
          <MultiLineChart
            series={[{ values: roc, color: '#4ade80' }]}
            height={90}
            horizontalLines={[{ y: 0, color: 'var(--color-fg-muted)', dashed: true }]}
          />
        </div>
        <div className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] p-2 md:col-span-2">
          <div className="mb-1 text-[9px] uppercase text-[var(--color-fg-muted)]">
            ATR (14) — volatility
          </div>
          <MultiLineChart series={[{ values: atr, color: '#f87171' }]} height={70} />
        </div>
      </div>
    </div>
  )
}
