import { AllocationBar } from './AllocationBar'
import { PositionsList } from './PositionsList'
import { TradeForm } from './TradeForm'
import { TradesTable } from './TradesTable'

export function PortfolioPage(): React.JSX.Element {
  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mx-auto max-w-6xl space-y-3">
        <div className="flex items-baseline justify-between">
          <h1 className="text-lg font-semibold">Portfolio</h1>
          <div className="text-[10px] text-[var(--color-fg-muted)]">
            Avg-cost basis · Realized+Unrealized P&amp;L · Live prices via Yahoo
          </div>
        </div>
        <AllocationBar />
        <PositionsList />
        <TradeForm />
        <TradesTable />
      </div>
    </div>
  )
}
