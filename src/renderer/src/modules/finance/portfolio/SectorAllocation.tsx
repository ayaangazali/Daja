import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { PieChart } from 'lucide-react'
import { useTrades } from '../../../hooks/useTrades'
import { useQuotes, type Quote } from '../../../hooks/useFinance'
import { computeTaxLotPositions, type TaxLotTrade } from '../../../lib/positionsFifo'
import type { Fundamentals } from '../../../hooks/useFundamentals'
import { fmtLargeNum } from '../../../lib/format'

const SECTOR_COLORS: Record<string, string> = {
  Technology: '#60a5fa',
  'Financial Services': '#4ade80',
  Healthcare: '#f87171',
  'Consumer Cyclical': '#facc15',
  'Communication Services': '#c084fc',
  Industrials: '#fb923c',
  'Consumer Defensive': '#34d399',
  Energy: '#f59e0b',
  'Real Estate': '#a78bfa',
  'Basic Materials': '#fbbf24',
  Utilities: '#22d3ee',
  Unknown: '#6b7280'
}

function sectorColor(s: string): string {
  return SECTOR_COLORS[s] ?? SECTOR_COLORS.Unknown
}

export function SectorAllocation(): React.JSX.Element | null {
  const { data: trades = [] } = useTrades()

  const openPositions = useMemo(() => {
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
    return pos.filter((p) => p.qty > 0.0001)
  }, [trades])

  const tickers = openPositions.map((p) => p.ticker)
  const quotes = useQuotes(tickers)
  const fundamentals = useQueries({
    queries: tickers.map((t) => ({
      queryKey: ['fundamentals', t],
      queryFn: () => window.nexus.finance.fundamentals(t) as Promise<Fundamentals>,
      staleTime: 15 * 60_000
    }))
  })

  const bySector = useMemo(() => {
    const m = new Map<string, { value: number; tickers: string[] }>()
    let total = 0
    openPositions.forEach((p, i) => {
      const price = (quotes[i]?.data as Quote | undefined)?.price
      const fund = fundamentals[i]?.data
      if (price == null) return
      const v = price * p.qty
      const sector = fund?.sector ?? 'Unknown'
      const existing = m.get(sector) ?? { value: 0, tickers: [] }
      existing.value += v
      existing.tickers.push(p.ticker)
      m.set(sector, existing)
      total += v
    })
    return {
      total,
      rows: [...m.entries()]
        .map(([sector, { value, tickers }]) => ({
          sector,
          value,
          tickers,
          pct: total > 0 ? (value / total) * 100 : 0
        }))
        .sort((a, b) => b.value - a.value)
    }
  }, [openPositions, quotes, fundamentals])

  if (openPositions.length === 0 || bySector.total === 0) return null

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <PieChart className="h-3 w-3" /> Sector allocation
        </div>
        <div className="font-mono text-[10px] tabular text-[var(--color-fg-muted)]">
          Total: ${fmtLargeNum(bySector.total)}
        </div>
      </div>
      {/* Stacked bar */}
      <div className="mb-3 flex h-3 w-full overflow-hidden rounded">
        {bySector.rows.map((r) => (
          <div
            key={r.sector}
            className="h-full"
            style={{ width: `${r.pct}%`, background: sectorColor(r.sector) }}
            title={`${r.sector}: ${r.pct.toFixed(1)}%`}
          />
        ))}
      </div>
      <table className="w-full text-[11px]">
        <thead className="text-[10px] uppercase text-[var(--color-fg-muted)]">
          <tr>
            <th className="px-2 py-1 text-left">Sector</th>
            <th className="px-2 py-1 text-right">Value</th>
            <th className="px-2 py-1 text-right">%</th>
            <th className="px-2 py-1 text-left">Tickers</th>
          </tr>
        </thead>
        <tbody>
          {bySector.rows.map((r) => (
            <tr key={r.sector} className="border-t border-[var(--color-border)]">
              <td className="px-2 py-1">
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: sectorColor(r.sector) }}
                  />
                  {r.sector}
                </span>
              </td>
              <td className="px-2 py-1 text-right font-mono tabular">${fmtLargeNum(r.value)}</td>
              <td className="px-2 py-1 text-right font-mono tabular">{r.pct.toFixed(1)}%</td>
              <td className="px-2 py-1 text-[10px] text-[var(--color-fg-muted)]">
                {r.tickers.join(', ')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
