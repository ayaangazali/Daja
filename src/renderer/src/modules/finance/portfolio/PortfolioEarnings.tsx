import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarClock } from 'lucide-react'
import { useTrades } from '../../../hooks/useTrades'
import { computeTaxLotPositions, type TaxLotTrade } from '../../../lib/positionsFifo'
import { cn } from '../../../lib/cn'

interface EarningsEntry {
  ticker: string
  companyName: string | null
  startDateFormatted: string
  startDateType: string | null
  epsEstimate: number | null
  epsActual: number | null
  epsSurprisePercent: number | null
}

export function PortfolioEarnings(): React.JSX.Element | null {
  const { data: trades = [] } = useTrades()

  const openTickers = useMemo(() => {
    const taxLotTrades: TaxLotTrade[] = trades
      .filter(
        (t): t is typeof t & { side: 'buy' | 'sell' } => t.side === 'buy' || t.side === 'sell'
      )
      .map((t) => ({
        date: t.date,
        ticker: t.ticker,
        side: t.side,
        quantity: t.quantity,
        price: t.price,
        fees: t.fees ?? 0
      }))
    const pos = computeTaxLotPositions(taxLotTrades)
    return new Set(pos.filter((p) => p.qty > 0.0001).map((p) => p.ticker))
  }, [trades])

  const { data = [] } = useQuery<EarningsEntry[]>({
    queryKey: ['earnings_calendar', 30],
    queryFn: () => window.daja.finance.earningsCalendar(30) as Promise<EarningsEntry[]>,
    staleTime: 30 * 60_000,
    enabled: openTickers.size > 0
  })

  const upcoming = useMemo(
    () =>
      data
        .filter((e) => openTickers.has(e.ticker))
        .sort((a, b) => a.startDateFormatted.localeCompare(b.startDateFormatted)),
    [data, openTickers]
  )

  if (openTickers.size === 0) return null

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <CalendarClock className="h-3 w-3" /> Upcoming earnings (portfolio, 30d)
        </div>
        <span className="text-[10px] text-[var(--color-fg-muted)]">
          {upcoming.length} of {openTickers.size} positions report
        </span>
      </div>
      {upcoming.length === 0 ? (
        <div className="py-2 text-[11px] text-[var(--color-fg-muted)]">
          No earnings announced in the next 30 days for your holdings.
        </div>
      ) : (
        <table className="w-full text-[11px]">
          <thead className="text-[10px] uppercase text-[var(--color-fg-muted)]">
            <tr>
              <th className="px-2 py-1 text-left">Date</th>
              <th className="px-2 py-1 text-left">When</th>
              <th className="px-2 py-1 text-left">Ticker</th>
              <th className="px-2 py-1 text-left">Company</th>
              <th className="px-2 py-1 text-right">EPS est</th>
            </tr>
          </thead>
          <tbody>
            {upcoming.map((e) => {
              const days = Math.max(
                0,
                Math.round((new Date(e.startDateFormatted).getTime() - Date.now()) / 86400000)
              )
              return (
                <tr
                  key={`${e.ticker}-${e.startDateFormatted}`}
                  className="border-t border-[var(--color-border)]"
                >
                  <td className="px-2 py-1 font-mono tabular">
                    {e.startDateFormatted}
                    <span
                      className={cn(
                        'ml-2 text-[9px]',
                        days <= 3
                          ? 'text-[var(--color-warn)]'
                          : days <= 7
                            ? 'text-[var(--color-info)]'
                            : 'text-[var(--color-fg-muted)]'
                      )}
                    >
                      ({days}d)
                    </span>
                  </td>
                  <td className="px-2 py-1 text-[10px] text-[var(--color-fg-muted)]">
                    {e.startDateType ?? '—'}
                  </td>
                  <td className="px-2 py-1 font-mono font-semibold">{e.ticker}</td>
                  <td className="max-w-[16rem] truncate px-2 py-1 text-[10px]">
                    {e.companyName ?? '—'}
                  </td>
                  <td className="px-2 py-1 text-right font-mono tabular">
                    {e.epsEstimate != null ? e.epsEstimate.toFixed(2) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
