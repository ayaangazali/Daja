import { useMemo, useState } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { useHistorical } from '../../../../hooks/useFinance'
import {
  anchoredVWAP,
  haTrendRun,
  toHeikinAshi,
  type OHLCBar
} from '../../../../lib/heikinAshi'
import { MultiLineChart } from '../../../../components/charts/ChartPrimitives'
import { fmtPrice } from '../../../../lib/format'
import { cn } from '../../../../lib/cn'

export function HeikinAshiPanel({ ticker }: { ticker: string }): React.JSX.Element {
  const [range, setRange] = useState<'1mo' | '3mo' | '6mo'>('3mo')
  const [anchorOffset, setAnchorOffset] = useState(30) // anchor n bars ago
  const { data: bars = [] } = useHistorical(ticker, range)

  const { haSummary, vwap, closes, haPrices } = useMemo(() => {
    const ohlc: OHLCBar[] = bars
      .filter((b) => b.open != null && b.high != null && b.low != null && b.close != null)
      .map((b) => ({
        open: b.open as number,
        high: b.high as number,
        low: b.low as number,
        close: b.close as number
      }))
    const highs = ohlc.map((b) => b.high)
    const lows = ohlc.map((b) => b.low)
    const closesArr = ohlc.map((b) => b.close)
    const vols = bars.map((b) => b.volume ?? 0)
    const ha = toHeikinAshi(ohlc)
    const haSummary = haTrendRun(ha)
    const anchor = Math.max(0, closesArr.length - 1 - anchorOffset)
    const vwap = anchoredVWAP(highs, lows, closesArr, vols, anchor)
    const haCloses: (number | null)[] = ha.map((h) => h.close)
    return { haSummary, vwap, closes: closesArr, haPrices: haCloses }
  }, [bars, anchorOffset])

  if (closes.length === 0) {
    return (
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3 text-[11px] text-[var(--color-fg-muted)]">
        Loading Heikin-Ashi…
      </div>
    )
  }

  const lastVwap = vwap.filter((v) => v != null).pop()
  const lastClose = closes[closes.length - 1]
  const vwapDeviation = lastVwap != null ? ((lastClose - lastVwap) / lastVwap) * 100 : null

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          {haSummary.direction === 'up' ? (
            <TrendingUp className="h-3 w-3 text-[var(--color-pos)]" />
          ) : (
            <TrendingDown className="h-3 w-3 text-[var(--color-neg)]" />
          )}
          Heikin-Ashi + anchored VWAP
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          {(['1mo', '3mo', '6mo'] as const).map((r) => (
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
          <label className="flex items-center gap-1 text-[var(--color-fg-muted)]">
            VWAP anchor:
            <input
              type="number"
              value={anchorOffset}
              onChange={(e) => setAnchorOffset(Math.max(0, Number(e.target.value) || 0))}
              className="w-14 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-1 py-0.5 text-right font-mono"
            />
            <span className="text-[9px]">bars ago</span>
          </label>
        </div>
      </div>

      <MultiLineChart
        series={[
          { values: closes as (number | null)[], color: 'var(--color-fg)', strokeWidth: 1 },
          { values: haPrices, color: '#60a5fa', strokeWidth: 1.2 },
          { values: vwap, color: '#fbbf24', strokeWidth: 1.2, dashed: true }
        ]}
        height={140}
      />

      <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4 text-[10px]">
        <Stat
          label="HA trend"
          value={`${haSummary.direction === 'up' ? '↑' : '↓'} ${haSummary.run} bars`}
          tone={haSummary.direction === 'up' ? 'pos' : 'neg'}
        />
        <Stat label="Close" value={`$${fmtPrice(lastClose)}`} />
        <Stat
          label="Anchored VWAP"
          value={lastVwap != null ? `$${fmtPrice(lastVwap)}` : '—'}
        />
        <Stat
          label="Δ vs VWAP"
          value={vwapDeviation != null ? `${vwapDeviation > 0 ? '+' : ''}${vwapDeviation.toFixed(2)}%` : '—'}
          tone={vwapDeviation != null && vwapDeviation > 0 ? 'pos' : 'neg'}
        />
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  tone
}: {
  label: string
  value: string
  tone?: 'pos' | 'neg'
}): React.JSX.Element {
  return (
    <div className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] p-1.5">
      <div className="text-[9px] uppercase text-[var(--color-fg-muted)]">{label}</div>
      <div
        className={cn(
          'font-mono text-[11px] font-semibold tabular',
          tone === 'pos' && 'text-[var(--color-pos)]',
          tone === 'neg' && 'text-[var(--color-neg)]'
        )}
      >
        {value}
      </div>
    </div>
  )
}
