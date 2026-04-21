import { useFundamentals } from '../../../../hooks/useFundamentals'
import { fmtPct, signColor } from '../../../../lib/format'
import { cn } from '../../../../lib/cn'

export function EarningsTab({ ticker }: { ticker: string }): React.JSX.Element {
  const { data, isLoading } = useFundamentals(ticker)
  if (isLoading) {
    return <div className="p-4 text-[11px] text-[var(--color-fg-muted)]">Loading…</div>
  }
  if (!data) return <></>

  const hist = data.earningsHistory
  return (
    <div className="space-y-3 p-3">
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)]">
        <div className="border-b border-[var(--color-border)] px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          EPS Estimates vs Actuals
        </div>
        <table className="w-full text-[11px]">
          <thead className="text-[10px] uppercase text-[var(--color-fg-muted)]">
            <tr>
              <th className="px-2 py-1 text-left">Quarter</th>
              <th className="px-2 py-1 text-right">EPS Est</th>
              <th className="px-2 py-1 text-right">EPS Actual</th>
              <th className="px-2 py-1 text-right">Surprise</th>
            </tr>
          </thead>
          <tbody>
            {hist.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-2 py-3 text-center text-[var(--color-fg-muted)]"
                >
                  No earnings history.
                </td>
              </tr>
            )}
            {hist.map((h) => (
              <tr key={h.quarter} className="border-t border-[var(--color-border)]">
                <td className="px-2 py-1 tabular">{h.quarter}</td>
                <td className="px-2 py-1 text-right font-mono tabular">
                  {h.epsEstimate?.toFixed(2) ?? '—'}
                </td>
                <td className="px-2 py-1 text-right font-mono tabular">
                  {h.epsActual?.toFixed(2) ?? '—'}
                </td>
                <td
                  className={cn(
                    'px-2 py-1 text-right font-mono tabular',
                    signColor(h.surprisePercent != null ? h.surprisePercent * 100 : null)
                  )}
                >
                  {h.surprisePercent != null ? fmtPct(h.surprisePercent * 100) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Fwd P/E" value={data.forwardPE?.toFixed(2)} />
        <Stat label="PEG" value={data.pegRatio?.toFixed(2)} />
        <Stat
          label="Rev Growth"
          value={data.revenueGrowth != null ? fmtPct(data.revenueGrowth * 100) : null}
          tone={data.revenueGrowth != null ? (data.revenueGrowth > 0 ? 'pos' : 'neg') : null}
        />
        <Stat
          label="EPS Growth"
          value={data.earningsGrowth != null ? fmtPct(data.earningsGrowth * 100) : null}
          tone={data.earningsGrowth != null ? (data.earningsGrowth > 0 ? 'pos' : 'neg') : null}
        />
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  tone
}: {
  label: string
  value: string | null | undefined
  tone?: 'pos' | 'neg' | null
}): React.JSX.Element {
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
      <div className="text-[10px] text-[var(--color-fg-muted)]">{label}</div>
      <div
        className={cn(
          'mt-1 font-mono text-lg font-semibold tabular',
          tone === 'pos' && 'text-[var(--color-pos)]',
          tone === 'neg' && 'text-[var(--color-neg)]'
        )}
      >
        {value ?? '—'}
      </div>
    </div>
  )
}
