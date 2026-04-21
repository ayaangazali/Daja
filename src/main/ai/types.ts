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
    public status?: number
  ) {
    super(message)
  }
}
