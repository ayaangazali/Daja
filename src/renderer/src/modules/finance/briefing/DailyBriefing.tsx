import { Copy, Sparkles, Square, Volume2 } from 'lucide-react'
import { useState } from 'react'
import { useAI } from '../../../hooks/useAI'
import { useWatchlist } from '../../../hooks/useWatchlist'
import { useQuotes } from '../../../hooks/useFinance'
import { cn } from '../../../lib/cn'

export function DailyBriefing(): React.JSX.Element {
  const { data: items = [] } = useWatchlist()
  const quotes = useQuotes(items.map((i) => i.ticker))
  const { state, start, cancel } = useAI()
  const [copied, setCopied] = useState(false)

  const generate = (): void => {
    const rows = items.map((item, i) => {
      const q = quotes[i]?.data
      return `${item.ticker}: $${q?.price?.toFixed(2) ?? '—'} (${q?.changePercent != null ? (q.changePercent > 0 ? '+' : '') + q.changePercent.toFixed(2) + '%' : '—'})`
    })
    void start({
      module: 'finance',
      promptKey: 'finance_summary',
      messages: [
        {
          role: 'user',
          content: `Give me a one-minute audio-ready daily briefing for my watchlist. No greetings — start directly with substance. Use natural spoken language (no bullet points, no markdown). 3-4 short paragraphs covering what moved most, what drove it, and what to watch into next session.

Watchlist snapshot:
${rows.join('\n')}`
        }
      ]
    })
  }

  const copy = async (): Promise<void> => {
    await navigator.clipboard.writeText(state.text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const speak = (): void => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(state.text)
    utter.rate = 1.05
    utter.pitch = 1
    window.speechSynthesis.speak(utter)
  }

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Daily briefing</h1>
          {state.streaming ? (
            <button
              onClick={cancel}
              className="flex items-center gap-1 rounded bg-[var(--color-neg)] px-3 py-1.5 text-[11px] font-medium text-white"
            >
              <Square className="h-3 w-3" /> Stop
            </button>
          ) : (
            <button
              onClick={generate}
              disabled={items.length === 0}
              className="flex items-center gap-1 rounded bg-[var(--color-info)] px-3 py-1.5 text-[11px] font-medium text-white disabled:opacity-40"
            >
              <Sparkles className="h-3 w-3" /> Generate
            </button>
          )}
        </div>
        <div
          className={cn(
            'flex-1 rounded-md border p-4 text-[12px] leading-relaxed',
            'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
          )}
        >
          {state.text || (
            <span className="text-[var(--color-fg-muted)]">
              Click Generate to produce a one-minute briefing across your {items.length}-ticker
              watchlist. Use the speaker icon to listen.
            </span>
          )}
        </div>
        {state.provider && (
          <div className="text-[9px] text-[var(--color-fg-muted)]">
            {state.provider} · {state.model}
          </div>
        )}
        {state.text && !state.streaming && (
          <div className="flex gap-2">
            <button
              onClick={speak}
              className="flex items-center gap-1 rounded border border-[var(--color-border)] px-3 py-1.5 text-[11px] hover:bg-[var(--color-bg-elev)]"
            >
              <Volume2 className="h-3 w-3" /> Speak
            </button>
            <button
              onClick={copy}
              className="flex items-center gap-1 rounded border border-[var(--color-border)] px-3 py-1.5 text-[11px] hover:bg-[var(--color-bg-elev)]"
            >
              <Copy className="h-3 w-3" /> {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              onClick={() => window.speechSynthesis.cancel()}
              className="flex items-center gap-1 rounded border border-[var(--color-border)] px-3 py-1.5 text-[11px] hover:bg-[var(--color-bg-elev)]"
            >
              <Square className="h-3 w-3" /> Stop speaking
            </button>
          </div>
        )}
        {state.error && (
          <div className="rounded bg-[var(--color-neg)]/10 p-2 text-[11px] text-[var(--color-neg)]">
            {state.error}
          </div>
        )}
      </div>
    </div>
  )
}
