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
import { RebalancePanel } from './RebalancePanel'
import { PortfolioEarnings } from './PortfolioEarnings'
import { DripCalculator } from './DripCalculator'
import { PortfolioExitSignals } from './PortfolioExitSignals'
import { useTrades } from '../../../hooks/useTrades'
import { downloadCsv, toCsv } from '../../../lib/csv'
import { ErrorBoundary } from '../../../shared/ErrorBoundary'
import { PageHeader } from '../../../shared/PageHeader'

function Panel({
  label,
  children
}: {
  label: string
  children: React.ReactNode
}): React.JSX.Element {
  return <ErrorBoundary label={label}>{children}</ErrorBoundary>
}

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
    <div className="flex h-full flex-col">
      <PageHeader
        title="Portfolio"
        subtitle="Avg-cost basis · Realized + Unrealized P&L · Live prices via Yahoo"
        actions={
          <>
            <button
              onClick={() => void exportCsv()}
              disabled={trades.length === 0}
              className="flex items-center gap-1 rounded-md border border-[var(--color-border)] px-3 py-1.5 text-[11px] hover:bg-[var(--color-bg-tint)] disabled:opacity-40"
            >
              <Download className="h-3 w-3" /> Export CSV
            </button>
            {csvErr && <span className="text-[10px] text-[var(--color-neg)]">{csvErr}</span>}
          </>
        }
      />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-6xl space-y-3">
        <Panel label="ExitSignals">
          <PortfolioExitSignals />
        </Panel>
        <Panel label="EquityCurve">
          <EquityCurve />
        </Panel>
        <Panel label="PortfolioEarnings">
          <PortfolioEarnings />
        </Panel>
        <Panel label="RiskDashboard">
          <RiskDashboard trades={trades} />
        </Panel>
        <Panel label="DividendTracker">
          <DividendTracker />
        </Panel>
        <Panel label="AllocationBar">
          <AllocationBar />
        </Panel>
        <Panel label="SectorAllocation">
          <SectorAllocation />
        </Panel>
        <Panel label="RebalancePanel">
          <RebalancePanel />
        </Panel>
        <Panel label="PositionsList">
          <PositionsList />
        </Panel>
        <Panel label="TaxLotView">
          <TaxLotView />
        </Panel>
        <Panel label="TaxHarvestPanel">
          <TaxHarvestPanel />
        </Panel>
        <Panel label="CorrelationMatrix">
          <CorrelationMatrix />
        </Panel>
        <Panel label="DripCalculator">
          <DripCalculator />
        </Panel>
        <Panel label="TradeForm">
          <TradeForm />
        </Panel>
        <Panel label="TradesTable">
          <TradesTable />
        </Panel>
        <Panel label="WatchlistImport">
          <WatchlistImport />
        </Panel>
        </div>
      </div>
    </div>
  )
}
