import { useEffect, useState } from 'react'

export type Layout = {
  i: string
  x: number
  y: number
  w: number
  h: number
  minW?: number
  minH?: number
  static?: boolean
}

export interface SavedLayout {
  id: number
  module: string
  name: string
  layout_config: string
  is_default: 0 | 1
  created_at: string
  updated_at: string
}

export function useDashboardLayout(
  module: string,
  name = 'default',
  initial: Layout[] = []
): {
  layout: Layout[]
  setLayout: (l: Layout[]) => void
  save: () => Promise<void>
  reset: () => Promise<void>
  loading: boolean
} {
  const [layout, setLayout] = useState<Layout[]>(initial)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async (): Promise<void> => {
      setLoading(true)
      try {
        const row = (await window.daja.db.call<SavedLayout | null>('layouts', 'get', [
          module,
          name
        ])) as SavedLayout | null
        if (cancelled) return
        if (row?.layout_config) {
          try {
            const parsed = JSON.parse(row.layout_config) as Layout[]
            if (Array.isArray(parsed) && parsed.length > 0) setLayout(parsed)
          } catch {
            // ignore
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module, name])

  const save = async (): Promise<void> => {
    await window.daja.db.call('layouts', 'save', [module, name, layout, true])
  }

  /** Reset layout to the built-in default AND persist that reset so reloads stick. */
  const reset = async (): Promise<void> => {
    setLayout(initial)
    try {
      await window.daja.db.call('layouts', 'save', [module, name, initial, true])
    } catch {
      // non-fatal: local state reset still applied
    }
  }

  return { layout, setLayout, save, reset, loading }
}
