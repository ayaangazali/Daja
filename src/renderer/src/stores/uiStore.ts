import { create } from 'zustand'

interface UIState {
  paletteOpen: boolean
  researchRailOpen: boolean
  theme: 'dark' | 'light'
  togglePalette: () => void
  setPalette: (open: boolean) => void
  toggleResearchRail: () => void
  setTheme: (theme: 'dark' | 'light') => void
}

export const useUIStore = create<UIState>((set) => ({
  paletteOpen: false,
  researchRailOpen: true,
  theme: 'dark',
  togglePalette: () => set((s) => ({ paletteOpen: !s.paletteOpen })),
  setPalette: (open) => set({ paletteOpen: open }),
  toggleResearchRail: () => set((s) => ({ researchRailOpen: !s.researchRailOpen })),
  setTheme: (theme) => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    set({ theme })
  }
}))
