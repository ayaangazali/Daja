import { useMemo, useState } from 'react'
import { Rocket, Eye, Target, Info } from 'lucide-react'
import { useHistorical, useQuote } from '../../../../hooks/useFinance'
import { useFundamentals } from '../../../../hooks/useFundamentals'
import { useOwnership, useStatements } from '../../../../hooks/useStatements'
import {
  computeEntrySignals,
  type EntrySignal,
  type Severity
} from '../../../../lib/entrySignals'
import { analyzeInsiderActivity } from '../../../../lib/insiderSignal'
import { altmanZ, piotroskiScore } from '../../../../lib/valuation'
import { cn } from '../../../../lib/cn'

const SEVERITY_COLOR: Record<Severity, string> = {
  low: 'text-[var(--color-fg-muted)] bg-[var(--color-fg-muted)]/10',
  medium: 'text-[var(--color-info)] bg-[var(--color-info)]/15',
  high: 'text-[var(--color-pos)] bg-[var(--color-pos)]/15',
  critical: 'text-white bg-[var(--color-pos)]'
}

const CATEGORY_LABEL: Record<string, string> = {
  technical: 'Technical',
  fundamental: 'Fundamental',
  momentum: 'Momentum',
  value: 'Value'
}

export function EntrySignalsPanel({ ticker }: { ticker: string }): React.JSX.Element {
  const [showAll, setShowAll] = useState(false)
  const { data: quote } = useQuote(ticker)
  const { data: bars = [] } = useHistorical(ticker, '2y')
  const { data: fund } = useFundamentals(ticker)
  const { data: ownership } = useOwnership(ticker)
  const { data: stmts } = useStatements(ticker)

  const verdict = useMemo(() => {
    if (!quote || bars.length < 30) return null

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

    // Insider
    let insiderSig: 'bullish' | 'bearish' | 'mixed' | 'neutral' = 'neutral'
    let insiderScore = 0
    if (ownership) {
      const ins = analyzeInsiderActivity(ownership.insiderTransactions)
      insiderSig = ins.signal
      insiderScore = ins.score
    }

    // Derive Piotroski + Altman from statements
    let piotroski: number | null = null
    let altman: number | null = null
    if (stmts && stmts.incomeAnnual.length >= 2 && stmts.balanceAnnual.length >= 2) {
      const latestInc = stmts.incomeAnnual[0]
      const prevInc = stmts.incomeAnnual[1]
      const latestBal = stmts.balanceAnnual[0]
      const prevBal = stmts.balanceAnnual[1]
      const latestCf = stmts.cashAnnual[0]
      const prevCf = stmts.cashAnnual[1]
      try {
        piotroski = piotroskiScore({
          curr: {
            netIncome: latestInc.netIncome,
            ocf: latestCf?.operating ?? null,
            totalAssets: latestBal.totalAssets,
            prevAssets: prevBal.totalAssets,
            longTermDebt: latestBal.longTermDebt,
            currentRatio: null,
            sharesOut: fund?.sharesOutstanding ?? null,
            grossMargin:
              latestInc.revenue && latestInc.grossProfit
                ? (latestInc.grossProfit / latestInc.revenue) * 100
                : null,
            assetTurnover:
              latestInc.revenue && latestBal.totalAssets
                ? latestInc.revenue / latestBal.totalAssets
                : null
          },
          prev: {
            netIncome: prevInc.netIncome,
            ocf: prevCf?.operating ?? null,
            totalAssets: prevBal.totalAssets,
            longTermDebt: prevBal.longTermDebt,
            currentRatio: null,
            sharesOut: fund?.sharesOutstanding ?? null,
            grossMargin:
              prevInc?.revenue && prevInc?.grossProfit
                ? (prevInc.grossProfit / prevInc.revenue) * 100
                : null,
            assetTurnover:
              prevInc?.revenue && prevBal?.totalAssets
                ? prevInc.revenue / prevBal.totalAssets
                : null
          }
        }).score
        const workingCapital =
          latestBal.totalAssets != null && latestBal.totalLiab != null
            ? latestBal.totalAssets - latestBal.totalLiab
            : null
        altman = altmanZ({
          workingCapital,
          retainedEarnings: latestBal.totalEquity,
          ebit: latestInc.operatingIncome,
          marketCap: fund?.marketCap ?? null,
          totalLiab: latestBal.totalLiab,
          sales: latestInc.revenue,
          totalAssets: latestBal.totalAssets
        }).z
      } catch {
        // noop — keep nulls
      }
    }

    return computeEntrySignals({
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
            piotroskiScore: piotroski,
            altmanZ: altman,
            insiderSignal: insiderSig,
            insiderScore
          }
        : undefined
    })
  }, [quote, bars, fund, ownership, stmts, ticker])

  if (!verdict) {
    return (
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3 text-[11px] text-[var(--color-fg-muted)]">
        Loading entry signals…
      </div>
    )
  }

  const actionStyle =
    verdict.action === 'buy'
      ? 'bg-[var(--color-pos)] text-white'
      : verdict.action === 'watch'
        ? 'bg-[var(--color-info)] text-white'
        : 'bg-[var(--color-fg-muted)]/20 text-[var(--color-fg-muted)]'

  const visible = showAll ? verdict.signals : verdict.signals.slice(0, 5)

  const groups: Record<string, EntrySignal[]> = {}
  for (const s of verdict.signals) {
    if (!groups[s.category]) groups[s.category] = []
    groups[s.category].push(s)
  }

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          {verdict.action === 'buy' ? (
            <Rocket className="h-4 w-4 text-[var(--color-pos)]" />
          ) : verdict.action === 'watch' ? (
            <Eye className="h-4 w-4 text-[var(--color-info)]" />
          ) : (
            <Target className="h-4 w-4 text-[var(--color-fg-muted)]" />
          )}
          Entry signal engine
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'rounded px-3 py-1 font-mono text-xs font-bold uppercase tracking-wide',
              actionStyle
            )}
          >
            {verdict.action}
          </span>
          <span className="font-mono text-2xl font-bold tabular">{verdict.score}</span>
          <span className="text-[10px] text-[var(--color-fg-muted)]">/100</span>
        </div>
      </div>

      <div
        className={cn(
          'mb-3 rounded px-3 py-2 text-[12px]',
          verdict.action === 'buy'
            ? 'bg-[var(--color-pos)]/15 text-[var(--color-pos)]'
            : verdict.action === 'watch'
              ? 'bg-[var(--color-info)]/15 text-[var(--color-info)]'
              : 'bg-[var(--color-fg-muted)]/10 text-[var(--color-fg-muted)]'
        )}
      >
        {verdict.headlineMessage}
      </div>

      {verdict.signals.length === 0 ? (
        <div className="flex items-center gap-2 rounded border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-[11px] text-[var(--color-fg-muted)]">
          <Info className="h-3 w-3" /> No bullish setups currently — wait for a constructive
          technical or fundamental signal before committing capital.
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((s) => (
            <div
              key={s.id}
              className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] p-2"
            >
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5 font-mono text-[9px] uppercase',
                      SEVERITY_COLOR[s.severity]
                    )}
                  >
                    {s.severity}
                  </span>
                  <span className="text-[9px] uppercase text-[var(--color-fg-muted)]">
                    {CATEGORY_LABEL[s.category]}
                  </span>
                  <span className="text-[11px] font-semibold">{s.title}</span>
                </div>
                <span className="font-mono text-[10px] tabular text-[var(--color-fg-muted)]">
                  +{s.points.toFixed(0)} pts
                </span>
              </div>
              <div className="text-[10px] leading-relaxed text-[var(--color-fg-muted)]">
                {s.rationale}
              </div>
            </div>
          ))}
          {verdict.signals.length > 5 && (
            <button
              onClick={() => setShowAll((p) => !p)}
              className="w-full rounded border border-[var(--color-border)] py-1 text-[10px] text-[var(--color-fg-muted)] hover:bg-[var(--color-bg)]"
            >
              {showAll
                ? 'Show less'
                : `Show ${verdict.signals.length - 5} more signal${verdict.signals.length - 5 === 1 ? '' : 's'}`}
            </button>
          )}
        </div>
      )}

      <div className="mt-3 grid grid-cols-4 gap-2 text-[9px]">
        {(['technical', 'momentum', 'fundamental', 'value'] as const).map((cat) => (
          <div
            key={cat}
            className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] p-1.5"
          >
            <div className="uppercase text-[var(--color-fg-muted)]">{CATEGORY_LABEL[cat]}</div>
            <div className="font-mono font-semibold tabular">
              {groups[cat]?.length ?? 0} signal{groups[cat]?.length === 1 ? '' : 's'}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
