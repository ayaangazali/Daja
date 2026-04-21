import { cn } from '../../../../lib/cn'

export function NewsPanel({ ticker }: { ticker: string }): React.JSX.Element {
  return (
    <div
      className={cn(
        'rounded-md border p-3',
        'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
      )}
    >
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
        News & Filings
      </div>
      <div className="text-[11px] text-[var(--color-fg-muted)]">
        News feed wires in Phase 2 (NewsAPI + SEC EDGAR 10-K/Q/8-K filings for {ticker}).
      </div>
    </div>
  )
}
