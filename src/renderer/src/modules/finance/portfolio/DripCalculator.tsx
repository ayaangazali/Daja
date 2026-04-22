import { useMemo, useState } from 'react'
import { Repeat } from 'lucide-react'
import { dripCAGR, projectDrip } from '../../../lib/drip'
import { BarChart, MultiLineChart } from '../../../components/charts/ChartPrimitives'
import { fmtLargeNum, fmtPct } from '../../../lib/format'

export function DripCalculator(): React.JSX.Element {
  const [startAmount, setStartAmount] = useState('10000')
  const [sharePrice, setSharePrice] = useState('100')
  const [dividendYield, setDividendYield] = useState('3')
  const [priceGrowth, setPriceGrowth] = useState('7')
  const [divGrowth, setDivGrowth] = useState('5')
  const [years, setYears] = useState('20')
  const [monthlyContrib, setMonthlyContrib] = useState('500')
  const [taxDrag, setTaxDrag] = useState('0')

  const rows = useMemo(
    () =>
      projectDrip({
        startAmount: Number(startAmount) || 0,
        sharePrice: Number(sharePrice) || 0,
        dividendYieldPct: Number(dividendYield) || 0,
        priceGrowthPct: Number(priceGrowth) || 0,
        dividendGrowthPct: Number(divGrowth) || 0,
        years: Math.max(1, Math.min(60, Number(years) || 0)),
        monthlyContribution: Number(monthlyContrib) || 0,
        taxDragPct: Number(taxDrag) || 0
      }),
    [startAmount, sharePrice, dividendYield, priceGrowth, divGrowth, years, monthlyContrib, taxDrag]
  )
  const finalRow = rows[rows.length - 1]
  const totalValue = rows.map((r) => r.totalValue as number | null)
  const contrib = rows.map((r) => r.totalContributed as number | null)
  const divs = rows.map((r) => r.dividendsReinvested as number | null)
  const cagr = dripCAGR(rows, Number(startAmount) || 0)

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <Repeat className="h-3 w-3" /> DRIP calculator (dividend reinvestment)
        </div>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <NumInput label="Start $" value={startAmount} onChange={setStartAmount} />
        <NumInput label="Share $" value={sharePrice} onChange={setSharePrice} />
        <NumInput label="Yield %" value={dividendYield} onChange={setDividendYield} />
        <NumInput label="Price +%/y" value={priceGrowth} onChange={setPriceGrowth} />
        <NumInput label="Div +%/y" value={divGrowth} onChange={setDivGrowth} />
        <NumInput label="Years" value={years} onChange={setYears} />
        <NumInput label="+$ / month" value={monthlyContrib} onChange={setMonthlyContrib} />
        <NumInput label="Tax drag %" value={taxDrag} onChange={setTaxDrag} />
      </div>

      {finalRow && (
        <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          <Stat label="Final value" value={`$${fmtLargeNum(finalRow.totalValue)}`} tone="pos" />
          <Stat label="Contributed" value={`$${fmtLargeNum(finalRow.totalContributed)}`} />
          <Stat
            label="Dividends (cum)"
            value={`$${fmtLargeNum(finalRow.totalDividends)}`}
            tone="pos"
          />
          <Stat label="CAGR" value={fmtPct(cagr)} tone="pos" />
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <div className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] p-2">
          <div className="mb-1 text-[9px] uppercase text-[var(--color-fg-muted)]">
            Total value vs contributions
          </div>
          <MultiLineChart
            series={[
              { values: totalValue, color: '#4ade80', strokeWidth: 1.4 },
              { values: contrib, color: '#60a5fa', strokeWidth: 1 }
            ]}
            height={140}
          />
        </div>
        <div className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] p-2">
          <div className="mb-1 text-[9px] uppercase text-[var(--color-fg-muted)]">
            Annual dividends reinvested
          </div>
          <BarChart values={divs} height={140} color="#a78bfa" />
        </div>
      </div>
    </div>
  )
}

function NumInput({
  label,
  value,
  onChange
}: {
  label: string
  value: string
  onChange: (v: string) => void
}): React.JSX.Element {
  return (
    <label className="flex flex-col gap-0.5 text-[10px] text-[var(--color-fg-muted)]">
      {label}
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-0.5 text-right font-mono text-[11px] text-[var(--color-fg)]"
      />
    </label>
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
    <div className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] p-1.5">
      <div className="text-[9px] uppercase text-[var(--color-fg-muted)]">{label}</div>
      <div
        className={`font-mono text-[12px] font-semibold tabular ${
          tone === 'pos'
            ? 'text-[var(--color-pos)]'
            : tone === 'neg'
              ? 'text-[var(--color-neg)]'
              : ''
        }`}
      >
        {value}
      </div>
    </div>
  )
}
