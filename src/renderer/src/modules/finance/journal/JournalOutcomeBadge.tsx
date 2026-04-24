import { useMemo } from 'react'
import { TrendingUp, TrendingDown, Circle, HelpCircle } from 'lucide-react'
import { useHistorical } from '../../../hooks/useFinance'
import { outcomeForEntry, type JournalLike } from '../../../lib/journalOutcome'
import { cn } from '../../../lib/cn'

/**
 * Inline verdict pill for a journal entry. Fetches the ticker's 3-month
 * history (shared across entries via react-query cache) and classifies.
 * Only renders on 'entry' or 'update' types — 'note' and 'exit' don't have
 * a forward-looking thesis to evaluate.
 */
export function JournalOutcomeBadge({ entry }: { entry: JournalLike }): React.JSX.Element | null {
  const relevant = entry.entry_type === 'entry' || entry.entry_type === 'update'
  const { data: bars = [] } = useHistorical(relevant ? entry.ticker : undefined, '3mo')

  const outcome = useMemo(() => {
    if (!relevant || bars.length === 0) return null
    return outcomeForEntry(entry, bars, { evalDays: 30 })
  }, [relevant, entry, bars])

  if (!relevant || !outcome) return null

  const { verdict, returnPct, rationale } = outcome
  const icon =
    verdict === 'win' ? (
      <TrendingUp className="h-3 w-3" />
    ) : verdict === 'loss' ? (
      <TrendingDown className="h-3 w-3" />
    ) : verdict === 'pending' ? (
      <Circle className="h-3 w-3" />
    ) : (
      <HelpCircle className="h-3 w-3" />
    )
  const pill =
    verdict === 'win'
      ? 'bg-[var(--color-pos)]/15 text-[var(--color-pos)]'
      : verdict === 'loss'
        ? 'bg-[var(--color-neg)]/15 text-[var(--color-neg)]'
        : verdict === 'pending'
          ? 'bg-[var(--color-fg-muted)]/10 text-[var(--color-fg-muted)]'
          : 'bg-[var(--color-fg-muted)]/10 text-[var(--color-fg-muted)]'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium uppercase',
        pill
      )}
      title={rationale}
    >
      {icon}
      {verdict}
      {returnPct != null && (
        <span className="font-mono tabular">
          {returnPct > 0 ? '+' : ''}
          {returnPct.toFixed(1)}%
        </span>
      )}
    </span>
  )
}
