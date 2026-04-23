import { ApiKeyManager } from './ApiKeyManager'
import { ProviderPreferences } from './ProviderPreferences'
import { ThemeToggle } from './ThemeToggle'
import { PageHeader } from '../../shared/PageHeader'

export function SettingsPage(): React.JSX.Element {
  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Settings"
        subtitle="API keys · AI providers · theme. Keys encrypted with OS keychain."
      />
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-3xl space-y-6 px-6 py-6">
          <ApiKeyManager />
          <ProviderPreferences />
          <ThemeToggle />
        </div>
      </div>
    </div>
  )
}
