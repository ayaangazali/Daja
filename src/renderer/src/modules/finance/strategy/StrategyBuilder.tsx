import { useState } from 'react'
import { Plus, Sparkles, Square, Trash2 } from 'lucide-react'
import {
  useAddStrategy,
  useRemoveStrategy,
  useStrategies,
  type StrategyRule
} from '../../../hooks/useStrategies'
import { useAI } from '../../../hooks/useAI'
import { PageHeader } from '../../../shared/PageHeader'
import { cn } from '../../../lib/cn'

const OPERATORS: StrategyRule['operator'][] = ['>', '>=', '<', '<=', '==', '!=', 'between']

const METRICS = [
  { key: 'rev_growth_yoy', label: 'Revenue Growth YoY %' },
  { key: 'eps_growth_yoy', label: 'EPS Growth YoY %' },
  { key: 'pe', label: 'P/E' },
  { key: 'fwd_pe', label: 'Forward P/E' },
  { key: 'peg', label: 'PEG' },
  { key: 'p_s', label: 'P/S' },
  { key: 'p_b', label: 'P/B' },
  { key: 'p_fcf', label: 'P/FCF' },
  { key: 'd_e', label: 'Debt/Equity' },
  { key: 'current_ratio', label: 'Current Ratio' },
  { key: 'gross_margin', label: 'Gross Margin %' },
  { key: 'op_margin', label: 'Op Margin %' },
  { key: 'net_margin', label: 'Net Margin %' },
  { key: 'roe', label: 'ROE %' },
  { key: 'roa', label: 'ROA %' },
  { key: 'div_yield', label: 'Div Yield %' },
  { key: 'insider_pct', label: 'Insider %' },
  { key: 'inst_pct', label: 'Inst %' },
  { key: 'short_pct', label: 'Short %' },
  { key: 'market_cap', label: 'Market Cap' }
]

