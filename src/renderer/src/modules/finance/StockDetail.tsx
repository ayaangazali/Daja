import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuote } from '../../hooks/useFinance'
import { useFundamentals } from '../../hooks/useFundamentals'
import { StockHeader } from './detail/StockHeader'
import { DetailTabs, type DetailTab } from './detail/DetailTabs'
import { OverviewTab } from './detail/tabs/OverviewTab'
import { ComingSoonTab } from './detail/tabs/ComingSoonTab'

export function StockDetail(): React.JSX.Element {
  const { ticker = '' } = useParams<{ ticker: string }>()
  const upper = ticker.toUpperCase()
  const [tab, setTab] = useState<DetailTab>('Overview')
  const { data: quote } = useQuote(upper)
  const { data: fundamentals, error: fundError } = useFundamentals(upper)

  return (
    <div className="flex h-full flex-col">
      <StockHeader ticker={upper} quote={quote} fundamentals={fundamentals} />
      <DetailTabs tab={tab} onChange={setTab} />
      <div className="flex-1 overflow-y-auto">
        {tab === 'Overview' && <OverviewTab ticker={upper} fundamentals={fundamentals} />}
        {tab === 'Financials' && (
          <ComingSoonTab name="Financials" note="Income / balance / cashflow statements tab." />
        )}
        {tab === 'Technicals' && (
          <ComingSoonTab
            name="Technicals"
            note="Detailed oscillators, MA crosses, pivot points."
          />
        )}
        {tab === 'Earnings' && (
          <ComingSoonTab name="Earnings" note="EPS est vs actual, revenue est, call summaries." />
        )}
        {tab === 'Options' && (
          <ComingSoonTab name="Options" note="Chain, Greeks, unusual flow, IV rank." />
        )}
        {tab === 'Ownership' && (
          <ComingSoonTab name="Ownership" note="13F holders, insider Form 4, ETF holders." />
        )}
        {tab === 'News' && (
          <ComingSoonTab name="News" note="Filtered news + SEC filings (10-K/Q/8-K)." />
        )}
        {tab === 'Sentiment' && (
          <ComingSoonTab name="Sentiment" note="Reddit mentions, Grok X/Twitter scan, analyst changes." />
        )}
        {tab === 'Simulation' && (
          <ComingSoonTab name="Simulation" note="Backtest, Monte Carlo, portfolio correlation." />
        )}
      </div>
      {fundError && (
        <div className="border-t border-[var(--color-border)] bg-[var(--color-neg)]/10 p-2 text-[10px] text-[var(--color-neg)]">
          Fundamentals load failed: {fundError.message}
        </div>
      )}
    </div>
  )
}
