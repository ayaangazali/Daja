import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type TechnicalsRange = '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y' | 'max'

interface State {
  range: TechnicalsRange
  setRange: (r: TechnicalsRange) => void
}

/**
 * Shared default range for all StockDetail > Technicals panels.
 * Each panel can still override locally, but they start aligned so newcomers
 * see coherent signals across RSI / Stoch / SMA / MACD on the same timeframe.
 * Persisted so user's preference survives restarts.
 */
export const useTechnicalsRange = create<State>()(
  persist(
    (set) => ({
      range: '6mo',
      setRange: (r) => set({ range: r })
    }),
    { name: 'daja-technicals-range' }
  )
)
