import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export interface AIConversation {
  id: number
  module: string
  provider: string
  model: string | null
  title: string | null
  messages: string
  context_ticker: string | null
  summary: string | null
  created_at: string
  updated_at: string
}

export interface HydratedConversation extends Omit<AIConversation, 'messages'> {
  messages: { role: 'user' | 'assistant'; content: string }[]
}

export function useConversations(
  module?: string
): ReturnType<typeof useQuery<AIConversation[], Error>> {
  return useQuery<AIConversation[], Error>({
    queryKey: ['conversations', module],
    queryFn: () => window.daja.db.call<AIConversation[]>('conversations', 'list', [module]),
    staleTime: 10_000
  })
}

export function useAddConversation(): ReturnType<
  typeof useMutation<
    AIConversation,
    Error,
    {
      module: string
      provider: string
      model?: string
      title?: string
      messages: { role: 'user' | 'assistant'; content: string }[]
      context_ticker?: string
    }
  >
> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (c: {
      module: string
      provider: string
      model?: string
      title?: string
      messages: { role: 'user' | 'assistant'; content: string }[]
      context_ticker?: string
    }) => window.daja.db.call<AIConversation>('conversations', 'add', [c]),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] })
  })
}

export function useUpdateConversation(): ReturnType<
  typeof useMutation<
    unknown,
    Error,
    {
      id: number
      patch: {
        title?: string
        messages?: { role: 'user' | 'assistant'; content: string }[]
        summary?: string
      }
    }
  >
> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }) => window.daja.db.call('conversations', 'update', [id, patch]),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] })
  })
}

export function useRemoveConversation(): ReturnType<typeof useMutation<unknown, Error, number>> {
  const qc = useQueryClient()
  return useMutation<unknown, Error, number>({
    mutationFn: (id) => window.daja.db.call('conversations', 'remove', [id]),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] })
  })
}
