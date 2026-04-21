import Store from 'electron-store'
import type { AIProviderId, ModuleId, Prefs } from '../../shared/ipc'

const store = new Store<Prefs>({
  name: 'nexus-prefs',
  defaults: { aiByModule: {}, modelByProvider: {}, theme: 'dark' } as Prefs,
  clearInvalidConfig: true
}) as unknown as {
  get: <K extends keyof Prefs>(key: K) => Prefs[K]
  set: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void
  store: Prefs
}

export function getAll(): Prefs {
  return {
    aiByModule: store.get('aiByModule') ?? {},
    modelByProvider: store.get('modelByProvider') ?? {},
    theme: store.get('theme') ?? 'dark'
  }
}

export function setAiForModule(module: ModuleId, provider: AIProviderId): void {
  const current = store.get('aiByModule') ?? {}
  store.set('aiByModule', { ...current, [module]: provider })
}

export function setModelForProvider(provider: AIProviderId, model: string): void {
  const current = store.get('modelByProvider') ?? {}
  store.set('modelByProvider', { ...current, [provider]: model })
}

export function setTheme(theme: 'dark' | 'light'): void {
  store.set('theme', theme)
}

export function getPreferredAI(module: ModuleId): AIProviderId {
  const map = store.get('aiByModule') ?? {}
  return map[module] ?? 'anthropic'
}

export function getPreferredModel(provider: AIProviderId): string | undefined {
  const map = store.get('modelByProvider') ?? {}
  return map[provider]
}
