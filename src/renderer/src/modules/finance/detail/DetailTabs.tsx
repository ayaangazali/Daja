import { cn } from '../../../lib/cn'

export const DETAIL_TABS = [
  'Overview',
  'Financials',
  'Technicals',
  'Earnings',
  'Options',
  'Ownership',
  'News',
  'Sentiment',
  'Simulation'
] as const

export type DetailTab = (typeof DETAIL_TABS)[number]

export function DetailTabs({
  tab,
  onChange
}: {
  tab: DetailTab
  onChange: (t: DetailTab) => void
}): React.JSX.Element {
  return (
    <div className="flex border-b border-[var(--color-border)]">
      {DETAIL_TABS.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={cn(
            'px-3 py-1.5 text-[11px] font-medium transition-colors',
            tab === t
              ? 'border-b-2 border-[var(--color-info)] text-[var(--color-fg)]'
              : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
          )}
        >
          {t}
        </button>
      ))}
    </div>
  )
}
