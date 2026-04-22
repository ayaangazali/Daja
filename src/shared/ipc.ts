import { z } from 'zod'

export const PROVIDER_IDS = [
  'anthropic',
  'openai',
  'gemini',
  'grok',
  'perplexity',
  'fmp',
  'alpha_vantage',
  'polygon',
  'news_api'
] as const

export const ProviderIdSchema = z.enum(PROVIDER_IDS)
export type ProviderId = z.infer<typeof ProviderIdSchema>

export const AI_PROVIDER_IDS = ['anthropic', 'openai', 'gemini', 'grok', 'perplexity'] as const
export const AIProviderIdSchema = z.enum(AI_PROVIDER_IDS)
export type AIProviderId = z.infer<typeof AIProviderIdSchema>

export const ModuleIdSchema = z.enum(['finance', 'sports', 'pdf', 'health', 'assistant'])
export type ModuleId = z.infer<typeof ModuleIdSchema>

export const KeyMetaSchema = z.object({
  provider: ProviderIdSchema,
  configured: z.boolean(),
  updatedAt: z.string().nullable(),
  lastTested: z.string().nullable(),
  lastTestResult: z.enum(['success', 'error']).nullable(),
  lastTestMessage: z.string().nullable()
})
export type KeyMeta = z.infer<typeof KeyMetaSchema>

export const TestResultSchema = z.object({
  ok: z.boolean(),
  message: z.string()
})
export type TestResult = z.infer<typeof TestResultSchema>

export const PrefsSchema = z.object({
  aiByModule: z.record(z.string(), AIProviderIdSchema).default(() => ({})),
  modelByProvider: z.record(z.string(), z.string()).default(() => ({})),
  theme: z.enum(['dark', 'light']).default('dark')
})
export type Prefs = {
  aiByModule: Partial<Record<ModuleId, AIProviderId>>
  modelByProvider: Partial<Record<AIProviderId, string>>
  theme: 'dark' | 'light'
}

export const IPC_CHANNELS = {
  keysList: 'keys:list',
  keysSet: 'keys:set',
  keysDelete: 'keys:delete',
  keysTest: 'keys:test',
  prefsGet: 'prefs:get',
  prefsSetAiModule: 'prefs:set-ai-module',
  prefsSetModel: 'prefs:set-model',
  prefsSetTheme: 'prefs:set-theme',
  aiChatStart: 'ai:chat:start',
  aiChatChunk: 'ai:chat:chunk',
  aiChatDone: 'ai:chat:done',
  aiChatError: 'ai:chat:error',
  aiChatCancel: 'ai:chat:cancel',
  financeQuote: 'finance:quote',
  financeHistorical: 'finance:historical',
  financeSearch: 'finance:search',
  financeFundamentals: 'finance:fundamentals',
  financeStatements: 'finance:statements',
  financeOwnership: 'finance:ownership',
  financeOptions: 'finance:options',
  financeNews: 'finance:news',
  financeFilings: 'finance:filings',
  financeReddit: 'finance:reddit',
  financeEarningsCal: 'finance:earnings-cal',
  financeScreener: 'finance:screener',
  financeDividends: 'finance:dividends',
  financePeers: 'finance:peers',
  pdfMerge: 'pdf:merge',
  pdfSplit: 'pdf:split',
  pdfInfo: 'pdf:info',
  pdfOpen: 'pdf:open',
  pdfSaveDialog: 'pdf:save-dialog',
  pdfPickDir: 'pdf:pick-dir',
  pdfRevealInFinder: 'pdf:reveal',
  sportsScoreboard: 'sports:scoreboard',
  sportsStandings: 'sports:standings',
  sportsSchedule: 'sports:schedule',
  windowAlwaysOnTop: 'window:always-on-top',
  windowToggleDevtools: 'window:toggle-devtools',
  notify: 'notify',
  fsSavePath: 'fs:save-path'
} as const
