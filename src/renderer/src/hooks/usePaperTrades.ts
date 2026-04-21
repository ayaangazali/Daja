import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export interface PaperTrade {
  id: number
  ticker: string
  side: 'buy' | 'sell'
  quantity: number
  price: number
  fees: number
  date: string
  notes: string | null
  created_at: string
}

export function usePaperTrades(): ReturnType<typeof useQuery<PaperTrade[], Error>> {
  return useQuery<PaperTrade[], Error>({
    queryKey: ['paper_trades'],
    queryFn: () => window.nexus.db.call<PaperTrade[]>('paperTrades', 'list'),
    staleTime: 10_000
  })
}

export function useAddPaperTrade(): ReturnType<
  typeof useMutation<
    PaperTrade,
    Error,
    Omit<PaperTrade, 'id' | 'created_at'> & { fees?: number; notes?: string | null }
  >
> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (
      t: Omit<PaperTrade, 'id' | 'created_at'> & { fees?: number; notes?: string | null }
    ) => window.nexus.db.call<PaperTrade>('paperTrades', 'add', [t]),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['paper_trades'] })
  })
}

export function useRemovePaperTrade(): ReturnType<typeof useMutation<unknown, Error, number>> {
  const qc = useQueryClient()
  return useMutation<unknown, Error, number>({
    mutationFn: (id) => window.nexus.db.call('paperTrades', 'remove', [id]),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['paper_trades'] })
  })
}

export function useResetPaperTrades(): ReturnType<typeof useMutation<unknown, Error, void>> {
  const qc = useQueryClient()
  return useMutation<unknown, Error, void>({
    mutationFn: () => window.nexus.db.call('paperTrades', 'reset', []),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['paper_trades'] })
  })
}
