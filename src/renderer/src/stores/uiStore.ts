import { create } from 'zustand'

interface UIState {
  paletteOpen: boolean
  researchRailOpen: boolean
  theme: 'dark' | 'light'
  alwaysOnTop: boolean
  focusMode: boolean
  togglePalette: () => void
  setPalette: (open: boolean) => void
  toggleResearchRail: () => void
  setTheme: (theme: 'dark' | 'light') => void
  toggleAlwaysOnTop: () => void
  toggleFocusMode: () => void
}

function applyTheme(theme: 'dark' | 'light'): void {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.style.colorScheme = theme
}

export const useUIStore = create<UIState>((set) => ({
  paletteOpen: false,
  researchRailOpen: true,
  theme: 'dark',
  alwaysOnTop: false,
  focusMode: false,
  togglePalette: () => set((s) => ({ paletteOpen: !s.paletteOpen })),
  setPalette: (open) => set({ paletteOpen: open }),
  toggleResearchRail: () => set((s) => ({ researchRailOpen: !s.researchRailOpen })),
  setTheme: (theme) => {
    applyTheme(theme)
    set({ theme })
  },
  toggleAlwaysOnTop: (): void => {
    set((s) => {
      const next = !s.alwaysOnTop
      window.nexus.window?.setAlwaysOnTop?.(next)
      return { alwaysOnTop: next }
    })
  },
  toggleFocusMode: (): void => set((s) => ({ focusMode: !s.focusMode }))
}))

// Apply initial theme on module load
applyTheme('dark')
