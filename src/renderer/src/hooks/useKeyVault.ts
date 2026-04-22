import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { KeyMeta, ProviderId, TestResult } from '../../../shared/ipc'

export function useKeys(): ReturnType<typeof useQuery<KeyMeta[], Error>> {
  return useQuery<KeyMeta[], Error>({
    queryKey: ['keys'],
    queryFn: () => window.daja.keys.list(),
    staleTime: 5_000
  })
}

export function useSetKey(): ReturnType<
  typeof useMutation<{ ok: boolean }, Error, { provider: ProviderId; key: string }>
> {
  const qc = useQueryClient()
  return useMutation<{ ok: boolean }, Error, { provider: ProviderId; key: string }>({
    mutationFn: ({ provider, key }) => window.daja.keys.set(provider, key),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['keys'] })
  })
}

export function useDeleteKey(): ReturnType<typeof useMutation<{ ok: boolean }, Error, ProviderId>> {
  const qc = useQueryClient()
  return useMutation<{ ok: boolean }, Error, ProviderId>({
    mutationFn: (provider) => window.daja.keys.delete(provider),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['keys'] })
  })
}

export function useTestKey(): ReturnType<typeof useMutation<TestResult, Error, ProviderId>> {
  const qc = useQueryClient()
  return useMutation<TestResult, Error, ProviderId>({
    mutationFn: (provider) => window.daja.keys.test(provider),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['keys'] })
  })
}
