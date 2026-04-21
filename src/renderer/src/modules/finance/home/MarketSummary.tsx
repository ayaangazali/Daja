import { Sparkles, Square } from 'lucide-react'
import { useState } from 'react'
import { useAI } from '../../../hooks/useAI'
import { cn } from '../../../lib/cn'

export function MarketSummary(): React.JSX.Element {
  const { state, start, cancel, reset } = useAI()
  const [region] = useState('US')

  const run = (): void => {
    void start({
      module: 'finance',
      promptKey: 'finance_summary',
      messages: [
        {
          role: 'user',
          content: `Give me a tight ${region} market summary for today. Focus on what moved most, what drove it, and what it implies for the coming session. Reference tickers from my watchlist if they're relevant. 6 bullets max.`
        }
      ]
    })
  }

  return (
    <section
      className={cn(
        'rounded-md border p-4',
        'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold">{region} market summary</h3>
        {state.streaming ? (
          <button
            onClick={cancel}
            className="flex items-center gap-1 rounded border border-[var(--color-border)] px-2 py-1 text-[10px]"
          >
            <Square className="h-2.5 w-2.5" /> Stop
          </button>
        ) : (
          <button
            onClick={state.text ? reset : run}
            className="flex items-center gap-1 rounded bg-[var(--color-info)] px-2 py-1 text-[10px] font-medium text-white"
          >
            <Sparkles className="h-2.5 w-2.5" />
            {state.text ? 'Reset' : 'Generate w/ AI'}
          </button>
        )}
      </div>
      {state.provider && (
        <div className="mt-1 font-mono text-[9px] text-[var(--color-fg-muted)]">
          {state.provider} / {state.model}
        </div>
      )}
      {state.text && (
        <div className="mt-3 whitespace-pre-wrap text-xs leading-relaxed">{state.text}</div>
      )}
      {state.error && (
        <div className="mt-3 rounded bg-[var(--color-neg)]/10 p-2 text-[11px] text-[var(--color-neg)]">
          {state.error}
        </div>
      )}
      {!state.text && !state.streaming && !state.error && (
        <div className="mt-3 text-[11px] text-[var(--color-fg-muted)]">
          AI-generated summary grounded in your watchlist + strategies. Requires configured AI key.
        </div>
      )}
    </section>
  )
}
