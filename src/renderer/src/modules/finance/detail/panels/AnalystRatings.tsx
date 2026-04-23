import type { Fundamentals } from '../../../../hooks/useFundamentals'
import { fmtPrice } from '../../../../lib/format'
import { cn } from '../../../../lib/cn'

type Period = Fundamentals['recommendationTrend'][number]

function weight(p: Period): number {
  return p.strongBuy * 2 + p.buy - p.sell - p.strongSell * 2
}

function total(p: Period): number {
  return p.strongBuy + p.buy + p.hold + p.sell + p.strongSell
}

function PeriodBar({ p }: { p: Period }): React.JSX.Element {
  const t = total(p)
  const seg = (n: number): number => (t === 0 ? 0 : (n / t) * 100)
  return (
    <div className="flex h-1.5 overflow-hidden rounded-sm">
      <div style={{ width: `${seg(p.strongBuy)}%` }} className="bg-[var(--color-pos)]" />
      <div style={{ width: `${seg(p.buy)}%` }} className="bg-[var(--color-pos)]/70" />
      <div style={{ width: `${seg(p.hold)}%` }} className="bg-[var(--color-warn)]" />
      <div style={{ width: `${seg(p.sell)}%` }} className="bg-[var(--color-neg)]/70" />
      <div style={{ width: `${seg(p.strongSell)}%` }} className="bg-[var(--color-neg)]" />
    </div>
  )
}

export function AnalystRatings({ data }: { data: Fundamentals }): React.JSX.Element {
  const r = data.recommendations
  const t = r ? r.strongBuy + r.buy + r.hold + r.sell + r.strongSell : 0
  const seg = (n: number): number => (t === 0 ? 0 : (n / t) * 100)

  const trend = data.recommendationTrend ?? []
  const now = trend.find((x) => x.period === '0m')
  const prev = trend.find((x) => x.period === '-1m') ?? trend.find((x) => x.period === '-2m')
  const momentum = now && prev ? weight(now) - weight(prev) : null

  return (
    <div
      className={cn(
        'rounded-md border p-3',
        'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
      )}
    >
      <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
        <span>Analyst Ratings</span>
        {momentum != null && (
          <span
            className={cn(
              'font-mono text-[10px] normal-case',
              momentum > 0
                ? 'text-[var(--color-pos)]'
                : momentum < 0
                  ? 'text-[var(--color-neg)]'
                  : 'text-[var(--color-fg-muted)]'
            )}
            title="Weighted rating momentum: (SB×2 + B − S − SS×2) difference vs prior period"
          >
            {momentum > 0 ? '↑' : momentum < 0 ? '↓' : '→'} {momentum > 0 ? '+' : ''}
            {momentum} rev mom
          </span>
        )}
      </div>
      {r && t > 0 ? (
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

      {trend.length >= 2 && (
        <div className="mt-3 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-2">
          <div className="mb-1.5 text-[9px] uppercase tracking-wide text-[var(--color-fg-muted)]">
            Revision histogram (last {trend.length} periods)
          </div>
          <div className="space-y-1.5">
            {trend.map((p) => (
              <div key={p.period} className="grid grid-cols-[40px_1fr_auto] items-center gap-2">
                <span className="font-mono text-[9px] text-[var(--color-fg-muted)]">
                  {p.period}
                </span>
                <PeriodBar p={p} />
                <span className="font-mono text-[9px] tabular text-[var(--color-fg-muted)]">
                  {total(p)}
                </span>
              </div>
            ))}
          </div>
        </div>
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
