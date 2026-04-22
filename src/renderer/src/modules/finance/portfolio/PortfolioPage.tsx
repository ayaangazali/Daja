import { useState } from 'react'
import { Download } from 'lucide-react'
import { AllocationBar } from './AllocationBar'
import { PositionsList } from './PositionsList'
import { TradeForm } from './TradeForm'
import { TradesTable } from './TradesTable'
import { EquityCurve } from './EquityCurve'
import { WatchlistImport } from './WatchlistImport'
import { RiskDashboard } from './RiskDashboard'
import { DividendTracker } from './DividendTracker'
import { TaxLotView } from './TaxLotView'
import { TaxHarvestPanel } from './TaxHarvestPanel'
import { CorrelationMatrix } from './CorrelationMatrix'
import { SectorAllocation } from './SectorAllocation'
import { useTrades } from '../../../hooks/useTrades'
import { downloadCsv, toCsv } from '../../../lib/csv'

export function PortfolioPage(): React.JSX.Element {
  const { data: trades = [] } = useTrades()

  const [csvErr, setCsvErr] = useState<string | null>(null)
  const exportCsv = async (): Promise<void> => {
    setCsvErr(null)
    try {
      const csv = toCsv(trades as unknown as Record<string, unknown>[], [
        'date',
        'ticker',
        'side',
        'quantity',
        'price',
        'fees',
        'currency',
        'exchange',
        'notes'
      ])
      await downloadCsv(`trades-${new Date().toISOString().slice(0, 10)}.csv`, csv)
    } catch (err) {
      setCsvErr(err instanceof Error ? err.message : 'Export failed')
      setTimeout(() => setCsvErr(null), 4000)
    }
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mx-auto max-w-6xl space-y-3">
        <div className="flex items-baseline justify-between">
          <h1 className="text-lg font-semibold">Portfolio</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => void exportCsv()}
              disabled={trades.length === 0}
              className="flex items-center gap-1 rounded border border-[var(--color-border)] px-2 py-1 text-[10px] hover:bg-[var(--color-bg-elev)] disabled:opacity-40"
            >
              <Download className="h-3 w-3" /> Export CSV
            </button>
            {csvErr && <span className="text-[10px] text-[var(--color-neg)]">{csvErr}</span>}
            <div className="text-[10px] text-[var(--color-fg-muted)]">
              Avg-cost basis · Realized+Unrealized P&amp;L · Live prices via Yahoo
            </div>
          </div>
        </div>
        <EquityCurve />
        <RiskDashboard trades={trades} />
        <DividendTracker />
        <AllocationBar />
        <SectorAllocation />
        <PositionsList />
        <TaxLotView />
        <TaxHarvestPanel />
        <CorrelationMatrix />
        <TradeForm />
        <TradesTable />
        <WatchlistImport />
      </div>
    </div>
  )
}
