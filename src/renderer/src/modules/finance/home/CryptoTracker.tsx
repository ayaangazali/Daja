import { Bitcoin } from 'lucide-react'
import { useQuotes, type Quote } from '../../../hooks/useFinance'
import { fmtLargeNum, fmtPct, fmtPrice } from '../../../lib/format'
import { cn } from '../../../lib/cn'

const CRYPTO: { ticker: string; label: string }[] = [
  { ticker: 'BTC-USD', label: 'Bitcoin' },
  { ticker: 'ETH-USD', label: 'Ethereum' },
  { ticker: 'SOL-USD', label: 'Solana' },
  { ticker: 'BNB-USD', label: 'BNB' },
  { ticker: 'XRP-USD', label: 'XRP' },
  { ticker: 'DOGE-USD', label: 'Dogecoin' }
]

export function CryptoTracker(): React.JSX.Element {
  const results = useQuotes(CRYPTO.map((c) => c.ticker))

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-4">
      <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
        <Bitcoin className="h-3 w-3" /> Crypto
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {CRYPTO.map((c, i) => {
          const q = results[i]?.data as Quote | undefined
          const loading = results[i]?.isLoading
          return (
            <div
              key={c.ticker}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-2.5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-mono text-[11px] font-semibold">{c.ticker}</div>
                  <div className="text-[9px] text-[var(--color-fg-muted)]">{c.label}</div>
                </div>
                {q && (
                  <div className="text-right">
                    <div className="font-mono text-[12px] font-semibold tabular">
                      ${fmtPrice(q.price)}
                    </div>
                    <div
                      className={cn(
                        'font-mono text-[10px] tabular',
                        q.changePercent > 0 ? 'text-[var(--color-pos)]' : 'text-[var(--color-neg)]'
                      )}
                    >
                      {fmtPct(q.changePercent)}
                    </div>
                  </div>
                )}
                {loading && !q && <div className="text-[9px] text-[var(--color-fg-muted)]">…</div>}
              </div>
              {q?.marketCap != null && (
                <div className="mt-1 text-[9px] text-[var(--color-fg-muted)]">
                  Cap ${fmtLargeNum(q.marketCap)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
