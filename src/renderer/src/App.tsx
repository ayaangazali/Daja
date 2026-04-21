import { AppProviders } from './providers/AppProviders'
import { AppRouter } from './router'

function App(): React.JSX.Element {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  )
}

export default App
