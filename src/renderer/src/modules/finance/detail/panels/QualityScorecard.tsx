import { useMemo } from 'react'
import { Award } from 'lucide-react'
import { useStatements } from '../../../../hooks/useStatements'
import { useFundamentals } from '../../../../hooks/useFundamentals'
import { altmanZ, cagr, fcfConversion, piotroskiScore, roic } from '../../../../lib/valuation'
import { coefficientOfVariation, qualityScore } from '../../../../lib/qualityScore'
import { cn } from '../../../../lib/cn'

export function QualityScorecard({ ticker }: { ticker: string }): React.JSX.Element {
  const { data: stmts } = useStatements(ticker)
  const { data: fund } = useFundamentals(ticker)

  const result = useMemo(() => {
    if (!stmts || !fund) return null
    const inc = stmts.incomeAnnual
    const bal = stmts.balanceAnnual
    const cf = stmts.cashAnnual
    if (inc.length < 2 || bal.length < 2 || cf.length < 1) return null

    const latestInc = inc[0]
    const prevInc = inc[1]
    const latestBal = bal[0]
    const prevBal = bal[1]
    const latestCf = cf[0]
    const prevCf = cf[1]

    // Piotroski
    const pScore = piotroskiScore({
      curr: {
        netIncome: latestInc.netIncome,
        ocf: latestCf?.operating ?? null,
        totalAssets: latestBal.totalAssets,
        prevAssets: prevBal.totalAssets,
        longTermDebt: latestBal.longTermDebt,
        currentRatio: null,
        sharesOut: fund.sharesOutstanding,
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
        sharesOut: fund.sharesOutstanding,
        grossMargin:
          prevInc?.revenue && prevInc?.grossProfit
            ? (prevInc.grossProfit / prevInc.revenue) * 100
            : null,
        assetTurnover:
          prevInc?.revenue && prevBal?.totalAssets ? prevInc.revenue / prevBal.totalAssets : null
      }
    })

    // Altman Z
    const workingCapital =
      latestBal.totalAssets != null && latestBal.totalLiab != null
        ? latestBal.totalAssets - latestBal.totalLiab
        : null
    const alt = altmanZ({
      workingCapital,
      retainedEarnings: latestBal.totalEquity,
      ebit: latestInc.operatingIncome,
      marketCap: fund.marketCap,
      totalLiab: latestBal.totalLiab,
      sales: latestInc.revenue,
      totalAssets: latestBal.totalAssets
    })

    // ROIC
    const roicPct = roic({
      operatingIncome: latestInc.operatingIncome,
      taxRate: 0.21,
      totalDebt: (latestBal.longTermDebt ?? 0) + (latestBal.shortTermDebt ?? 0),
      totalEquity: latestBal.totalEquity,
      cash: latestBal.cash
    })

    // FCF conversion
    const fcfConvPct = fcfConversion(latestCf?.freeCashflow, latestInc.netIncome)

    // Gross margin stability (coefficient of variation over all years)
    const grossMargins = inc
      .map((r) =>
        r.revenue && r.revenue > 0 && r.grossProfit != null
          ? (r.grossProfit / r.revenue) * 100
          : null
      )
      .filter((v): v is number => v != null)
    const gmStdev = coefficientOfVariation(grossMargins)

    // Revenue + EPS CAGR (3y)
    const rev = inc.map((r) => r.revenue).filter((v): v is number => v != null)
    const revCagr = rev.length >= 4 ? cagr(rev[3], rev[0], 3) : null
    const eps = inc.map((r) => r.eps).filter((v): v is number => v != null)
    const epsCagr = eps.length >= 4 ? cagr(eps[3], eps[0], 3) : null

    return qualityScore({
      piotroskiScore: pScore.score,
      altmanZ: alt.z,
      roicPct,
      grossMarginStdev: gmStdev,
      fcfConversionPct: fcfConvPct,
      debtToEquity: fund.debtToEquity,
      revenueCagr3y: revCagr,
      epsCagr3y: epsCagr
    })
  }, [stmts, fund])

  if (!result) {
    return (
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3 text-[11px] text-[var(--color-fg-muted)]">
        Loading quality scorecard…
      </div>
    )
  }

  const gradeColor: Record<string, string> = {
    'A+': 'bg-[var(--color-pos)]/25 text-[var(--color-pos)]',
    A: 'bg-[var(--color-pos)]/15 text-[var(--color-pos)]',
    B: 'bg-[var(--color-info)]/15 text-[var(--color-info)]',
    C: 'bg-[var(--color-warn)]/15 text-[var(--color-warn)]',
    D: 'bg-[var(--color-neg)]/15 text-[var(--color-neg)]',
    F: 'bg-[var(--color-neg)]/25 text-[var(--color-neg)]'
  }

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <Award className="h-3 w-3" /> Quality scorecard
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'rounded px-3 py-1 font-mono text-xl font-bold',
              gradeColor[result.grade]
            )}
          >
            {result.grade}
          </span>
          <span className="font-mono text-2xl font-bold tabular">{result.score}/100</span>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
        {result.breakdown.map((b) => (
          <div
            key={b.name}
            className="flex items-center justify-between rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1"
          >
            <span className="text-[10px]">
              {b.name} <span className="text-[var(--color-fg-muted)]">({b.note})</span>
            </span>
            <div className="flex items-center gap-1">
              <div className="h-1 w-16 overflow-hidden rounded bg-[var(--color-bg-elev)]">
                <div
                  className="h-full bg-[var(--color-info)]"
                  style={{ width: `${(b.points / b.max) * 100}%` }}
                />
              </div>
              <span className="w-10 text-right font-mono text-[10px] tabular">
                {b.points.toFixed(0)}/{b.max}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
