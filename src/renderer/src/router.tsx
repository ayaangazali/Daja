import { Suspense, lazy } from 'react'
import { createHashRouter, Navigate, RouterProvider } from 'react-router-dom'
import { Shell } from './shell/Shell'
import { FinanceModule } from './modules/finance/FinanceModule'
import { FinanceHome } from './modules/finance/FinanceHome'

const StockDetail = lazy(() =>
  import('./modules/finance/StockDetail').then((m) => ({ default: m.StockDetail }))
)
const PortfolioPage = lazy(() =>
  import('./modules/finance/portfolio/PortfolioPage').then((m) => ({ default: m.PortfolioPage }))
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

const L = (el: React.ReactNode): React.ReactElement => (
  <Suspense fallback={<Fallback />}>{el}</Suspense>
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
          { path: 'portfolio', element: L(<PortfolioPage />) },
          { path: ':ticker', element: L(<StockDetail />) }
        ]
      },
      { path: 'sports/*', element: L(<SportsModule />) },
      { path: 'pdf/*', element: L(<PdfModule />) },
      { path: 'health/*', element: L(<HealthModule />) },
      { path: 'assistant/*', element: L(<AssistantModule />) },
      { path: 'settings', element: L(<SettingsPage />) },
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
