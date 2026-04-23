import { useMemo, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { Siren, Zap } from 'lucide-react'
import { useTrades } from '../../../hooks/useTrades'
import { useQuotes, type Quote } from '../../../hooks/useFinance'
import type { Fundamentals } from '../../../hooks/useFundamentals'
import { computeTaxLotPositions, type TaxLotTrade } from '../../../lib/positionsFifo'
import {
  HISTORICAL_SCENARIOS,
  runCustomScenario,
  runStressTest,
  type Position,
  type Scenario,
  type StressResult
} from '../../../lib/stressTest'
import { fmtLargeNum, fmtPct } from '../../../lib/format'
import { cn } from '../../../lib/cn'

export function StressTestPanel(): React.JSX.Element | null {
  const { data: trades = [] } = useTrades()
  const [selectedId, setSelectedId] = useState<string>('covid_2020')
  const [customSpy, setCustomSpy] = useState('-20')

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
    return computeTaxLotPositions(taxLotTrades).filter((p) => p.qty > 0.0001)
  }, [trades])

  const tickers = openPositions.map((p) => p.ticker)
  const quotes = useQuotes(tickers)
  const fundQueries = useQueries({
    queries: tickers.map((t) => ({
      queryKey: ['fundamentals', t],
      queryFn: () => window.daja.finance.fundamentals(t) as Promise<Fundamentals>,
      staleTime: 15 * 60_000
    }))
  })

  const positions: Position[] = useMemo(() => {
    return openPositions.map((p, i) => {
      const q = quotes[i]?.data as Quote | undefined
      const f = fundQueries[i]?.data
      return {
        ticker: p.ticker,
        shares: p.qty,
        currentPrice: q?.price ?? p.avgCost,
        beta: null, // Yahoo fundamentals doesn't expose beta in our Fundamentals shape
        sector: f?.sector ?? null
      }
    })
  }, [openPositions, quotes, fundQueries])

  const scenarios: Scenario[] = HISTORICAL_SCENARIOS
  const selectedScenario = scenarios.find((s) => s.id === selectedId) ?? scenarios[0]

  const results: Record<string, StressResult> = useMemo(() => {
    const out: Record<string, StressResult> = {}
    for (const s of scenarios) {
      out[s.id] = runStressTest(positions, s)
    }
    return out
  }, [positions, scenarios])

  const customResult = useMemo(() => {
    const spy = Number(customSpy) || 0
    return runCustomScenario(positions, spy)
  }, [positions, customSpy])

  if (openPositions.length === 0) return null

  const active: StressResult = results[selectedScenario.id] ?? customResult

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <Siren className="h-3 w-3" /> Portfolio stress test
        </div>
        <span className="text-[9px] text-[var(--color-fg-muted)]">
          Historical crisis overlays + custom shock
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-1">
        {scenarios.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedId(s.id)}
            className={cn(
              'rounded-md border px-2 py-1 text-[10px]',
              selectedId === s.id
                ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
                : 'border-[var(--color-border)] text-[var(--color-fg-muted)]'
            )}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="mb-3 text-[10px] text-[var(--color-fg-muted)]">
        {selectedScenario.description}
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-2.5">
          <div className="text-[9px] uppercase text-[var(--color-fg-muted)]">Before</div>
          <div className="font-mono text-[14px] font-semibold tabular">
            ${fmtLargeNum(active.portfolioBefore)}
          </div>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-2.5">
          <div className="text-[9px] uppercase text-[var(--color-fg-muted)]">After shock</div>
          <div className="font-mono text-[14px] font-semibold tabular">
            ${fmtLargeNum(active.portfolioAfter)}
          </div>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-2.5">
          <div className="text-[9px] uppercase text-[var(--color-fg-muted)]">Δ dollars</div>
          <div
            className={cn(
              'font-mono text-[14px] font-semibold tabular',
              active.portfolioDelta >= 0 ? 'text-[var(--color-pos)]' : 'text-[var(--color-neg)]'
            )}
          >
            ${fmtLargeNum(active.portfolioDelta)}
          </div>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-2.5">
          <div className="text-[9px] uppercase text-[var(--color-fg-muted)]">Δ %</div>
          <div
            className={cn(
              'font-mono text-[14px] font-semibold tabular',
              active.portfolioDeltaPct >= 0 ? 'text-[var(--color-pos)]' : 'text-[var(--color-neg)]'
            )}
          >
            {fmtPct(active.portfolioDeltaPct)}
          </div>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2 rounded-lg border border-dashed border-[var(--color-border)] p-2 text-[10px]">
        <Zap className="h-3 w-3 text-[var(--color-accent)]" />
        <span className="text-[var(--color-fg-muted)]">Custom: SPY shock</span>
        <input
          type="number"
          value={customSpy}
          onChange={(e) => setCustomSpy(e.target.value)}
          className="w-16 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-1 py-0.5 font-mono text-[10px]"
        />
        <span>%</span>
        <span className="ml-4 text-[var(--color-fg-muted)]">→</span>
        <span
          className={cn(
            'font-mono tabular',
            customResult.portfolioDeltaPct >= 0
              ? 'text-[var(--color-pos)]'
              : 'text-[var(--color-neg)]'
          )}
        >
          {fmtPct(customResult.portfolioDeltaPct)} (${fmtLargeNum(customResult.portfolioDelta)})
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead className="text-[9px] uppercase text-[var(--color-fg-muted)]">
            <tr>
              <th className="px-2 py-1 text-left">Ticker</th>
              <th className="px-2 py-1 text-left">Sector</th>
              <th className="px-2 py-1 text-right">Before</th>
              <th className="px-2 py-1 text-right">Shock %</th>
              <th className="px-2 py-1 text-right">After</th>
              <th className="px-2 py-1 text-right">P&L</th>
            </tr>
          </thead>
          <tbody>
            {active.positions
              .slice()
              .sort((a, b) => a.pnl - b.pnl)
              .map((p) => (
                <tr
                  key={p.ticker}
                  className="border-t border-[var(--color-border)] font-mono tabular"
                >
                  <td className="px-2 py-0.5 font-semibold">{p.ticker}</td>
                  <td className="max-w-[10rem] truncate px-2 py-0.5 text-[9px]">
                    {p.sector ?? '—'}
                  </td>
                  <td className="px-2 py-0.5 text-right">${fmtLargeNum(p.currentValue)}</td>
                  <td
                    className={cn(
                      'px-2 py-0.5 text-right',
                      p.shockPct >= 0 ? 'text-[var(--color-pos)]' : 'text-[var(--color-neg)]'
                    )}
                  >
                    {fmtPct(p.shockPct)}
                  </td>
                  <td className="px-2 py-0.5 text-right">${fmtLargeNum(p.newValue)}</td>
                  <td
                    className={cn(
                      'px-2 py-0.5 text-right',
                      p.pnl >= 0 ? 'text-[var(--color-pos)]' : 'text-[var(--color-neg)]'
                    )}
                  >
                    ${fmtLargeNum(p.pnl)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
