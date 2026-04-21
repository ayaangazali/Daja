import { createHashRouter, Navigate, RouterProvider } from 'react-router-dom'
import { Shell } from './shell/Shell'
import { FinanceModule } from './modules/finance/FinanceModule'
import { FinanceHome } from './modules/finance/FinanceHome'
import { ComingSoon } from './modules/_placeholders/ComingSoon'
import { SettingsPage } from './modules/settings/SettingsPage'

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
          { path: ':ticker', element: <ComingSoon name="Stock Detail (Step 7)" /> }
        ]
      },
      { path: 'sports', element: <ComingSoon name="Sports Hub" /> },
      { path: 'pdf', element: <ComingSoon name="PDF Toolkit" /> },
      { path: 'health', element: <ComingSoon name="Health Tracker" /> },
      { path: 'assistant', element: <ComingSoon name="AI Assistant" /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <ComingSoon name="Not Found" /> }
    ]
  }
])

export function AppRouter(): React.JSX.Element {
  return <RouterProvider router={router} />
}
