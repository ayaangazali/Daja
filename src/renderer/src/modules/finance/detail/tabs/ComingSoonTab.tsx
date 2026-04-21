import { cn } from '../../../../lib/cn'

export function ComingSoonTab({ name, note }: { name: string; note?: string }): React.JSX.Element {
  return (
    <div className="p-6">
      <div
        className={cn(
          'rounded-md border border-dashed p-6 text-center',
          'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
        )}
      >
        <div className="text-sm font-semibold">{name}</div>
        <div className="mt-1 text-[11px] text-[var(--color-fg-muted)]">
          {note ?? 'Wires in Phase 2.'}
        </div>
      </div>
    </div>
  )
}
