import { useState } from 'react'
import { EarningsBanner } from './home/EarningsBanner'
import { MarketTabs } from './home/MarketTabs'
import { MarketIndexCards, REGION_KEYS } from './home/MarketIndexCards'
import { MarketSummary } from './home/MarketSummary'
import { SearchBar } from './home/SearchBar'

export function FinanceHome(): React.JSX.Element {
  const [region, setRegion] = useState<(typeof REGION_KEYS)[number]>('US')
  return (
    <div className="flex h-full flex-col">
      <EarningsBanner />
      <MarketTabs region={region} onChange={setRegion} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-5xl space-y-4">
          <MarketIndexCards region={region} />
          <MarketSummary />
        </div>
      </div>
      <div className="border-t border-[var(--color-border)] p-3">
        <div className="mx-auto max-w-3xl">
          <SearchBar />
        </div>
      </div>
    </div>
  )
}
