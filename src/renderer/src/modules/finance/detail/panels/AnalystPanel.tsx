import { useMemo, useState } from 'react'
import { Beaker, CheckCircle2, XCircle } from 'lucide-react'
import { useStatements } from '../../../../hooks/useStatements'
import { useFundamentals } from '../../../../hooks/useFundamentals'
import {
  altmanZ,
  cagr,
  dcfValue,
  fcfConversion,
  fcfYield,
  grahamNumber,
  interestCoverage,
  magicFormulaMetrics,
  piotroskiScore,
  roic,
  sustainableGrowth
} from '../../../../lib/valuation'
import { fmtLargeNum, fmtPct, fmtPrice } from '../../../../lib/format'
import { cn } from '../../../../lib/cn'
import { RiskVsSpy } from './RiskVsSpy'
import { FinancialRatios } from './FinancialRatios'
import { MonteCarloPanel } from './MonteCarloPanel'
import { BacktestPanel } from './BacktestPanel'

export function AnalystPanel({ ticker }: { ticker: string }): React.JSX.Element {
  const { data: stmts } = useStatements(ticker)
  const { data: fund } = useFundamentals(ticker)

  // DCF + period controls
  const [growthRate, setGrowthRate] = useState('8')
  const [terminalGrowth, setTerminalGrowth] = useState('2.5')
  const [discountRate, setDiscountRate] = useState('9')
  const [years, setYears] = useState('5')
  const [period, setPeriod] = useState<'annual' | 'quarterly'>('annual')

  const analysis = useMemo(() => {
    if (!stmts || !fund) return null

    const incomeSeries = period === 'annual' ? stmts.incomeAnnual : stmts.incomeQuarterly
    const balanceSeries = period === 'annual' ? stmts.balanceAnnual : stmts.balanceQuarterly
    const cashSeries = period === 'annual' ? stmts.cashAnnual : stmts.cashQuarterly

    const latestAnn = incomeSeries[0]
    const prevAnn = incomeSeries[1]
    const latestBal = balanceSeries[0]
    const prevBal = balanceSeries[1]
    const latestCash = cashSeries[0]

    if (!latestAnn || !prevAnn || !latestBal || !prevBal) return null

    // TTM FCF when annual view selected (sum last 4 quarterly); else use the series value directly
    const useTTM = period === 'annual' && stmts.cashQuarterly.length >= 4
    const fcf = useTTM
      ? stmts.cashQuarterly.slice(0, 4).reduce((s, r) => s + (r.freeCashflow ?? 0), 0)
      : (latestCash?.freeCashflow ?? null)
    const ocf = useTTM
      ? stmts.cashQuarterly.slice(0, 4).reduce((s, r) => s + (r.operating ?? 0), 0)
      : (latestCash?.operating ?? null)
    const prevOcf = cashSeries[1]?.operating ?? null

    // Graham number
    const bvps =
      latestBal.totalEquity != null && fund.sharesOutstanding
        ? latestBal.totalEquity / fund.sharesOutstanding
        : null
    const eps = latestAnn.eps
    const graham = grahamNumber(eps, bvps)

    // Piotroski F
    const grossC =
      latestAnn.revenue != null && latestAnn.revenue > 0
        ? (latestAnn.revenue - (latestAnn.netIncome ?? 0) * 0 - 0) / latestAnn.revenue // placeholder; we'd need COGS
        : null
    const pScore = piotroskiScore({
      curr: {
        netIncome: latestAnn.netIncome,
        ocf,
        totalAssets: latestBal.totalAssets,
        prevAssets: prevBal.totalAssets,
        longTermDebt: latestBal.longTermDebt,
        currentRatio: fund.currentRatio,
        sharesOut: fund.sharesOutstanding,
        grossMargin: fund.grossMargins,
        assetTurnover:
          latestBal.totalAssets != null && latestBal.totalAssets > 0
            ? (latestAnn.revenue ?? 0) / latestBal.totalAssets
            : null
      },
      prev: {
        netIncome: prevAnn.netIncome,
        ocf: prevOcf,
        totalAssets: prevBal.totalAssets,
        longTermDebt: prevBal.longTermDebt,
        currentRatio: null,
        sharesOut: fund.sharesOutstanding, // approx — prior year not captured
        grossMargin: null,
        assetTurnover:
          prevBal.totalAssets != null && prevBal.totalAssets > 0
            ? (prevAnn.revenue ?? 0) / prevBal.totalAssets
            : null
      }
    })

    // Altman Z
    const workingCapital =
      latestBal.totalAssets != null && latestBal.totalLiab != null
        ? latestBal.totalAssets - latestBal.totalLiab
        : null
    const alt = altmanZ({
      workingCapital,
      retainedEarnings: latestBal.totalEquity, // approx
      ebit: latestAnn.operatingIncome,
      marketCap: fund.marketCap,
      totalLiab: latestBal.totalLiab,
      sales: latestAnn.revenue,
      totalAssets: latestBal.totalAssets
    })

    // ROIC
    const roicPct = roic({
      operatingIncome: latestAnn.operatingIncome,
      taxRate: 0.21, // US corp default
      totalDebt: (latestBal.longTermDebt ?? 0) + (latestBal.shortTermDebt ?? 0),
      totalEquity: latestBal.totalEquity,
      cash: latestBal.cash
    })

    // Sustainable growth
    const sGrowth = sustainableGrowth(
      fund.returnOnEquity != null ? fund.returnOnEquity * 100 : null,
      fund.payoutRatio
    )

    // FCF yield
    const fcfY = fcfYield(fcf, fund.marketCap)
    const fcfConv = fcfConversion(fcf, latestAnn.netIncome)

    // Interest coverage — EBIT / interestExpense (we don't have interestExpense in our schema; skip)
    const iCov = interestCoverage(latestAnn.operatingIncome, null)

    // Magic Formula
    const mf = magicFormulaMetrics({
      ebit: latestAnn.operatingIncome,
      enterpriseValue: fund.enterpriseValue,
      roicPct
    })

    // Revenue CAGR 3y
    const rev3 = stmts.incomeAnnual.slice(0, 4).map((r) => r.revenue)
    const revCagr = rev3.length >= 4 ? cagr(rev3[3] ?? null, rev3[0] ?? null, 3) : null
    const ni3 = stmts.incomeAnnual.slice(0, 4).map((r) => r.netIncome)
    const niCagr = ni3.length >= 4 ? cagr(ni3[3] ?? null, ni3[0] ?? null, 3) : null

    // DCF
    const growthN = Number(growthRate) / 100
    const termN = Number(terminalGrowth) / 100
    const discountN = Number(discountRate) / 100
    const yearsN = Math.max(1, Math.min(30, Number(years) || 5))
    const dcf =
      fcf != null && fund.sharesOutstanding
        ? dcfValue({
            fcfBase: fcf,
            growthRate: growthN,
            terminalGrowth: termN,
            discountRate: discountN,
            years: yearsN,
            sharesOut: fund.sharesOutstanding,
            netDebt:
              (latestBal.longTermDebt ?? 0) + (latestBal.shortTermDebt ?? 0) - (latestBal.cash ?? 0)
          })
        : null

    return {
      graham,
      pScore,
      alt,
      roicPct,
      sGrowth,
      fcfY,
      fcfConv,
      iCov,
      mf,
      revCagr,
      niCagr,
      dcf,
      grossC
    }
  }, [stmts, fund, growthRate, terminalGrowth, discountRate, years, period])

  if (!stmts || !fund) {
    return (
      <div className="p-4 text-[11px] text-[var(--color-fg-muted)]">
        Loading statements + fundamentals…
      </div>
    )
  }
  if (!analysis) {
    return (
      <div className="p-4 text-[11px] text-[var(--color-fg-muted)]">
        Insufficient historical data to compute analyst metrics for {ticker}.
      </div>
    )
  }

  const intrinsicPrice = analysis.dcf?.perShare
  const currentPrice =
    fund.marketCap != null && fund.sharesOutstanding
      ? fund.marketCap / fund.sharesOutstanding
      : null
  const marginOfSafety =
    intrinsicPrice != null && currentPrice != null && intrinsicPrice > 0
      ? ((intrinsicPrice - currentPrice) / intrinsicPrice) * 100
      : null

  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex overflow-hidden rounded border border-[var(--color-border)]">
          {(['annual', 'quarterly'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-3 py-1 text-[10px] font-semibold uppercase tracking-wide',
                period === p
                  ? 'bg-[var(--color-info)] text-white'
                  : 'text-[var(--color-fg-muted)] hover:bg-[var(--color-bg)]'
              )}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="text-[9px] text-[var(--color-fg-muted)]">
          FCF = TTM (sum last 4 Q) when annual active. Data: Yahoo fundamentals-timeseries.
        </div>
      </div>
      <RiskVsSpy ticker={ticker} />
      <FinancialRatios ticker={ticker} />
      <MonteCarloPanel ticker={ticker} />
      <BacktestPanel ticker={ticker} />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Score
          label="Piotroski F-score"
          value={`${analysis.pScore.score}/9`}
          tone={analysis.pScore.score >= 7 ? 'pos' : analysis.pScore.score >= 4 ? 'warn' : 'neg'}
          sub={
            analysis.pScore.score >= 7
              ? 'Strong balance sheet'
              : analysis.pScore.score >= 4
                ? 'Mixed'
                : 'Weak'
          }
        />
        <Score
          label="Altman Z-score"
          value={analysis.alt.z != null ? analysis.alt.z.toFixed(2) : '—'}
          tone={
            analysis.alt.zone === 'safe'
              ? 'pos'
              : analysis.alt.zone === 'grey'
                ? 'warn'
                : analysis.alt.zone === 'distress'
                  ? 'neg'
                  : null
          }
          sub={
            analysis.alt.zone === 'safe'
              ? 'Healthy (>2.99)'
              : analysis.alt.zone === 'grey'
                ? 'Grey zone'
                : analysis.alt.zone === 'distress'
                  ? 'Distress (<1.81)'
                  : 'Unknown'
          }
        />
        <Score
          label="ROIC"
          value={analysis.roicPct != null ? `${analysis.roicPct.toFixed(1)}%` : '—'}
          tone={
            analysis.roicPct != null
              ? analysis.roicPct > 15
                ? 'pos'
                : analysis.roicPct > 8
                  ? 'warn'
                  : 'neg'
              : null
          }
          sub="NOPAT / Invested Capital"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Metric
          label="Graham Number"
          value={analysis.graham != null ? `$${fmtPrice(analysis.graham)}` : '—'}
        />
        <Metric
          label="FCF Yield"
          value={analysis.fcfY != null ? `${analysis.fcfY.toFixed(2)}%` : '—'}
          tone={
            analysis.fcfY != null
              ? analysis.fcfY > 5
                ? 'pos'
                : analysis.fcfY > 2
                  ? 'warn'
                  : 'neg'
              : null
          }
        />
        <Metric
          label="FCF Conversion"
          value={analysis.fcfConv != null ? `${analysis.fcfConv.toFixed(2)}x` : '—'}
          tone={
            analysis.fcfConv != null
              ? analysis.fcfConv > 1
                ? 'pos'
                : analysis.fcfConv > 0.7
                  ? 'warn'
                  : 'neg'
              : null
          }
        />
        <Metric
          label="Sustainable Growth"
          value={analysis.sGrowth != null ? `${analysis.sGrowth.toFixed(1)}%` : '—'}
        />
        <Metric
          label="Magic Formula EY"
          value={
            analysis.mf.earningsYieldPct != null
              ? `${analysis.mf.earningsYieldPct.toFixed(1)}%`
              : '—'
          }
        />
        <Metric
          label="3y Revenue CAGR"
          value={analysis.revCagr != null ? fmtPct(analysis.revCagr) : '—'}
          tone={
            analysis.revCagr != null
              ? analysis.revCagr > 10
                ? 'pos'
                : analysis.revCagr > 0
                  ? 'warn'
                  : 'neg'
              : null
          }
        />
        <Metric
          label="3y Earnings CAGR"
          value={analysis.niCagr != null ? fmtPct(analysis.niCagr) : '—'}
          tone={
            analysis.niCagr != null
              ? analysis.niCagr > 10
                ? 'pos'
                : analysis.niCagr > 0
                  ? 'warn'
                  : 'neg'
              : null
          }
        />
        <Metric
          label="Int Coverage"
          value={analysis.iCov != null ? `${analysis.iCov.toFixed(1)}x` : '—'}
        />
      </div>

      <div
        className={cn(
          'rounded-md border p-3',
          'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
        )}
      >
        <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <Beaker className="h-3 w-3 text-[var(--color-info)]" /> Piotroski breakdown
        </div>
        <div className="grid grid-cols-1 gap-1 md:grid-cols-3">
          {analysis.pScore.checks.map((c) => (
            <div key={c.name} className="flex items-center gap-2 text-[11px]">
              {c.passed ? (
                <CheckCircle2 className="h-3 w-3 text-[var(--color-pos)]" />
              ) : (
                <XCircle className="h-3 w-3 text-[var(--color-neg)]" />
              )}
              <span>{c.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        className={cn(
          'rounded-md border p-3',
          'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
        )}
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
            DCF intrinsic value
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <Param label="Growth %" value={growthRate} onChange={setGrowthRate} />
            <Param label="Terminal %" value={terminalGrowth} onChange={setTerminalGrowth} />
            <Param label="Discount %" value={discountRate} onChange={setDiscountRate} />
            <Param label="Years" value={years} onChange={setYears} />
          </div>
        </div>
        {analysis.dcf ? (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Metric
              label="Intrinsic/share"
              value={`$${fmtPrice(analysis.dcf.perShare)}`}
              emphasize
            />
            <Metric
              label="Current price"
              value={currentPrice != null ? `$${fmtPrice(currentPrice)}` : '—'}
            />
            <Metric
              label="Margin of safety"
              value={
                marginOfSafety != null
                  ? `${marginOfSafety > 0 ? '+' : ''}${marginOfSafety.toFixed(1)}%`
                  : '—'
              }
              tone={
                marginOfSafety != null
                  ? marginOfSafety > 20
                    ? 'pos'
                    : marginOfSafety > 0
                      ? 'warn'
                      : 'neg'
                  : null
              }
            />
            <Metric
              label="Enterprise Value"
              value={`$${fmtLargeNum(analysis.dcf.enterpriseValue)}`}
            />
          </div>
        ) : (
          <div className="text-[11px] text-[var(--color-fg-muted)]">
            Need FCF + shares outstanding to compute DCF.
          </div>
        )}
      </div>
    </div>
  )
}

function Score({
  label,
  value,
  tone,
  sub
}: {
  label: string
  value: string
  tone?: 'pos' | 'neg' | 'warn' | null
  sub?: string
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'rounded-md border p-3',
        'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
      )}
    >
      <div className="text-[10px] uppercase text-[var(--color-fg-muted)]">{label}</div>
      <div
        className={cn(
          'mt-1 font-mono text-2xl font-semibold tabular',
          tone === 'pos' && 'text-[var(--color-pos)]',
          tone === 'neg' && 'text-[var(--color-neg)]',
          tone === 'warn' && 'text-[var(--color-warn)]'
        )}
      >
        {value}
      </div>
      {sub && <div className="text-[9px] text-[var(--color-fg-muted)]">{sub}</div>}
    </div>
  )
}

function Metric({
  label,
  value,
  tone,
  emphasize
}: {
  label: string
  value: string
  tone?: 'pos' | 'neg' | 'warn' | null
  emphasize?: boolean
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'rounded border p-2',
        'border-[var(--color-border)] bg-[var(--color-bg)]',
        emphasize && 'border-[var(--color-info)]/40 bg-[var(--color-info)]/5'
      )}
    >
      <div className="text-[9px] text-[var(--color-fg-muted)]">{label}</div>
      <div
        className={cn(
          'font-mono font-semibold tabular',
          emphasize ? 'text-base' : 'text-sm',
          tone === 'pos' && 'text-[var(--color-pos)]',
          tone === 'neg' && 'text-[var(--color-neg)]',
          tone === 'warn' && 'text-[var(--color-warn)]'
        )}
      >
        {value}
      </div>
    </div>
  )
}

function Param({
  label,
  value,
  onChange
}: {
  label: string
  value: string
  onChange: (v: string) => void
}): React.JSX.Element {
  return (
    <label className="flex items-center gap-1">
      <span className="text-[var(--color-fg-muted)]">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type="number"
        step="0.1"
        className="w-14 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-1 py-0.5 font-mono text-[10px]"
      />
    </label>
  )
}
