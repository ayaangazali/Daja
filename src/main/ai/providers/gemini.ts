import type { AIProvider, AIStreamOptions } from '../types'
import { AIError } from '../types'
import { readSSE } from '../sse'

export const geminiProvider: AIProvider = {
  id: 'gemini',
  async *stream(opts: AIStreamOptions): AsyncGenerator<string, void, unknown> {
    const contents = opts.messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      opts.model
    )}:streamGenerateContent?alt=sse&key=${encodeURIComponent(opts.apiKey)}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.system }] },
        contents,
        generationConfig: { maxOutputTokens: opts.maxTokens ?? 2048 }
      }),
      signal: opts.signal
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new AIError(`Gemini ${res.status}: ${text.slice(0, 200)}`, 'gemini', res.status)
    }
    for await (const { data } of readSSE(res, opts.signal)) {
      try {
        const parsed = JSON.parse(data) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[]
        }
        const text = parsed.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('')
        if (text) yield text
      } catch {
        // skip
      }
    }
  }
}
