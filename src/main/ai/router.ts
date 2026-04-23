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

/**
 * Default model per provider. Each entry lists a primary plus ordered fallbacks —
 * if the primary errors with 404/unknown-model, the caller can walk the list.
 * Keep versions broad (e.g., 'gpt-4o' resolves to latest alias) to minimize drift.
 */
export const MODEL_PREFERENCES: Record<AIProviderId, { primary: string; fallbacks: string[] }> = {
  anthropic: {
    primary: 'claude-sonnet-4-6',
    fallbacks: ['claude-sonnet-4-5', 'claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest']
  },
  openai: { primary: 'gpt-4o', fallbacks: ['gpt-4o-mini', 'gpt-4-turbo'] },
  gemini: { primary: 'gemini-2.5-pro', fallbacks: ['gemini-2.0-pro', 'gemini-1.5-pro'] },
  grok: { primary: 'grok-4', fallbacks: ['grok-beta'] },
  perplexity: { primary: 'sonar-pro', fallbacks: ['sonar'] }
}

export const DEFAULT_MODELS: Record<AIProviderId, string> = {
  anthropic: MODEL_PREFERENCES.anthropic.primary,
  openai: MODEL_PREFERENCES.openai.primary,
  gemini: MODEL_PREFERENCES.gemini.primary,
  grok: MODEL_PREFERENCES.grok.primary,
  perplexity: MODEL_PREFERENCES.perplexity.primary
}

/**
 * Given a provider and an error message, suggest the next fallback model.
 * Returns null if no more fallbacks remain.
 */
export function nextFallback(provider: AIProviderId, currentModel: string): string | null {
  const chain = [MODEL_PREFERENCES[provider].primary, ...MODEL_PREFERENCES[provider].fallbacks]
  const idx = chain.indexOf(currentModel)
  if (idx < 0) return chain[0] ?? null
  return chain[idx + 1] ?? null
}
