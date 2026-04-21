import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export interface StrategyRule {
  metric: string
  operator: '>' | '>=' | '<' | '<=' | '==' | '!=' | 'between'
  value: number | [number, number]
  label?: string
}

export interface Strategy {
  id: number
  name: string
  description: string | null
  rules: StrategyRule[]
  natural_language: string | null
  asset_classes: string[]
  is_active: 0 | 1
  backtest_results: string | null
  created_at: string
  updated_at: string
}

export function useStrategies(): ReturnType<typeof useQuery<Strategy[], Error>> {
  return useQuery<Strategy[], Error>({
    queryKey: ['strategies'],
    queryFn: () => window.nexus.db.call<Strategy[]>('strategies', 'list'),
    staleTime: 30_000
  })
}

export function useActiveStrategies(): ReturnType<typeof useQuery<Strategy[], Error>> {
  return useQuery<Strategy[], Error>({
    queryKey: ['strategies', 'active'],
    queryFn: () => window.nexus.db.call<Strategy[]>('strategies', 'listActive'),
    staleTime: 30_000
  })
}

export function useAddStrategy(): ReturnType<
  typeof useMutation<
    Strategy,
    Error,
    {
      name: string
      description?: string
      rules: StrategyRule[]
      natural_language?: string
      asset_classes?: string[]
    }
  >
> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (s: {
      name: string
      description?: string
      rules: StrategyRule[]
      natural_language?: string
      asset_classes?: string[]
    }) => window.nexus.db.call<Strategy>('strategies', 'add', [s]),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['strategies'] })
  })
}

export function useRemoveStrategy(): ReturnType<typeof useMutation<unknown, Error, number>> {
  const qc = useQueryClient()
  return useMutation<unknown, Error, number>({
    mutationFn: (id) => window.nexus.db.call('strategies', 'remove', [id]),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['strategies'] })
  })
}
