import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Check, ChevronLeft, Lock, Zap } from 'lucide-react'
import { useSetKey, useKeys } from '../hooks/useKeyVault'
import { usePrefs, useSetAiForModule, useSetModel } from '../hooks/usePrefs'
import { cn } from '../lib/cn'

const PROVIDERS = [
  {
    id: 'anthropic' as const,
    name: 'Anthropic Claude',
    tagline: 'Recommended — best for long-context financial analysis',
    model: 'claude-sonnet-4-6',
    href: 'https://console.anthropic.com/settings/keys',
    keyPrefix: 'sk-ant-'
  },
  {
    id: 'openai' as const,
    name: 'OpenAI',
    tagline: 'GPT-4o — strong general reasoning',
    model: 'gpt-4o',
    href: 'https://platform.openai.com/api-keys',
    keyPrefix: 'sk-'
  },
  {
    id: 'gemini' as const,
    name: 'Google Gemini',
    tagline: '2.5 Pro — fast + free tier available',
    model: 'gemini-2.5-pro',
    href: 'https://aistudio.google.com/apikey',
    keyPrefix: 'AI'
  }
]

const MODULES = ['finance', 'assistant', 'sports', 'pdf', 'health'] as const

export function QuickSetup(): React.JSX.Element {
  const navigate = useNavigate()
  const { data: keys = [] } = useKeys()
  const { data: prefs } = usePrefs()
  const setKey = useSetKey()
  const setAi = useSetAiForModule()
  const setModel = useSetModel()

  const [provider, setProvider] = useState<(typeof PROVIDERS)[number]>(PROVIDERS[0])
  const [apiKey, setApiKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const existing = keys.find((k) => k.provider === provider.id)
  const hasKey = existing?.configured ?? false
  const hasAnyKey = keys.some((k) => k.configured)

  const submit = async (): Promise<void> => {
    setError(null)
    const trimmed = apiKey.trim()
    if (!trimmed) {
      setError('Paste an API key from ' + provider.name)
      return
    }
    if (trimmed.length > 512) {
      setError('Key is too long — check that only the key was pasted, not a full file')
      return
    }
    if (/\s/.test(trimmed)) {
      setError('Key contains whitespace — paste may have included a newline')
      return
    }
    // Gemini prefix check — real Gemini keys start with "AIza", not just "AI".
    const realPrefix = provider.keyPrefix === 'AI' ? 'AIza' : provider.keyPrefix
    if (!trimmed.startsWith(realPrefix)) {
      setError(`Key doesn't look like a ${provider.name} key — expected prefix "${realPrefix}"`)
      return
    }
    setBusy(true)
    try {
      await setKey.mutateAsync({ provider: provider.id, key: trimmed })
      // Auto-wire every module to this provider
      for (const mod of MODULES) {
        await setAi.mutateAsync({ module: mod, provider: provider.id })
      }
      // Set default model
      await setModel.mutateAsync({ provider: provider.id, model: provider.model })
      setApiKey('')
      // Navigate to Launchpad
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save key')
    } finally {
      setBusy(false)
    }
  }

  // Check if all 5 modules already route to the same provider
  const allConfigured = MODULES.every((m) => prefs?.aiByModule?.[m] === provider.id)

  return (
    <div className="launchpad-bg flex h-full flex-col overflow-auto">
      <div className="mx-auto flex w-full max-w-2xl flex-col px-6 pt-10 pb-14">
        <button
          onClick={() => navigate('/')}
          className="mb-8 flex w-fit items-center gap-1 rounded-md px-2 py-1 text-[11px] text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elev)] hover:text-[var(--color-fg)]"
        >
          <ChevronLeft className="h-3 w-3" /> Back to Launchpad
        </button>
        <div className="mb-2 flex items-center gap-2">
          <span
            className="flex h-10 w-10 items-center justify-center text-white"
            style={{
              borderRadius: '28%',
              background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-soft))'
            }}
          >
            <Sparkles className="h-5 w-5" />
          </span>
          <h1 className="serif text-[30px] font-medium leading-tight tracking-tight">
            Quick setup
          </h1>
        </div>
        <p className="mb-8 text-[13px] leading-relaxed text-[var(--color-fg-muted)]">
          Daja works entirely with your own LLM API key. One key powers every AI feature: market
          research, daily briefing, portfolio reviewer, journal coach, earnings analyst, assistant
          chat — all of it. Nothing ever leaves your machine except the requests to your chosen
          provider.
        </p>

        <div className="mb-6 grid grid-cols-1 gap-2 md:grid-cols-3">
          {PROVIDERS.map((p) => {
            const installed = keys.find((k) => k.provider === p.id)?.configured ?? false
            return (
              <button
                key={p.id}
                onClick={() => setProvider(p)}
                className={cn(
                  'rounded-xl border p-3 text-left transition-colors',
                  provider.id === p.id
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
                    : 'border-[var(--color-border)] bg-[var(--color-bg-elev)] hover:border-[var(--color-border-strong)]'
                )}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[12px] font-semibold">{p.name}</span>
                  {installed && <Check className="h-3 w-3 text-[var(--color-pos)]" />}
                </div>
                <div className="text-[10px] text-[var(--color-fg-muted)]">{p.tagline}</div>
              </button>
            )
          })}
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-5">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
            <Lock className="h-3 w-3" />
            Paste your {provider.name} API key
          </div>
          <p className="mb-3 text-[11px] text-[var(--color-fg-muted)]">
            Get one from{' '}
            <a
              href={provider.href}
              target="_blank"
              rel="noreferrer"
              className="text-[var(--color-accent)] underline"
            >
              {provider.href.replace(/^https?:\/\//, '')}
            </a>
            . It's encrypted with macOS Keychain / Windows Credential Manager via Electron
            safeStorage — never stored in plain text.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={provider.keyPrefix + '…'}
              className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 font-mono text-[12px] outline-none focus:border-[var(--color-accent)]"
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
            <button
              onClick={submit}
              disabled={busy || apiKey.trim().length === 0}
              className="flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-[12px] font-medium text-white disabled:opacity-40"
            >
              <Zap className="h-3.5 w-3.5" /> {busy ? 'Saving…' : 'Save & activate'}
            </button>
          </div>
          {error && (
            <div className="mt-2 rounded-md bg-[var(--color-neg)]/10 px-2 py-1 text-[11px] text-[var(--color-neg)]">
              {error}
            </div>
          )}
          {hasKey && (
            <div className="mt-3 flex items-center gap-2 rounded-md bg-[var(--color-pos)]/10 px-3 py-2 text-[11px] text-[var(--color-pos)]">
              <Check className="h-3 w-3" /> {provider.name} key is installed.
              {allConfigured
                ? ' All modules route to this provider.'
                : ' You can still wire other modules to different providers in Settings.'}
            </div>
          )}
        </div>

        <div className="mt-6 text-[11px] text-[var(--color-fg-muted)]">
          Power-user notes:
          <ul className="mt-2 list-disc space-y-0.5 pl-4">
            <li>
              One key is enough. You can mix providers per module in{' '}
              <button
                onClick={() => navigate('/settings')}
                className="text-[var(--color-accent)] underline"
              >
                Settings
              </button>{' '}
              later.
            </li>
            <li>
              Market data (quotes, fundamentals, news, options) comes from Yahoo Finance — no key
              required, no account needed.
            </li>
            <li>
              Crypto, treasuries, FX, commodities, SEC filings — all free sources, no key required.
            </li>
          </ul>
        </div>

        {!hasAnyKey && !hasKey && (
          <div className="mt-6 rounded-lg border border-dashed border-[var(--color-border)] p-3 text-[11px] text-[var(--color-fg-muted)]">
            <strong className="text-[var(--color-fg)]">Skip for now?</strong> Everything non-AI
            works without a key — watchlist, charts, fundamentals, technicals, portfolio tracking,
            exit signals, stress tests, screener. AI panels will just show "configure a key to
            enable".
          </div>
        )}
      </div>
    </div>
  )
}
