import { AI_PROVIDERS } from '../../../lib/constants'
import type { AIProviderId } from '../../../../../shared/ipc'
import { usePrefs, useSetAiForModule } from '../../../hooks/usePrefs'
import { cn } from '../../../lib/cn'

export function ProviderSelector(): React.JSX.Element {
  const { data: prefs } = usePrefs()
  const setAi = useSetAiForModule()
  const current = prefs?.aiByModule?.finance ?? 'anthropic'
  return (
    <select
      value={current}
      onChange={(e) =>
        setAi.mutate({ module: 'finance', provider: e.target.value as AIProviderId })
      }
      className={cn(
        'h-6 rounded border px-1 text-[10px] outline-none',
        'border-[var(--color-border)] bg-[var(--color-bg)]'
      )}
    >
      {AI_PROVIDERS.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  )
}
