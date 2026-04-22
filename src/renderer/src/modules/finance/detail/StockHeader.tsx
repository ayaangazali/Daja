import { useMemo } from 'react'
import { useTradesByTicker } from '../../../hooks/useTrades'
import type { Quote } from '../../../hooks/useFinance'
import type { Fundamentals } from '../../../hooks/useFundamentals'
import { fmtPrice, fmtSignedPrice, fmtPct, signColor } from '../../../lib/format'
import { StrategyScoreBadge } from '../strategy/StrategyScoreBadge'
import { Range52w } from '../../../components/Range52w'
import { cn } from '../../../lib/cn'

export function StockHeader({
  ticker,
  quote,
  fundamentals
}: {
  ticker: string
  quote: Quote | undefined
  fundamentals: Fundamentals | undefined
}): React.JSX.Element {
  const { data: trades = [] } = useTradesByTicker(ticker)
  const pos = useMemo(() => {
    let net = 0
    let costBasis = 0
    for (const t of trades) {
      if (t.side === 'buy') {
        net += t.quantity
        costBasis += t.quantity * t.price + t.fees
      } else if (t.side === 'sell') {
        if (net > 0) {
          const avg = costBasis / net
          costBasis -= avg * t.quantity
        }
        net -= t.quantity
      }
    }
    if (net <= 0) return null
    const avg = costBasis / net
    return { qty: net, avg }
  }, [trades])

  const unreal = pos && quote ? (quote.price - pos.avg) * pos.qty : null

  return (
    <div className="border-b border-[var(--color-border)] px-4 py-3">
      <div className="flex items-baseline gap-3">
        <div className="font-mono text-2xl font-bold">{ticker}</div>
        {fundamentals?.name && <div className="text-sm">{fundamentals.name}</div>}
        {quote?.exchange && (
          <span className="rounded bg-[var(--color-bg-elev)] px-1.5 py-0.5 text-[10px] text-[var(--color-fg-muted)]">
            {quote.exchange}
          </span>
        )}
        {fundamentals?.sector && (
          <span className="rounded bg-[var(--color-info)]/20 px-1.5 py-0.5 text-[10px] text-[var(--color-info)]">
            {fundamentals.sector}
          </span>
        )}
      </div>
      <div className="mt-1 flex items-baseline gap-3">
        <div className="font-mono text-3xl font-semibold tabular">${fmtPrice(quote?.price)}</div>
        <div className={cn('font-mono text-sm tabular', signColor(quote?.change))}>
          {quote ? fmtSignedPrice(quote.change) : ''}
        </div>
        <div className={cn('font-mono text-sm tabular', signColor(quote?.changePercent))}>
          {quote ? fmtPct(quote.changePercent) : ''}
        </div>
        <Range52w
          low={quote?.fiftyTwoWeekLow}
          high={quote?.fiftyTwoWeekHigh}
          current={quote?.price}
          className="ml-2"
        />
        <div className="ml-auto flex items-center gap-2">
          <StrategyScoreBadge fundamentals={fundamentals} />
          {pos && (
            <div
              className={cn(
                'rounded px-2 py-1 font-mono text-[10px]',
                'bg-[var(--color-info)]/15 text-[var(--color-info)]'
              )}
              title={`Avg cost $${pos.avg.toFixed(2)}`}
            >
              Position: {pos.qty} @ ${pos.avg.toFixed(2)}{' '}
              <span className={signColor(unreal)}>
                {unreal != null ? ` (${unreal >= 0 ? '+' : ''}$${unreal.toFixed(0)})` : ''}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
