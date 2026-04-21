import { useOwnership } from '../../../../hooks/useStatements'
import { fmtLargeNum, fmtPct } from '../../../../lib/format'
import { cn } from '../../../../lib/cn'

export function OwnershipTab({ ticker }: { ticker: string }): React.JSX.Element {
  const { data, isLoading, error } = useOwnership(ticker)
  if (error)
    return (
      <div className="p-4 text-[11px] text-[var(--color-neg)]">
        Ownership load failed: {error.message}
      </div>
    )
  if (isLoading || !data)
    return <div className="p-4 text-[11px] text-[var(--color-fg-muted)]">Loading…</div>

  return (
    <div className="space-y-3 p-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Stat
          label="Insiders %"
          value={
            data.majorHolders.insidersPercentHeld != null
              ? fmtPct(data.majorHolders.insidersPercentHeld * 100)
              : null
          }
        />
        <Stat
          label="Institutions %"
          value={
            data.majorHolders.institutionsPercentHeld != null
              ? fmtPct(data.majorHolders.institutionsPercentHeld * 100)
              : null
          }
        />
        <Stat
          label="Inst of Float %"
          value={
            data.majorHolders.institutionsFloatPercentHeld != null
              ? fmtPct(data.majorHolders.institutionsFloatPercentHeld * 100)
              : null
          }
        />
        <Stat
          label="Inst Count"
          value={
            data.majorHolders.institutionsCount != null
              ? data.majorHolders.institutionsCount.toString()
              : null
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Panel title="Top Institutional Holders">
          {data.institutionalOwnership.slice(0, 10).map((i) => (
            <div
              key={i.organization}
              className="flex items-center justify-between border-b border-[var(--color-border)] py-1 text-[11px] last:border-0"
            >
              <div className="truncate pr-2">{i.organization}</div>
              <div className="flex shrink-0 items-center gap-2 font-mono text-[10px] tabular">
                <span>{fmtLargeNum(i.shares)}</span>
                <span className="text-[var(--color-fg-muted)]">
                  {i.pctHeld != null ? fmtPct(i.pctHeld * 100) : '—'}
                </span>
              </div>
            </div>
          ))}
          {data.institutionalOwnership.length === 0 && (
            <div className="py-2 text-[10px] text-[var(--color-fg-muted)]">No data</div>
          )}
        </Panel>

        <Panel title="Top Fund Holders">
          {data.fundOwnership.slice(0, 10).map((i) => (
            <div
              key={i.organization}
              className="flex items-center justify-between border-b border-[var(--color-border)] py-1 text-[11px] last:border-0"
            >
              <div className="truncate pr-2">{i.organization}</div>
              <div className="flex shrink-0 items-center gap-2 font-mono text-[10px] tabular">
                <span>{fmtLargeNum(i.shares)}</span>
                <span className="text-[var(--color-fg-muted)]">
                  {i.pctHeld != null ? fmtPct(i.pctHeld * 100) : '—'}
                </span>
              </div>
            </div>
          ))}
          {data.fundOwnership.length === 0 && (
            <div className="py-2 text-[10px] text-[var(--color-fg-muted)]">No data</div>
          )}
        </Panel>
      </div>

      <Panel title="Insider Transactions">
        <table className="w-full text-[11px]">
          <thead className="text-[10px] uppercase text-[var(--color-fg-muted)]">
            <tr>
              <th className="py-1 text-left">Date</th>
              <th className="py-1 text-left">Name</th>
              <th className="py-1 text-left">Action</th>
              <th className="py-1 text-right">Shares</th>
              <th className="py-1 text-right">Value</th>
            </tr>
          </thead>
          <tbody>
            {data.insiderTransactions.slice(0, 20).map((t, i) => (
              <tr key={i} className="border-t border-[var(--color-border)]">
                <td className="py-1 tabular">{t.date}</td>
                <td className="py-1 truncate pr-2">{t.name}</td>
                <td
                  className={cn(
                    'py-1 text-[10px]',
                    t.transaction.toLowerCase().includes('purchase')
                      ? 'text-[var(--color-pos)]'
                      : t.transaction.toLowerCase().includes('sale')
                        ? 'text-[var(--color-neg)]'
                        : 'text-[var(--color-fg-muted)]'
                  )}
                >
                  {t.transaction}
                </td>
                <td className="py-1 text-right font-mono tabular">{fmtLargeNum(t.shares)}</td>
                <td className="py-1 text-right font-mono tabular">
                  {t.value != null ? `$${fmtLargeNum(t.value)}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.insiderTransactions.length === 0 && (
          <div className="py-2 text-[10px] text-[var(--color-fg-muted)]">No transactions</div>
        )}
      </Panel>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | null }): React.JSX.Element {
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
      <div className="text-[10px] text-[var(--color-fg-muted)]">{label}</div>
      <div className="mt-1 font-mono text-lg font-semibold tabular">{value ?? '—'}</div>
    </div>
  )
}

function Panel({
  title,
  children
}: {
  title: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
        {title}
      </div>
      {children}
    </div>
  )
}
