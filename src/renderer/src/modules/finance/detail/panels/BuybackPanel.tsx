import { useMemo } from 'react'
import { Coins } from 'lucide-react'
import { useStatements } from '../../../../hooks/useStatements'
import { useFundamentals } from '../../../../hooks/useFundamentals'
import { fmtLargeNum } from '../../../../lib/format'
import { cn } from '../../../../lib/cn'

export function BuybackPanel({ ticker }: { ticker: string }): React.JSX.Element | null {
  const { data: stmts } = useStatements(ticker)
  const { data: fund } = useFundamentals(ticker)

  const rows = useMemo(() => {
    if (!stmts?.cashAnnual) return []
    // Yahoo reports buybacks + dividends as NEGATIVE numbers (outflows).
    // Flip sign so bar heights read as "dollars returned to shareholders".
    return [...stmts.cashAnnual]
      .slice(0, 5)
      .reverse()
      .map((r) => ({
        date: r.date.slice(0, 7),
        buyback: r.repurchaseOfStock != null ? Math.abs(r.repurchaseOfStock) : null,
        dividend: r.dividendsPaid != null ? Math.abs(r.dividendsPaid) : null,
        issuance: r.issuanceOfStock ?? null,
        fcf: r.freeCashflow ?? null
      }))
  }, [stmts])

  const totals = useMemo(() => {
    const buyback = rows.reduce((s, r) => s + (r.buyback ?? 0), 0)
    const dividend = rows.reduce((s, r) => s + (r.dividend ?? 0), 0)
    const issuance = rows.reduce((s, r) => s + (r.issuance ?? 0), 0)
    const fcf = rows.reduce((s, r) => s + (r.fcf ?? 0), 0)
    const shareholderYield = fund?.marketCap && fund.marketCap > 0
      ? ((buyback + dividend - issuance) / fund.marketCap) * 100 / Math.max(1, rows.length)
      : null
    const payoutOfFcf = fcf > 0 ? ((buyback + dividend) / fcf) * 100 : null
    return { buyback, dividend, issuance, fcf, shareholderYield, payoutOfFcf }
  }, [rows, fund?.marketCap])

  if (rows.length === 0) return null

  const maxVal = Math.max(
    1,
    ...rows.flatMap((r) => [r.buyback ?? 0, r.dividend ?? 0])
  )

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <Coins className="h-3 w-3" /> Capital return · buybacks + dividends (5y)
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] tabular text-[var(--color-fg-muted)]">
          {totals.shareholderYield != null && (
            <span
              className={cn(
                totals.shareholderYield > 5
                  ? 'text-[var(--color-pos)]'
                  : totals.shareholderYield < 0
                    ? 'text-[var(--color-neg)]'
                    : 'text-[var(--color-fg-muted)]'
              )}
            >
              SH yield {totals.shareholderYield >= 0 ? '+' : ''}
              {totals.shareholderYield.toFixed(2)}%/y
            </span>
          )}
          {totals.payoutOfFcf != null && (
            <span>FCF payout {totals.payoutOfFcf.toFixed(0)}%</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2 text-center">
        {rows.map((r) => {
          const bbPct = r.buyback != null ? (r.buyback / maxVal) * 100 : 0
          const divPct = r.dividend != null ? (r.dividend / maxVal) * 100 : 0
          return (
            <div key={r.date}>
              <div className="relative flex h-24 items-end justify-center gap-1">
                <div
                  className="w-3 rounded-t bg-[var(--color-accent)]/70"
                  style={{ height: `${bbPct}%` }}
                  title={`Buyback: $${fmtLargeNum(r.buyback ?? 0)}`}
                />
                <div
                  className="w-3 rounded-t bg-[var(--color-pos)]/70"
                  style={{ height: `${divPct}%` }}
                  title={`Dividend: $${fmtLargeNum(r.dividend ?? 0)}`}
                />
              </div>
              <div className="mt-1 text-[9px] text-[var(--color-fg-muted)]">{r.date}</div>
              <div className="font-mono text-[9px] tabular">
                ${fmtLargeNum((r.buyback ?? 0) + (r.dividend ?? 0))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label="5y buybacks" value={`$${fmtLargeNum(totals.buyback)}`} />
        <Stat label="5y dividends" value={`$${fmtLargeNum(totals.dividend)}`} />
        <Stat
          label="5y share issuance"
          value={totals.issuance !== 0 ? `$${fmtLargeNum(totals.issuance)}` : '—'}
          tone={totals.issuance > totals.buyback * 0.2 ? 'neg' : undefined}
        />
        <Stat
          label="Buyback vs dividend"
          value={
            totals.dividend > 0
              ? `${(totals.buyback / totals.dividend).toFixed(2)}×`
              : totals.buyback > 0
                ? '∞'
                : '—'
          }
        />
      </div>

      <div className="mt-2 flex items-center gap-3 text-[9px] text-[var(--color-fg-muted)]">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-[var(--color-accent)]/70" /> Buyback
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-[var(--color-pos)]/70" /> Dividend
        </span>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  tone
}: {
  label: string
  value: string
  tone?: 'pos' | 'neg'
}): React.JSX.Element {
  return (
    <div className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] p-2">
      <div className="text-[9px] uppercase text-[var(--color-fg-muted)]">{label}</div>
      <div
        className={cn(
          'font-mono text-[12px] font-semibold tabular',
          tone === 'pos' && 'text-[var(--color-pos)]',
          tone === 'neg' && 'text-[var(--color-neg)]'
        )}
      >
        {value}
      </div>
    </div>
  )
}
