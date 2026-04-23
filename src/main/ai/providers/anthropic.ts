import type { AIProvider, AIStreamOptions } from '../types'
import { AIError } from '../types'
import { readSSE } from '../sse'

export const anthropicProvider: AIProvider = {
  id: 'anthropic',
  async *stream(opts: AIStreamOptions): AsyncGenerator<string, void, unknown> {
    const messages = opts.messages.filter((m) => m.role !== 'system')
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': opts.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: opts.model,
        max_tokens: opts.maxTokens ?? 2048,
        system: opts.system,
        stream: true,
        messages: messages.map((m) => ({ role: m.role, content: m.content }))
      }),
      signal: opts.signal
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new AIError(`Anthropic ${res.status}: ${text.slice(0, 200)}`, 'anthropic', res.status)
    }
    let parseFailures = 0
    for await (const { event, data } of readSSE(res, opts.signal)) {
      if (event === 'content_block_delta' || !event) {
        try {
          const parsed = JSON.parse(data) as {
            type?: string
            delta?: { type?: string; text?: string }
          }
          if (parsed.delta?.type === 'text_delta' && parsed.delta.text) {
            yield parsed.delta.text
          }
        } catch (err) {
          parseFailures += 1
          // Log every parse failure at warn level so stream drops don't vanish
          // silently. We don't abort — readSSE already re-buffers across
          // chunk boundaries, so transient issues are expected to be rare.
          console.warn(
            `[anthropic] SSE parse failed (#${parseFailures}):`,
            err instanceof Error ? err.message : err,
            '· data preview:',
            data.slice(0, 120)
          )
        }
      }
    }
    if (parseFailures > 0) {
      console.warn(`[anthropic] stream completed with ${parseFailures} parse failures`)
    }
  }
}
