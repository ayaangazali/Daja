// @vitest-environment node
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

let TMP = ''
vi.mock('electron', () => ({
  app: { getPath: () => TMP, getName: () => 'Daja', getVersion: () => '0.0.0' }
}))

import {
  recordUsage,
  summarizeUsage,
  getUsage,
  clearUsage,
  estimateCost,
  charsToTokens,
  __resetForTests
} from './aiUsage'

describe('aiUsage', () => {
  beforeEach(() => {
    TMP = mkdtempSync(join(tmpdir(), 'daja-usage-'))
    __resetForTests()
  })
  afterEach(() => {
    try {
      rmSync(TMP, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  })

  it('charsToTokens approximates input size', () => {
    expect(charsToTokens(0)).toBe(1)
    expect(charsToTokens(40)).toBe(10)
    expect(charsToTokens(4000)).toBe(1000)
  })

  it('estimateCost uses model-specific pricing when known', () => {
    // gpt-4o-mini: input $0.15/M, output $0.60/M
    expect(estimateCost('openai', 'gpt-4o-mini', 1_000_000, 0)).toBeCloseTo(0.15, 4)
    expect(estimateCost('openai', 'gpt-4o-mini', 0, 1_000_000)).toBeCloseTo(0.6, 4)
  })

  it('estimateCost falls back to provider tier for unknown models', () => {
    const c = estimateCost('anthropic', 'claude-not-a-real-model', 1_000_000, 0)
    // fallback anthropic input: $3/M
    expect(c).toBeCloseTo(3, 4)
  })

  it('recordUsage + getUsage round-trip', async () => {
    recordUsage({
      at: '2026-04-23T10:00:00.000Z',
      provider: 'anthropic',
      model: 'claude-sonnet-4-6',
      module: 'finance',
      inputTokens: 1000,
      outputTokens: 500,
      estCostUsd: estimateCost('anthropic', 'claude-sonnet-4-6', 1000, 500),
      durationMs: 2500
    })
    // Give the async write chain a moment (jsonStore's atomic-rename queue)
    await new Promise((r) => setTimeout(r, 50))
    const list = getUsage()
    expect(list.length).toBe(1)
    expect(list[0].provider).toBe('anthropic')
    expect(list[0].estCostUsd).toBeGreaterThan(0)
  })

  it('summarizeUsage aggregates by provider + module within window', async () => {
    const now = new Date()
    recordUsage({
      at: now.toISOString(),
      provider: 'anthropic',
      model: 'claude-sonnet-4-6',
      module: 'finance',
      inputTokens: 1000,
      outputTokens: 500,
      estCostUsd: 0.01,
      durationMs: 1000
    })
    recordUsage({
      at: now.toISOString(),
      provider: 'openai',
      model: 'gpt-4o-mini',
      module: 'assistant',
      inputTokens: 500,
      outputTokens: 250,
      estCostUsd: 0.001,
      durationMs: 500
    })
    await new Promise((r) => setTimeout(r, 50))
    const s = summarizeUsage(30)
    expect(s.totalCalls).toBe(2)
    expect(s.byProvider.anthropic.calls).toBe(1)
    expect(s.byProvider.openai.calls).toBe(1)
    expect(s.byModule.finance.calls).toBe(1)
    expect(s.byModule.assistant.calls).toBe(1)
  })

  it('summarizeUsage ignores entries older than window', async () => {
    const old = new Date()
    old.setDate(old.getDate() - 60)
    recordUsage({
      at: old.toISOString(),
      provider: 'anthropic',
      model: 'claude-sonnet-4-6',
      module: 'finance',
      inputTokens: 100,
      outputTokens: 50,
      estCostUsd: 0.001,
      durationMs: 500
    })
    await new Promise((r) => setTimeout(r, 50))
    const s = summarizeUsage(30)
    expect(s.totalCalls).toBe(0)
  })

  it('clearUsage empties the log', async () => {
    recordUsage({
      at: new Date().toISOString(),
      provider: 'anthropic',
      model: 'claude-sonnet-4-6',
      module: 'finance',
      inputTokens: 1,
      outputTokens: 1,
      estCostUsd: 0,
      durationMs: 1
    })
    await new Promise((r) => setTimeout(r, 50))
    expect(getUsage().length).toBe(1)
    clearUsage()
    await new Promise((r) => setTimeout(r, 50))
    expect(getUsage().length).toBe(0)
  })
})
