import { cn } from '../../../lib/cn'

export const DETAIL_TABS = [
  'Overview',
  'Analyst',
  'Financials',
  'Technicals',
  'Earnings',
  'Options',
  'Ownership',
  'Peers',
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
      {DETAIL_TABS.map((t, i) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          title={`${t} (press ${i + 1})`}
          aria-label={t}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium transition-colors',
            tab === t
              ? 'border-b-2 border-[var(--color-info)] text-[var(--color-fg)]'
              : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
          )}
        >
          {t}
          <kbd className="rounded border border-[var(--color-border)] px-1 font-mono text-[8px] text-[var(--color-fg-muted)]">
            {i + 1}
          </kbd>
        </button>
      ))}
    </div>
  )
}
