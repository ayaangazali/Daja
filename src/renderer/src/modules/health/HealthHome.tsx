import { AlertTriangle, Heart, Pill, Activity } from 'lucide-react'
import { Link } from 'react-router-dom'

export function HealthHome(): React.JSX.Element {
  return (
    <div className="h-full overflow-auto p-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="mb-4">
          <h1 className="text-xl font-semibold">Health tracker</h1>
          <p className="mt-1 text-[12px] text-[var(--color-fg-muted)]">
            Track vitals, medications, and symptoms over time. Data stays on this machine.
          </p>
        </div>

        {/* Medical disclaimer — legally important for a health-tracking tool. */}
        <div className="rounded-md border border-[var(--color-warn)]/40 bg-[var(--color-warn)]/10 p-4">
          <div className="mb-1 flex items-center gap-2 font-semibold text-[var(--color-warn)]">
            <AlertTriangle className="h-4 w-4" />
            Not medical advice
          </div>
          <p className="text-[11px] leading-relaxed text-[var(--color-fg)]">
            Daja's Health module is for personal tracking only. It is{' '}
            <strong>not a medical device</strong> and does not provide diagnosis, treatment, or
            clinical recommendations. Always consult a licensed healthcare provider for medical
            decisions. If you are experiencing a medical emergency, call your local emergency
            number.
          </p>
          <p className="mt-2 text-[10px] text-[var(--color-fg-muted)]">
            Data is stored locally in your app directory and encrypted at rest via the OS
            filesystem-level encryption (FileVault on macOS, BitLocker on Windows, LUKS on
            Linux). We do not transmit health data to any server.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Link
            to="/health/vitals"
            className="flex items-start gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-4 hover:border-[var(--color-accent)]"
          >
            <Activity className="h-5 w-5 text-[var(--color-accent)]" />
            <div>
              <div className="text-[13px] font-medium">Vitals</div>
              <div className="text-[10px] text-[var(--color-fg-muted)]">
                Temperature · BP · heart rate · weight
              </div>
            </div>
          </Link>
          <Link
            to="/health/medications"
            className="flex items-start gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-4 hover:border-[var(--color-accent)]"
          >
            <Pill className="h-5 w-5 text-[var(--color-accent)]" />
            <div>
              <div className="text-[13px] font-medium">Medications</div>
              <div className="text-[10px] text-[var(--color-fg-muted)]">
                Active meds · dosage · reminders
              </div>
            </div>
          </Link>
          <Link
            to="/health/timeline"
            className="flex items-start gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-4 hover:border-[var(--color-accent)]"
          >
            <Heart className="h-5 w-5 text-[var(--color-accent)]" />
            <div>
              <div className="text-[13px] font-medium">Timeline</div>
              <div className="text-[10px] text-[var(--color-fg-muted)]">
                Trends · charts · export
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
