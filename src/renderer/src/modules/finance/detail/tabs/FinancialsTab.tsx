import { Fragment, useState } from 'react'
import {
  useStatements,
  type BalanceRow,
  type CashflowRow,
  type IncomeRow
} from '../../../../hooks/useStatements'
import { fmtLargeNum } from '../../../../lib/format'
import { MarginTrend } from '../panels/MarginTrend'
import { cn } from '../../../../lib/cn'

type Period = 'annual' | 'quarterly'
type Statement = 'income' | 'balance' | 'cashflow'

export function FinancialsTab({ ticker }: { ticker: string }): React.JSX.Element {
  const { data, isLoading, error } = useStatements(ticker)
  const [period, setPeriod] = useState<Period>('annual')
  const [stmt, setStmt] = useState<Statement>('income')

  if (error) {
    return (
      <div className="p-4 text-[11px] text-[var(--color-neg)]">
        Statements load failed: {error.message}
      </div>
    )
  }

  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center gap-2">
        <div className="flex overflow-hidden rounded border border-[var(--color-border)]">
          {(['income', 'balance', 'cashflow'] as Statement[]).map((s) => (
            <button
              key={s}
              onClick={() => setStmt(s)}
              className={cn(
                'px-3 py-1 text-[11px] font-semibold uppercase tracking-wide',
                stmt === s
                  ? 'bg-[var(--color-info)] text-white'
                  : 'text-[var(--color-fg-muted)] hover:bg-[var(--color-bg)]'
              )}
            >
              {s === 'cashflow' ? 'Cash Flow' : s === 'balance' ? 'Balance' : 'Income'}
            </button>
          ))}
        </div>
        <div className="flex overflow-hidden rounded border border-[var(--color-border)]">
          {(['annual', 'quarterly'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-3 py-1 text-[10px]',
                period === p
                  ? 'bg-[var(--color-bg-elev)] text-[var(--color-fg)]'
                  : 'text-[var(--color-fg-muted)]'
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      {isLoading && <div className="text-[11px] text-[var(--color-fg-muted)]">Loading…</div>}
      {data && stmt === 'income' && (
        <IncomeTable rows={period === 'annual' ? data.incomeAnnual : data.incomeQuarterly} />
      )}
      {data && stmt === 'balance' && (
        <BalanceTable rows={period === 'annual' ? data.balanceAnnual : data.balanceQuarterly} />
      )}
      {data && stmt === 'cashflow' && (
        <CashflowTable rows={period === 'annual' ? data.cashAnnual : data.cashQuarterly} />
      )}
      {data && stmt === 'income' && period === 'annual' && <MarginTrend ticker={ticker} />}
    </div>
  )
}

function growth(curr: number | null, prev: number | null): string {
  if (curr == null || prev == null || prev === 0) return ''
  const g = ((curr - prev) / Math.abs(prev)) * 100
  const sign = g > 0 ? '+' : ''
  return `${sign}${g.toFixed(1)}%`
}

function Cell({ value }: { value: number | null }): React.JSX.Element {
  return (
    <td className="px-2 py-1 text-right font-mono tabular">
      {value == null ? '—' : fmtLargeNum(value)}
    </td>
  )
}

function GrowthCell({
  curr,
  prev
}: {
  curr: number | null
  prev: number | null
}): React.JSX.Element {
  const g = growth(curr, prev)
  const pos = g.startsWith('+')
  return (
    <td
      className={cn(
        'px-1 py-1 text-right font-mono text-[10px] tabular',
        g === ''
          ? 'text-[var(--color-fg-muted)]'
          : pos
            ? 'text-[var(--color-pos)]'
            : 'text-[var(--color-neg)]'
      )}
    >
      {g}
    </td>
  )
}

function IncomeTable({ rows }: { rows: IncomeRow[] }): React.JSX.Element {
  const sorted = [...rows].reverse()
  return (
    <div className="overflow-x-auto rounded-md border border-[var(--color-border)]">
      <table className="w-full text-[11px]">
        <thead className="border-b border-[var(--color-border)] text-[10px] uppercase text-[var(--color-fg-muted)]">
          <tr>
            <th className="px-2 py-1 text-left">Metric</th>
            {sorted.map((r) => (
              <th key={r.date} colSpan={2} className="px-2 py-1 text-right">
                {r.date}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(
            [
              ['Revenue', 'revenue'],
              ['Cost of Rev', 'costOfRevenue'],
              ['Gross Profit', 'grossProfit'],
              ['Op Expense', 'operatingExpense'],
              ['Op Income', 'operatingIncome'],
              ['Net Income', 'netIncome'],
              ['EBITDA', 'ebitda'],
              ['EPS', 'eps']
            ] as [string, keyof IncomeRow][]
          ).map(([label, key]) => (
            <tr
              key={label}
              className="border-t border-[var(--color-border)] hover:bg-[var(--color-bg-elev)]"
            >
              <td className="px-2 py-1 text-[var(--color-fg-muted)]">{label}</td>
              {sorted.map((r, i) => (
                <Fragment key={r.date}>
                  <Cell value={r[key] as number | null} />
                  <GrowthCell
                    curr={r[key] as number | null}
                    prev={(sorted[i - 1]?.[key] as number | null) ?? null}
                  />
                </Fragment>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BalanceTable({ rows }: { rows: BalanceRow[] }): React.JSX.Element {
  const sorted = [...rows].reverse()
  return (
    <div className="overflow-x-auto rounded-md border border-[var(--color-border)]">
      <table className="w-full text-[11px]">
        <thead className="border-b border-[var(--color-border)] text-[10px] uppercase text-[var(--color-fg-muted)]">
          <tr>
            <th className="px-2 py-1 text-left">Metric</th>
            {sorted.map((r) => (
              <th key={r.date} className="px-2 py-1 text-right">
                {r.date}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(
            [
              ['Total Assets', 'totalAssets'],
              ['Total Liab', 'totalLiab'],
              ['Equity', 'totalEquity'],
              ['Cash', 'cash'],
              ['ST Investments', 'shortTermInvestments'],
              ['LT Debt', 'longTermDebt'],
              ['ST Debt', 'shortTermDebt']
            ] as [string, keyof BalanceRow][]
          ).map(([label, key]) => (
            <tr
              key={label}
              className="border-t border-[var(--color-border)] hover:bg-[var(--color-bg-elev)]"
            >
              <td className="px-2 py-1 text-[var(--color-fg-muted)]">{label}</td>
              {sorted.map((r) => (
                <Cell key={r.date} value={r[key] as number | null} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CashflowTable({ rows }: { rows: CashflowRow[] }): React.JSX.Element {
  const sorted = [...rows].reverse()
  return (
    <div className="overflow-x-auto rounded-md border border-[var(--color-border)]">
      <table className="w-full text-[11px]">
        <thead className="border-b border-[var(--color-border)] text-[10px] uppercase text-[var(--color-fg-muted)]">
          <tr>
            <th className="px-2 py-1 text-left">Metric</th>
            {sorted.map((r) => (
              <th key={r.date} className="px-2 py-1 text-right">
                {r.date}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(
            [
              ['Operating CF', 'operating'],
              ['Investing CF', 'investing'],
              ['Financing CF', 'financing'],
              ['CapEx', 'capex'],
              ['Free CF', 'freeCashflow']
            ] as [string, keyof CashflowRow][]
          ).map(([label, key]) => (
            <tr
              key={label}
              className="border-t border-[var(--color-border)] hover:bg-[var(--color-bg-elev)]"
            >
              <td className="px-2 py-1 text-[var(--color-fg-muted)]">{label}</td>
              {sorted.map((r) => (
                <Cell key={r.date} value={r[key] as number | null} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
