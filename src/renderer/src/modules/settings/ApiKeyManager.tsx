import { CheckCircle2, Eye, EyeOff, Loader2, Trash2, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AI_PROVIDERS, DATA_PROVIDERS } from '../../lib/constants'
import type { KeyMeta, ProviderId } from '../../../../shared/ipc'
import { cn } from '../../lib/cn'
import { useDeleteKey, useKeys, useSetKey, useTestKey } from '../../hooks/useKeyVault'

export function ApiKeyManager(): React.JSX.Element {
  const { data: keys, isLoading } = useKeys()
  return (
    <section className="mt-6">
      <h2 className="text-sm font-semibold">API Keys</h2>
      <p className="mt-0.5 text-xs text-[var(--color-fg-muted)]">
        Stored encrypted via OS keychain. Keys never leave your machine.
      </p>
      <div className="mt-3 space-y-4">
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
            AI Providers
          </div>
          {AI_PROVIDERS.map((p) => (
            <KeyRow
              key={p.id}
              providerId={p.id}
              name={p.name}
              meta={keys?.find((k) => k.provider === p.id)}
              loading={isLoading}
            />
          ))}
        </div>
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
            Financial Data Sources
          </div>
          {DATA_PROVIDERS.map((p) => (
            <KeyRow
              key={p.id}
              providerId={p.id}
              name={p.name}
              meta={keys?.find((k) => k.provider === p.id)}
              loading={isLoading}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

/** Per-provider key format expectations. `hint` is surfaced on invalid input. */
const KEY_FORMATS: Record<string, { match: RegExp; hint: string }> = {
  anthropic: { match: /^sk-ant-/, hint: 'Anthropic keys start with `sk-ant-`' },
  openai: { match: /^sk-/, hint: 'OpenAI keys start with `sk-`' },
  gemini: { match: /^AIza[0-9A-Za-z_-]{33,}$/, hint: 'Gemini keys start with `AIza` and are ~39 chars' },
  grok: { match: /^xai-/, hint: 'Grok keys start with `xai-`' },
  perplexity: { match: /^pplx-/, hint: 'Perplexity keys start with `pplx-`' },
  supermemory: { match: /^sm_/, hint: 'Supermemory keys start with `sm_`' },
  fmp: { match: /.{20,}/, hint: 'FMP keys are typically 32+ characters' },
  finnhub: { match: /.{16,}/, hint: 'Finnhub keys are typically 40 characters' }
}

function validateKey(providerId: string, key: string): string | null {
  const fmt = KEY_FORMATS[providerId]
  if (!fmt) return null
  if (key.length < 10) return 'Key looks too short — check for truncation on paste'
  if (/\s/.test(key)) return 'Key contains whitespace — paste may have included a newline'
  if (!fmt.match.test(key)) return fmt.hint
  return null
}

function KeyRow({
  providerId,
  name,
  meta,
  loading
}: {
  providerId: ProviderId
  name: string
  meta: KeyMeta | undefined
  loading: boolean
}): React.JSX.Element {
  const [value, setValue] = useState('')
  const [reveal, setReveal] = useState(false)
  const setMut = useSetKey()
  const delMut = useDeleteKey()
  const testMut = useTestKey()

  const configured = !!meta?.configured
  const testStatus = useMemo(() => {
    if (testMut.isPending) return 'testing'
    if (meta?.lastTestResult === 'success') return 'success'
    if (meta?.lastTestResult === 'error') return 'error'
    return 'idle'
  }, [testMut.isPending, meta])

  const trimmed = value.trim()
  const validationError = trimmed ? validateKey(providerId, trimmed) : null

  const save = (): void => {
    if (!trimmed || validationError) return
    setMut.mutate({ provider: providerId, key: trimmed }, { onSuccess: () => setValue('') })
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md border px-3 py-2',
        'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
      )}
    >
      <div className="w-40 text-xs font-medium">{name}</div>
      {configured ? (
        <div className="flex flex-1 items-center gap-2 text-xs text-[var(--color-fg-muted)]">
          <span className="font-mono">••••••••</span>
          {meta?.lastTested && (
            <span className="text-[10px]">
              Tested {new Date(meta.lastTested).toLocaleDateString()}
            </span>
          )}
        </div>
      ) : (
        <div className="flex flex-1 items-center gap-2">
          <div className="flex flex-1 flex-col gap-1">
            <div className="flex items-center gap-2">
              <input
                type={reveal ? 'text' : 'password'}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={loading ? '...' : `Paste ${name} API key`}
                aria-invalid={validationError != null}
                aria-describedby={validationError ? `key-err-${providerId}` : undefined}
                className={cn(
                  'flex-1 rounded border bg-[var(--color-bg)] px-2 py-1 text-xs outline-none',
                  'placeholder:text-[var(--color-fg-muted)]',
                  validationError
                    ? 'border-[var(--color-neg)] focus:border-[var(--color-neg)]'
                    : 'border-[var(--color-border)] focus:border-[var(--color-info)]'
                )}
              />
              <button
                onClick={() => setReveal(!reveal)}
                aria-label={reveal ? 'Hide key' : 'Reveal key'}
                className="p-1 text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
              >
                {reveal ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={save}
                disabled={!trimmed || !!validationError || setMut.isPending}
                className="rounded bg-[var(--color-info)] px-2 py-1 text-xs font-medium text-white disabled:opacity-40"
              >
                Save
              </button>
            </div>
            {validationError && (
              <div id={`key-err-${providerId}`} className="text-[10px] text-[var(--color-neg)]">
                {validationError}
              </div>
            )}
          </div>
        </div>
      )}
      {configured && (
        <>
          <button
            onClick={() => testMut.mutate(providerId)}
            disabled={testMut.isPending}
            className="flex items-center gap-1 rounded border border-[var(--color-border)] px-2 py-1 text-xs hover:bg-[var(--color-bg)]"
          >
            {testStatus === 'testing' && <Loader2 className="h-3 w-3 animate-spin" />}
            {testStatus === 'success' && (
              <CheckCircle2 className="h-3 w-3 text-[var(--color-pos)]" />
            )}
            {testStatus === 'error' && <XCircle className="h-3 w-3 text-[var(--color-neg)]" />}
            Test
          </button>
          <button
            onClick={() => delMut.mutate(providerId)}
            className="p-1 text-[var(--color-fg-muted)] hover:text-[var(--color-neg)]"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  )
}
