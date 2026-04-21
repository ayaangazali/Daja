import { ipcMain, type WebContents } from 'electron'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { AIProviderIdSchema, IPC_CHANNELS, ModuleIdSchema } from '../../shared/ipc'
import { getKeyPlaintext } from '../services/keyVault'
import { getPreferredAI, getPreferredModel } from '../services/prefs'
import { getProvider, DEFAULT_MODELS } from '../ai/router'
import { buildUserContextBlock } from '../ai/contextInjector'
import { PROMPTS, type PromptKey } from '../ai/prompts'

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string()
})

const ChatStartPayload = z.object({
  module: ModuleIdSchema,
  promptKey: z.string().optional(),
  ticker: z.string().optional(),
  providerOverride: AIProviderIdSchema.optional(),
  modelOverride: z.string().optional(),
  messages: z.array(MessageSchema).min(1)
})

const activeRequests = new Map<string, AbortController>()

export function registerAiIpc(): void {
  ipcMain.handle(IPC_CHANNELS.aiChatStart, async (event, raw) => {
    const { module, promptKey, ticker, providerOverride, modelOverride, messages } =
      ChatStartPayload.parse(raw)

    const providerId = providerOverride ?? getPreferredAI(module)
    const model = modelOverride ?? getPreferredModel(providerId) ?? DEFAULT_MODELS[providerId]
    const apiKey = getKeyPlaintext(providerId)
    if (!apiKey) {
      throw new Error(`No API key for ${providerId}. Configure in Settings.`)
    }

    const basePrompt =
      (promptKey && PROMPTS[promptKey as PromptKey]) ?? PROMPTS.assistant_default
    const userBlock = buildUserContextBlock({ module, ticker })
    const system = userBlock
      ? `${basePrompt}\n\n--- USER CONTEXT ---\n${userBlock}\n--- END USER CONTEXT ---`
      : basePrompt

    const provider = getProvider(providerId)
    const requestId = randomUUID()
    const ctrl = new AbortController()
    activeRequests.set(requestId, ctrl)
    const wc: WebContents = event.sender

    ;(async (): Promise<void> => {
      try {
        for await (const chunk of provider.stream({
          messages,
          system,
          model,
          apiKey,
          signal: ctrl.signal
        })) {
          if (ctrl.signal.aborted) break
          if (!wc.isDestroyed()) wc.send(IPC_CHANNELS.aiChatChunk, requestId, chunk)
        }
        if (!wc.isDestroyed()) wc.send(IPC_CHANNELS.aiChatDone, requestId)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown AI error'
        if (!wc.isDestroyed()) wc.send(IPC_CHANNELS.aiChatError, requestId, msg)
      } finally {
        activeRequests.delete(requestId)
      }
    })()

    return { requestId, provider: providerId, model }
  })

  ipcMain.handle(IPC_CHANNELS.aiChatCancel, async (_e, raw) => {
    const parsed = z.object({ requestId: z.string() }).parse(raw)
    const ctrl = activeRequests.get(parsed.requestId)
    if (ctrl) {
      ctrl.abort()
      activeRequests.delete(parsed.requestId)
    }
    return { ok: true }
  })
}
