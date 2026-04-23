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
import { StressTestPanel } from './StressTestPanel'
import { AttributionPanel } from './AttributionPanel'
import { useTrades } from '../../../hooks/useTrades'
import { downloadCsv, toCsv } from '../../../lib/csv'
import { ErrorBoundary } from '../../../shared/ErrorBoundary'
import { PageHeader } from '../../../shared/PageHeader'
import { cn } from '../../../lib/cn'

type Tab = 'overview' | 'positions' | 'signals' | 'analysis' | 'tools'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'positions', label: 'Positions' },
  { id: 'signals', label: 'Signals' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'tools', label: 'Tools' }
]

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
  const [tab, setTab] = useState<Tab>('overview')

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
      <div className="flex border-b border-[var(--color-border)] bg-[var(--color-bg-elev)] px-5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'px-4 py-2 text-[11px] font-medium transition-colors',
              tab === t.id
                ? 'border-b-2 border-[var(--color-accent)] text-[var(--color-fg)]'
                : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-6xl space-y-3">
          {tab === 'overview' && (
            <>
              <Panel label="EquityCurve">
                <EquityCurve />
              </Panel>
              <Panel label="RiskDashboard">
                <RiskDashboard trades={trades} />
              </Panel>
              <Panel label="AllocationBar">
                <AllocationBar />
              </Panel>
              <Panel label="SectorAllocation">
                <SectorAllocation />
              </Panel>
              <Panel label="DividendTracker">
                <DividendTracker />
              </Panel>
            </>
          )}
          {tab === 'positions' && (
            <>
              <Panel label="PositionsList">
                <PositionsList />
              </Panel>
              <Panel label="TaxLotView">
                <TaxLotView />
              </Panel>
              <Panel label="TradesTable">
                <TradesTable />
              </Panel>
            </>
          )}
          {tab === 'signals' && (
            <>
              <Panel label="ExitSignals">
                <PortfolioExitSignals />
              </Panel>
              <Panel label="StressTest">
                <StressTestPanel />
              </Panel>
              <Panel label="PortfolioEarnings">
                <PortfolioEarnings />
              </Panel>
            </>
          )}
          {tab === 'analysis' && (
            <>
              <Panel label="Attribution">
                <AttributionPanel />
              </Panel>
              <Panel label="CorrelationMatrix">
                <CorrelationMatrix />
              </Panel>
              <Panel label="RebalancePanel">
                <RebalancePanel />
              </Panel>
              <Panel label="TaxHarvestPanel">
                <TaxHarvestPanel />
              </Panel>
            </>
          )}
          {tab === 'tools' && (
            <>
              <Panel label="TradeForm">
                <TradeForm />
              </Panel>
              <Panel label="DripCalculator">
                <DripCalculator />
              </Panel>
              <Panel label="WatchlistImport">
                <WatchlistImport />
              </Panel>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
