import { useQuery } from '@tanstack/react-query'
import type { Fundamentals } from '../../../shared/fundamentals'

export type { Fundamentals }

export function useFundamentals(
  ticker: string | undefined
): ReturnType<typeof useQuery<Fundamentals, Error>> {
  return useQuery<Fundamentals, Error>({
    queryKey: ['fundamentals', ticker],
    queryFn: () => window.daja.finance.fundamentals(ticker as string),
    enabled: !!ticker,
    staleTime: 15 * 60_000
  })
}