export function StrategyBuilder(): React.JSX.Element {
  const { data: strategies = [] } = useStrategies()
  const add = useAddStrategy()
  const rem = useRemoveStrategy()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [naturalLang, setNaturalLang] = useState('')
  const [rules, setRules] = useState<StrategyRule[]>([
    { metric: 'rev_growth_yoy', operator: '>', value: 15 }
  ])
  const [message, setMessage] = useState<string | null>(null)
  const { state, start, cancel } = useAI()

  const addRule = (): void => setRules((r) => [...r, { metric: 'pe', operator: '<', value: 25 }])
  const updateRule = (i: number, patch: Partial<StrategyRule>): void =>
    setRules((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const removeRule = (i: number): void => setRules((rs) => rs.filter((_, idx) => idx !== i))

  const save = (): void => {
    if (!name.trim()) return
    add.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        rules,
        natural_language: naturalLang.trim() || undefined,
        asset_classes: ['stock']
      },
      {
        onSuccess: () => {
          setName('')
          setDescription('')
          setNaturalLang('')
          setRules([{ metric: 'rev_growth_yoy', operator: '>', value: 15 }])
          setMessage('Strategy saved')
          setTimeout(() => setMessage(null), 2000)
        }
      }
    )
  }

  const extractWithAI = async (): Promise<void> => {
    if (!naturalLang.trim()) return
    const valid = METRICS.map((m) => m.key).join(', ')
    await start({
      module: 'finance',
      promptKey: 'assistant_default',
      messages: [
        {
          role: 'user',
          content: `Convert the following natural-language strategy description into a JSON array of strict rules. Valid metrics: ${valid}. Valid operators: >, >=, <, <=, ==, !=, between (value must be [lo, hi]). Values are numbers only (for percentages use the percent number, e.g. 20 not 0.2). Output ONLY a JSON array, no prose.

Description:
${naturalLang}`
        }
      ]
    })
  }

  // Parse AI response when streaming stops
  const parseAiRules = (): void => {
    try {
      const match = state.text.match(/\[[\s\S]*\]/)
      if (!match) return
      const parsed = JSON.parse(match[0]) as StrategyRule[]
      if (Array.isArray(parsed) && parsed.every((r) => r.metric && r.operator)) {
        setRules(parsed)
        setMessage(`Applied ${parsed.length} rules from AI`)
        setTimeout(() => setMessage(null), 3000)
      }
    } catch {
      setMessage('Could not parse AI output — check JSON')
      setTimeout(() => setMessage(null), 3000)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader title="Strategies" subtitle="Build, tag, and backtest trading rules." />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-3xl space-y-3">
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
              New Strategy
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Strategy name (e.g. Mid-cap growth)"
                className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-[11px]"
              />
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description"
                className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-[11px]"
              />
            </div>
            <div className="mt-2">
              <div className="mb-1 flex items-center justify-between">
                <div className="text-[10px] text-[var(--color-fg-muted)]">Natural language</div>
                {state.streaming ? (
                  <button
                    onClick={cancel}
                    className="flex items-center gap-1 rounded bg-[var(--color-neg)] px-2 py-0.5 text-[10px] text-white"
                  >
                    <Square className="h-2.5 w-2.5" /> Stop
                  </button>
                ) : (
                  <button
                    onClick={extractWithAI}
                    disabled={!naturalLang.trim()}
                    className="flex items-center gap-1 rounded bg-[var(--color-info)] px-2 py-0.5 text-[10px] text-white disabled:opacity-40"
                  >
                    <Sparkles className="h-2.5 w-2.5" /> Parse with AI
                  </button>
                )}
              </div>
              <textarea
                value={naturalLang}
                onChange={(e) => setNaturalLang(e.target.value)}
                placeholder="I look for mid-cap growth stocks with revenue growth above 20%, P/E under 30, and ROE above 15%…"
                rows={3}
                className="w-full resize-none rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-[11px]"
              />
              {state.text && !state.streaming && (
                <div className="mt-2 space-y-1">
                  <pre className="max-h-36 overflow-auto rounded bg-[var(--color-bg)] p-2 font-mono text-[10px]">
                    {state.text}
                  </pre>
                  <button
                    onClick={parseAiRules}
                    className="rounded bg-[var(--color-pos)] px-2 py-1 text-[10px] font-medium text-white"
                  >
                    Apply parsed rules
                  </button>
                </div>
              )}
            </div>

            <div className="mt-3 border-t border-[var(--color-border)] pt-2">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[10px] text-[var(--color-fg-muted)]">Rules</div>
                <button
                  onClick={addRule}
                  className="flex items-center gap-1 text-[10px] text-[var(--color-info)] hover:underline"
                >
                  <Plus className="h-2.5 w-2.5" /> Add rule
                </button>
              </div>
              <div className="space-y-1">
                {rules.map((r, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <select
                      value={r.metric}
                      onChange={(e) => updateRule(i, { metric: e.target.value })}
                      className="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-[10px]"
                    >
                      {METRICS.map((m) => (
                        <option key={m.key} value={m.key}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={r.operator}
                      onChange={(e) =>
                        updateRule(i, { operator: e.target.value as StrategyRule['operator'] })
                      }
                      className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 font-mono text-[10px]"
                    >
                      {OPERATORS.map((op) => (
                        <option key={op} value={op}>
                          {op}
                        </option>
                      ))}
                    </select>
                    <input
                      value={Array.isArray(r.value) ? r.value.join(',') : r.value}
                      onChange={(e) => {
                        const v = e.target.value
                        if (r.operator === 'between') {
                          const parts = v.split(',').map((x) => Number(x.trim()))
                          if (parts.length === 2 && parts.every(Number.isFinite)) {
                            updateRule(i, { value: parts as [number, number] })
                          }
                        } else {
                          const n = Number(v)
                          if (Number.isFinite(n)) updateRule(i, { value: n })
                        }
                      }}
                      className="w-24 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 font-mono text-[10px]"
                    />
                    <button
                      onClick={() => removeRule(i)}
                      className="text-[var(--color-fg-muted)] hover:text-[var(--color-neg)]"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={save}
                disabled={!name.trim() || rules.length === 0 || add.isPending}
                className="rounded bg-[var(--color-info)] px-3 py-1.5 text-[11px] font-medium text-white disabled:opacity-40"
              >
                Save strategy
              </button>
              {message && <span className="text-[10px] text-[var(--color-pos)]">{message}</span>}
            </div>
          </div>

          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)]">
            <div className="border-b border-[var(--color-border)] px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
              Active strategies ({strategies.length})
            </div>
            {strategies.length === 0 && (
              <div className="p-4 text-center text-[11px] text-[var(--color-fg-muted)]">
                No strategies yet. Your AI analyst will use these to score every stock.
              </div>
            )}
            {strategies.map((s) => (
              <div
                key={s.id}
                className={cn(
                  'group border-b border-[var(--color-border)] px-3 py-2 text-[11px] last:border-0'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{s.name}</div>
                    {s.description && (
                      <div className="text-[10px] text-[var(--color-fg-muted)]">
                        {s.description}
                      </div>
                    )}
                    <div className="mt-1 flex flex-wrap gap-1">
                      {s.rules.map((r, i) => (
                        <span
                          key={i}
                          className="rounded bg-[var(--color-bg)] px-1.5 py-0.5 font-mono text-[9px]"
                        >
                          {r.metric} {r.operator}{' '}
                          {Array.isArray(r.value) ? r.value.join('–') : r.value}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => rem.mutate(s.id)}
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Trash2 className="h-3 w-3 text-[var(--color-fg-muted)] hover:text-[var(--color-neg)]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
