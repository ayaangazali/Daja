import { InteractiveChart } from '../panels/InteractiveChart'
import { FundamentalsGrid } from '../panels/FundamentalsGrid'
import { TechnicalsGauge } from '../panels/TechnicalsGauge'
import { MiniBarCharts } from '../panels/MiniBarCharts'
import { AnalystRatings } from '../panels/AnalystRatings'
import { NewsPanel } from '../panels/NewsPanel'
import { BreakEvenCalc } from '../panels/BreakEvenCalc'
import { DividendPanel } from '../panels/DividendPanel'
import { RelativePerformance } from '../panels/RelativePerformance'
import type { Fundamentals } from '../../../../hooks/useFundamentals'

export function OverviewTab({
  ticker,
  fundamentals
}: {
  ticker: string
  fundamentals: Fundamentals | undefined
}): React.JSX.Element {
  return (
    <div className="space-y-3 p-3">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_260px]">
        <div className="h-[340px] rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)]">
          <InteractiveChart ticker={ticker} />
        </div>
        <TechnicalsGauge ticker={ticker} />
      </div>
      {fundamentals && <FundamentalsGrid data={fundamentals} />}
      {fundamentals && <MiniBarCharts data={fundamentals} />}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {fundamentals && <AnalystRatings data={fundamentals} />}
        <BreakEvenCalc ticker={ticker} />
      </div>
      <RelativePerformance ticker={ticker} />
      <DividendPanel ticker={ticker} />
      <NewsPanel ticker={ticker} />
      {fundamentals?.description && (
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3 text-[11px] leading-relaxed text-[var(--color-fg-muted)]">
          {fundamentals.description}
        </div>
      )}
    </div>
  )
}
