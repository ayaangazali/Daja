import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export interface Trade {
  id: number
  ticker: string
  asset_class: string
  side: 'buy' | 'sell' | 'short' | 'cover'
  quantity: number
  price: number
  fees: number
  currency: string
  exchange: string | null
  date: string
  notes: string | null
  strategy_id: number | null
  journal_id: number | null
  created_at: string
  updated_at: string
}

export interface NewTrade {
  ticker: string
  asset_class?: string
  side: Trade['side']
  quantity: number
  price: number
  fees?: number
  date: string
  notes?: string | null
}

export function useTrades(): ReturnType<typeof useQuery<Trade[], Error>> {
  return useQuery<Trade[], Error>({
    queryKey: ['trades'],
    queryFn: () => window.daja.db.call<Trade[]>('trades', 'list'),
    staleTime: 30_000
  })
}

export function useTradesByTicker(
  ticker: string | undefined
): ReturnType<typeof useQuery<Trade[], Error>> {
  return useQuery<Trade[], Error>({
    queryKey: ['trades', ticker],
    queryFn: () => window.daja.db.call<Trade[]>('trades', 'byTicker', [ticker]),
    enabled: !!ticker,
    staleTime: 30_000
  })
}

export function useAddTrade(): ReturnType<typeof useMutation<Trade, Error, NewTrade>> {
  const qc = useQueryClient()
  return useMutation<Trade, Error, NewTrade>({
    mutationFn: (t) => window.daja.db.call<Trade>('trades', 'add', [t]),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trades'] })
  })
}

export function useRemoveTrade(): ReturnType<typeof useMutation<unknown, Error, number>> {
  const qc = useQueryClient()
  return useMutation<unknown, Error, number>({
    mutationFn: (id) => window.daja.db.call('trades', 'remove', [id]),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trades'] })
  })
}
