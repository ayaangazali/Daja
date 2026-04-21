import { useHistorical, useQuote } from '../../../hooks/useFinance'
import { Sparkline } from '../../../shared/Sparkline'
import { fmtLargeNum, fmtPct, fmtPrice, signColor } from '../../../lib/format'
import { cn } from '../../../lib/cn'

interface Props {
  ticker: string
  x: number
  y: number
}

export function TickerHoverCard({ ticker, x, y }: Props): React.JSX.Element {
  const { data: quote } = useQuote(ticker)
  const { data: bars = [] } = useHistorical(ticker, '1mo')
  const closes = bars.map((b) => b.close).filter((c): c is number => c != null)
  return (
    <div
      className={cn(
        'pointer-events-none fixed z-50 w-64 rounded-md border p-3 shadow-xl',
        'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
      )}
      style={{ left: x + 8, top: y + 8 }}
    >
      <div className="flex items-baseline justify-between">
        <div className="font-mono text-sm font-semibold">{ticker}</div>
        <div className={cn('font-mono text-xs tabular', signColor(quote?.changePercent))}>
          {fmtPct(quote?.changePercent)}
        </div>
      </div>
      {quote?.shortName && (
        <div className="truncate text-[10px] text-[var(--color-fg-muted)]">{quote.shortName}</div>
      )}
      <div className="mt-1 font-mono text-lg font-semibold tabular">${fmtPrice(quote?.price)}</div>
      {closes.length > 2 && (
        <Sparkline points={closes} width={240} height={40} className="mt-2 w-full" />
      )}
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[9px]">
        <Row label="Day Hi" value={fmtPrice(quote?.dayHigh)} />
        <Row label="Day Lo" value={fmtPrice(quote?.dayLow)} />
        <Row label="52w Hi" value={fmtPrice(quote?.fiftyTwoWeekHigh)} />
        <Row label="52w Lo" value={fmtPrice(quote?.fiftyTwoWeekLow)} />
        <Row label="Vol" value={fmtLargeNum(quote?.volume)} />
        <Row label="Mkt Cap" value={fmtLargeNum(quote?.marketCap)} />
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[var(--color-fg-muted)]">{label}</span>
      <span className="font-mono tabular">{value}</span>
    </div>
  )
}
