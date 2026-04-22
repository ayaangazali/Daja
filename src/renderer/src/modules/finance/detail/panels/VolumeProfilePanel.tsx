import { useMemo, useState } from 'react'
import { BarChart4 } from 'lucide-react'
import { useHistorical } from '../../../../hooks/useFinance'
import { volumeProfile } from '../../../../lib/volumeProfile'
import { fmtLargeNum, fmtPrice } from '../../../../lib/format'
import { cn } from '../../../../lib/cn'

export function VolumeProfilePanel({ ticker }: { ticker: string }): React.JSX.Element {
  const [range, setRange] = useState<'3mo' | '6mo' | '1y' | '2y'>('6mo')
  const { data: bars = [] } = useHistorical(ticker, range)

  const profile = useMemo(() => {
    if (bars.length === 0) return null
    const highs: number[] = []
    const lows: number[] = []
    const closes: number[] = []
    const vols: number[] = []
    for (const b of bars) {
      if (b.high != null && b.low != null && b.close != null) {
        highs.push(b.high)
        lows.push(b.low)
        closes.push(b.close)
        vols.push(b.volume ?? 0)
      }
    }
    return volumeProfile(highs, lows, closes, vols, 24)
  }, [bars])

  if (!profile || profile.buckets.length === 0) {
    return (
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3 text-[11px] text-[var(--color-fg-muted)]">
        Loading volume profile…
      </div>
    )
  }

  const maxVol = Math.max(...profile.buckets.map((b) => b.volume))
  const reversed = [...profile.buckets].reverse() // high at top

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <BarChart4 className="h-3 w-3" /> Volume profile
        </div>
        <div className="flex items-center gap-1 text-[10px]">
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
      <div className="mb-2 grid grid-cols-3 gap-2 text-[10px]">
        <div className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] p-1.5">
          <div className="text-[9px] uppercase text-[var(--color-fg-muted)]">POC</div>
          <div className="font-mono text-[11px] font-semibold tabular text-[var(--color-info)]">
            ${profile.poc ? fmtPrice(profile.poc.low) : '—'}—$
            {profile.poc ? fmtPrice(profile.poc.high) : '—'}
          </div>
        </div>
        <div className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] p-1.5">
          <div className="text-[9px] uppercase text-[var(--color-fg-muted)]">Value area (70%)</div>
          <div className="font-mono text-[11px] font-semibold tabular">
            ${fmtPrice(profile.valueAreaLow)}—${fmtPrice(profile.valueAreaHigh)}
          </div>
        </div>
        <div className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] p-1.5">
          <div className="text-[9px] uppercase text-[var(--color-fg-muted)]">Total vol</div>
          <div className="font-mono text-[11px] font-semibold tabular">
            {fmtLargeNum(profile.totalVolume)}
          </div>
        </div>
      </div>
      <div className="space-y-0.5">
        {reversed.map((b, i) => {
          const width = maxVol > 0 ? (b.volume / maxVol) * 100 : 0
          const inVA = b.low >= profile.valueAreaLow && b.high <= profile.valueAreaHigh
          const isPoc = profile.poc != null && b.low === profile.poc.low
          return (
            <div key={`b-${i}`} className="flex items-center gap-2 text-[9px]">
              <span className="w-24 font-mono tabular text-[var(--color-fg-muted)]">
                ${fmtPrice(b.low)}—${fmtPrice(b.high)}
              </span>
              <div className="relative h-3 flex-1 rounded bg-[var(--color-bg)]">
                <div
                  className={cn(
                    'h-full rounded',
                    isPoc
                      ? 'bg-[var(--color-info)]'
                      : inVA
                        ? 'bg-[var(--color-pos)]/50'
                        : 'bg-[var(--color-fg-muted)]/40'
                  )}
                  style={{ width: `${width}%` }}
                />
              </div>
              <span className="w-16 text-right font-mono tabular">{fmtLargeNum(b.volume)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
