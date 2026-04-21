import { Clock } from 'lucide-react'

export function ComingSoon({ name }: { name: string }): React.JSX.Element {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-2 text-[var(--color-fg-muted)]">
        <Clock className="h-10 w-10" />
        <div className="text-sm font-semibold">{name}</div>
        <div className="text-xs">Coming soon.</div>
      </div>
    </div>
  )
}
