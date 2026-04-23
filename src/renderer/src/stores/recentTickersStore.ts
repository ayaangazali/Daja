import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface RecentTickersState {
  tickers: string[]
  add: (ticker: string) => void
  clear: () => void
}

const MAX = 12

export const useRecentTickers = create<RecentTickersState>()(
  persist(
    (set) => ({
      tickers: [],
      add: (ticker) =>
        set((s) => {
          const norm = ticker.trim().toUpperCase()
          if (!norm) return s
          const next = [norm, ...s.tickers.filter((t) => t !== norm)].slice(0, MAX)
          return { tickers: next }
        }),
      clear: () => set({ tickers: [] })
    }),
    { name: 'daja-recent-tickers' }
  )
)
