import { useEffect } from 'react'
import { AppProviders } from './providers/AppProviders'
import { AppRouter } from './router'
import { usePrefs } from './hooks/usePrefs'
import { useUIStore } from './stores/uiStore'
import { ErrorBoundary } from './shared/ErrorBoundary'

function ThemeSync(): null {
  const { data: prefs } = usePrefs()
  const setTheme = useUIStore((s) => s.setTheme)
  useEffect(() => {
    if (prefs?.theme) setTheme(prefs.theme)
  }, [prefs?.theme, setTheme])
  return null
}

function App(): React.JSX.Element {
  return (
    <ErrorBoundary label="App">
      <AppProviders>
        <ThemeSync />
        <AppRouter />
      </AppProviders>
    </ErrorBoundary>
  )
}

export default App
