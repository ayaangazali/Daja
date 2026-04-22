import { useQuery } from '@tanstack/react-query'
import { DollarSign } from 'lucide-react'
import { analyzeDividendGrowth } from '../../../../lib/dividendGrowth'
import { fmtPct } from '../../../../lib/format'
import { cn } from '../../../../lib/cn'

interface DividendInfo {
  symbol: string
  yield: number | null
  rate: number | null
  exDate: string | null
  payDate: string | null
  history: { date: string; amount: number }[]
}

export function DividendPanel({ ticker }: { ticker: string }): React.JSX.Element | null {
  const { data } = useQuery<DividendInfo, Error>({
    queryKey: ['dividends', ticker],
    queryFn: () => window.daja.finance.dividends(ticker) as Promise<DividendInfo>,
    staleTime: 6 * 60 * 60_000
  })

  if (!data || data.history.length === 0) return null
  const growth = analyzeDividendGrowth(data.history)
  if (growth.annualByYear.length < 2) return null

  const maxAnnual = Math.max(...growth.annualByYear.map((y) => y.total))
  const last10 = growth.annualByYear.slice(-10)

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <DollarSign className="h-3 w-3" /> Dividend history
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] tabular text-[var(--color-fg-muted)]">
          {data.yield != null && <span>Yield {fmtPct(data.yield)}</span>}
          {data.rate != null && <span>Rate ${data.rate.toFixed(2)}</span>}
          {data.payDate && <span>Next pay {data.payDate}</span>}
        </div>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat
          label="1y growth"
          value={growth.growth1y != null ? fmtPct(growth.growth1y) : '—'}
          tone={growth.growth1y != null && growth.growth1y > 0 ? 'pos' : 'neg'}
        />
        <Stat
          label="3y CAGR"
          value={growth.cagr3y != null ? fmtPct(growth.cagr3y) : '—'}
          tone={growth.cagr3y != null && growth.cagr3y > 0 ? 'pos' : 'neg'}
        />
        <Stat
          label="5y CAGR"
          value={growth.cagr5y != null ? fmtPct(growth.cagr5y) : '—'}
          tone={growth.cagr5y != null && growth.cagr5y > 0 ? 'pos' : 'neg'}
        />
        <Stat
          label="Streak"
          value={`${growth.increaseStreak}y`}
          tone={growth.increaseStreak >= 5 ? 'pos' : undefined}
        />
      </div>
      <div className="flex items-end gap-1">
        {last10.map((y) => {
          const scale = maxAnnual > 0 ? (y.total / maxAnnual) * 60 : 0
          return (
            <div
              key={y.year}
              className="flex-1 text-center"
              title={`${y.year}: $${y.total.toFixed(2)}`}
            >
              <div className="relative flex h-[60px] flex-col justify-end">
                <div
                  className="w-full rounded-t bg-[var(--color-info)]"
                  style={{ height: `${scale}px` }}
                />
              </div>
              <div className="mt-1 font-mono text-[9px] tabular text-[var(--color-fg-muted)]">
                {y.year}
              </div>
              <div className="font-mono text-[9px] tabular">${y.total.toFixed(2)}</div>
            </div>
          )
        })}
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
          'font-mono text-[12px] font-semibold tabular',
          tone === 'pos' && 'text-[var(--color-pos)]',
          tone === 'neg' && 'text-[var(--color-neg)]'
        )}
      >
        {value}
      </div>
    </div>
  )
}
