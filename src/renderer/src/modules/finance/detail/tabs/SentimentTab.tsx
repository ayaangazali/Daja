import { ExternalLink, MessageSquare, AtSign } from 'lucide-react'
import { useFundamentals } from '../../../../hooks/useFundamentals'
import { useReddit } from '../../../../hooks/useStatements'
import { useAI } from '../../../../hooks/useAI'
import { cn } from '../../../../lib/cn'

export function SentimentTab({ ticker }: { ticker: string }): React.JSX.Element {
  const { data: reddit = [], isLoading } = useReddit(ticker)
  const { data: fund } = useFundamentals(ticker)
  const { state, start, cancel } = useAI()

  const runXScan = (): void => {
    void start({
      module: 'finance',
      promptKey: 'finance',
      ticker,
      providerOverride: 'grok',
      messages: [
        {
          role: 'user',
          content: `Scan X/AtSign for recent chatter on $${ticker}. What's the sentiment (bull/bear/mixed)? Any notable posts, cashtag trends, insider/analyst activity mentioned? Cite example posts when possible. 6 bullets max.`
        }
      ]
    })
  }

  const totalScore = reddit.reduce((s, r) => s + r.score, 0)
  const totalComments = reddit.reduce((s, r) => s + r.numComments, 0)

  return (
    <div className="space-y-3 p-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Stat
          label="Reddit Posts (1w)"
          value={reddit.length.toString()}
          sub="past 7 days"
        />
        <Stat label="Total Upvotes" value={totalScore.toLocaleString()} />
        <Stat label="Total Comments" value={totalComments.toLocaleString()} />
      </div>

      {fund?.recommendations && (
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
          <div className="mb-2 text-[10px] font-semibold uppercase text-[var(--color-fg-muted)]">
            Analyst Consensus
          </div>
          <div className="grid grid-cols-5 gap-2 text-center text-[11px]">
            <Rec label="Strong Buy" n={fund.recommendations.strongBuy} tone="pos" />
            <Rec label="Buy" n={fund.recommendations.buy} tone="pos" />
            <Rec label="Hold" n={fund.recommendations.hold} tone="warn" />
            <Rec label="Sell" n={fund.recommendations.sell} tone="neg" />
            <Rec label="Strong Sell" n={fund.recommendations.strongSell} tone="neg" />
          </div>
        </div>
      )}

      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase text-[var(--color-fg-muted)]">
            <AtSign className="h-3 w-3" /> X/AtSign Scan (via Grok)
          </div>
          {state.streaming ? (
            <button
              onClick={cancel}
              className="rounded bg-[var(--color-neg)] px-2 py-1 text-[10px] text-white"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={runXScan}
              className="rounded bg-[var(--color-info)] px-2 py-1 text-[10px] font-medium text-white"
            >
              Run Scan
            </button>
          )}
        </div>
        {state.text ? (
          <div className="whitespace-pre-wrap text-[11px] leading-relaxed">{state.text}</div>
        ) : (
          <div className="text-[10px] text-[var(--color-fg-muted)]">
            Requires Grok API key. Grok has native X integration.
          </div>
        )}
        {state.error && (
          <div className="mt-2 text-[10px] text-[var(--color-neg)]">{state.error}</div>
        )}
      </div>

      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase text-[var(--color-fg-muted)]">
          <MessageSquare className="h-3 w-3" /> Reddit Mentions
        </div>
        {isLoading && <div className="text-[10px] text-[var(--color-fg-muted)]">Loading…</div>}
        {reddit.length === 0 && !isLoading && (
          <div className="text-[10px] text-[var(--color-fg-muted)]">
            No recent mentions for ${ticker}.
          </div>
        )}
        {reddit.map((r) => (
          <a
            key={r.id}
            href={r.permalink}
            target="_blank"
            rel="noreferrer"
            className="flex gap-2 border-b border-[var(--color-border)] py-2 text-[11px] last:border-0 hover:bg-[var(--color-bg)]"
          >
            <div className="flex w-12 shrink-0 flex-col items-center justify-center rounded bg-[var(--color-bg)] py-1 text-[10px]">
              <div className="font-mono font-semibold">{r.score}</div>
              <div className="text-[8px] text-[var(--color-fg-muted)]">up</div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium leading-snug">{r.title}</div>
              <div className="mt-0.5 text-[9px] text-[var(--color-fg-muted)]">
                r/{r.subreddit} · u/{r.author} · {r.numComments} comments ·{' '}
                {new Date(r.created * 1000).toLocaleDateString()}
              </div>
            </div>
            <ExternalLink className="h-3 w-3 shrink-0 text-[var(--color-fg-muted)]" />
          </a>
        ))}
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  sub
}: {
  label: string
  value: string
  sub?: string
}): React.JSX.Element {
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
      <div className="text-[10px] text-[var(--color-fg-muted)]">{label}</div>
      <div className="mt-1 font-mono text-lg font-semibold tabular">{value}</div>
      {sub && <div className="text-[9px] text-[var(--color-fg-muted)]">{sub}</div>}
    </div>
  )
}

function Rec({
  label,
  n,
  tone
}: {
  label: string
  n: number
  tone: 'pos' | 'neg' | 'warn'
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'rounded p-2',
        tone === 'pos' && 'bg-[var(--color-pos)]/10',
        tone === 'neg' && 'bg-[var(--color-neg)]/10',
        tone === 'warn' && 'bg-[var(--color-warn)]/10'
      )}
    >
      <div className="font-mono text-lg font-bold tabular">{n}</div>
      <div className="text-[9px] text-[var(--color-fg-muted)]">{label}</div>
    </div>
  )
}
