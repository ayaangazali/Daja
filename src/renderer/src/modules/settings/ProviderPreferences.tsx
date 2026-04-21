import { AI_PROVIDERS } from '../../lib/constants'
import type { AIProviderId, ModuleId } from '../../../../shared/ipc'
import { usePrefs, useSetAiForModule, useSetModel } from '../../hooks/usePrefs'
import { cn } from '../../lib/cn'

const MODULES: { id: ModuleId; label: string }[] = [
  { id: 'finance', label: 'Finance' },
  { id: 'health', label: 'Health' },
  { id: 'assistant', label: 'Assistant' }
]

export function ProviderPreferences(): React.JSX.Element {
  const { data: prefs } = usePrefs()
  const setAi = useSetAiForModule()
  const setModel = useSetModel()

  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold">AI Provider Preferences</h2>
      <p className="mt-0.5 text-xs text-[var(--color-fg-muted)]">
        Which provider each module uses by default.
      </p>
      <div className="mt-3 space-y-2">
        {MODULES.map((m) => {
          const pick = prefs?.aiByModule?.[m.id] ?? 'anthropic'
          return (
            <div
              key={m.id}
              className={cn(
                'flex items-center gap-2 rounded-md border px-3 py-2',
                'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
              )}
            >
              <div className="w-24 text-xs font-medium">{m.label}</div>
              <select
                value={pick}
                onChange={(e) =>
                  setAi.mutate({ module: m.id, provider: e.target.value as AIProviderId })
                }
                className="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs"
              >
                {AI_PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )
        })}
      </div>
      <h3 className="mt-4 text-xs font-semibold">Model per provider</h3>
      <div className="mt-2 space-y-2">
        {AI_PROVIDERS.map((p) => {
          const model = prefs?.modelByProvider?.[p.id] ?? p.defaultModel
          return (
            <div
              key={p.id}
              className={cn(
                'flex items-center gap-2 rounded-md border px-3 py-2',
                'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
              )}
            >
              <div className="w-40 text-xs font-medium">{p.name}</div>
              <input
                defaultValue={model}
                onBlur={(e) => {
                  const v = e.target.value.trim()
                  if (v && v !== model) setModel.mutate({ provider: p.id, model: v })
                }}
                className="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 font-mono text-xs"
              />
            </div>
          )
        })}
      </div>
    </section>
  )
}
