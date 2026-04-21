import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type PropsWithChildren } from 'react'

export function AppProviders({ children }: PropsWithChildren): React.JSX.Element {
  const [qc] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: 1
          }
        }
      })
  )
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}
