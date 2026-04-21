import type { Fundamentals } from '../../../../hooks/useFundamentals'
import { fmtPrice } from '../../../../lib/format'
import { cn } from '../../../../lib/cn'

export function AnalystRatings({ data }: { data: Fundamentals }): React.JSX.Element {
  const r = data.recommendations
  const total = r
    ? r.strongBuy + r.buy + r.hold + r.sell + r.strongSell
    : 0
  const seg = (n: number): number => (total === 0 ? 0 : (n / total) * 100)
  return (
    <div
      className={cn(
        'rounded-md border p-3',
        'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
      )}
    >
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
        Analyst Ratings
      </div>
      {r && total > 0 ? (
        <>
          <div className="flex h-3 overflow-hidden rounded">
            <div style={{ width: `${seg(r.strongBuy)}%` }} className="bg-[var(--color-pos)]" />
            <div style={{ width: `${seg(r.buy)}%` }} className="bg-[var(--color-pos)]/70" />
            <div style={{ width: `${seg(r.hold)}%` }} className="bg-[var(--color-warn)]" />
            <div style={{ width: `${seg(r.sell)}%` }} className="bg-[var(--color-neg)]/70" />
            <div style={{ width: `${seg(r.strongSell)}%` }} className="bg-[var(--color-neg)]" />
          </div>
          <div className="mt-1 grid grid-cols-5 text-center text-[9px] text-[var(--color-fg-muted)]">
            <span>SB {r.strongBuy}</span>
            <span>B {r.buy}</span>
            <span>H {r.hold}</span>
            <span>S {r.sell}</span>
            <span>SS {r.strongSell}</span>
          </div>
        </>
      ) : (
        <div className="text-[10px] text-[var(--color-fg-muted)]">No ratings data</div>
      )}
      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
        <div>
          <div className="text-[9px] text-[var(--color-fg-muted)]">Low</div>
          <div className="font-mono tabular">{fmtPrice(data.targetLow)}</div>
        </div>
        <div>
          <div className="text-[9px] text-[var(--color-fg-muted)]">Avg</div>
          <div className="font-mono font-semibold tabular">{fmtPrice(data.targetMean)}</div>
        </div>
        <div>
          <div className="text-[9px] text-[var(--color-fg-muted)]">High</div>
          <div className="font-mono tabular">{fmtPrice(data.targetHigh)}</div>
        </div>
      </div>
    </div>
  )
}
