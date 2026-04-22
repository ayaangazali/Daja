import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuote } from '../../hooks/useFinance'
import { useFundamentals } from '../../hooks/useFundamentals'
import { StockHeader } from './detail/StockHeader'
import { DetailTabs, DETAIL_TABS, type DetailTab } from './detail/DetailTabs'
import { OverviewTab } from './detail/tabs/OverviewTab'
import { AnalystPanel } from './detail/panels/AnalystPanel'
import { FinancialsTab } from './detail/tabs/FinancialsTab'
import { TechnicalsTab } from './detail/tabs/TechnicalsTab'
import { EarningsTab } from './detail/tabs/EarningsTab'
import { OwnershipTab } from './detail/tabs/OwnershipTab'
import { PeersTab } from './detail/tabs/PeersTab'
import { OptionsTab } from './detail/tabs/OptionsTab'
import { NewsTab } from './detail/tabs/NewsTab'
import { SentimentTab } from './detail/tabs/SentimentTab'
import { SimulationTab } from './detail/tabs/SimulationTab'
import { ErrorBoundary } from '../../shared/ErrorBoundary'

export function StockDetail(): React.JSX.Element {
  const { ticker = '' } = useParams<{ ticker: string }>()
  const upper = ticker.toUpperCase()
  const [tab, setTab] = useState<DetailTab>('Overview')
  const { data: quote } = useQuote(upper)
  const { data: fundamentals, error: fundError } = useFundamentals(upper)

  // Keyboard shortcuts 1-9 jump between detail tabs.
  // Reject shift+digit (='!@#...') and all other modifier combos.
  useEffect(() => {
    const h = (e: KeyboardEvent): void => {
      const el = document.activeElement as HTMLElement | null
      const tagName = el?.tagName.toLowerCase()
      if (tagName === 'input' || tagName === 'textarea' || el?.isContentEditable) return
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return
      if (!/^[1-9]$/.test(e.key)) return
      const n = parseInt(e.key, 10)
      if (n < 1 || n > DETAIL_TABS.length) return
      e.preventDefault()
      setTab(DETAIL_TABS[n - 1])
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  return (
    <div className="flex h-full flex-col">
      <StockHeader ticker={upper} quote={quote} fundamentals={fundamentals} />
      <DetailTabs tab={tab} onChange={setTab} />
      <div className="flex-1 overflow-y-auto">
        <ErrorBoundary label={`${upper}:${tab}`}>
          {tab === 'Overview' && <OverviewTab ticker={upper} fundamentals={fundamentals} />}
          {tab === 'Analyst' && <AnalystPanel ticker={upper} />}
          {tab === 'Financials' && <FinancialsTab ticker={upper} />}
          {tab === 'Technicals' && <TechnicalsTab ticker={upper} />}
          {tab === 'Earnings' && <EarningsTab ticker={upper} />}
          {tab === 'Options' && <OptionsTab ticker={upper} />}
          {tab === 'Ownership' && <OwnershipTab ticker={upper} />}
          {tab === 'Peers' && <PeersTab ticker={upper} />}
          {tab === 'News' && <NewsTab ticker={upper} />}
          {tab === 'Sentiment' && <SentimentTab ticker={upper} />}
          {tab === 'Simulation' && <SimulationTab ticker={upper} />}
        </ErrorBoundary>
      </div>
      {fundError && (
        <div className="border-t border-[var(--color-border)] bg-[var(--color-neg)]/10 p-2 text-[10px] text-[var(--color-neg)]">
          Fundamentals load failed: {fundError.message}
        </div>
      )}
    </div>
  )
}
