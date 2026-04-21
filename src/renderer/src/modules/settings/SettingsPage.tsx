import { ApiKeyManager } from './ApiKeyManager'
import { ProviderPreferences } from './ProviderPreferences'
import { ThemeToggle } from './ThemeToggle'

export function SettingsPage(): React.JSX.Element {
  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-3xl px-6 py-6">
        <div className="flex items-baseline justify-between">
          <h1 className="text-lg font-semibold">Settings</h1>
          <div className="text-[10px] text-[var(--color-fg-muted)]">
            Keys encrypted w/ OS keychain (safeStorage)
          </div>
        </div>
        <ApiKeyManager />
        <ProviderPreferences />
        <ThemeToggle />
      </div>
    </div>
  )
}
