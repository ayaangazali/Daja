import type { AIProviderId, ModuleId, Prefs } from '../../shared/ipc'
import { createJsonStore } from './jsonStore'

interface PrefsRecord extends Record<string, unknown> {
  aiByModule: Partial<Record<ModuleId, AIProviderId>>
  modelByProvider: Partial<Record<AIProviderId, string>>
  theme: 'dark' | 'light'
}

let _store: ReturnType<typeof createJsonStore<PrefsRecord>> | null = null
function store(): ReturnType<typeof createJsonStore<PrefsRecord>> {
  if (!_store) {
    _store = createJsonStore<PrefsRecord>('nexus-prefs', {
      aiByModule: {},
      modelByProvider: {},
      theme: 'dark'
    })
  }
  return _store
}

export function getAll(): Prefs {
  const s = store()
  return {
    aiByModule: s.get('aiByModule') ?? {},
    modelByProvider: s.get('modelByProvider') ?? {},
    theme: s.get('theme') ?? 'dark'
  }
}

export function setAiForModule(module: ModuleId, provider: AIProviderId): void {
  const s = store()
  const current = s.get('aiByModule') ?? {}
  s.set('aiByModule', { ...current, [module]: provider })
}

export function setModelForProvider(provider: AIProviderId, model: string): void {
  const s = store()
  const current = s.get('modelByProvider') ?? {}
  s.set('modelByProvider', { ...current, [provider]: model })
}

export function setTheme(theme: 'dark' | 'light'): void {
  store().set('theme', theme)
}

export function getPreferredAI(module: ModuleId): AIProviderId {
  const map = store().get('aiByModule') ?? {}
  return map[module] ?? 'anthropic'
}

export function getPreferredModel(provider: AIProviderId): string | undefined {
  const map = store().get('modelByProvider') ?? {}
  return map[provider]
}
