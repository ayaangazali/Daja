import { useEffect } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AccentId = 'clay' | 'blue' | 'green' | 'purple' | 'rose' | 'teal' | 'mono'

export interface AccentDef {
  id: AccentId
  label: string
  /** Main accent color (CSS color expression) */
  main: string
  /** Softer partner for gradients */
  soft: string
}

export const ACCENTS: AccentDef[] = [
  { id: 'clay', label: 'Claude Clay', main: '#CC785C', soft: '#DA7756' },
  { id: 'blue', label: 'Blue', main: '#3b82f6', soft: '#60a5fa' },
  { id: 'green', label: 'Green', main: '#10b981', soft: '#34d399' },
  { id: 'purple', label: 'Purple', main: '#8b5cf6', soft: '#a78bfa' },
  { id: 'rose', label: 'Rose', main: '#f43f5e', soft: '#fb7185' },
  { id: 'teal', label: 'Teal', main: '#14b8a6', soft: '#2dd4bf' },
  { id: 'mono', label: 'Monochrome', main: '#6b7280', soft: '#9ca3af' }
]

interface State {
  accent: AccentId
  setAccent: (a: AccentId) => void
}

export const useAccent = create<State>()(
  persist(
    (set) => ({
      accent: 'clay',
      setAccent: (accent) => set({ accent })
    }),
    { name: 'daja-accent' }
  )
)

/**
 * Apply the current accent to CSS custom properties. Call once at app mount
 * (via a hook in the shell). Subsequent changes re-apply via the same effect.
 */
export function useAccentSync(): void {
  const accent = useAccent((s) => s.accent)
  useEffect(() => {
    const def = ACCENTS.find((a) => a.id === accent) ?? ACCENTS[0]
    document.documentElement.style.setProperty('--color-accent', def.main)
    document.documentElement.style.setProperty('--color-accent-soft', def.soft)
  }, [accent])
}
