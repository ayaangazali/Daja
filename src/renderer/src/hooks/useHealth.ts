import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export interface HealthLog {
  id: number
  date: string
  symptoms: string | null
  severity: number | null
  temperature: number | null
  temperature_unit: string
  blood_pressure_systolic: number | null
  blood_pressure_diastolic: number | null
  heart_rate: number | null
  weight: number | null
  weight_unit: string
  sleep_hours: number | null
  sleep_quality: number | null
  mood: number | null
  energy: number | null
  water_intake_oz: number | null
  notes: string | null
  created_at: string
}

export function useHealthLogs(): ReturnType<typeof useQuery<HealthLog[], Error>> {
  return useQuery<HealthLog[], Error>({
    queryKey: ['health_logs'],
    queryFn: () => window.nexus.db.call<HealthLog[]>('health', 'list'),
    staleTime: 10_000
  })
}

export function useRecentHealth(
  days = 30
): ReturnType<typeof useQuery<HealthLog[], Error>> {
  return useQuery<HealthLog[], Error>({
    queryKey: ['health_logs', 'recent', days],
    queryFn: () => window.nexus.db.call<HealthLog[]>('health', 'recent', [days]),
    staleTime: 10_000
  })
}

export function useAddHealthLog(): ReturnType<
  typeof useMutation<HealthLog, Error, Partial<Omit<HealthLog, 'id' | 'created_at'>> & { date: string }>
> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (log: Partial<Omit<HealthLog, 'id' | 'created_at'>> & { date: string }) =>
      window.nexus.db.call<HealthLog>('health', 'add', [log]),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['health_logs'] })
  })
}

export function useRemoveHealthLog(): ReturnType<typeof useMutation<unknown, Error, number>> {
  const qc = useQueryClient()
  return useMutation<unknown, Error, number>({
    mutationFn: (id) => window.nexus.db.call('health', 'remove', [id]),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['health_logs'] })
  })
}

export interface Medication {
  id: number
  name: string
  dosage: string | null
  frequency: string | null
  purpose: string | null
  start_date: string | null
  end_date: string | null
  side_effects: string | null
  notes: string | null
  is_active: 0 | 1
  created_at: string
}

export function useMedications(): ReturnType<typeof useQuery<Medication[], Error>> {
  return useQuery<Medication[], Error>({
    queryKey: ['medications'],
    queryFn: () => window.nexus.db.call<Medication[]>('medications', 'list'),
    staleTime: 30_000
  })
}

export function useAddMedication(): ReturnType<
  typeof useMutation<Medication, Error, Partial<Omit<Medication, 'id' | 'created_at'>> & { name: string }>
> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (m: Partial<Omit<Medication, 'id' | 'created_at'>> & { name: string }) =>
      window.nexus.db.call<Medication>('medications', 'add', [m]),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medications'] })
  })
}

export function useSetMedActive(): ReturnType<
  typeof useMutation<unknown, Error, { id: number; active: 0 | 1 }>
> {
  const qc = useQueryClient()
  return useMutation<unknown, Error, { id: number; active: 0 | 1 }>({
    mutationFn: ({ id, active }) =>
      window.nexus.db.call('medications', 'setActive', [id, active]),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medications'] })
  })
}

export function useRemoveMedication(): ReturnType<typeof useMutation<unknown, Error, number>> {
  const qc = useQueryClient()
  return useMutation<unknown, Error, number>({
    mutationFn: (id) => window.nexus.db.call('medications', 'remove', [id]),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medications'] })
  })
}
