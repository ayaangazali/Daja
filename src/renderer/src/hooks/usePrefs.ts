import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AIProviderId, ModuleId, Prefs } from '../../../shared/ipc'

export function usePrefs(): ReturnType<typeof useQuery<Prefs, Error>> {
  return useQuery<Prefs, Error>({
    queryKey: ['prefs'],
    queryFn: () => window.daja.prefs.get(),
    staleTime: 10_000
  })
}

export function useSetAiForModule(): ReturnType<
  typeof useMutation<{ ok: boolean }, Error, { module: ModuleId; provider: AIProviderId }>
> {
  const qc = useQueryClient()
  return useMutation<{ ok: boolean }, Error, { module: ModuleId; provider: AIProviderId }>({
    mutationFn: ({ module, provider }) => window.daja.prefs.setAiForModule(module, provider),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prefs'] })
  })
}

export function useSetModel(): ReturnType<
  typeof useMutation<{ ok: boolean }, Error, { provider: AIProviderId; model: string }>
> {
  const qc = useQueryClient()
  return useMutation<{ ok: boolean }, Error, { provider: AIProviderId; model: string }>({
    mutationFn: ({ provider, model }) => window.daja.prefs.setModel(provider, model),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prefs'] })
  })
}

export function useSetTheme(): ReturnType<
  typeof useMutation<{ ok: boolean }, Error, 'dark' | 'light'>
> {
  const qc = useQueryClient()
  return useMutation<{ ok: boolean }, Error, 'dark' | 'light'>({
    mutationFn: (theme) => window.daja.prefs.setTheme(theme),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prefs'] })
  })
}
