import { Outlet } from 'react-router-dom'
import { Watchlist } from './home/Watchlist'
import { ResearchPanel } from './research/ResearchPanel'

export function FinanceModule(): React.JSX.Element {
  return (
    <div className="flex h-full min-h-0">
      <Watchlist />
      <main className="min-h-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <ResearchPanel />
    </div>
  )
}
