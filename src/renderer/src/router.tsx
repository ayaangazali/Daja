import { Suspense, lazy } from 'react'
import { createHashRouter, Navigate, RouterProvider } from 'react-router-dom'
import { Shell } from './shell/Shell'
import { FinanceModule } from './modules/finance/FinanceModule'
import { FinanceHome } from './modules/finance/FinanceHome'
import { ErrorBoundary } from './shared/ErrorBoundary'

const StockDetail = lazy(() =>
  import('./modules/finance/StockDetail').then((m) => ({ default: m.StockDetail }))
)
const PortfolioPage = lazy(() =>
  import('./modules/finance/portfolio/PortfolioPage').then((m) => ({ default: m.PortfolioPage }))
)
const StrategyBuilder = lazy(() =>
  import('./modules/finance/strategy/StrategyBuilder').then((m) => ({ default: m.StrategyBuilder }))
)
const JournalPage = lazy(() =>
  import('./modules/finance/journal/JournalPage').then((m) => ({ default: m.JournalPage }))
)
const ComparePage = lazy(() =>
  import('./modules/finance/compare/ComparePage').then((m) => ({ default: m.ComparePage }))
)
const ScreenerPage = lazy(() =>
  import('./modules/finance/screener/ScreenerPage').then((m) => ({ default: m.ScreenerPage }))
)
const DailyBriefing = lazy(() =>
  import('./modules/finance/briefing/DailyBriefing').then((m) => ({ default: m.DailyBriefing }))
)
const PaperPage = lazy(() =>
  import('./modules/finance/paper/PaperPage').then((m) => ({ default: m.PaperPage }))
)
const SettingsPage = lazy(() =>
  import('./modules/settings/SettingsPage').then((m) => ({ default: m.SettingsPage }))
)
const SportsModule = lazy(() =>
  import('./modules/sports/SportsModule').then((m) => ({ default: m.SportsModule }))
)
const PdfModule = lazy(() =>
  import('./modules/pdf-tools/PdfModule').then((m) => ({ default: m.PdfModule }))
)
const HealthModule = lazy(() =>
  import('./modules/health/HealthModule').then((m) => ({ default: m.HealthModule }))
)
const AssistantModule = lazy(() =>
  import('./modules/assistant/AssistantModule').then((m) => ({ default: m.AssistantModule }))
)

function Fallback(): React.JSX.Element {
  return (
    <div className="flex h-full items-center justify-center text-[11px] text-[var(--color-fg-muted)]">
      Loading module…
    </div>
  )
}

const L = (label: string, el: React.ReactNode): React.ReactElement => (
  <ErrorBoundary label={label}>
    <Suspense fallback={<Fallback />}>{el}</Suspense>
  </ErrorBoundary>
)

const router = createHashRouter([
  {
    path: '/',
    element: <Shell />,
    children: [
      { index: true, element: <Navigate to="/finance" replace /> },
      {
        path: 'finance',
        element: <FinanceModule />,
        children: [
          { index: true, element: <FinanceHome /> },
          { path: 'portfolio', element: L('Portfolio', <PortfolioPage />) },
          { path: 'strategies', element: L('Strategies', <StrategyBuilder />) },
          { path: 'journal', element: L('Journal', <JournalPage />) },
          { path: 'compare', element: L('Compare', <ComparePage />) },
          { path: 'screener', element: L('Screener', <ScreenerPage />) },
          { path: 'briefing', element: L('Briefing', <DailyBriefing />) },
          { path: 'paper', element: L('Paper Trading', <PaperPage />) },
          { path: ':ticker', element: L('StockDetail', <StockDetail />) }
        ]
      },
      { path: 'sports/*', element: L('Sports', <SportsModule />) },
      { path: 'pdf/*', element: L('PDF', <PdfModule />) },
      { path: 'health/*', element: L('Health', <HealthModule />) },
      { path: 'assistant/*', element: L('Assistant', <AssistantModule />) },
      { path: 'settings', element: L('Settings', <SettingsPage />) },
      {
        path: '*',
        element: (
          <div className="flex h-full items-center justify-center text-[11px] text-[var(--color-fg-muted)]">
            Not found.
          </div>
        )
      }
    ]
  }
])

export function AppRouter(): React.JSX.Element {
  return <RouterProvider router={router} />
}
