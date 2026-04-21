import type { AIProviderId } from '../../shared/ipc'
import { anthropicProvider } from './providers/anthropic'
import { geminiProvider } from './providers/gemini'
import { openaiProvider, grokProvider, perplexityProvider } from './providers/openaiCompat'
import type { AIProvider } from './types'

const PROVIDERS: Record<AIProviderId, AIProvider> = {
  anthropic: anthropicProvider,
  openai: openaiProvider,
  gemini: geminiProvider,
  grok: grokProvider,
  perplexity: perplexityProvider
}

export function getProvider(id: AIProviderId): AIProvider {
  return PROVIDERS[id]
}

export const DEFAULT_MODELS: Record<AIProviderId, string> = {
  anthropic: 'claude-sonnet-4-6',
  openai: 'gpt-4o',
  gemini: 'gemini-2.5-pro',
  grok: 'grok-4',
  perplexity: 'sonar-pro'
}
