import { Send, Square } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAI, type AIMessage } from '../../../hooks/useAI'
import { ProviderSelector } from './ProviderSelector'
import { cn } from '../../../lib/cn'

export function ResearchPanel(): React.JSX.Element {
  const { ticker } = useParams<{ ticker?: string }>()
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [input, setInput] = useState('')
  const { state, start, cancel } = useAI()

  const submit = (): void => {
    const text = input.trim()
    if (!text) return
    const next = [...messages, { role: 'user' as const, content: text }]
    setMessages(next)
    setInput('')
    void start({
      module: 'finance',
      promptKey: 'finance',
      ticker,
      messages: next
    })
  }

  const commitAssistant = (): void => {
    if (state.text) {
      setMessages((m) => [...m, { role: 'assistant' as const, content: state.text }])
    }
  }

  return (
    <aside
      className={cn(
        'flex w-80 shrink-0 flex-col border-l',
        'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
      )}
    >
      <div className="flex items-center justify-between border-b border-[var(--color-border)] p-2">
        <div className="flex items-center gap-2">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
            Research
          </div>
          {ticker && (
            <div className="rounded bg-[var(--color-info)]/20 px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-info)]">
              {ticker}
            </div>
          )}
        </div>
        <ProviderSelector />
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {messages.length === 0 && !state.text && !state.streaming && (
          <div className="space-y-2 text-[11px] text-[var(--color-fg-muted)]">
            <div>AI research grounded in your strategies + portfolio.</div>
            <div>Try:</div>
            <ul className="list-disc pl-4">
              <li>Does {ticker ?? 'NVDA'} match my strategies?</li>
              <li>Summarize today's earnings beats in my watchlist.</li>
              <li>Compare {ticker ?? 'AAPL'} to sector peers on P/FCF.</li>
            </ul>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className="mb-3">
            <div className="mb-0.5 text-[9px] font-semibold uppercase text-[var(--color-fg-muted)]">
              {m.role}
            </div>
            <div className="whitespace-pre-wrap text-[11px] leading-relaxed">{m.content}</div>
          </div>
        ))}
        {state.streaming && (
          <div className="mb-3">
            <div className="mb-0.5 text-[9px] font-semibold uppercase text-[var(--color-fg-muted)]">
              assistant {state.provider && `· ${state.provider}`}
            </div>
            <div className="whitespace-pre-wrap text-[11px] leading-relaxed">{state.text}</div>
          </div>
        )}
        {!state.streaming && state.text && (
          <div className="mb-3">
            <div className="mb-0.5 flex items-center justify-between">
              <span className="text-[9px] font-semibold uppercase text-[var(--color-fg-muted)]">
                assistant {state.provider && `· ${state.provider}`}
              </span>
              <button
                onClick={commitAssistant}
                className="text-[9px] text-[var(--color-info)] hover:underline"
              >
                Keep
              </button>
            </div>
            <div className="whitespace-pre-wrap text-[11px] leading-relaxed">{state.text}</div>
          </div>
        )}
        {state.error && (
          <div className="mt-2 rounded bg-[var(--color-neg)]/10 p-2 text-[10px] text-[var(--color-neg)]">
            {state.error}
          </div>
        )}
      </div>
      <div className="border-t border-[var(--color-border)] p-2">
        <div className="flex items-end gap-1">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            }}
            placeholder={`Ask about ${ticker ?? 'the market'}…`}
            rows={2}
            className={cn(
              'flex-1 resize-none rounded border bg-[var(--color-bg)] px-2 py-1 text-[11px] outline-none',
              'border-[var(--color-border)] placeholder:text-[var(--color-fg-muted)]',
              'focus:border-[var(--color-info)]'
            )}
          />
          {state.streaming ? (
            <button
              onClick={cancel}
              className="rounded bg-[var(--color-neg)] p-2 text-white"
              title="Stop"
            >
              <Square className="h-3 w-3" />
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={!input.trim()}
              className="rounded bg-[var(--color-info)] p-2 text-white disabled:opacity-40"
              title="Send"
            >
              <Send className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
