import { useMemo, useState } from 'react'
import { AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react'
import { useQuote } from '../../../hooks/useFinance'
import { positionSize, rMultiple } from '../../../lib/indicators'
import { fmtLargeNum, fmtPrice } from '../../../lib/format'
import { PageHeader } from '../../../shared/PageHeader'
import { cn } from '../../../lib/cn'

export function PositionSizeCalculator(): React.JSX.Element {
  const [account, setAccount] = useState('100000')
  const [riskPct, setRiskPct] = useState('1')
  const [ticker, setTicker] = useState('')
  const [entry, setEntry] = useState('')
  const [stop, setStop] = useState('')
  const [target, setTarget] = useState('')
  const [side, setSide] = useState<'long' | 'short'>('long')

  const { data: quote } = useQuote(ticker.toUpperCase() || undefined)

  const useLivePrice = (): void => {
    if (quote?.price) setEntry(quote.price.toFixed(2))
  }

  const accN = Number(account) || 0
  const riskN = Number(riskPct) || 0
  const entryN = Number(entry) || 0
  const stopN = Number(stop) || 0
  const targetN = Number(target) || 0

  const result = useMemo(
    () => positionSize({ accountSize: accN, riskPct: riskN, entry: entryN, stop: stopN }),
    [accN, riskN, entryN, stopN]
  )

  const reward = targetN > 0 ? Math.abs(targetN - entryN) * result.shares : 0
  const rr =
    result.riskPerShare > 0 && targetN > 0 ? Math.abs(targetN - entryN) / result.riskPerShare : 0
  const rMult = targetN > 0 && entryN > 0 && stopN > 0 ? rMultiple(entryN, targetN, stopN, side) : 0

  // Validation warnings
  const warnings: string[] = []
  if (side === 'long' && stopN >= entryN && stopN > 0 && entryN > 0)
    warnings.push('Long stop should be below entry')
  if (side === 'short' && stopN <= entryN && stopN > 0 && entryN > 0)
    warnings.push('Short stop should be above entry')
  if (side === 'long' && targetN > 0 && targetN <= entryN)
    warnings.push('Long target should be above entry')
  if (side === 'short' && targetN > 0 && targetN >= entryN)
    warnings.push('Short target should be below entry')
  if (riskN > 2) warnings.push(`Risk ${riskN}% is aggressive — pros use 0.5-1%`)
  if (result.portfolioPct > 50) warnings.push('Position > 50% of account — concentration risk')

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Position size calculator"
        subtitle="Fixed-fractional risk model: size shares so a stop-loss hit equals your target dollar risk."
      />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-3xl space-y-3">
          <div
            className={cn(
              'grid grid-cols-1 gap-3 rounded-md border p-3 md:grid-cols-2',
              'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
            )}
          >
            <Field label="Account size ($)">
              <input
                type="number"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 font-mono text-[12px]"
              />
            </Field>
            <Field label="Risk per trade (%)">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={riskPct}
                  onChange={(e) => setRiskPct(e.target.value)}
                  className="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 font-mono text-[12px]"
                />
                <div className="flex gap-0.5">
                  {['0.5', '1', '2'].map((v) => (
                    <button
                      key={v}
                      onClick={() => setRiskPct(v)}
                      className="rounded border border-[var(--color-border)] px-1.5 py-0.5 text-[9px] hover:bg-[var(--color-bg)]"
                    >
                      {v}%
                    </button>
                  ))}
                </div>
              </div>
            </Field>
            <Field label="Ticker (optional, pulls live price)">
              <div className="flex items-center gap-2">
                <input
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase())}
                  placeholder="AAPL"
                  className="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 font-mono text-[12px]"
                />
                {quote?.price != null && (
                  <button
                    onClick={useLivePrice}
                    className="rounded bg-[var(--color-info)] px-2 py-1.5 text-[10px] font-medium text-white"
                  >
                    Use ${fmtPrice(quote.price)}
                  </button>
                )}
              </div>
            </Field>
            <Field label="Side">
              <div className="flex gap-1">
                <button
                  onClick={() => setSide('long')}
                  className={cn(
                    'flex-1 rounded py-1.5 text-[11px] font-medium',
                    side === 'long'
                      ? 'bg-[var(--color-pos)] text-white'
                      : 'border border-[var(--color-border)] text-[var(--color-fg-muted)]'
                  )}
                >
                  <TrendingUp className="inline h-3 w-3" /> Long
                </button>
                <button
                  onClick={() => setSide('short')}
                  className={cn(
                    'flex-1 rounded py-1.5 text-[11px] font-medium',
                    side === 'short'
                      ? 'bg-[var(--color-neg)] text-white'
                      : 'border border-[var(--color-border)] text-[var(--color-fg-muted)]'
                  )}
                >
                  <TrendingDown className="inline h-3 w-3" /> Short
                </button>
              </div>
            </Field>
            <Field label="Entry price ($)">
              <input
                type="number"
                step="0.01"
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 font-mono text-[12px]"
              />
            </Field>
            <Field label="Stop loss ($)">
              <input
                type="number"
                step="0.01"
                value={stop}
                onChange={(e) => setStop(e.target.value)}
                className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 font-mono text-[12px]"
              />
            </Field>
            <Field label="Price target ($, optional)">
              <input
                type="number"
                step="0.01"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="Optional — computes reward + R:R"
                className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 font-mono text-[12px]"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Shares" value={result.shares.toLocaleString()} emphasize />
            <Stat label="Risk per share" value={`$${fmtPrice(result.riskPerShare)}`} />
            <Stat label="Dollar risk" value={`$${fmtLargeNum(result.dollarRisk)}`} tone="neg" />
            <Stat label="Position value" value={`$${fmtLargeNum(result.positionValue)}`} />
            <Stat
              label="% of account"
              value={`${result.portfolioPct.toFixed(1)}%`}
              tone={result.portfolioPct > 50 ? 'neg' : result.portfolioPct > 25 ? 'warn' : null}
            />
            {targetN > 0 && (
              <>
                <Stat label="Reward" value={`$${fmtLargeNum(reward)}`} tone="pos" />
                <Stat
                  label="Risk : Reward"
                  value={rr > 0 ? `1 : ${rr.toFixed(2)}` : '—'}
                  tone={rr >= 2 ? 'pos' : rr >= 1 ? 'warn' : rr > 0 ? 'neg' : null}
                />
                <Stat
                  label="R multiple"
                  value={
                    rMult > 0 ? `+${rMult.toFixed(2)}R` : rMult < 0 ? `${rMult.toFixed(2)}R` : '—'
                  }
                  tone={
                    rMult >= 2
                      ? 'pos'
                      : rMult >= 1
                        ? 'warn'
                        : rMult > 0
                          ? 'warn'
                          : rMult < 0
                            ? 'neg'
                            : null
                  }
                />
              </>
            )}
          </div>

          {warnings.length > 0 && (
            <div
              className={cn(
                'rounded-md border p-3',
                'border-[var(--color-warn)]/50 bg-[var(--color-warn)]/10'
              )}
            >
              <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-[var(--color-warn)]">
                <AlertTriangle className="h-3.5 w-3.5" /> Warnings
              </div>
              <ul className="space-y-0.5 text-[11px] text-[var(--color-warn)]">
                {warnings.map((w) => (
                  <li key={w}>• {w}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-md border border-dashed border-[var(--color-border)] p-3 text-[10px] leading-relaxed text-[var(--color-fg-muted)]">
            <div className="font-semibold text-[var(--color-fg)]">How this works</div>
            <div className="mt-1">
              Shares = floor(Account × Risk% / |Entry − Stop|). Pros typically risk 0.5–1% per
              trade. A 20% max drawdown at 1% risk per trade survives 20 consecutive losses — the
              math that keeps accounts alive.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  children
}: {
  label: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <label className="block">
      <div className="mb-1 text-[10px] uppercase text-[var(--color-fg-muted)]">{label}</div>
      {children}
    </label>
  )
}

function Stat({
  label,
  value,
  tone,
  emphasize
}: {
  label: string
  value: string
  tone?: 'pos' | 'neg' | 'warn' | null
  emphasize?: boolean
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'rounded-md border p-3',
        'border-[var(--color-border)] bg-[var(--color-bg-elev)]',
        emphasize && 'border-[var(--color-info)]/40 bg-[var(--color-info)]/5'
      )}
    >
      <div className="text-[10px] text-[var(--color-fg-muted)]">{label}</div>
      <div
        className={cn(
          'mt-1 font-mono font-semibold tabular',
          emphasize ? 'text-xl' : 'text-lg',
          tone === 'pos' && 'text-[var(--color-pos)]',
          tone === 'neg' && 'text-[var(--color-neg)]',
          tone === 'warn' && 'text-[var(--color-warn)]'
        )}
      >
        {value}
      </div>
    </div>
  )
}
