import type { AIProviderId } from '../../shared/ipc'
import { createJsonStore } from './jsonStore'

/**
 * AI usage telemetry — per-call record of provider, model, character counts
 * (we approximate tokens when the provider doesn't return usage). Stored
 * locally in the jsonStore; never leaves the machine.
 */

export interface UsageEntry {
  at: string // ISO
  provider: AIProviderId
  model: string
  module: string
  /** Rough token estimates — input + output characters divided by 4 if real usage absent */
  inputTokens: number
  outputTokens: number
  /** USD estimate based on provider pricing table */
  estCostUsd: number
  /** Wall-clock duration in ms */
  durationMs: number
}

interface UsageSchema extends Record<string, unknown> {
  entries: UsageEntry[]
}

let _store: ReturnType<typeof createJsonStore<UsageSchema>> | null = null
function store(): ReturnType<typeof createJsonStore<UsageSchema>> {
  if (!_store) _store = createJsonStore<UsageSchema>('daja-ai-usage', { entries: [] })
  return _store
}

/**
 * Per-1M-tokens pricing in USD as of 2026-04. Update as providers adjust.
 * When the exact model isn't listed, fall back to provider tier defaults.
 */
const PRICING: Record<string, { input: number; output: number }> = {
  // Anthropic
  'claude-sonnet-4-6': { input: 3, output: 15 },
  'claude-sonnet-4-5': { input: 3, output: 15 },
  'claude-3-5-sonnet-latest': { input: 3, output: 15 },
  'claude-3-5-haiku-latest': { input: 0.8, output: 4 },
  // OpenAI
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4-turbo': { input: 10, output: 30 },
  // Gemini
  'gemini-2.5-pro': { input: 1.25, output: 5 },
  'gemini-2.0-pro': { input: 1.25, output: 5 },
  'gemini-1.5-pro': { input: 3.5, output: 10.5 },
  // Grok
  'grok-4': { input: 3, output: 15 },
  'grok-beta': { input: 5, output: 15 },
  // Perplexity
  'sonar-pro': { input: 3, output: 15 },
  sonar: { input: 1, output: 1 }
}

const PROVIDER_FALLBACK: Record<AIProviderId, { input: number; output: number }> = {
  anthropic: { input: 3, output: 15 },
  openai: { input: 2.5, output: 10 },
  gemini: { input: 1.25, output: 5 },
  grok: { input: 3, output: 15 },
  perplexity: { input: 3, output: 15 }
}

export function estimateCost(
  provider: AIProviderId,
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const p = PRICING[model] ?? PROVIDER_FALLBACK[provider]
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000
}

/**
 * Character-count to token approximation (English prose). Real providers
 * return usage in their final streaming event — wire that in when we extract
 * it. Until then ~4 chars/token keeps estimates within 20%.
 */
export function charsToTokens(chars: number): number {
  return Math.max(1, Math.round(chars / 4))
}

const MAX_ENTRIES = 10_000 // cap so the JSON file doesn't grow unbounded

export function recordUsage(entry: UsageEntry): void {
  const s = store()
  const existing = s.get('entries') ?? []
  const next = [...existing, entry]
  // Drop oldest once we exceed cap — keep the most-recent window
  const trimmed = next.length > MAX_ENTRIES ? next.slice(next.length - MAX_ENTRIES) : next
  s.set('entries', trimmed)
}

export function getUsage(limit = 500): UsageEntry[] {
  const entries = store().get('entries') ?? []
  return entries.slice(-limit).reverse()
}

export interface UsageSummary {
  totalCalls: number
  totalInputTokens: number
  totalOutputTokens: number
  totalCostUsd: number
  byProvider: Record<
    string,
    { calls: number; inputTokens: number; outputTokens: number; costUsd: number }
  >
  byModule: Record<string, { calls: number; costUsd: number }>
  /** ISO date of the oldest entry in the window */
  since: string | null
}

export function summarizeUsage(windowDays = 30): UsageSummary {
  const entries = store().get('entries') ?? []
  const cutoff = Date.now() - windowDays * 86_400_000
  const window = entries.filter((e) => {
    const t = Date.parse(e.at)
    return !Number.isNaN(t) && t >= cutoff
  })
  const summary: UsageSummary = {
    totalCalls: window.length,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCostUsd: 0,
    byProvider: {},
    byModule: {},
    since: window.length > 0 ? window[0].at : null
  }
  for (const e of window) {
    summary.totalInputTokens += e.inputTokens
    summary.totalOutputTokens += e.outputTokens
    summary.totalCostUsd += e.estCostUsd
    const bp = (summary.byProvider[e.provider] ??= {
      calls: 0,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0
    })
    bp.calls += 1
    bp.inputTokens += e.inputTokens
    bp.outputTokens += e.outputTokens
    bp.costUsd += e.estCostUsd
    const bm = (summary.byModule[e.module] ??= { calls: 0, costUsd: 0 })
    bm.calls += 1
    bm.costUsd += e.estCostUsd
  }
  return summary
}

export function clearUsage(): void {
  store().set('entries', [])
}

/** Test-only: drop memoized store so next call rebuilds for a fresh tmpdir. */
export function __resetForTests(): void {
  _store = null
}
