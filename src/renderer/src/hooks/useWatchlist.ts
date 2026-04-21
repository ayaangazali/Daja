import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export interface WatchlistItem {
  id: number
  ticker: string
  asset_class: string
  list_name: string
  notes: string | null
  target_buy_price: number | null
  alert_above: number | null
  alert_below: number | null
  sort_order: number
  added_at: string
}

export function useWatchlist(
  listName = 'default'
): ReturnType<typeof useQuery<WatchlistItem[], Error>> {
  return useQuery<WatchlistItem[], Error>({
    queryKey: ['watchlist', listName],
    queryFn: () => window.nexus.db.call<WatchlistItem[]>('watchlist', 'list', [listName]),
    staleTime: 30_000
  })
}

export function useAddToWatchlist(): ReturnType<
  typeof useMutation<
    WatchlistItem,
    Error,
    { ticker: string; listName?: string; assetClass?: string }
  >
> {
  const qc = useQueryClient()
  return useMutation<
    WatchlistItem,
    Error,
    { ticker: string; listName?: string; assetClass?: string }
  >({
    mutationFn: ({ ticker, listName = 'default', assetClass = 'stock' }) =>
      window.nexus.db.call<WatchlistItem>('watchlist', 'add', [ticker, listName, assetClass]),
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: ['watchlist', vars.listName ?? 'default'] })
  })
}

export function useRemoveFromWatchlist(): ReturnType<
  typeof useMutation<unknown, Error, { ticker: string; listName?: string }>
> {
  const qc = useQueryClient()
  return useMutation<unknown, Error, { ticker: string; listName?: string }>({
    mutationFn: ({ ticker, listName = 'default' }) =>
      window.nexus.db.call('watchlist', 'remove', [ticker, listName]),
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: ['watchlist', vars.listName ?? 'default'] })
  })
}
