import { useMemo, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { Rocket, Eye, ChevronDown, ChevronRight, Target } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useWatchlist } from '../../../hooks/useWatchlist'
import { useQuotes, type HistoricalBar, type Quote } from '../../../hooks/useFinance'
import type { Fundamentals } from '../../../hooks/useFundamentals'
import type { Ownership } from '../../../hooks/useStatements'
import { computeEntrySignals, type EntryVerdict } from '../../../lib/entrySignals'
import { analyzeInsiderActivity } from '../../../lib/insiderSignal'
import { cn } from '../../../lib/cn'

interface Row {
  ticker: string
  verdict: EntryVerdict | null
  loading: boolean
}

export function WatchlistEntrySignals(): React.JSX.Element | null {
  const { data: items = [] } = useWatchlist()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const navigate = useNavigate()

  const tickers = items.map((i) => i.ticker)
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

  const rows: Row[] = useMemo(() => {
    return tickers.map((ticker, i) => {
      const quote = quotes[i]?.data as Quote | undefined
      const bars = historicalQueries[i]?.data
      const fund = fundamentalQueries[i]?.data
      const own = ownershipQueries[i]?.data
      const loading =
        quotes[i]?.isLoading || historicalQueries[i]?.isLoading || fundamentalQueries[i]?.isLoading
      if (!quote || !bars || bars.length < 30) {
        return { ticker, verdict: null, loading: Boolean(loading) }
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

      const verdict = computeEntrySignals({
        ticker,
        currentPrice: quote.price,
        technical: { bars: technicalBars },
        fundamental: fund
          ? {
              trailingPE: fund.trailingPE,
              pegRatio: fund.pegRatio,
              priceToBook: fund.priceToBook,
              profitMargins: fund.profitMargins,
              operatingMargins: fund.operatingMargins,
              revenueGrowth: fund.revenueGrowth,
              earningsGrowth: fund.earningsGrowth,
              debtToEquity: fund.debtToEquity,
              recommendationMean: fund.recommendationMean,
              targetMean: fund.targetMean,
              dividendYield: fund.dividendYield,
              earningsHistory: fund.earningsHistory,
              insiderSignal: insiderSig,
              insiderScore
            }
          : undefined
      })
      return { ticker, verdict, loading: false }
    })
  }, [tickers, quotes, historicalQueries, fundamentalQueries, ownershipQueries])

  const sorted = [...rows].sort((a, b) => {
    const sa = a.verdict?.score ?? -1
    const sb = b.verdict?.score ?? -1
    return sb - sa
  })

  const buyCount = rows.filter((r) => r.verdict?.action === 'buy').length
  const watchCount = rows.filter((r) => r.verdict?.action === 'watch').length

  if (tickers.length === 0) return null

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
          {buyCount > 0 ? (
            <Rocket className="h-4 w-4 text-[var(--color-pos)]" />
          ) : watchCount > 0 ? (
            <Eye className="h-4 w-4 text-[var(--color-info)]" />
          ) : (
            <Target className="h-4 w-4 text-[var(--color-fg-muted)]" />
          )}
          Watchlist entry signals
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono tabular">
          <span
            className={cn(
              'rounded px-2 py-0.5 uppercase',
              buyCount > 0
                ? 'bg-[var(--color-pos)] text-white'
                : 'bg-[var(--color-pos)]/15 text-[var(--color-pos)]'
            )}
          >
            {buyCount} buy
          </span>
          <span
            className={cn(
              'rounded px-2 py-0.5 uppercase',
              watchCount > 0
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-[var(--color-info)]/15 text-[var(--color-info)]'
            )}
          >
            {watchCount} watch
          </span>
          <span className="rounded bg-[var(--color-fg-muted)]/15 px-2 py-0.5 uppercase text-[var(--color-fg-muted)]">
            {rows.length - buyCount - watchCount} wait
          </span>
        </div>
      </div>

      {buyCount > 0 && (
        <div className="mb-3 rounded border border-[var(--color-pos)]/40 bg-[var(--color-pos)]/10 px-3 py-2 text-[11px] text-[var(--color-pos)]">
          <strong>Opportunity:</strong> {buyCount} watchlist ticker
          {buyCount === 1 ? ' has' : 's have'} triggered a BUY setup. Review the rationales below.
        </div>
      )}

      <div className="space-y-1">
        {sorted.slice(0, 10).map((row) => {
          const v = row.verdict
          const isOpen = expanded.has(row.ticker)
          const style =
            v?.action === 'buy'
              ? 'border-[var(--color-pos)]/50 bg-[var(--color-pos)]/5'
              : v?.action === 'watch'
                ? 'border-[var(--color-info)]/50 bg-[var(--color-info)]/5'
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
                  {row.loading && (
                    <span className="text-[9px] text-[var(--color-fg-muted)]">loading…</span>
                  )}
                  {v && (
                    <span className="text-[10px] text-[var(--color-fg-muted)]">
                      {v.headlineMessage}
                    </span>
                  )}
                </button>
                <div className="flex items-center gap-2">
                  {v && <span className="font-mono text-[12px] font-bold tabular">{v.score}</span>}
                  <span
                    className={cn(
                      'rounded px-2 py-0.5 font-mono text-[9px] uppercase',
                      v?.action === 'buy' && 'bg-[var(--color-pos)] text-white',
                      v?.action === 'watch' && 'bg-[var(--color-accent)] text-white',
                      (!v || v.action === 'ignore') &&
                        'bg-[var(--color-fg-muted)]/15 text-[var(--color-fg-muted)]'
                    )}
                  >
                    {v?.action ?? 'wait'}
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
                            s.severity === 'high' &&
                              'bg-[var(--color-pos)]/15 text-[var(--color-pos)]',
                            s.severity === 'medium' &&
                              'bg-[var(--color-info)]/15 text-[var(--color-info)]',
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
        Score ≥ 60 → BUY · 30-59 → WATCH · &lt; 30 → wait. Scans 22 bullish indicators across
        technical (trend, momentum, candles, volume), fundamental (Piotroski, Altman, earnings,
        insider, growth, margins), and valuation (PEG, leverage).
      </div>
    </div>
  )
}
