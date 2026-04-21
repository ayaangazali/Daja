import type { Fundamentals } from '../../../../hooks/useFundamentals'
import { fmtLargeNum, fmtPrice } from '../../../../lib/format'
import { cn } from '../../../../lib/cn'

interface Cell {
  label: string
  value: string
  tone?: 'pos' | 'neg' | 'muted' | null
}

function pctCell(label: string, v: number | null, goodHigh = true): Cell {
  if (v == null) return { label, value: '—', tone: 'muted' }
  const pct = v * 100
  const tone = goodHigh ? (pct > 0 ? 'pos' : pct < 0 ? 'neg' : null) : pct < 0 ? 'pos' : 'neg'
  return { label, value: `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%`, tone }
}

function ratioCell(label: string, v: number | null): Cell {
  if (v == null) return { label, value: '—', tone: 'muted' }
  return { label, value: v.toFixed(2), tone: null }
}

export function FundamentalsGrid({ data }: { data: Fundamentals }): React.JSX.Element {
  const cells: Cell[] = [
    { label: 'Mkt Cap', value: fmtLargeNum(data.marketCap) ?? '—' },
    { label: 'EV', value: fmtLargeNum(data.enterpriseValue) ?? '—' },
    ratioCell('P/E', data.trailingPE),
    ratioCell('Fwd P/E', data.forwardPE),
    ratioCell('PEG', data.pegRatio),
    ratioCell('P/S', data.priceToSales),
    ratioCell('P/B', data.priceToBook),
    ratioCell('D/E', data.debtToEquity),
    pctCell('Rev Growth', data.revenueGrowth),
    pctCell('EPS Growth', data.earningsGrowth),
    pctCell('Gross Margin', data.grossMargins),
    pctCell('Op Margin', data.operatingMargins),
    pctCell('Net Margin', data.profitMargins),
    pctCell('ROE', data.returnOnEquity),
    pctCell('ROA', data.returnOnAssets),
    { label: 'Cash', value: fmtLargeNum(data.totalCash) },
    { label: 'Debt', value: fmtLargeNum(data.totalDebt), tone: data.totalDebt ? 'neg' : null },
    ratioCell('Current', data.currentRatio),
    pctCell('Div Yield', data.dividendYield),
    pctCell('Payout', data.payoutRatio, false),
    { label: 'Shares Out', value: fmtLargeNum(data.sharesOutstanding) },
    { label: 'Float', value: fmtLargeNum(data.floatShares) },
    pctCell('Insider', data.insiderPercent),
    pctCell('Inst.', data.institutionalPercent),
    pctCell('Short %', data.shortPercent, false),
    { label: 'Analyst Low', value: fmtPrice(data.targetLow) },
    { label: 'Analyst Avg', value: fmtPrice(data.targetMean) },
    { label: 'Analyst High', value: fmtPrice(data.targetHigh) },
    ratioCell('Rec Mean', data.recommendationMean),
    { label: 'Employees', value: fmtLargeNum(data.employees) }
  ]

  return (
    <div
      className={cn(
        'grid grid-cols-5 overflow-hidden rounded-md border text-[11px]',
        'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
      )}
    >
      {cells.map((c) => (
        <div
          key={c.label}
          className={cn(
            'flex items-center justify-between border-b border-r border-[var(--color-border)] px-2 py-1.5'
          )}
        >
          <span className="truncate text-[var(--color-fg-muted)]">{c.label}</span>
          <span
            className={cn(
              'tabular font-mono font-medium',
              c.tone === 'pos' && 'text-[var(--color-pos)]',
              c.tone === 'neg' && 'text-[var(--color-neg)]',
              c.tone === 'muted' && 'text-[var(--color-fg-muted)]'
            )}
          >
            {c.value}
          </span>
        </div>
      ))}
    </div>
  )
}
