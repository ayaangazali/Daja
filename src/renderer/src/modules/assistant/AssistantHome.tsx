import { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark.css'
// useRef already imported; wasStreamingRef added in effect
import { MessageSquarePlus, Send, Square, Trash2 } from 'lucide-react'
import { useAI, type AIMessage } from '../../hooks/useAI'
import {
  useAddConversation,
  useConversations,
  useRemoveConversation,
  useUpdateConversation,
  type AIConversation
} from '../../hooks/useConversations'
import { usePrefs, useSetAiForModule } from '../../hooks/usePrefs'
import { AI_PROVIDERS } from '../../lib/constants'
import type { AIProviderId } from '../../../../shared/ipc'
import { cn } from '../../lib/cn'

export function AssistantHome(): React.JSX.Element {
  const { data: conversations = [] } = useConversations('assistant')
  const addMut = useAddConversation()
  const updateMut = useUpdateConversation()
  const remMut = useRemoveConversation()
  const { data: prefs } = usePrefs()
  const setAi = useSetAiForModule()

  const [activeId, setActiveId] = useState<number | null>(null)
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [input, setInput] = useState('')
  const { state, start, cancel } = useAI()
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [atBottom, setAtBottom] = useState(true)
  const [newMsgPending, setNewMsgPending] = useState(false)

  const active = useMemo<AIConversation | null>(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId]
  )

  useEffect(() => {
    if (active) {
      try {
        const parsed = JSON.parse(active.messages) as unknown
        if (
          Array.isArray(parsed) &&
          parsed.every(
            (m): m is AIMessage =>
              m != null &&
              typeof m === 'object' &&
              (m as AIMessage).role != null &&
              typeof (m as AIMessage).content === 'string'
          )
        ) {
          setMessages(parsed)
        } else {
          setMessages([])
        }
      } catch {
        setMessages([])
      }
    } else {
      setMessages([])
    }
  }, [active])

  // Only auto-scroll when user is near the bottom. If they scrolled up to read,
  // respect their position and surface a "new messages" pill instead.
  useEffect(() => {
    if (atBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      setNewMsgPending(false)
    } else {
      setNewMsgPending(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, state.text])

  // Track whether user is within 100px of the bottom of the scroll container.
  const handleScroll = (): void => {
    const el = scrollRef.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    setAtBottom(distance < 100)
  }

  const newConversation = (): void => {
    setActiveId(null)
    setMessages([])
    setInput('')
  }

  const submit = async (): Promise<void> => {
    const text = input.trim()
    if (!text || state.streaming) return
    const next = [...messages, { role: 'user' as const, content: text }]
    setMessages(next)
    setInput('')
    await start({
      module: 'assistant',
      promptKey: 'assistant_default',
      messages: next
    })
  }

  // Persist when stream transitions streaming → not-streaming
  const wasStreamingRef = useRef(false)
  useEffect(() => {
    const transitioned = wasStreamingRef.current && !state.streaming
    wasStreamingRef.current = state.streaming
    if (!transitioned) return
    if (!state.text) return
    const finalMessages = [...messages, { role: 'assistant' as const, content: state.text }]
    setMessages(finalMessages)
    if (activeId == null) {
      addMut.mutate(
        {
          module: 'assistant',
          provider: state.provider ?? 'unknown',
          model: state.model ?? undefined,
          title: messages[0]?.content.slice(0, 60) ?? 'New chat',
          messages: finalMessages
        },
        { onSuccess: (conv) => setActiveId(conv.id) }
      )
    } else {
      updateMut.mutate({ id: activeId, patch: { messages: finalMessages } })
    }
  }, [
    state.streaming,
    state.text,
    messages,
    activeId,
    addMut,
    updateMut,
    state.provider,
    state.model
  ])

  const currentProvider = prefs?.aiByModule?.assistant ?? 'anthropic'

  return (
    <div className="flex h-full min-h-0">
      <aside
        className={cn(
          'flex w-64 shrink-0 flex-col border-r',
          'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
        )}
      >
        <div className="border-b border-[var(--color-border)] p-2">
          <button
            onClick={newConversation}
            className="flex w-full items-center justify-center gap-1 rounded bg-[var(--color-info)] py-1.5 text-[11px] font-medium text-white"
          >
            <MessageSquarePlus className="h-3 w-3" /> New chat
          </button>
          <select
            value={currentProvider}
            onChange={(e) =>
              setAi.mutate({ module: 'assistant', provider: e.target.value as AIProviderId })
            }
            className="mt-2 w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-[10px]"
          >
            {AI_PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 && (
            <div className="p-3 text-[10px] text-[var(--color-fg-muted)]">No saved chats.</div>
          )}
          {conversations.map((c) => (
            <div
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={cn(
                'group flex cursor-pointer items-start justify-between gap-1 border-b border-[var(--color-border)] px-2 py-1.5',
                activeId === c.id ? 'bg-[var(--color-info)]/10' : 'hover:bg-[var(--color-bg)]'
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[11px] font-medium">{c.title ?? 'Untitled'}</div>
                <div className="flex items-center gap-1 text-[9px] text-[var(--color-fg-muted)]">
                  <span>{c.provider}</span>
                  <span>·</span>
                  <span>{new Date(c.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  remMut.mutate(c.id)
                  if (activeId === c.id) newConversation()
                }}
                className="opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Trash2 className="h-3 w-3 text-[var(--color-fg-muted)] hover:text-[var(--color-neg)]" />
              </button>
            </div>
          ))}
        </div>
      </aside>
      <main className="relative flex min-h-0 flex-1 flex-col">
        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4">
          <div className="mx-auto max-w-3xl space-y-4">
            {messages.length === 0 && !state.streaming && (
              <div className="rounded-md border border-dashed border-[var(--color-border)] p-6 text-center text-[var(--color-fg-muted)]">
                <div className="text-sm font-medium text-[var(--color-fg)]">Daja Assistant</div>
                <div className="mt-1 text-[11px]">
                  General chat grounded in your personal context (strategies, portfolio, health
                  logs). Pick provider on left.
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <Bubble key={i} message={m} />
            ))}
            {state.streaming && (
              <Bubble message={{ role: 'assistant', content: state.text || '…' }} streaming />
            )}
            {state.error && (
              <div className="rounded bg-[var(--color-neg)]/10 p-3 text-[11px] text-[var(--color-neg)]">
                {state.error}
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>
        {newMsgPending && !atBottom && (
          <button
            onClick={() => {
              bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
              setNewMsgPending(false)
            }}
            aria-label="Jump to newest message"
            className="absolute bottom-20 left-1/2 -translate-x-1/2 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-1.5 text-[11px] font-medium text-[var(--color-fg)] shadow-md hover:bg-[var(--color-bg-tint)]"
          >
            ↓ New messages
          </button>
        )}
        <div className="border-t border-[var(--color-border)] p-3">
          <div className="mx-auto flex max-w-3xl items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void submit()
                }
              }}
              rows={2}
              placeholder="Ask anything…"
              className={cn(
                'flex-1 resize-none rounded-md border bg-[var(--color-bg-elev)] px-3 py-2 text-[12px] outline-none',
                'border-[var(--color-border)] placeholder:text-[var(--color-fg-muted)]',
                'focus:border-[var(--color-info)]'
              )}
            />
            {state.streaming ? (
              <button
                onClick={cancel}
                className="rounded-md bg-[var(--color-neg)] p-2.5 text-white"
              >
                <Square className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={!input.trim()}
                className="rounded-md bg-[var(--color-info)] p-2.5 text-white disabled:opacity-40"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function Bubble({
  message,
  streaming
}: {
  message: AIMessage
  streaming?: boolean
}): React.JSX.Element {
  const [copied, setCopied] = useState(false)
  const copy = (): void => {
    void navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div
      className={cn(
        'group relative rounded-md px-3 py-2 text-[12px]',
        message.role === 'user'
          ? 'ml-auto max-w-xl bg-[var(--color-info)]/15 text-[var(--color-fg)]'
          : 'border border-[var(--color-border)] bg-[var(--color-bg-elev)]'
      )}
    >
      <div className="mb-0.5 flex items-center justify-between text-[9px] font-semibold uppercase text-[var(--color-fg-muted)]">
        <span>
          {message.role}
          {streaming && ' · streaming'}
        </span>
        <button
          onClick={copy}
          aria-label="Copy message"
          className="opacity-0 transition-opacity group-hover:opacity-100 hover:text-[var(--color-fg)]"
        >
          {copied ? 'copied!' : 'copy'}
        </button>
      </div>
      {message.role === 'assistant' ? (
        <MarkdownContent content={message.content} />
      ) : (
        <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
      )}
    </div>
  )
}

function MarkdownContent({ content }: { content: string }): React.JSX.Element {
  return (
    <div className="prose prose-sm max-w-none leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_code]:rounded [&_code]:bg-[var(--color-bg)] [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[11px] [&_h1]:text-[14px] [&_h1]:font-semibold [&_h2]:text-[13px] [&_h2]:font-semibold [&_h3]:text-[12px] [&_h3]:font-semibold [&_hr]:my-2 [&_hr]:border-[var(--color-border)] [&_li]:my-0.5 [&_ol]:ml-4 [&_p]:my-1 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-[var(--color-bg)] [&_pre]:p-2 [&_pre_code]:bg-transparent [&_pre_code]:px-0 [&_table]:my-2 [&_table]:w-full [&_table]:text-[11px] [&_td]:border-t [&_td]:border-[var(--color-border)] [&_td]:px-2 [&_td]:py-1 [&_th]:border-b [&_th]:border-[var(--color-border)] [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_ul]:ml-4 [&_ul]:list-disc">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
