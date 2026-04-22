import { useMemo, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { AlertOctagon, AlertTriangle, ChevronDown, ChevronRight, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTrades } from '../../../hooks/useTrades'
import { useQuotes, type HistoricalBar, type Quote } from '../../../hooks/useFinance'
import type { Fundamentals } from '../../../hooks/useFundamentals'
import type { Ownership } from '../../../hooks/useStatements'
import { computeTaxLotPositions, type TaxLotTrade } from '../../../lib/positionsFifo'
import { computeExitSignals, type ExitVerdict } from '../../../lib/exitSignals'
import { analyzeInsiderActivity } from '../../../lib/insiderSignal'
import { cn } from '../../../lib/cn'

interface PositionRow {
  ticker: string
  qty: number
  avgCost: number
  verdict: ExitVerdict | null
  loading: boolean
}

export function PortfolioExitSignals(): React.JSX.Element | null {
  const { data: trades = [] } = useTrades()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const navigate = useNavigate()

  const positions = useMemo(() => {
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

  const tickers = positions.map((p) => p.ticker)
  const quotes = useQuotes(tickers)

  const historicalQueries = useQueries({
    queries: tickers.map((t) => ({
      queryKey: ['historical', t, '2y'],
      queryFn: () => window.daja.finance.historical(t, '2y') as Promise<HistoricalBar[]>,
      staleTime: 30 * 60_000
    }))
  })
  const fundamentalQueries = useQueries({
    queries: tickers.map((t) => ({
      queryKey: ['fundamentals', t],
      queryFn: () => window.daja.finance.fundamentals(t) as Promise<Fundamentals>,
      staleTime: 15 * 60_000
    }))
  })
  const ownershipQueries = useQueries({
    queries: tickers.map((t) => ({
      queryKey: ['ownership', t],
      queryFn: () => window.daja.finance.ownership(t) as Promise<Ownership>,
      staleTime: 30 * 60_000
    }))
  })

  const rows: PositionRow[] = useMemo(() => {
    return positions.map((pos, i) => {
      const quote = quotes[i]?.data as Quote | undefined
      const bars = historicalQueries[i]?.data
      const fund = fundamentalQueries[i]?.data
      const own = ownershipQueries[i]?.data
      const loading =
        quotes[i]?.isLoading ||
        historicalQueries[i]?.isLoading ||
        fundamentalQueries[i]?.isLoading
      if (!quote || !bars || bars.length < 30) {
        return {
          ticker: pos.ticker,
          qty: pos.qty,
          avgCost: pos.avgCost,
          verdict: null,
          loading: Boolean(loading)
        }
      }

      const technicalBars = bars
        .filter((b) => b.close != null && b.high != null && b.low != null && b.open != null)
        .map((b) => ({
          time: b.time,
          open: b.open as number,
          high: b.high as number,
          low: b.low as number,
          close: b.close as number,
          volume: b.volume ?? 0
        }))

      let insiderSig: 'bullish' | 'bearish' | 'mixed' | 'neutral' = 'neutral'
      let insiderScore = 0
      if (own) {
        const ins = analyzeInsiderActivity(own.insiderTransactions)
        insiderSig = ins.signal
        insiderScore = ins.score
      }

      const verdict = computeExitSignals({
        position: {
          ticker: pos.ticker,
          shares: pos.qty,
          avgCost: pos.avgCost,
          currentPrice: quote.price
        },
        technical: { bars: technicalBars },
        fundamental: fund
          ? {
              trailingPE: fund.trailingPE,
              forwardPE: fund.forwardPE,
              pegRatio: fund.pegRatio,
              priceToSales: fund.priceToSales,
              priceToBook: fund.priceToBook,
              profitMargins: fund.profitMargins,
              operatingMargins: fund.operatingMargins,
              grossMargins: fund.grossMargins,
              revenueGrowth: fund.revenueGrowth,
              earningsGrowth: fund.earningsGrowth,
              debtToEquity: fund.debtToEquity,
              recommendationMean: fund.recommendationMean,
              targetMean: fund.targetMean,
              dividendYield: fund.dividendYield,
              payoutRatio: fund.payoutRatio,
              earningsHistory: fund.earningsHistory,
              insiderSignal: insiderSig,
              insiderScore
            }
          : undefined
      })

      return {
        ticker: pos.ticker,
        qty: pos.qty,
        avgCost: pos.avgCost,
        verdict,
        loading: false
      }
    })
  }, [positions, quotes, historicalQueries, fundamentalQueries, ownershipQueries])

  const sorted = [...rows].sort((a, b) => {
    const sa = a.verdict?.score ?? -1
    const sb = b.verdict?.score ?? -1
    return sb - sa
  })

  const exitCount = rows.filter((r) => r.verdict?.action === 'exit').length
  const trimCount = rows.filter((r) => r.verdict?.action === 'trim').length

  if (positions.length === 0) return null

  const toggle = (ticker: string): void => {
    setExpanded((prev) => {
      const n = new Set(prev)
      if (n.has(ticker)) n.delete(ticker)
      else n.add(ticker)
      return n
    })
  }

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          {exitCount > 0 ? (
            <AlertOctagon className="h-4 w-4 text-[var(--color-neg)]" />
          ) : trimCount > 0 ? (
            <AlertTriangle className="h-4 w-4 text-[var(--color-warn)]" />
          ) : (
            <ShieldCheck className="h-4 w-4 text-[var(--color-pos)]" />
          )}
          Portfolio exit signals
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono tabular">
          <span
            className={cn(
              'rounded px-2 py-0.5 uppercase',
              exitCount > 0
                ? 'bg-[var(--color-neg)] text-white'
                : 'bg-[var(--color-neg)]/15 text-[var(--color-neg)]'
            )}
          >
            {exitCount} exit
          </span>
          <span
            className={cn(
              'rounded px-2 py-0.5 uppercase',
              trimCount > 0
                ? 'bg-[var(--color-warn)] text-white'
                : 'bg-[var(--color-warn)]/15 text-[var(--color-warn)]'
            )}
          >
            {trimCount} trim
          </span>
          <span className="rounded bg-[var(--color-pos)]/15 px-2 py-0.5 uppercase text-[var(--color-pos)]">
            {rows.length - exitCount - trimCount} hold
          </span>
        </div>
      </div>

      {exitCount > 0 && (
        <div className="mb-3 rounded border border-[var(--color-neg)]/40 bg-[var(--color-neg)]/10 px-3 py-2 text-[11px] text-[var(--color-neg)]">
          <strong>Action required:</strong> {exitCount} position{exitCount === 1 ? ' has' : 's have'}{' '}
          triggered an EXIT verdict. Review the rationales below and decide whether to close or
          override.
        </div>
      )}

      <div className="space-y-1">
        {sorted.map((row) => {
          const v = row.verdict
          const isOpen = expanded.has(row.ticker)
          const style =
            v?.action === 'exit'
              ? 'border-[var(--color-neg)]/50 bg-[var(--color-neg)]/5'
              : v?.action === 'trim'
                ? 'border-[var(--color-warn)]/50 bg-[var(--color-warn)]/5'
                : 'border-[var(--color-border)]'
          return (
            <div key={row.ticker} className={cn('rounded border', style)}>
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <button
                  onClick={() => toggle(row.ticker)}
                  className="flex flex-1 items-center gap-2"
                >
                  {isOpen ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  <span className="font-mono text-[12px] font-semibold">{row.ticker}</span>
                  <span className="text-[10px] text-[var(--color-fg-muted)]">
                    {row.qty} sh @ ${row.avgCost.toFixed(2)}
                  </span>
                  {row.loading && (
                    <span className="text-[9px] text-[var(--color-fg-muted)]">loading…</span>
                  )}
                  {v && (
                    <span className="ml-2 text-[10px] text-[var(--color-fg-muted)]">
                      {v.headlineMessage}
                    </span>
                  )}
                </button>
                <div className="flex items-center gap-2">
                  {v && <span className="font-mono text-[12px] font-bold tabular">{v.score}</span>}
                  <span
                    className={cn(
                      'rounded px-2 py-0.5 font-mono text-[9px] uppercase',
                      v?.action === 'exit' && 'bg-[var(--color-neg)] text-white',
                      v?.action === 'trim' && 'bg-[var(--color-warn)] text-white',
                      (!v || v.action === 'hold') &&
                        'bg-[var(--color-pos)]/15 text-[var(--color-pos)]'
                    )}
                  >
                    {v?.action ?? 'hold'}
                  </span>
                  <button
                    onClick={() => navigate(`/finance/stock/${row.ticker}`)}
                    className="rounded border border-[var(--color-border)] px-2 py-0.5 text-[10px] hover:bg-[var(--color-bg)]"
                  >
                    View →
                  </button>
                </div>
              </div>
              {isOpen && v && v.signals.length > 0 && (
                <div className="space-y-1 border-t border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2">
                  {v.signals.map((s) => (
                    <div key={s.id} className="text-[10px]">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'rounded px-1 py-0.5 font-mono text-[9px] uppercase',
                            s.severity === 'critical' && 'bg-[var(--color-neg)] text-white',
                            s.severity === 'high' &&
                              'bg-[var(--color-neg)]/15 text-[var(--color-neg)]',
                            s.severity === 'medium' &&
                              'bg-[var(--color-warn)]/15 text-[var(--color-warn)]',
                            s.severity === 'low' && 'text-[var(--color-fg-muted)]'
                          )}
                        >
                          {s.severity}
                        </span>
                        <span className="text-[9px] uppercase text-[var(--color-fg-muted)]">
                          {s.category}
                        </span>
                        <span className="font-semibold">{s.title}</span>
                      </div>
                      <div className="pl-10 text-[var(--color-fg-muted)]">{s.rationale}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-3 text-[9px] text-[var(--color-fg-muted)]">
        Signals combine technical (price action, momentum, trend, volume), fundamental (growth,
        valuation, analyst target, insider flow), risk (volatility, drawdown), and position
        (stop-loss, trailing stop, profit target). Score ≥ 60 → EXIT · 30-59 → TRIM · &lt; 30 →
        HOLD.
      </div>
    </div>
  )
}
