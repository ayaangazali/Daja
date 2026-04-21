import type { AIProvider, AIStreamOptions } from '../types'
import { AIError } from '../types'
import { readSSE } from '../sse'
import type { AIProviderId } from '../../../shared/ipc'

export function makeOpenAICompat(
  id: AIProviderId,
  baseUrl: string
): AIProvider {
  return {
    id,
    async *stream(opts: AIStreamOptions): AsyncGenerator<string, void, unknown> {
      const msgs = [
        { role: 'system', content: opts.system },
        ...opts.messages.map((m) => ({ role: m.role, content: m.content }))
      ]
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${opts.apiKey}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: opts.model,
          messages: msgs,
          stream: true,
          max_tokens: opts.maxTokens ?? 2048
        }),
        signal: opts.signal
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new AIError(`${id} ${res.status}: ${text.slice(0, 200)}`, id, res.status)
      }
      for await (const { data } of readSSE(res, opts.signal)) {
        if (data === '[DONE]') return
        try {
          const parsed = JSON.parse(data) as {
            choices?: { delta?: { content?: string } }[]
          }
          const delta = parsed.choices?.[0]?.delta?.content
          if (delta) yield delta
        } catch {
          // skip
        }
      }
    }
  }
}

export const openaiProvider = makeOpenAICompat('openai', 'https://api.openai.com/v1')
export const grokProvider = makeOpenAICompat('grok', 'https://api.x.ai/v1')
export const perplexityProvider = makeOpenAICompat('perplexity', 'https://api.perplexity.ai')
