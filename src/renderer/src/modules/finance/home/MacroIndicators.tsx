import { useQuotes } from '../../../hooks/useFinance'
import { Sparkline } from '../../../shared/Sparkline'
import { PercentBadge } from '../../../shared/PercentBadge'
import { fmtPrice } from '../../../lib/format'
import { cn } from '../../../lib/cn'

const INDICATORS = [
  { symbol: '^TNX', label: '10Y Yield', fmt: 'pct' },
  { symbol: '^FVX', label: '5Y Yield', fmt: 'pct' },
  { symbol: '^IRX', label: '13W T-Bill', fmt: 'pct' },
  { symbol: '^VIX', label: 'VIX', fmt: 'num' },
  { symbol: 'DX-Y.NYB', label: 'Dollar Idx', fmt: 'num' },
  { symbol: 'GC=F', label: 'Gold', fmt: 'price' },
  { symbol: 'CL=F', label: 'Crude Oil', fmt: 'price' },
  { symbol: 'BTC-USD', label: 'Bitcoin', fmt: 'price' },
  { symbol: 'ETH-USD', label: 'Ethereum', fmt: 'price' }
]

export function MacroIndicators(): React.JSX.Element {
  const quotes = useQuotes(INDICATORS.map((i) => i.symbol))
  return (
    <div
      className={cn(
        'rounded-md border p-3',
        'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          Macro indicators
        </div>
        <div className="text-[9px] text-[var(--color-fg-muted)]">
          Rates · DXY · Gold · Oil · Crypto
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9">
        {INDICATORS.map((ind, i) => {
          const q = quotes[i]?.data
          const price = q?.price
          const pct = q?.changePercent
          const spark = q?.spark ?? []
          return (
            <div
              key={ind.symbol}
              className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] p-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-semibold uppercase text-[var(--color-fg-muted)]">
                  {ind.label}
                </span>
                <PercentBadge value={pct} />
              </div>
              <div className="mt-0.5 font-mono text-[12px] font-semibold tabular">
                {price != null
                  ? ind.fmt === 'pct'
                    ? `${price.toFixed(2)}%`
                    : ind.fmt === 'num'
                      ? price.toFixed(2)
                      : `$${fmtPrice(price)}`
                  : '—'}
              </div>
              {spark.length > 2 && (
                <Sparkline points={spark} width={80} height={16} className="mt-0.5 w-full" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
