import { useMemo, useState } from 'react'
import { Plus, Trash2, LineChart } from 'lucide-react'
import { useQuote } from '../../../../hooks/useFinance'
import {
  breakEvens,
  maxLoss,
  maxProfit,
  payoffCurve,
  type OptionLeg
} from '../../../../lib/optionsPayoff'
import { MultiLineChart } from '../../../../components/charts/ChartPrimitives'
import { fmtPrice } from '../../../../lib/format'
import { cn } from '../../../../lib/cn'

const PRESETS: Record<string, (spot: number) => OptionLeg[]> = {
  'Long Call': (s) => [
    { type: 'call', side: 'long', strike: Math.round(s), premium: 3, quantity: 1 }
  ],
  'Long Put': (s) => [
    { type: 'put', side: 'long', strike: Math.round(s), premium: 3, quantity: 1 }
  ],
  'Covered Call': (s) => [
    { type: 'call', side: 'short', strike: Math.round(s * 1.05), premium: 2, quantity: 1 }
  ],
  Straddle: (s) => [
    { type: 'call', side: 'long', strike: Math.round(s), premium: 3, quantity: 1 },
    { type: 'put', side: 'long', strike: Math.round(s), premium: 3, quantity: 1 }
  ],
  'Bull Call Spread': (s) => [
    { type: 'call', side: 'long', strike: Math.round(s), premium: 3, quantity: 1 },
    { type: 'call', side: 'short', strike: Math.round(s * 1.05), premium: 1, quantity: 1 }
  ],
  'Iron Condor': (s) => [
    { type: 'put', side: 'long', strike: Math.round(s * 0.9), premium: 1, quantity: 1 },
    { type: 'put', side: 'short', strike: Math.round(s * 0.95), premium: 2, quantity: 1 },
    { type: 'call', side: 'short', strike: Math.round(s * 1.05), premium: 2, quantity: 1 },
    { type: 'call', side: 'long', strike: Math.round(s * 1.1), premium: 1, quantity: 1 }
  ]
}

export function OptionsPayoffPanel({ ticker }: { ticker: string }): React.JSX.Element {
  const { data: quote } = useQuote(ticker)
  const spot = quote?.price ?? 100
  const [legs, setLegs] = useState<OptionLeg[]>([
    { type: 'call', side: 'long', strike: Math.round(spot), premium: 3, quantity: 1 }
  ])

  const { curve, prices, be, mp, ml } = useMemo(() => {
    const minP = spot * 0.7
    const maxP = spot * 1.3
    const c = payoffCurve(legs, minP, maxP, 200)
    return {
      curve: c.map((p) => p.pnl as number | null),
      prices: c.map((p) => p.price),
      be: breakEvens(c),
      mp: maxProfit(c),
      ml: maxLoss(c)
    }
  }, [legs, spot])

  const updateLeg = (idx: number, patch: Partial<OptionLeg>): void => {
    setLegs((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)))
  }
  const removeLeg = (idx: number): void => {
    setLegs((prev) => prev.filter((_, i) => i !== idx))
  }
  const addLeg = (): void => {
    setLegs((prev) => [
      ...prev,
      { type: 'call', side: 'long', strike: Math.round(spot), premium: 2, quantity: 1 }
    ])
  }
  const loadPreset = (name: string): void => {
    const fn = PRESETS[name]
    if (fn) setLegs(fn(spot))
  }

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <LineChart className="h-3 w-3" /> Options payoff diagram
        </div>
        <div className="flex flex-wrap items-center gap-1 text-[10px]">
          {Object.keys(PRESETS).map((name) => (
            <button
              key={name}
              onClick={() => loadPreset(name)}
              className="rounded border border-[var(--color-border)] px-2 py-0.5 hover:bg-[var(--color-bg)]"
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      <MultiLineChart
        series={[{ values: curve, color: '#60a5fa', strokeWidth: 1.4 }]}
        height={180}
        horizontalLines={[{ y: 0, color: 'var(--color-fg-muted)', dashed: true }]}
        title={`Spot $${spot.toFixed(2)}  ·  Profit/Loss at expiration`}
      />

      <div className="mt-2 mb-3 grid grid-cols-2 gap-2 md:grid-cols-4 text-[10px]">
        <Stat
          label="Max profit"
          value={mp.pnl < 100_000_000 ? `$${mp.pnl.toFixed(0)}` : '∞'}
          tone="pos"
        />
        <Stat
          label="Max loss"
          value={ml.pnl > -100_000_000 ? `$${ml.pnl.toFixed(0)}` : '-∞'}
          tone="neg"
        />
        <Stat
          label="Break-even(s)"
          value={be.length ? be.map((p) => `$${fmtPrice(p)}`).join(', ') : '—'}
        />
        <Stat
          label="Range shown"
          value={`$${fmtPrice(prices[0] ?? 0)}–$${fmtPrice(prices[prices.length - 1] ?? 0)}`}
        />
      </div>

      <div className="space-y-1">
        {legs.map((leg, idx) => (
          <div
            key={idx}
            className="grid grid-cols-[auto_auto_auto_auto_auto_auto] items-center gap-1 text-[10px]"
          >
            <select
              value={leg.side}
              onChange={(e) => updateLeg(idx, { side: e.target.value as 'long' | 'short' })}
              className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-1 py-0.5"
            >
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>
            <select
              value={leg.type}
              onChange={(e) => updateLeg(idx, { type: e.target.value as 'call' | 'put' })}
              className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-1 py-0.5"
            >
              <option value="call">Call</option>
              <option value="put">Put</option>
            </select>
            <label className="flex items-center gap-1 text-[var(--color-fg-muted)]">
              K
              <input
                type="number"
                value={leg.strike}
                onChange={(e) => updateLeg(idx, { strike: Number(e.target.value) })}
                className="w-16 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-1 py-0.5 font-mono"
              />
            </label>
            <label className="flex items-center gap-1 text-[var(--color-fg-muted)]">
              $
              <input
                type="number"
                step="0.05"
                value={leg.premium}
                onChange={(e) => updateLeg(idx, { premium: Number(e.target.value) })}
                className="w-16 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-1 py-0.5 font-mono"
              />
            </label>
            <label className="flex items-center gap-1 text-[var(--color-fg-muted)]">
              Q
              <input
                type="number"
                value={leg.quantity}
                onChange={(e) => updateLeg(idx, { quantity: Number(e.target.value) })}
                className="w-10 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-1 py-0.5 font-mono"
              />
            </label>
            <button
              onClick={() => removeLeg(idx)}
              className="rounded border border-[var(--color-border)] px-1.5 py-0.5 text-[var(--color-neg)] hover:bg-[var(--color-bg)]"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        <button
          onClick={addLeg}
          className="flex items-center gap-1 rounded border border-[var(--color-border)] px-2 py-0.5 text-[10px] hover:bg-[var(--color-bg)]"
        >
          <Plus className="h-3 w-3" /> Add leg
        </button>
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
  value: string
  tone?: 'pos' | 'neg'
}): React.JSX.Element {
  return (
    <div className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] p-1.5">
      <div className="text-[9px] uppercase text-[var(--color-fg-muted)]">{label}</div>
      <div
        className={cn(
          'font-mono text-[11px] font-semibold tabular',
          tone === 'pos' && 'text-[var(--color-pos)]',
          tone === 'neg' && 'text-[var(--color-neg)]'
        )}
      >
        {value}
      </div>
    </div>
  )
}
