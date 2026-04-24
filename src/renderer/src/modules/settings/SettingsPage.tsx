import { useState } from 'react'
import { Key, Cpu, Palette, HardDrive } from 'lucide-react'
import { ApiKeyManager } from './ApiKeyManager'
import { ProviderPreferences } from './ProviderPreferences'
import { ThemeToggle } from './ThemeToggle'
import { BackupPanel } from './BackupPanel'
import { UsagePanel } from './UsagePanel'
import { PageHeader } from '../../shared/PageHeader'
import { cn } from '../../lib/cn'

type Section = 'keys' | 'providers' | 'appearance' | 'data'

const SECTIONS: { id: Section; label: string; description: string; icon: typeof Key }[] = [
  {
    id: 'keys',
    label: 'API keys',
    description: 'Provider credentials · encrypted via OS keychain',
    icon: Key
  },
  {
    id: 'providers',
    label: 'Providers',
    description: 'Default AI provider + model per module',
    icon: Cpu
  },
  {
    id: 'appearance',
    label: 'Appearance',
    description: 'Theme · density · motion preferences',
    icon: Palette
  },
  {
    id: 'data',
    label: 'Data',
    description: 'Backup · restore · device migration',
    icon: HardDrive
  }
]

export function SettingsPage(): React.JSX.Element {
  const [section, setSection] = useState<Section>('keys')

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Settings"
        subtitle="API keys · AI providers · theme. Keys encrypted with OS keychain."
      />
      <div className="flex-1 overflow-auto">
        <div className="mx-auto flex max-w-5xl gap-6 px-6 py-6">
          <nav aria-label="Settings sections" className="w-56 shrink-0 space-y-1">
            {SECTIONS.map((s) => {
              const Icon = s.icon
              const active = section === s.id
              return (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex w-full items-start gap-2 rounded-md px-3 py-2 text-left transition-colors',
                    active
                      ? 'bg-[var(--color-accent)]/15 text-[var(--color-fg)]'
                      : 'text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elev)] hover:text-[var(--color-fg)]'
                  )}
                >
                  <Icon className="mt-0.5 h-3.5 w-3.5" aria-hidden="true" />
                  <div>
                    <div className="text-[12px] font-medium">{s.label}</div>
                    <div className="text-[10px] text-[var(--color-fg-muted)]">{s.description}</div>
                  </div>
                </button>
              )
            })}
          </nav>
          <div className="min-w-0 flex-1 space-y-6">
            {section === 'keys' && <ApiKeyManager />}
            {section === 'providers' && (
              <>
                <ProviderPreferences />
                <UsagePanel />
              </>
            )}
            {section === 'appearance' && <ThemeToggle />}
            {section === 'data' && <BackupPanel />}
          </div>
        </div>
      </div>
    </div>
  )
}
