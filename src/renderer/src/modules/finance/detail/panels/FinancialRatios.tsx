import { useMemo, useState } from 'react'
import { Percent } from 'lucide-react'
import { useStatements } from '../../../../hooks/useStatements'
import {
  MultiLineChart,
  ZeroBarChart
} from '../../../../components/charts/ChartPrimitives'
import { cn } from '../../../../lib/cn'

type Period = 'annual' | 'quarterly'

export function FinancialRatios({ ticker }: { ticker: string }): React.JSX.Element {
  const [period, setPeriod] = useState<Period>('annual')
  const { data } = useStatements(ticker)

  const series = useMemo(() => {
    if (!data) return null
    const inc = [...(period === 'annual' ? data.incomeAnnual : data.incomeQuarterly)].reverse()
    const bal = [...(period === 'annual' ? data.balanceAnnual : data.balanceQuarterly)].reverse()
    const cf = [...(period === 'annual' ? data.cashAnnual : data.cashQuarterly)].reverse()

    const n = Math.min(inc.length, bal.length, cf.length)
    const dates = inc.slice(0, n).map((r) => r.date.slice(0, 7))

    const roe: (number | null)[] = []
    const roa: (number | null)[] = []
    const de: (number | null)[] = []
    const assetTurnover: (number | null)[] = []
    const opMargin: (number | null)[] = []
    const fcfMargin: (number | null)[] = []
    const fcfConv: (number | null)[] = []
    const debtToAssets: (number | null)[] = []
    const equityMultiplier: (number | null)[] = []
    const grossMargin: (number | null)[] = []

    for (let i = 0; i < n; i++) {
      const ir = inc[i]
      const br = bal[i]
      const cr = cf[i]

      const totalDebt = (br.longTermDebt ?? 0) + (br.shortTermDebt ?? 0)

      roe.push(
        ir.netIncome != null && br.totalEquity && br.totalEquity > 0
          ? (ir.netIncome / br.totalEquity) * 100
          : null
      )
      roa.push(
        ir.netIncome != null && br.totalAssets && br.totalAssets > 0
          ? (ir.netIncome / br.totalAssets) * 100
          : null
      )
      de.push(
        totalDebt > 0 && br.totalEquity && br.totalEquity > 0 ? totalDebt / br.totalEquity : null
      )
      assetTurnover.push(
        ir.revenue != null && br.totalAssets && br.totalAssets > 0
          ? ir.revenue / br.totalAssets
          : null
      )
      opMargin.push(
        ir.revenue != null && ir.revenue > 0 && ir.operatingIncome != null
          ? (ir.operatingIncome / ir.revenue) * 100
          : null
      )
      grossMargin.push(
        ir.revenue != null && ir.revenue > 0 && ir.grossProfit != null
          ? (ir.grossProfit / ir.revenue) * 100
          : null
      )
      fcfMargin.push(
        ir.revenue != null && ir.revenue > 0 && cr.freeCashflow != null
          ? (cr.freeCashflow / ir.revenue) * 100
          : null
      )
      fcfConv.push(
        ir.netIncome != null && ir.netIncome !== 0 && cr.freeCashflow != null
          ? (cr.freeCashflow / ir.netIncome) * 100
          : null
      )
      debtToAssets.push(
        totalDebt > 0 && br.totalAssets && br.totalAssets > 0
          ? (totalDebt / br.totalAssets) * 100
          : null
      )
      equityMultiplier.push(
        br.totalAssets && br.totalEquity && br.totalEquity > 0
          ? br.totalAssets / br.totalEquity
          : null
      )
    }

    return {
      dates,
      roe,
      roa,
      de,
      assetTurnover,
      opMargin,
      grossMargin,
      fcfMargin,
      fcfConv,
      debtToAssets,
      equityMultiplier
    }
  }, [data, period])

  if (!series) {
    return (
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3 text-[11px] text-[var(--color-fg-muted)]">
        Loading ratios…
      </div>
    )
  }

  const sections: { title: string; chart: React.ReactNode }[] = [
    {
      title: 'Return on Equity (ROE) %',
      chart: <ZeroBarChart values={series.roe} height={70} />
    },
    {
      title: 'Return on Assets (ROA) %',
      chart: <ZeroBarChart values={series.roa} height={70} />
    },
    {
      title: 'Gross / Operating / FCF margin %',
      chart: (
        <MultiLineChart
          series={[
            { values: series.grossMargin, color: '#4ade80' },
            { values: series.opMargin, color: '#60a5fa' },
            { values: series.fcfMargin, color: '#fbbf24' }
          ]}
          height={90}
          horizontalLines={[{ y: 0, color: 'var(--color-fg-muted)', dashed: true }]}
        />
      )
    },
    {
      title: 'FCF / Net Income conversion %',
      chart: (
        <MultiLineChart
          series={[{ values: series.fcfConv, color: '#a78bfa' }]}
          height={70}
          horizontalLines={[
            { y: 100, color: 'var(--color-pos)', label: '100%', dashed: true },
            { y: 0, color: 'var(--color-fg-muted)', dashed: true }
          ]}
        />
      )
    },
    {
      title: 'Debt / Equity',
      chart: <ZeroBarChart values={series.de} height={70} colorPos="#fb923c" />
    },
    {
      title: 'Debt / Assets %',
      chart: <ZeroBarChart values={series.debtToAssets} height={70} colorPos="#fb923c" />
    },
    {
      title: 'Asset turnover (Revenue / Assets)',
      chart: (
        <MultiLineChart
          series={[{ values: series.assetTurnover, color: '#34d399' }]}
          height={70}
        />
      )
    },
    {
      title: 'Equity multiplier (Assets / Equity)',
      chart: (
        <MultiLineChart
          series={[{ values: series.equityMultiplier, color: '#c084fc' }]}
          height={70}
        />
      )
    }
  ]

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <Percent className="h-3 w-3" /> Ratio trends
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          {(['annual', 'quarterly'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'rounded border px-2 py-0.5 font-mono uppercase',
                period === p
                  ? 'border-[var(--color-info)] bg-[var(--color-info)]/15 text-[var(--color-info)]'
                  : 'border-[var(--color-border)] text-[var(--color-fg-muted)]'
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {sections.map((s) => (
          <div
            key={s.title}
            className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] p-2"
          >
            <div className="mb-1 text-[9px] uppercase text-[var(--color-fg-muted)]">
              {s.title}
            </div>
            {s.chart}
          </div>
        ))}
      </div>
    </div>
  )
}
