import { useState } from 'react'
import { Pill, Plus, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react'
import {
  useAddMedication,
  useMedications,
  useRemoveMedication,
  useSetMedActive
} from '../../hooks/useHealth'
import { cn } from '../../lib/cn'

export function MedicationTracker(): React.JSX.Element {
  const { data: meds = [] } = useMedications()
  const add = useAddMedication()
  const setActive = useSetMedActive()
  const rem = useRemoveMedication()

  const [form, setForm] = useState({
    name: '',
    dosage: '',
    frequency: '',
    purpose: '',
    start_date: new Date().toISOString().slice(0, 10),
    notes: ''
  })

  const submit = (): void => {
    if (!form.name.trim()) return
    add.mutate(
      {
        name: form.name,
        dosage: form.dosage || null,
        frequency: form.frequency || null,
        purpose: form.purpose || null,
        start_date: form.start_date || null,
        end_date: null,
        side_effects: null,
        notes: form.notes || null
      },
      {
        onSuccess: () => setForm({ name: '', dosage: '', frequency: '', purpose: '', start_date: new Date().toISOString().slice(0, 10), notes: '' })
      }
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-3 p-4">
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
        <div className="mb-2 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <Plus className="h-3 w-3" /> Add medication
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Name"
            className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-[11px]"
          />
          <input
            value={form.dosage}
            onChange={(e) => setForm({ ...form, dosage: e.target.value })}
            placeholder="Dosage"
            className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-[11px]"
          />
          <input
            value={form.frequency}
            onChange={(e) => setForm({ ...form, frequency: e.target.value })}
            placeholder="2x daily"
            className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-[11px]"
          />
          <input
            value={form.purpose}
            onChange={(e) => setForm({ ...form, purpose: e.target.value })}
            placeholder="Purpose"
            className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-[11px]"
          />
          <input
            type="date"
            value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-[11px]"
          />
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Notes (optional)"
            className="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-[11px]"
          />
          <button
            onClick={submit}
            disabled={!form.name || add.isPending}
            className="rounded bg-[var(--color-info)] px-3 py-1 text-[11px] font-medium text-white disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)]">
        <div className="border-b border-[var(--color-border)] px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          Medications ({meds.length})
        </div>
        {meds.length === 0 && (
          <div className="p-4 text-center text-[11px] text-[var(--color-fg-muted)]">
            No medications logged.
          </div>
        )}
        {meds.map((m) => (
          <div
            key={m.id}
            className={cn(
              'group flex items-center gap-3 border-b border-[var(--color-border)] px-3 py-2 text-[11px] last:border-0',
              m.is_active === 0 && 'opacity-50'
            )}
          >
            <Pill className="h-3 w-3 text-[var(--color-fg-muted)]" />
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{m.name}</div>
              <div className="flex items-center gap-2 text-[10px] text-[var(--color-fg-muted)]">
                {m.dosage && <span>{m.dosage}</span>}
                {m.frequency && <span>· {m.frequency}</span>}
                {m.purpose && <span>· {m.purpose}</span>}
              </div>
            </div>
            <button
              onClick={() =>
                setActive.mutate({ id: m.id, active: m.is_active === 1 ? 0 : 1 })
              }
              className="text-[var(--color-fg-muted)] hover:text-[var(--color-info)]"
            >
              {m.is_active === 1 ? (
                <ToggleRight className="h-4 w-4 text-[var(--color-pos)]" />
              ) : (
                <ToggleLeft className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={() => rem.mutate(m.id)}
              className="opacity-0 transition-opacity group-hover:opacity-100"
            >
              <Trash2 className="h-3 w-3 text-[var(--color-fg-muted)] hover:text-[var(--color-neg)]" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
