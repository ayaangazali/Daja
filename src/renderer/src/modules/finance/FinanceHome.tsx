import { useState, useMemo, useCallback } from 'react'
import { Save, RotateCcw } from 'lucide-react'
import { Responsive, WidthProvider } from 'react-grid-layout'
import { EarningsBanner } from './home/EarningsBanner'
import { MarketTabs } from './home/MarketTabs'
import { MarketIndexCards, REGION_KEYS } from './home/MarketIndexCards'
import { MarketSummary } from './home/MarketSummary'
import { SearchBar } from './home/SearchBar'
import { SectorHeatmap } from './home/SectorHeatmap'
import { TopMovers } from './home/TopMovers'
import { MacroIndicators } from './home/MacroIndicators'
import { useDashboardLayout, type Layout } from '../../hooks/useLayout'
import { cn } from '../../lib/cn'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

const ResponsiveGrid = WidthProvider(Responsive)

const DEFAULT_LAYOUT: Layout[] = [
  { i: 'indices', x: 0, y: 0, w: 12, h: 6, minW: 6, minH: 4 },
  { i: 'macro', x: 0, y: 6, w: 12, h: 4, minW: 6, minH: 3 },
  { i: 'movers', x: 0, y: 10, w: 12, h: 4, minW: 6, minH: 3 },
  { i: 'sectors', x: 0, y: 14, w: 12, h: 5, minW: 6, minH: 3 },
  { i: 'summary', x: 0, y: 19, w: 12, h: 8, minW: 4, minH: 4 }
]

export function FinanceHome(): React.JSX.Element {
  const [region, setRegion] = useState<(typeof REGION_KEYS)[number]>('US')
  const { layout, setLayout, save, reset } = useDashboardLayout(
    'finance-home',
    'default',
    DEFAULT_LAYOUT
  )
  const [dirty, setDirty] = useState(false)

  const layouts = useMemo(() => ({ lg: layout, md: layout, sm: layout, xs: layout }), [layout])

  const onChange = useCallback(
    (newLayout: Layout[]): void => {
      setLayout(newLayout)
      setDirty(true)
    },
    [setLayout]
  )

  const onSave = async (): Promise<void> => {
    await save()
    setDirty(false)
  }

  return (
    <div className="flex h-full flex-col">
      <EarningsBanner />
      <MarketTabs region={region} onChange={setRegion} />
      <div className="flex items-center justify-end gap-2 border-b border-[var(--color-border)] px-3 py-1">
        <button
          onClick={() => {
            reset()
            setDirty(true)
          }}
          className="flex items-center gap-1 rounded px-2 py-1 text-[10px] text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elev)] hover:text-[var(--color-fg)]"
        >
          <RotateCcw className="h-3 w-3" /> Reset layout
        </button>
        <button
          onClick={onSave}
          disabled={!dirty}
          className={cn(
            'flex items-center gap-1 rounded px-2 py-1 text-[10px]',
            dirty ? 'bg-[var(--color-info)] text-white' : 'text-[var(--color-fg-muted)]'
          )}
        >
          <Save className="h-3 w-3" /> {dirty ? 'Save layout' : 'Saved'}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <ResponsiveGrid
          className="layout"
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 900, sm: 600, xs: 0 }}
          cols={{ lg: 12, md: 12, sm: 12, xs: 12 }}
          rowHeight={40}
          margin={[8, 8]}
          onLayoutChange={onChange}
          draggableHandle=".panel-handle"
        >
          <div key="indices" className="h-full overflow-hidden rounded-md">
            <div className="panel-handle flex cursor-move items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-elev)] px-2 py-1 text-[10px] uppercase tracking-wide text-[var(--color-fg-muted)]">
              <span>Market indices ({region})</span>
            </div>
            <div className="h-[calc(100%-24px)] overflow-y-auto p-2">
              <MarketIndexCards region={region} />
            </div>
          </div>
          <div key="macro" className="h-full overflow-hidden rounded-md">
            <div className="panel-handle flex cursor-move items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-elev)] px-2 py-1 text-[10px] uppercase tracking-wide text-[var(--color-fg-muted)]">
              <span>Macro</span>
            </div>
            <div className="h-[calc(100%-24px)] overflow-y-auto p-2">
              <MacroIndicators />
            </div>
          </div>
          <div key="movers" className="h-full overflow-hidden rounded-md">
            <div className="panel-handle flex cursor-move items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-elev)] px-2 py-1 text-[10px] uppercase tracking-wide text-[var(--color-fg-muted)]">
              <span>Watchlist movers</span>
            </div>
            <div className="h-[calc(100%-24px)] overflow-y-auto p-2">
              <TopMovers />
            </div>
          </div>
          <div key="sectors" className="h-full overflow-hidden rounded-md">
            <div className="panel-handle flex cursor-move items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-elev)] px-2 py-1 text-[10px] uppercase tracking-wide text-[var(--color-fg-muted)]">
              <span>Sector heatmap</span>
            </div>
            <div className="h-[calc(100%-24px)] overflow-y-auto p-2">
              <SectorHeatmap />
            </div>
          </div>
          <div key="summary" className="h-full overflow-hidden rounded-md">
            <div className="panel-handle flex cursor-move items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-elev)] px-2 py-1 text-[10px] uppercase tracking-wide text-[var(--color-fg-muted)]">
              <span>AI market summary</span>
            </div>
            <div className="h-[calc(100%-24px)] overflow-y-auto p-2">
              <MarketSummary />
            </div>
          </div>
        </ResponsiveGrid>
      </div>
      <div className="border-t border-[var(--color-border)] p-3">
        <div className="mx-auto max-w-3xl">
          <SearchBar />
        </div>
      </div>
    </div>
  )
}
