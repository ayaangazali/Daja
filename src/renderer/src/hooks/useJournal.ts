import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export interface JournalEntry {
  id: number
  trade_id: number | null
  ticker: string
  entry_type: 'entry' | 'exit' | 'update' | 'note'
  thesis: string | null
  conviction: number | null
  target_price: number | null
  stop_loss: number | null
  risk_reward_ratio: number | null
  lessons: string | null
  emotions: string | null
  tags: string | null
  screenshots: string | null
  created_at: string
  updated_at: string
}

export function useJournal(): ReturnType<typeof useQuery<JournalEntry[], Error>> {
  return useQuery<JournalEntry[], Error>({
    queryKey: ['journal'],
    queryFn: () => window.daja.db.call<JournalEntry[]>('journal', 'list'),
    staleTime: 10_000
  })
}

export function useJournalByTicker(
  ticker: string | undefined
): ReturnType<typeof useQuery<JournalEntry[], Error>> {
  return useQuery<JournalEntry[], Error>({
    queryKey: ['journal', ticker],
    queryFn: () => window.daja.db.call<JournalEntry[]>('journal', 'byTicker', [ticker]),
    enabled: !!ticker,
    staleTime: 10_000
  })
}

export function useAddJournal(): ReturnType<
  typeof useMutation<JournalEntry, Error, Omit<JournalEntry, 'id' | 'created_at' | 'updated_at'>>
> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (j: Omit<JournalEntry, 'id' | 'created_at' | 'updated_at'>) =>
      window.daja.db.call<JournalEntry>('journal', 'add', [j]),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journal'] })
  })
}

export function useRemoveJournal(): ReturnType<typeof useMutation<unknown, Error, number>> {
  const qc = useQueryClient()
  return useMutation<unknown, Error, number>({
    mutationFn: (id) => window.daja.db.call('journal', 'remove', [id]),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journal'] })
  })
}
