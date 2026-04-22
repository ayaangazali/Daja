import { useMemo, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { useStatements } from '../../../../hooks/useStatements'
import {
  BarChart,
  MultiLineChart,
  ZeroBarChart
} from '../../../../components/charts/ChartPrimitives'
import { fmtLargeNum } from '../../../../lib/format'
import { cn } from '../../../../lib/cn'

type Period = 'annual' | 'quarterly'

export function FinancialsCharts({ ticker }: { ticker: string }): React.JSX.Element {
  const [period, setPeriod] = useState<Period>('annual')
  const { data, isLoading } = useStatements(ticker)

  const rows = useMemo(() => {
    if (!data) return null
    // Reverse so oldest → newest for chart x-axis
    return {
      income: [...(period === 'annual' ? data.incomeAnnual : data.incomeQuarterly)].reverse(),
      balance: [...(period === 'annual' ? data.balanceAnnual : data.balanceQuarterly)].reverse(),
      cash: [...(period === 'annual' ? data.cashAnnual : data.cashQuarterly)].reverse()
    }
  }, [data, period])

  if (isLoading || !rows) {
    return (
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3 text-[11px] text-[var(--color-fg-muted)]">
        Loading financial charts…
      </div>
    )
  }

  const dates = rows.income.map((r) => r.date.slice(0, 7))
  const revenue = rows.income.map((r) => r.revenue ?? null)
  const netIncome = rows.income.map((r) => r.netIncome ?? null)
  const grossProfit = rows.income.map((r) => r.grossProfit ?? null)
  const opIncome = rows.income.map((r) => r.operatingIncome ?? null)
  const ebitda = rows.income.map((r) => r.ebitda ?? null)
  const eps = rows.income.map((r) => r.eps ?? null)

  // Margins
  const grossMargin = rows.income.map((r) =>
    r.revenue != null && r.revenue > 0 && r.grossProfit != null
      ? (r.grossProfit / r.revenue) * 100
      : null
  )
  const opMargin = rows.income.map((r) =>
    r.revenue != null && r.revenue > 0 && r.operatingIncome != null
      ? (r.operatingIncome / r.revenue) * 100
      : null
  )
  const netMargin = rows.income.map((r) =>
    r.revenue != null && r.revenue > 0 && r.netIncome != null
      ? (r.netIncome / r.revenue) * 100
      : null
  )

  // Cash flow
  const opCF = rows.cash.map((r) => r.operating ?? null)
  const invCF = rows.cash.map((r) => r.investing ?? null)
  const finCF = rows.cash.map((r) => r.financing ?? null)
  const capex = rows.cash.map((r) => (r.capex != null ? Math.abs(r.capex) : null))
  const fcf = rows.cash.map((r) => r.freeCashflow ?? null)

  // Balance
  const cash = rows.balance.map((r) => r.cash ?? null)
  const ltDebt = rows.balance.map((r) => r.longTermDebt ?? null)
  const stDebt = rows.balance.map((r) => r.shortTermDebt ?? null)
  const totalDebt = rows.balance.map((_, i) => {
    const l = rows.balance[i].longTermDebt ?? 0
    const s = rows.balance[i].shortTermDebt ?? 0
    return l + s || null
  })
  const netDebt = rows.balance.map((_, i) => {
    const td = totalDebt[i]
    const c = rows.balance[i].cash
    return td != null && c != null ? td - c : null
  })
  const totalAssets = rows.balance.map((r) => r.totalAssets ?? null)
  const totalLiab = rows.balance.map((r) => r.totalLiab ?? null)
  const equity = rows.balance.map((r) => r.totalEquity ?? null)

  // Growth rates (YoY)
  const yoy = (series: (number | null)[]): (number | null)[] =>
    series.map((v, i) => {
      const prev = series[i - 1]
      if (v == null || prev == null || prev === 0) return null
      return ((v - prev) / Math.abs(prev)) * 100
    })

  const revGrowth = yoy(revenue)
  const niGrowth = yoy(netIncome)
  const epsGrowth = yoy(eps)

  const sections: {
    title: string
    chart: React.ReactNode
    sub?: string
  }[] = [
    {
      title: 'Revenue',
      chart: <BarChart values={revenue} height={80} title="$" color="#60a5fa" />,
      sub: 'Total revenue per period'
    },
    {
      title: 'Revenue YoY growth %',
      chart: <ZeroBarChart values={revGrowth} height={60} />
    },
    {
      title: 'Net Income',
      chart: <ZeroBarChart values={netIncome} height={80} />
    },
    {
      title: 'Net Income YoY %',
      chart: <ZeroBarChart values={niGrowth} height={60} />
    },
    {
      title: 'Gross / Operating / Net Income',
      chart: (
        <MultiLineChart
          series={[
            { values: grossProfit, color: '#4ade80' },
            { values: opIncome, color: '#60a5fa' },
            { values: netIncome, color: '#fbbf24' }
          ]}
          height={120}
        />
      )
    },
    {
      title: 'Margin trend (Gross / Operating / Net)',
      chart: (
        <MultiLineChart
          series={[
            { values: grossMargin, color: '#4ade80' },
            { values: opMargin, color: '#60a5fa' },
            { values: netMargin, color: '#fbbf24' }
          ]}
          height={100}
          horizontalLines={[{ y: 0, color: 'var(--color-fg-muted)', dashed: true }]}
        />
      )
    },
    {
      title: 'EBITDA',
      chart: <BarChart values={ebitda} height={70} color="#a78bfa" />
    },
    {
      title: 'Diluted EPS',
      chart: <ZeroBarChart values={eps} height={70} />
    },
    {
      title: 'EPS YoY growth %',
      chart: <ZeroBarChart values={epsGrowth} height={60} />
    },
    {
      title: 'Operating Cash Flow',
      chart: <ZeroBarChart values={opCF} height={70} />
    },
    {
      title: 'Free Cash Flow',
      chart: <ZeroBarChart values={fcf} height={70} />
    },
    {
      title: 'CapEx (abs)',
      chart: <BarChart values={capex} height={60} color="#f87171" />
    },
    {
      title: 'CF — Operating / Investing / Financing',
      chart: (
        <MultiLineChart
          series={[
            { values: opCF, color: '#4ade80' },
            { values: invCF, color: '#f87171' },
            { values: finCF, color: '#fbbf24' }
          ]}
          height={100}
          horizontalLines={[{ y: 0, color: 'var(--color-fg-muted)', dashed: true }]}
        />
      )
    },
    {
      title: 'Total Assets / Liabilities / Equity',
      chart: (
        <MultiLineChart
          series={[
            { values: totalAssets, color: '#60a5fa' },
            { values: totalLiab, color: '#f87171' },
            { values: equity, color: '#4ade80' }
          ]}
          height={100}
        />
      )
    },
    {
      title: 'Cash / LT Debt / ST Debt',
      chart: (
        <MultiLineChart
          series={[
            { values: cash, color: '#4ade80' },
            { values: ltDebt, color: '#f87171' },
            { values: stDebt, color: '#fbbf24' }
          ]}
          height={90}
        />
      )
    },
    {
      title: 'Net Debt (Total Debt − Cash)',
      chart: <ZeroBarChart values={netDebt} height={70} />
    }
  ]

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <BarChart3 className="h-3 w-3" /> Financial charts ({dates.length} periods)
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

      <div className="mb-2 flex flex-wrap gap-1 font-mono text-[9px] text-[var(--color-fg-muted)]">
        {dates.map((d, i) => (
          <span key={`d-${i}`} className="w-[calc(100%/12)] min-w-[3rem] truncate">
            {d}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {sections.map((s) => (
          <div
            key={s.title}
            className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] p-2"
          >
            <div className="mb-1 flex items-center justify-between text-[9px] uppercase text-[var(--color-fg-muted)]">
              <span>{s.title}</span>
              {s.sub && <span className="normal-case">{s.sub}</span>}
            </div>
            {s.chart}
          </div>
        ))}
      </div>

      <div className="mt-3 text-[9px] text-[var(--color-fg-muted)]">
        All charts share x-axis ordered oldest → newest. Last value:{' '}
        <span className="font-mono tabular">
          Rev ${fmtLargeNum(revenue[revenue.length - 1] ?? 0)} · NI $
          {fmtLargeNum(netIncome[netIncome.length - 1] ?? 0)} · FCF $
          {fmtLargeNum(fcf[fcf.length - 1] ?? 0)}
        </span>
      </div>
    </div>
  )
}
