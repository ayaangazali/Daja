import { useMemo, useState } from 'react'
import { useOptions, type OptionsContract } from '../../../../hooks/useStatements'
import { fmtPct, fmtPrice } from '../../../../lib/format'
import { blackScholes } from '../../../../lib/blackScholes'
import { cn } from '../../../../lib/cn'

const RISK_FREE_RATE = 0.045 // approximation — fetch from FRED in Phase 2

function computeGreeks(
  c: OptionsContract,
  type: 'call' | 'put',
  underlying: number
): { delta: number; gamma: number; theta: number; vega: number } | null {
  if (c.impliedVolatility == null || c.impliedVolatility <= 0) return null
  const nowSec = Math.floor(Date.now() / 1000)
  const T = (c.expiration - nowSec) / (365.25 * 86400)
  if (T <= 0) return null
  const g = blackScholes(type, {
    S: underlying,
    K: c.strike,
    T,
    r: RISK_FREE_RATE,
    sigma: c.impliedVolatility
  })
  return {
    delta: g.delta,
    gamma: g.gamma,
    theta: g.theta / 365, // per-day
    vega: g.vega / 100 // per-1% vol
  }
}

export function OptionsTab({ ticker }: { ticker: string }): React.JSX.Element {
  const [expiration, setExpiration] = useState<number | undefined>(undefined)
  const { data, isLoading, error } = useOptions(ticker, expiration)

  if (error)
    return (
      <div className="p-4 text-[11px] text-[var(--color-neg)]">
        Options load failed: {error.message}
      </div>
    )
  if (isLoading || !data)
    return <div className="p-4 text-[11px] text-[var(--color-fg-muted)]">Loading options…</div>

  const { calls, puts } = data
  const callVol = calls.reduce((s, c) => s + (c.volume ?? 0), 0)
  const putVol = puts.reduce((s, c) => s + (c.volume ?? 0), 0)
  const pcRatio = callVol === 0 ? 0 : putVol / callVol
  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center gap-3">
        <select
          value={expiration ?? data.currentExpiration}
          onChange={(e) => setExpiration(Number(e.target.value))}
          className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-[11px]"
        >
          {data.expirationDates.map((exp) => (
            <option key={exp} value={exp}>
              {new Date(exp * 1000).toISOString().slice(0, 10)}
            </option>
          ))}
        </select>
        <div className="text-[10px] text-[var(--color-fg-muted)]">
          Underlying: <span className="font-mono tabular">${fmtPrice(data.underlyingPrice)}</span>
        </div>
        <div
          className={cn(
            'rounded px-2 py-0.5 font-mono text-[10px]',
            pcRatio > 1.2 && 'bg-[var(--color-neg)]/15 text-[var(--color-neg)]',
            pcRatio < 0.7 && 'bg-[var(--color-pos)]/15 text-[var(--color-pos)]',
            pcRatio >= 0.7 && pcRatio <= 1.2 && 'bg-[var(--color-warn)]/15 text-[var(--color-warn)]'
          )}
        >
          P/C vol ratio {pcRatio.toFixed(2)}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <ChainTable title="Calls" type="call" contracts={calls} underlying={data.underlyingPrice} tone="pos" />
        <ChainTable title="Puts" type="put" contracts={puts} underlying={data.underlyingPrice} tone="neg" />
      </div>
      <div className="text-[9px] text-[var(--color-fg-muted)]">
        Greeks computed via Black-Scholes at r={RISK_FREE_RATE * 100}% using Yahoo IV. Δ = delta, Γ = gamma, Θ = theta/day, V = vega/1% vol.
      </div>
    </div>
  )
}

function ChainTable({
  title,
  type,
  contracts,
  underlying,
  tone
}: {
  title: string
  type: 'call' | 'put'
  contracts: OptionsContract[]
  underlying: number
  tone: 'pos' | 'neg'
}): React.JSX.Element {
  const nearATM = useMemo(() => {
    return [...contracts]
      .sort((a, b) => Math.abs(a.strike - underlying) - Math.abs(b.strike - underlying))
      .slice(0, 20)
      .sort((a, b) => a.strike - b.strike)
  }, [contracts, underlying])
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)]">
      <div
        className={cn(
          'border-b px-3 py-2 text-[10px] font-semibold uppercase tracking-wide',
          tone === 'pos'
            ? 'border-[var(--color-pos)]/30 text-[var(--color-pos)]'
            : 'border-[var(--color-neg)]/30 text-[var(--color-neg)]'
        )}
      >
        {title} ({contracts.length})
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead className="text-[9px] uppercase text-[var(--color-fg-muted)]">
            <tr>
              <th className="px-1 py-1 text-right">Strike</th>
              <th className="px-1 py-1 text-right">Last</th>
              <th className="px-1 py-1 text-right">Bid</th>
              <th className="px-1 py-1 text-right">Ask</th>
              <th className="px-1 py-1 text-right">Vol</th>
              <th className="px-1 py-1 text-right">OI</th>
              <th className="px-1 py-1 text-right">IV</th>
              <th className="px-1 py-1 text-right" title="Delta">Δ</th>
              <th className="px-1 py-1 text-right" title="Theta per day">Θ/d</th>
            </tr>
          </thead>
          <tbody>
            {nearATM.map((c) => (
              <tr
                key={c.contractSymbol}
                className={cn(
                  'border-t border-[var(--color-border)] font-mono tabular',
                  c.inTheMoney && 'bg-[var(--color-info)]/5'
                )}
              >
                <td className="px-1 py-0.5 text-right font-semibold">{c.strike}</td>
                <td className="px-1 py-0.5 text-right">
                  {c.lastPrice && c.lastPrice > 0 ? c.lastPrice.toFixed(2) : '—'}
                </td>
                <td className="px-1 py-0.5 text-right">
                  {c.bid && c.bid > 0 ? c.bid.toFixed(2) : '—'}
                </td>
                <td className="px-1 py-0.5 text-right">
                  {c.ask && c.ask > 0 ? c.ask.toFixed(2) : '—'}
                </td>
                <td className="px-1 py-0.5 text-right">
                  {c.volume && c.volume > 0 ? c.volume.toLocaleString() : '—'}
                </td>
                <td className="px-1 py-0.5 text-right">
                  {c.openInterest && c.openInterest > 0 ? c.openInterest.toLocaleString() : '—'}
                </td>
                <td className="px-1 py-0.5 text-right">
                  {c.impliedVolatility != null ? fmtPct(c.impliedVolatility * 100, 0) : '—'}
                </td>
                <td className="px-1 py-0.5 text-right">
                  {(() => {
                    const g = computeGreeks(c, type, underlying)
                    return g ? g.delta.toFixed(2) : '—'
                  })()}
                </td>
                <td className="px-1 py-0.5 text-right">
                  {(() => {
                    const g = computeGreeks(c, type, underlying)
                    return g ? g.theta.toFixed(3) : '—'
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
