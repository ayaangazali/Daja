import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react'
import { useHistorical, useQuote } from '../../../../hooks/useFinance'
import { useFundamentals } from '../../../../hooks/useFundamentals'
import { useOwnership } from '../../../../hooks/useStatements'
import { useTradesByTicker } from '../../../../hooks/useTrades'
import { computeExitSignals, type ExitSignal, type Severity } from '../../../../lib/exitSignals'
import { analyzeInsiderActivity } from '../../../../lib/insiderSignal'
import { cn } from '../../../../lib/cn'

const SEVERITY_COLOR: Record<Severity, string> = {
  low: 'text-[var(--color-fg-muted)] bg-[var(--color-fg-muted)]/10',
  medium: 'text-[var(--color-warn)] bg-[var(--color-warn)]/15',
  high: 'text-[var(--color-neg)] bg-[var(--color-neg)]/15',
  critical: 'text-white bg-[var(--color-neg)]'
}

const CATEGORY_LABEL: Record<string, string> = {
  technical: 'Technical',
  fundamental: 'Fundamental',
  risk: 'Risk',
  position: 'Position'
}

export function ExitSignalsPanel({ ticker }: { ticker: string }): React.JSX.Element {
  const [stopLoss, setStopLoss] = useState('8')
  const [trailingStop, setTrailingStop] = useState('15')
  const [profitTake, setProfitTake] = useState('50')
  const [showAll, setShowAll] = useState(false)

  const { data: quote } = useQuote(ticker)
  const { data: bars = [] } = useHistorical(ticker, '2y')
  const { data: fund } = useFundamentals(ticker)
  const { data: ownership } = useOwnership(ticker)
  const { data: trades = [] } = useTradesByTicker(ticker)

  const verdict = useMemo(() => {
    if (!quote || bars.length < 30) return null

    let net = 0
    let basis = 0
    for (const t of trades) {
      if (t.side === 'buy') {
        net += t.quantity
        basis += t.quantity * t.price + (t.fees ?? 0)
      } else if (t.side === 'sell') {
        if (net > 0) {
          const avg = basis / net
          basis -= avg * t.quantity
        }
        net -= t.quantity
      }
    }
    const avgCost = net > 0 ? basis / net : quote.price

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
    if (ownership) {
      const ins = analyzeInsiderActivity(ownership.insiderTransactions)
      insiderSig = ins.signal
      insiderScore = ins.score
    }

    return computeExitSignals({
      position: {
        ticker,
        shares: Math.max(0, net),
        avgCost,
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
        : undefined,
      options: {
        stopLossPct: Number(stopLoss) || undefined,
        trailingStopPct: Number(trailingStop) || undefined,
        profitTakePct: Number(profitTake) || undefined
      }
    })
  }, [quote, bars, fund, ownership, trades, ticker, stopLoss, trailingStop, profitTake])

  if (!verdict) {
    return (
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3 text-[11px] text-[var(--color-fg-muted)]">
        Loading exit signals…
      </div>
    )
  }

  const actionStyle =
    verdict.action === 'exit'
      ? 'bg-[var(--color-neg)] text-white'
      : verdict.action === 'trim'
        ? 'bg-[var(--color-warn)] text-white'
        : 'bg-[var(--color-pos)] text-white'

  const visible = showAll ? verdict.signals : verdict.signals.slice(0, 5)

  const groups: Record<string, ExitSignal[]> = {}
  for (const s of verdict.signals) {
    if (!groups[s.category]) groups[s.category] = []
    groups[s.category].push(s)
  }

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          {verdict.action === 'exit' ? (
            <XCircle className="h-4 w-4 text-[var(--color-neg)]" />
          ) : verdict.action === 'trim' ? (
            <AlertTriangle className="h-4 w-4 text-[var(--color-warn)]" />
          ) : (
            <CheckCircle className="h-4 w-4 text-[var(--color-pos)]" />
          )}
          Exit signal engine
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
          verdict.action === 'exit'
            ? 'bg-[var(--color-neg)]/15 text-[var(--color-neg)]'
            : verdict.action === 'trim'
              ? 'bg-[var(--color-warn)]/15 text-[var(--color-warn)]'
              : 'bg-[var(--color-pos)]/10 text-[var(--color-pos)]'
        )}
      >
        {verdict.headlineMessage}
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2 text-[10px]">
        <label className="flex items-center gap-1 text-[var(--color-fg-muted)]">
          Stop loss %
          <input
            type="number"
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
            className="w-14 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-1 py-0.5 text-right font-mono"
          />
        </label>
        <label className="flex items-center gap-1 text-[var(--color-fg-muted)]">
          Trail %
          <input
            type="number"
            value={trailingStop}
            onChange={(e) => setTrailingStop(e.target.value)}
            className="w-14 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-1 py-0.5 text-right font-mono"
          />
        </label>
        <label className="flex items-center gap-1 text-[var(--color-fg-muted)]">
          Target %
          <input
            type="number"
            value={profitTake}
            onChange={(e) => setProfitTake(e.target.value)}
            className="w-14 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-1 py-0.5 text-right font-mono"
          />
        </label>
      </div>

      {verdict.signals.length === 0 ? (
        <div className="flex items-center gap-2 rounded border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-[11px] text-[var(--color-fg-muted)]">
          <Info className="h-3 w-3" /> No exit conditions triggered. Technical + fundamental picture
          is currently supportive of holding.
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
        {(['technical', 'fundamental', 'risk', 'position'] as const).map((cat) => (
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
