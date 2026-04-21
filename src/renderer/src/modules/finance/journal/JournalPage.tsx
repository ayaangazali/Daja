import { useState } from 'react'
import { Sparkles, Square, Trash2 } from 'lucide-react'
import { useAddJournal, useJournal, useRemoveJournal } from '../../../hooks/useJournal'
import { useAI } from '../../../hooks/useAI'
import { cn } from '../../../lib/cn'

export function JournalPage(): React.JSX.Element {
  const { data: entries = [] } = useJournal()
  const add = useAddJournal()
  const rem = useRemoveJournal()
  const { state, start, cancel } = useAI()

  const [form, setForm] = useState<{
    ticker: string
    entry_type: 'entry' | 'exit' | 'update' | 'note'
    thesis: string
    conviction: number
    target_price: string
    stop_loss: string
    tags: string
    emotions: string
  }>({
    ticker: '',
    entry_type: 'entry',
    thesis: '',
    conviction: 7,
    target_price: '',
    stop_loss: '',
    tags: '',
    emotions: ''
  })

  const submit = (): void => {
    if (!form.ticker.trim() || !form.thesis.trim()) return
    add.mutate(
      {
        trade_id: null,
        ticker: form.ticker,
        entry_type: form.entry_type,
        thesis: form.thesis || null,
        conviction: form.conviction,
        target_price: form.target_price ? Number(form.target_price) : null,
        stop_loss: form.stop_loss ? Number(form.stop_loss) : null,
        risk_reward_ratio: null,
        lessons: null,
        emotions: form.emotions || null,
        tags: form.tags ? JSON.stringify(form.tags.split(',').map((t) => t.trim())) : null,
        screenshots: null
      },
      {
        onSuccess: () => {
          setForm({
            ticker: '',
            entry_type: 'entry',
            thesis: '',
            conviction: 7,
            target_price: '',
            stop_loss: '',
            tags: '',
            emotions: ''
          })
        }
      }
    )
  }

  const analyze = (): void => {
    const summary = entries
      .slice(0, 30)
      .map((e) => {
        return `- ${e.created_at.slice(0, 10)} ${e.ticker} ${e.entry_type} conviction=${e.conviction ?? '?'} target=${e.target_price ?? '?'} stop=${e.stop_loss ?? '?'} thesis="${(e.thesis ?? '').slice(0, 120)}" tags=${e.tags ?? '[]'}`
      })
      .join('\n')
    void start({
      module: 'finance',
      promptKey: 'journal_analyzer',
      messages: [
        {
          role: 'user',
          content: `Analyze my trade journal. Find patterns (strategy/tag win rates, conviction vs outcome, common mistakes, emotional tells). Output: top 3 patterns w/ specific entry refs, then 1 actionable suggestion.\n\nENTRIES:\n${summary}`
        }
      ]
    })
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-3xl space-y-3">
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
                AI Journal Analyzer
              </div>
              {state.streaming ? (
                <button
                  onClick={cancel}
                  className="flex items-center gap-1 rounded bg-[var(--color-neg)] px-2 py-1 text-[10px] text-white"
                >
                  <Square className="h-2.5 w-2.5" /> Stop
                </button>
              ) : (
                <button
                  onClick={analyze}
                  disabled={entries.length === 0}
                  className="flex items-center gap-1 rounded bg-[var(--color-info)] px-2 py-1 text-[10px] font-medium text-white disabled:opacity-40"
                >
                  <Sparkles className="h-2.5 w-2.5" /> Analyze {entries.length} entries
                </button>
              )}
            </div>
            {state.text && (
              <div className="whitespace-pre-wrap text-[11px] leading-relaxed">{state.text}</div>
            )}
            {!state.text && (
              <div className="text-[11px] text-[var(--color-fg-muted)]">
                Find patterns in your thesis, conviction, and outcomes.
              </div>
            )}
          </div>

          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
              New Entry
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <input
                value={form.ticker}
                onChange={(e) => setForm({ ...form, ticker: e.target.value.toUpperCase() })}
                placeholder="Ticker"
                className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 font-mono text-[11px]"
              />
              <select
                value={form.entry_type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    entry_type: e.target.value as 'entry' | 'exit' | 'update' | 'note'
                  })
                }
                className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-[11px]"
              >
                <option value="entry">Entry</option>
                <option value="exit">Exit</option>
                <option value="update">Update</option>
                <option value="note">Note</option>
              </select>
              <input
                type="number"
                step="0.01"
                value={form.target_price}
                onChange={(e) => setForm({ ...form, target_price: e.target.value })}
                placeholder="Target $"
                className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 font-mono text-[11px]"
              />
              <input
                type="number"
                step="0.01"
                value={form.stop_loss}
                onChange={(e) => setForm({ ...form, stop_loss: e.target.value })}
                placeholder="Stop $"
                className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 font-mono text-[11px]"
              />
            </div>
            <textarea
              value={form.thesis}
              onChange={(e) => setForm({ ...form, thesis: e.target.value })}
              placeholder="Thesis — why you're taking this position"
              rows={2}
              className="mt-2 w-full resize-none rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-[11px]"
            />
            <div className="mt-2 flex items-center gap-2">
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-[var(--color-fg-muted)]">Conviction</span>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={form.conviction}
                  onChange={(e) => setForm({ ...form, conviction: Number(e.target.value) })}
                />
                <span className="w-4 font-mono tabular">{form.conviction}</span>
              </div>
              <input
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="Tags (comma-sep): momentum, earnings_play"
                className="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-[11px]"
              />
              <button
                onClick={submit}
                disabled={!form.ticker || !form.thesis}
                className="rounded bg-[var(--color-info)] px-3 py-1 text-[11px] font-medium text-white disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </div>

          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)]">
            <div className="border-b border-[var(--color-border)] px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
              Entries ({entries.length})
            </div>
            {entries.length === 0 && (
              <div className="p-4 text-center text-[11px] text-[var(--color-fg-muted)]">
                No entries yet.
              </div>
            )}
            {entries.map((e) => (
              <div
                key={e.id}
                className={cn(
                  'group border-b border-[var(--color-border)] px-3 py-2 text-[11px] last:border-0'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold">{e.ticker}</span>
                      <span
                        className={cn(
                          'rounded px-1.5 py-0.5 text-[9px] uppercase',
                          e.entry_type === 'entry' &&
                            'bg-[var(--color-pos)]/15 text-[var(--color-pos)]',
                          e.entry_type === 'exit' &&
                            'bg-[var(--color-neg)]/15 text-[var(--color-neg)]',
                          e.entry_type === 'update' &&
                            'bg-[var(--color-warn)]/15 text-[var(--color-warn)]',
                          e.entry_type === 'note' &&
                            'bg-[var(--color-fg-muted)]/10 text-[var(--color-fg-muted)]'
                        )}
                      >
                        {e.entry_type}
                      </span>
                      {e.conviction != null && (
                        <span className="text-[9px] text-[var(--color-fg-muted)]">
                          conviction {e.conviction}/10
                        </span>
                      )}
                      <span className="text-[9px] text-[var(--color-fg-muted)]">
                        {e.created_at.slice(0, 10)}
                      </span>
                    </div>
                    {e.thesis && <div className="mt-0.5">{e.thesis}</div>}
                    {(e.target_price || e.stop_loss) && (
                      <div className="mt-0.5 text-[9px] text-[var(--color-fg-muted)]">
                        {e.target_price && `target $${e.target_price}`}
                        {e.target_price && e.stop_loss && ' · '}
                        {e.stop_loss && `stop $${e.stop_loss}`}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => rem.mutate(e.id)}
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
