import { cn } from '../../../lib/cn'
import { REGION_KEYS } from './MarketIndexCards'

interface Props {
  region: (typeof REGION_KEYS)[number]
  onChange: (r: (typeof REGION_KEYS)[number]) => void
}

export function MarketTabs({ region, onChange }: Props): React.JSX.Element {
  return (
    <div className="flex items-center gap-1 border-b border-[var(--color-border)] px-1">
      {REGION_KEYS.map((k) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          className={cn(
            'px-3 py-2 text-[11px] font-medium transition-colors',
            region === k
              ? 'border-b-2 border-[var(--color-info)] text-[var(--color-fg)]'
              : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
          )}
        >
          {k}
        </button>
      ))}
    </div>
  )
}
