import { useMemo } from 'react'
import { ShieldCheck, Coins } from 'lucide-react'
import { useFundamentals } from '../../../../hooks/useFundamentals'
import { useStatements } from '../../../../hooks/useStatements'
import { fromFundamentals } from '../../../../lib/dividendSustainability'
import { cn } from '../../../../lib/cn'

export function DividendSustainabilityPanel({
  ticker
}: {
  ticker: string
}): React.JSX.Element | null {
  const { data: fund } = useFundamentals(ticker)
  const { data: stmts } = useStatements(ticker)

  // Trailing twelve months FCF — sum last 4 quarterly entries if present,
  // else fall back to most-recent annual.
  const ttmFcf = useMemo(() => {
    if (!stmts) return null
    const q = stmts.cashQuarterly?.slice(0, 4) ?? []
    if (q.length === 4 && q.every((r) => r.freeCashflow != null)) {
      return q.reduce((s, r) => s + (r.freeCashflow as number), 0)
    }
    const a = stmts.cashAnnual?.[0]
    return a?.freeCashflow ?? null
  }, [stmts])

  const assessment = useMemo(() => {
    if (!fund) return null
    return fromFundamentals(fund, ttmFcf)
  }, [fund, ttmFcf])

  if (!assessment) return null
  if (assessment.tier === 'n/a') {
    return (
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3 text-[11px] text-[var(--color-fg-muted)]">
        <div className="mb-1 flex items-center gap-2 font-semibold uppercase tracking-wide text-[10px]">
          <Coins className="h-3 w-3" /> Dividend sustainability
        </div>
        {assessment.summary}
      </div>
    )
  }

  const tierClass =
    assessment.tier === 'green'
      ? 'text-[var(--color-pos)] border-[var(--color-pos)]/40 bg-[var(--color-pos)]/5'
      : assessment.tier === 'yellow'
        ? 'text-[var(--color-warn)] border-[var(--color-warn)]/40 bg-[var(--color-warn)]/5'
        : 'text-[var(--color-neg)] border-[var(--color-neg)]/40 bg-[var(--color-neg)]/5'

  const factors = [
    { key: 'payoutRatio', label: 'Payout ratio', data: assessment.factors.payoutRatio },
    { key: 'fcfCoverage', label: 'FCF coverage', data: assessment.factors.fcfCoverage },
    { key: 'earningsGrowth', label: 'Earnings growth', data: assessment.factors.earningsGrowth },
    { key: 'leverage', label: 'Leverage', data: assessment.factors.leverage }
  ]

  return (
    <div className={cn('rounded-md border p-3', tierClass)}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide">
          <ShieldCheck className="h-3 w-3" /> Dividend sustainability
        </div>
        <div className="font-mono text-[11px] font-semibold uppercase tabular">
          {assessment.tier} · {assessment.score}/100
        </div>
      </div>
      <div className="mb-2 text-[11px] leading-relaxed">{assessment.summary}</div>
      <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
        {factors.map((f) => (
          <div
            key={f.key}
            className="flex items-start gap-2 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-[10px]"
          >
            <span className="font-mono font-semibold tabular text-[var(--color-fg)]">
              {f.data.points}/25
            </span>
            <div>
              <div className="font-semibold text-[var(--color-fg)]">{f.label}</div>
              <div className="text-[var(--color-fg-muted)]">{f.data.note}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
