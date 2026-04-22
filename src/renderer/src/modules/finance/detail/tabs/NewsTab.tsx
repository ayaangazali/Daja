import { useMemo } from 'react'
import { ExternalLink, FileText, Newspaper } from 'lucide-react'
import { useFilings, useNews } from '../../../../hooks/useStatements'
import { useAI } from '../../../../hooks/useAI'
import { aggregateSentiment, scoreHeadline } from '../../../../lib/sentiment'
import { cn } from '../../../../lib/cn'

export function NewsTab({ ticker }: { ticker: string }): React.JSX.Element {
  const { data: news = [], isLoading: newsLoading } = useNews(ticker)
  const { data: filings = [], isLoading: filLoading } = useFilings(ticker)
  const { state, start, cancel } = useAI()

  const sentiment = useMemo(() => {
    const scored = news.map((n) => ({ ...n, score: scoreHeadline(n.title) }))
    return { scored, summary: aggregateSentiment(scored.map((s) => s.score)) }
  }, [news])

  const digest = (): void => {
    const headlines = news
      .slice(0, 10)
      .map((n) => `- ${n.title} (${n.publisher})`)
      .join('\n')
    const filingList = filings
      .slice(0, 10)
      .map((f) => `- ${f.form} filed ${f.filingDate}`)
      .join('\n')
    void start({
      module: 'finance',
      promptKey: 'finance',
      ticker,
      messages: [
        {
          role: 'user',
          content: `Here are the latest news headlines + SEC filings for ${ticker}.\n\nNEWS:\n${headlines}\n\nFILINGS:\n${filingList}\n\nGive me a tight digest: what matters, what's noise. 5 bullets max, reference specific items.`
        }
      ]
    })
  }

  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase text-[var(--color-fg-muted)]">AI Digest</div>
        {state.streaming ? (
          <button
            onClick={cancel}
            className="rounded bg-[var(--color-neg)] px-2 py-1 text-[10px] text-white"
          >
            Stop
          </button>
        ) : (
          <button
            onClick={digest}
            disabled={news.length === 0 && filings.length === 0}
            className="rounded bg-[var(--color-info)] px-2 py-1 text-[10px] font-medium text-white disabled:opacity-40"
          >
            Generate AI Digest
          </button>
        )}
      </div>
      {state.text && (
        <div className="rounded-md border border-[var(--color-info)]/30 bg-[var(--color-info)]/5 p-3 text-[11px] whitespace-pre-wrap leading-relaxed">
          {state.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Panel icon={<Newspaper className="h-3 w-3" />} title="News">
          {newsLoading && <Loading />}
          {news.length === 0 && !newsLoading && <Empty />}
          {news.length > 0 && (
            <div className="mb-2 flex items-center justify-between rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-[10px]">
              <span className="text-[var(--color-fg-muted)]">
                Headline sentiment ({news.length}):
              </span>
              <span className="flex items-center gap-2 font-mono tabular">
                <span
                  className={cn(
                    'font-semibold uppercase',
                    sentiment.summary.label === 'bullish' && 'text-[var(--color-pos)]',
                    sentiment.summary.label === 'bearish' && 'text-[var(--color-neg)]',
                    sentiment.summary.label === 'neutral' && 'text-[var(--color-fg-muted)]'
                  )}
                >
                  {sentiment.summary.label}
                </span>
                <span className="text-[var(--color-pos)]">+{sentiment.summary.positive}</span>
                <span className="text-[var(--color-neg)]">-{sentiment.summary.negative}</span>
                <span className="text-[var(--color-fg-muted)]">
                  avg {sentiment.summary.averageScore.toFixed(2)}
                </span>
              </span>
            </div>
          )}
          {sentiment.scored.map((n) => (
            <a
              key={n.id || n.link}
              href={n.link}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col border-b border-[var(--color-border)] py-2 text-[11px] last:border-0 hover:bg-[var(--color-bg)]"
            >
              <div className="flex items-start gap-2">
                <span
                  className={cn(
                    'mt-1 inline-block h-2 w-2 shrink-0 rounded-full',
                    n.score > 0.1
                      ? 'bg-[var(--color-pos)]'
                      : n.score < -0.1
                        ? 'bg-[var(--color-neg)]'
                        : 'bg-[var(--color-fg-muted)]'
                  )}
                  title={`score ${n.score.toFixed(2)}`}
                />
                <div className="flex-1">
                  <div className="font-medium leading-snug">{n.title}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-[9px] text-[var(--color-fg-muted)]">
                    <span>{n.publisher}</span>
                    <span>·</span>
                    <span>
                      {n.providerPublishTime
                        ? new Date(n.providerPublishTime * 1000).toLocaleString()
                        : ''}
                    </span>
                  </div>
                </div>
                <ExternalLink className="h-3 w-3 shrink-0 text-[var(--color-fg-muted)]" />
              </div>
            </a>
          ))}
        </Panel>

        <Panel icon={<FileText className="h-3 w-3" />} title="SEC Filings">
          {filLoading && <Loading />}
          {filings.length === 0 && !filLoading && <Empty />}
          {filings.map((f) => (
            <a
              key={f.accession}
              href={f.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between border-b border-[var(--color-border)] py-1.5 text-[11px] last:border-0 hover:bg-[var(--color-bg)]"
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold',
                    ['10-K', '10-Q'].includes(f.form)
                      ? 'bg-[var(--color-info)]/20 text-[var(--color-info)]'
                      : f.form === '8-K'
                        ? 'bg-[var(--color-warn)]/20 text-[var(--color-warn)]'
                        : 'bg-[var(--color-fg-muted)]/10 text-[var(--color-fg-muted)]'
                  )}
                >
                  {f.form}
                </span>
                <span className="tabular">{f.filingDate}</span>
                {f.reportDate && (
                  <span className="text-[9px] text-[var(--color-fg-muted)]">
                    period ending {f.reportDate}
                  </span>
                )}
              </div>
              <ExternalLink className="h-3 w-3 text-[var(--color-fg-muted)]" />
            </a>
          ))}
        </Panel>
      </div>
    </div>
  )
}

function Panel({
  icon,
  title,
  children
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
        {icon} {title}
      </div>
      {children}
    </div>
  )
}
function Loading(): React.JSX.Element {
  return <div className="text-[10px] text-[var(--color-fg-muted)]">Loading…</div>
}
function Empty(): React.JSX.Element {
  return <div className="text-[10px] text-[var(--color-fg-muted)]">No data.</div>
}
