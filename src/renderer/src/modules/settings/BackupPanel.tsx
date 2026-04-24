import { useState } from 'react'
import { Download, Upload, ShieldCheck, AlertTriangle } from 'lucide-react'
import { cn } from '../../lib/cn'

export function BackupPanel(): React.JSX.Element {
  const [busy, setBusy] = useState<'none' | 'exporting' | 'restoring'>('none')
  const [message, setMessage] = useState<{
    tone: 'ok' | 'warn' | 'err'
    text: string
    detail?: string
  } | null>(null)

  const handleExport = async (): Promise<void> => {
    setBusy('exporting')
    setMessage(null)
    try {
      const r = await window.daja.backup.export()
      if (r.ok && r.path) {
        setMessage({
          tone: 'ok',
          text: 'Backup saved',
          detail: r.path
        })
      } else {
        setMessage({ tone: 'warn', text: 'Export cancelled' })
      }
    } catch (err) {
      setMessage({
        tone: 'err',
        text: 'Export failed',
        detail: err instanceof Error ? err.message : String(err)
      })
    } finally {
      setBusy('none')
    }
  }

  const handleRestore = async (): Promise<void> => {
    if (
      !confirm(
        'Restoring will overwrite your local data. A pre-restore backup is saved alongside for recovery. Continue?'
      )
    )
      return
    setBusy('restoring')
    setMessage(null)
    try {
      const r = await window.daja.backup.restore()
      if (!r.ok) {
        setMessage({ tone: 'warn', text: 'Restore cancelled' })
        return
      }
      setMessage({
        tone: 'ok',
        text: r.requiresRestart ? 'Restored — restart the app to reopen the database' : 'Restored',
        detail: `From backup dated ${r.manifestDate?.slice(0, 10) ?? 'unknown'}. Files: ${r.restored?.join(', ')}. Pre-restore copies: ${r.backedUp?.length ?? 0}.`
      })
    } catch (err) {
      setMessage({
        tone: 'err',
        text: 'Restore failed',
        detail: err instanceof Error ? err.message : String(err)
      })
    } finally {
      setBusy('none')
    }
  }

  return (
    <section>
      <h2 className="text-sm font-semibold">Backup & restore</h2>
      <p className="mt-0.5 text-xs text-[var(--color-fg-muted)]">
        Export your local data (trades, journal, watchlist, health logs, preferences) as a single
        JSON file. Keys are NOT exported — they stay encrypted on this machine.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={handleExport}
          disabled={busy !== 'none'}
          aria-busy={busy === 'exporting'}
          className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-2 text-[11px] font-medium hover:bg-[var(--color-bg-tint)] disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5" />
          {busy === 'exporting' ? 'Exporting…' : 'Export backup'}
        </button>
        <button
          onClick={handleRestore}
          disabled={busy !== 'none'}
          aria-busy={busy === 'restoring'}
          className="flex items-center gap-2 rounded-md border border-[var(--color-warn)]/40 bg-[var(--color-warn)]/10 px-3 py-2 text-[11px] font-medium text-[var(--color-warn)] hover:bg-[var(--color-warn)]/20 disabled:opacity-40"
        >
          <Upload className="h-3.5 w-3.5" />
          {busy === 'restoring' ? 'Restoring…' : 'Restore from backup'}
        </button>
      </div>

      {message && (
        <div
          className={cn(
            'mt-3 rounded-md border px-3 py-2 text-[11px]',
            message.tone === 'ok' &&
              'border-[var(--color-pos)]/40 bg-[var(--color-pos)]/10 text-[var(--color-pos)]',
            message.tone === 'warn' &&
              'border-[var(--color-warn)]/40 bg-[var(--color-warn)]/10 text-[var(--color-warn)]',
            message.tone === 'err' &&
              'border-[var(--color-neg)]/40 bg-[var(--color-neg)]/10 text-[var(--color-neg)]'
          )}
        >
          <div className="flex items-center gap-1.5 font-medium">
            {message.tone === 'ok' && <ShieldCheck className="h-3 w-3" />}
            {(message.tone === 'warn' || message.tone === 'err') && (
              <AlertTriangle className="h-3 w-3" />
            )}
            {message.text}
          </div>
          {message.detail && (
            <div className="mt-1 break-all font-mono text-[10px] text-[var(--color-fg-muted)]">
              {message.detail}
            </div>
          )}
        </div>
      )}

      <p className="mt-3 text-[10px] text-[var(--color-fg-muted)]">
        On restore, existing files are kept alongside as{' '}
        <code>*.pre-restore-&lt;timestamp&gt;</code> for manual recovery.
      </p>
    </section>
  )
}
