import { InteractiveChart } from '../panels/InteractiveChart'
import { FundamentalsGrid } from '../panels/FundamentalsGrid'
import { TechnicalsGauge } from '../panels/TechnicalsGauge'
import { MiniBarCharts } from '../panels/MiniBarCharts'
import { AnalystRatings } from '../panels/AnalystRatings'
import { NewsPanel } from '../panels/NewsPanel'
import { BreakEvenCalc } from '../panels/BreakEvenCalc'
import { DividendPanel } from '../panels/DividendPanel'
import { RelativePerformance } from '../panels/RelativePerformance'
import { TrendScorePanel } from '../panels/TrendScorePanel'
import { ExitSignalsPanel } from '../panels/ExitSignalsPanel'
import { EntrySignalsPanel } from '../panels/EntrySignalsPanel'
import { PanelBoundary } from '../../../../shared/ErrorBoundary'
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
        <PanelBoundary label="Chart">
          <div className="h-[340px] rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)]">
            <InteractiveChart ticker={ticker} />
          </div>
        </PanelBoundary>
        <PanelBoundary label="Technicals gauge">
          <TechnicalsGauge ticker={ticker} />
        </PanelBoundary>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <PanelBoundary label="Entry signals">
          <EntrySignalsPanel ticker={ticker} />
        </PanelBoundary>
        <PanelBoundary label="Exit signals">
          <ExitSignalsPanel ticker={ticker} />
        </PanelBoundary>
      </div>
      <PanelBoundary label="Trend score">
        <TrendScorePanel ticker={ticker} />
      </PanelBoundary>
      {fundamentals && (
        <PanelBoundary label="Fundamentals">
          <FundamentalsGrid data={fundamentals} />
        </PanelBoundary>
      )}
      {fundamentals && (
        <PanelBoundary label="Mini bar charts">
          <MiniBarCharts data={fundamentals} />
        </PanelBoundary>
      )}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {fundamentals && (
          <PanelBoundary label="Analyst ratings">
            <AnalystRatings data={fundamentals} />
          </PanelBoundary>
        )}
        <PanelBoundary label="Break-even calc">
          <BreakEvenCalc ticker={ticker} />
        </PanelBoundary>
      </div>
      <PanelBoundary label="Relative performance">
        <RelativePerformance ticker={ticker} />
      </PanelBoundary>
      <PanelBoundary label="Dividends">
        <DividendPanel ticker={ticker} />
      </PanelBoundary>
      <PanelBoundary label="News">
        <NewsPanel ticker={ticker} />
      </PanelBoundary>
      {fundamentals?.description && (
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3 text-[11px] leading-relaxed text-[var(--color-fg-muted)]">
          {fundamentals.description}
        </div>
      )}
    </div>
  )
}
