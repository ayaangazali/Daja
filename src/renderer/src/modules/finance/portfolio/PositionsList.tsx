import { NavLink } from 'react-router-dom'
import { useMemo } from 'react'
import { useTrades } from '../../../hooks/useTrades'
import { useQuotes } from '../../../hooks/useFinance'
import { computePositions } from './positions'
import { fmtPrice, fmtPct, signColor, fmtLargeNum } from '../../../lib/format'
import { cn } from '../../../lib/cn'

export function PositionsList(): React.JSX.Element {
  const { data: trades = [] } = useTrades()
  const positions = useMemo(() => computePositions(trades), [trades])
  const tickers = positions.map((p) => p.ticker)
  const quotes = useQuotes(tickers)

  const enriched = positions.map((p, i) => {
    const q = quotes[i]?.data
    const marketPrice = q?.price ?? null
    const marketValue = marketPrice != null ? marketPrice * p.qty : null
    const unrealized = marketPrice != null && p.qty > 0 ? (marketPrice - p.avgCost) * p.qty : 0
    const unrealizedPct =
      p.avgCost > 0 && marketPrice != null ? ((marketPrice - p.avgCost) / p.avgCost) * 100 : 0
    return { ...p, marketPrice, marketValue, unrealized, unrealizedPct }
  })

  const totalValue = enriched.reduce((s, p) => s + (p.marketValue ?? 0), 0)
  const totalCost = enriched.reduce((s, p) => s + p.costBasis, 0)
  const totalUnrealized = enriched.reduce((s, p) => s + p.unrealized, 0)
  const totalRealized = enriched.reduce((s, p) => s + p.realizedPnL, 0)

  return (
    <div>
      <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Market Value" value={`$${fmtLargeNum(totalValue)}`} />
        <Stat label="Cost Basis" value={`$${fmtLargeNum(totalCost)}`} />
        <Stat
          label="Unrealized"
          value={`${totalUnrealized >= 0 ? '+' : ''}$${fmtLargeNum(totalUnrealized)}`}
          tone={totalUnrealized >= 0 ? 'pos' : 'neg'}
        />
        <Stat
          label="Realized"
          value={`${totalRealized >= 0 ? '+' : ''}$${fmtLargeNum(totalRealized)}`}
          tone={totalRealized >= 0 ? 'pos' : 'neg'}
        />
      </div>
      <div
        className={cn(
          'overflow-hidden rounded-md border',
          'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
        )}
      >
        <table className="w-full text-[11px]">
          <thead className="border-b border-[var(--color-border)] text-[10px] uppercase text-[var(--color-fg-muted)]">
            <tr>
              <th className="px-2 py-1.5 text-left">Ticker</th>
              <th className="px-2 py-1.5 text-right">Qty</th>
              <th className="px-2 py-1.5 text-right">Avg Cost</th>
              <th className="px-2 py-1.5 text-right">Price</th>
              <th className="px-2 py-1.5 text-right">Value</th>
              <th className="px-2 py-1.5 text-right">Unreal $</th>
              <th className="px-2 py-1.5 text-right">Unreal %</th>
              <th className="px-2 py-1.5 text-right">Realized</th>
              <th className="px-2 py-1.5 text-right">% Port</th>
            </tr>
          </thead>
          <tbody>
            {enriched.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-2 py-4 text-center text-[11px] text-[var(--color-fg-muted)]"
                >
                  No positions yet. Log a trade below.
                </td>
              </tr>
            )}
            {enriched.map((p) => {
              const weight = totalValue > 0 ? ((p.marketValue ?? 0) / totalValue) * 100 : 0
              return (
                <tr
                  key={p.ticker}
                  className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg)]"
                >
                  <td className="px-2 py-1 font-mono font-semibold">
                    <NavLink to={`/finance/${p.ticker}`} className="hover:text-[var(--color-info)]">
                      {p.ticker}
                    </NavLink>
                  </td>
                  <td className="px-2 py-1 text-right font-mono tabular">{p.qty}</td>
                  <td className="px-2 py-1 text-right font-mono tabular">${fmtPrice(p.avgCost)}</td>
                  <td className="px-2 py-1 text-right font-mono tabular">
                    {p.marketPrice != null ? `$${fmtPrice(p.marketPrice)}` : '—'}
                  </td>
                  <td className="px-2 py-1 text-right font-mono tabular">
                    ${fmtLargeNum(p.marketValue)}
                  </td>
                  <td
                    className={cn(
                      'px-2 py-1 text-right font-mono tabular',
                      signColor(p.unrealized)
                    )}
                  >
                    {p.unrealized >= 0 ? '+' : ''}${p.unrealized.toFixed(0)}
                  </td>
                  <td
                    className={cn(
                      'px-2 py-1 text-right font-mono tabular',
                      signColor(p.unrealizedPct)
                    )}
                  >
                    {fmtPct(p.unrealizedPct)}
                  </td>
                  <td
                    className={cn(
                      'px-2 py-1 text-right font-mono tabular',
                      signColor(p.realizedPnL)
                    )}
                  >
                    {p.realizedPnL >= 0 ? '+' : ''}${p.realizedPnL.toFixed(0)}
                  </td>
                  <td className="px-2 py-1 text-right font-mono tabular">{weight.toFixed(1)}%</td>
                </tr>
              )
            })}
          </tbody>
        </table>
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
    <div
      className={cn(
        'rounded-md border p-3',
        'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
      )}
    >
      <div className="text-[10px] text-[var(--color-fg-muted)]">{label}</div>
      <div
        className={cn(
          'mt-1 font-mono text-lg font-semibold tabular',
          tone === 'pos' && 'text-[var(--color-pos)]',
          tone === 'neg' && 'text-[var(--color-neg)]'
        )}
      >
        {value}
      </div>
    </div>
  )
}
