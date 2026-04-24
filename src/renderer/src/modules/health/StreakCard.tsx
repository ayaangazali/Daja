import { useMemo } from 'react'
import { Flame, Trophy, Target } from 'lucide-react'
import { useHealthLogs } from '../../hooks/useHealth'
import { cn } from '../../lib/cn'

/**
 * Consecutive-day logging streak. Gamification nudge — visible streak
 * boosts adherence to daily tracking. Pure client-side compute over the
 * log table; no schema change required.
 */

function computeStreak(dates: string[]): { current: number; longest: number } {
  if (dates.length === 0) return { current: 0, longest: 0 }
  // Normalize + dedupe to YYYY-MM-DD, sort descending (newest first)
  const unique = Array.from(new Set(dates.map((d) => d.slice(0, 10))))
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort((a, b) => b.localeCompare(a))
  if (unique.length === 0) return { current: 0, longest: 0 }

  const msDay = 86_400_000
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const yesterday = new Date(today.getTime() - msDay).toISOString().slice(0, 10)

  let current = 0
  // Current streak starts from today (or yesterday if they haven't logged yet today)
  if (unique[0] === todayStr || unique[0] === yesterday) {
    current = 1
    let prev = unique[0]
    for (let i = 1; i < unique.length; i++) {
      const gap = Math.round((Date.parse(prev) - Date.parse(unique[i])) / msDay)
      if (gap === 1) {
        current += 1
        prev = unique[i]
      } else {
        break
      }
    }
  }

  // Longest streak anywhere in history
  let longest = 1
  let run = 1
  for (let i = 1; i < unique.length; i++) {
    const gap = Math.round((Date.parse(unique[i - 1]) - Date.parse(unique[i])) / msDay)
    if (gap === 1) {
      run += 1
      if (run > longest) longest = run
    } else {
      run = 1
    }
  }
  return { current, longest: Math.max(longest, current) }
}

function streakBadge(n: number): { icon: React.ReactNode; label: string; tone: string } {
  if (n >= 365) return { icon: <Trophy className="h-4 w-4" />, label: 'legend', tone: 'text-[var(--color-accent)]' }
  if (n >= 100) return { icon: <Trophy className="h-4 w-4" />, label: 'century', tone: 'text-[var(--color-accent)]' }
  if (n >= 30) return { icon: <Flame className="h-4 w-4" />, label: 'on fire', tone: 'text-[var(--color-warn)]' }
  if (n >= 7) return { icon: <Flame className="h-4 w-4" />, label: 'warm', tone: 'text-[var(--color-warn)]' }
  if (n >= 3) return { icon: <Target className="h-4 w-4" />, label: 'starting', tone: 'text-[var(--color-info)]' }
  return { icon: <Target className="h-4 w-4" />, label: 'fresh', tone: 'text-[var(--color-fg-muted)]' }
}

export function StreakCard(): React.JSX.Element {
  const { data: logs = [] } = useHealthLogs()
  const { current, longest } = useMemo(() => computeStreak(logs.map((l) => l.date)), [logs])
  const badge = streakBadge(current)

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-4">
      <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
        <span>Logging streak</span>
        <span className={cn('flex items-center gap-1 normal-case', badge.tone)}>
          {badge.icon}
          {badge.label}
        </span>
      </div>
      <div className="flex items-baseline gap-6">
        <div>
          <div className="font-mono text-3xl font-semibold tabular">{current}</div>
          <div className="text-[10px] text-[var(--color-fg-muted)]">current (days)</div>
        </div>
        <div>
          <div className="font-mono text-xl font-semibold tabular text-[var(--color-fg-muted)]">
            {longest}
          </div>
          <div className="text-[10px] text-[var(--color-fg-muted)]">longest ever</div>
        </div>
      </div>
      {current === 0 && logs.length > 0 && (
        <div className="mt-2 text-[10px] text-[var(--color-fg-muted)]">
          Log vitals today to start a new streak.
        </div>
      )}
      {current > 0 && current < 7 && (
        <div className="mt-2 text-[10px] text-[var(--color-fg-muted)]">
          {7 - current} more day{7 - current === 1 ? '' : 's'} to 'warm' badge.
        </div>
      )}
      {current >= 7 && current < 30 && (
        <div className="mt-2 text-[10px] text-[var(--color-fg-muted)]">
          {30 - current} more to 'on fire'.
        </div>
      )}
    </div>
  )
}
