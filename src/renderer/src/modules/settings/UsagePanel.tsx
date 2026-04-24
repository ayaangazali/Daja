import { useEffect, useState } from 'react'
import { BarChart3, RefreshCw, Trash2 } from 'lucide-react'
import { cn } from '../../lib/cn'

interface Summary {
  totalCalls: number
  totalInputTokens: number
  totalOutputTokens: number
  totalCostUsd: number
  byProvider: Record<
    string,
    { calls: number; inputTokens: number; outputTokens: number; costUsd: number }
  >
  byModule: Record<string, { calls: number; costUsd: number }>
  since: string | null
}

const WINDOWS: { days: number; label: string }[] = [
  { days: 1, label: '24h' },
  { days: 7, label: '7d' },
  { days: 30, label: '30d' },
  { days: 90, label: '90d' }
]

function fmtUsd(v: number): string {
  if (v < 0.01) return `$${v.toFixed(4)}`
  if (v < 1) return `$${v.toFixed(3)}`
  return `$${v.toFixed(2)}`
}
function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

export function UsagePanel(): React.JSX.Element {
  const [days, setDays] = useState(30)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async (d: number): Promise<void> => {
    setLoading(true)
    try {
      const s = await window.daja.aiUsage.summary(d)
      setSummary(s)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load(days)
  }, [days])

  const clear = async (): Promise<void> => {
    if (!confirm('Clear all AI usage telemetry? This only affects local stats, not your provider billing.')) return
    await window.daja.aiUsage.clear()
    void load(days)
  }

  return (
    <section>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <BarChart3 className="h-4 w-4" /> AI usage
          </h2>
          <p className="mt-0.5 text-xs text-[var(--color-fg-muted)]">
            Per-call log of AI requests. Cost estimates use published provider pricing; actuals on
            your bill may differ. Local only — no telemetry leaves this machine.
          </p>
        </div>
        <div className="flex items-center gap-1">
          {WINDOWS.map((w) => (
            <button
              key={w.days}
              onClick={() => setDays(w.days)}
              aria-pressed={days === w.days}
              className={cn(
                'rounded border px-2 py-1 font-mono text-[10px]',
                days === w.days
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
                  : 'border-[var(--color-border)] text-[var(--color-fg-muted)]'
              )}
            >
              {w.label}
            </button>
          ))}
          <button
            onClick={() => void load(days)}
            aria-label="Refresh usage"
            className="ml-1 rounded border border-[var(--color-border)] p-1 text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
          >
            <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {summary ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Calls" value={summary.totalCalls.toString()} />
            <Stat label="Input tokens" value={fmtNum(summary.totalInputTokens)} />
            <Stat label="Output tokens" value={fmtNum(summary.totalOutputTokens)} />
            <Stat label="Estimated cost" value={fmtUsd(summary.totalCostUsd)} tone="accent" />
          </div>

          {summary.totalCalls > 0 ? (
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
                  By provider
                </div>
                <table className="w-full text-[11px]">
                  <thead className="text-[9px] uppercase text-[var(--color-fg-muted)]">
                    <tr>
                      <th className="text-left">Provider</th>
                      <th className="text-right">Calls</th>
                      <th className="text-right">In tok</th>
                      <th className="text-right">Out tok</th>
                      <th className="text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(summary.byProvider).map(([p, s]) => (
                      <tr key={p} className="border-t border-[var(--color-border)] font-mono tabular">
                        <td className="py-1 capitalize">{p}</td>
                        <td className="py-1 text-right">{s.calls}</td>
                        <td className="py-1 text-right">{fmtNum(s.inputTokens)}</td>
                        <td className="py-1 text-right">{fmtNum(s.outputTokens)}</td>
                        <td className="py-1 text-right text-[var(--color-accent)]">
                          {fmtUsd(s.costUsd)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
                  By module
                </div>
                <table className="w-full text-[11px]">
                  <thead className="text-[9px] uppercase text-[var(--color-fg-muted)]">
                    <tr>
                      <th className="text-left">Module</th>
                      <th className="text-right">Calls</th>
                      <th className="text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(summary.byModule).map(([m, s]) => (
                      <tr key={m} className="border-t border-[var(--color-border)] font-mono tabular">
                        <td className="py-1 capitalize">{m}</td>
                        <td className="py-1 text-right">{s.calls}</td>
                        <td className="py-1 text-right text-[var(--color-accent)]">
                          {fmtUsd(s.costUsd)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-md border border-dashed border-[var(--color-border)] p-4 text-center text-[11px] text-[var(--color-fg-muted)]">
              No AI calls in the last {days} day{days === 1 ? '' : 's'}.
            </div>
          )}

          <div className="mt-3 flex items-center justify-between text-[10px] text-[var(--color-fg-muted)]">
            <span>
              {summary.since
                ? `Oldest entry in window: ${summary.since.slice(0, 16).replace('T', ' ')}`
                : 'No entries yet'}
            </span>
            <button
              onClick={() => void clear()}
              className="flex items-center gap-1 hover:text-[var(--color-neg)]"
            >
              <Trash2 className="h-3 w-3" /> Clear all
            </button>
          </div>
        </>
      ) : loading ? (
        <div className="mt-4 text-center text-[11px] text-[var(--color-fg-muted)]">Loading…</div>
      ) : null}
    </section>
  )
}

function Stat({
  label,
  value,
  tone
}: {
  label: string
  value: string
  tone?: 'accent'
}): React.JSX.Element {
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
      <div className="text-[10px] text-[var(--color-fg-muted)]">{label}</div>
      <div
        className={cn(
          'font-mono text-lg font-semibold tabular',
          tone === 'accent' && 'text-[var(--color-accent)]'
        )}
      >
        {value}
      </div>
    </div>
  )
}
