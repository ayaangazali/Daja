import { useQuotes } from '../../../hooks/useFinance'
import { Sparkline } from '../../../shared/Sparkline'
import { PercentBadge } from '../../../shared/PercentBadge'
import { fmtPrice } from '../../../lib/format'
import { cn } from '../../../lib/cn'

interface IndexDef {
  symbol: string
  label: string
}

const REGIONS: Record<string, IndexDef[]> = {
  US: [
    { symbol: '^DJI', label: 'DJI' },
    { symbol: '^GSPC', label: 'S&P 500' },
    { symbol: '^IXIC', label: 'NASDAQ' },
    { symbol: '^RUT', label: 'Russell 2K' },
    { symbol: '^VIX', label: 'VIX' }
  ],
  Europe: [
    { symbol: '^FTSE', label: 'FTSE 100' },
    { symbol: '^GDAXI', label: 'DAX' },
    { symbol: '^FCHI', label: 'CAC 40' },
    { symbol: '^STOXX50E', label: 'Euro Stoxx' }
  ],
  Asia: [
    { symbol: '^N225', label: 'Nikkei' },
    { symbol: '^HSI', label: 'Hang Seng' },
    { symbol: '000001.SS', label: 'Shanghai' },
    { symbol: '^KS11', label: 'KOSPI' }
  ],
  Crypto: [
    { symbol: 'BTC-USD', label: 'BTC' },
    { symbol: 'ETH-USD', label: 'ETH' },
    { symbol: 'SOL-USD', label: 'SOL' }
  ],
  Futures: [
    { symbol: 'ES=F', label: 'S&P Futures' },
    { symbol: 'CL=F', label: 'Crude Oil' },
    { symbol: 'GC=F', label: 'Gold' }
  ]
}

export function MarketIndexCards({ region }: { region: keyof typeof REGIONS }): React.JSX.Element {
  const indices = REGIONS[region] ?? REGIONS.US
  const quotes = useQuotes(indices.map((i) => i.symbol))
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5">
      {indices.map((idx, i) => {
        const q = quotes[i]?.data as
          | {
              price: number
              change: number
              changePercent: number
              spark: number[]
            }
          | undefined
        return (
          <div
            key={idx.symbol}
            className={cn(
              'rounded-md border p-3',
              'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
            )}
          >
            <div className="flex items-baseline justify-between">
              <div className="text-[11px] font-semibold">{idx.label}</div>
              <div className="font-mono text-[10px] text-[var(--color-fg-muted)]">{idx.symbol}</div>
            </div>
            <div className="mt-1 font-mono text-lg font-semibold tabular">{fmtPrice(q?.price)}</div>
            <Sparkline points={q?.spark ?? []} width={160} height={28} className="mt-1 w-full" />
            <div className="mt-1 flex items-center gap-2">
              <PercentBadge value={q?.changePercent} />
              <span className="text-[10px] text-[var(--color-fg-muted)] tabular">
                {q ? (q.change > 0 ? '+' : '') + q.change.toFixed(2) : '—'}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export const REGION_KEYS = Object.keys(REGIONS) as (keyof typeof REGIONS)[]
