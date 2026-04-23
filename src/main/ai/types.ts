import type { AIProviderId } from '../../shared/ipc'

export interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AIStreamOptions {
  messages: AIMessage[]
  system: string
  model: string
  apiKey: string
  maxTokens?: number
  signal?: AbortSignal
}

export interface AIProvider {
  id: AIProviderId
  stream(opts: AIStreamOptions): AsyncGenerator<string, void, unknown>
}

export class AIError extends Error {
  constructor(
    message: string,
    public provider: AIProviderId,
    public status?: number,
    /** Seconds to wait before retry (from Retry-After header or exp backoff). */
    public retryAfterSec?: number
  ) {
    super(message)
  }
}

/**
 * Parse Retry-After or x-ratelimit-reset-* headers into a seconds value.
 * Falls back to exponential backoff computed from attempt number.
 */
export function computeRetryDelay(
  res: Response,
  attempt: number,
  provider: string
): number {
  const retryAfter = res.headers.get('retry-after')
  if (retryAfter) {
    const asNum = Number(retryAfter)
    if (Number.isFinite(asNum) && asNum > 0) return Math.min(asNum, 60)
    // Retry-After may be an HTTP date
    const asDate = Date.parse(retryAfter)
    if (!Number.isNaN(asDate)) {
      const sec = Math.max(0, Math.ceil((asDate - Date.now()) / 1000))
      return Math.min(sec, 60)
    }
  }
  // Provider-specific headers
  const tokenReset = res.headers.get('x-ratelimit-reset-tokens')
  if (tokenReset) {
    const asNum = Number(tokenReset)
    if (Number.isFinite(asNum) && asNum > 0) return Math.min(asNum, 60)
  }
  // Exponential backoff with jitter: 2s, 4s, 8s + up to 1s jitter
  const base = Math.min(2 ** attempt, 16)
  const jitter = Math.random()
  console.warn(`[${provider}] no Retry-After header; exp-backoff ${base}s attempt ${attempt}`)
  return base + jitter
}
