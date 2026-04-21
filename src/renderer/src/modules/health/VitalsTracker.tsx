import { useState } from 'react'
import { useAddHealthLog } from '../../hooks/useHealth'

export function VitalsTracker(): React.JSX.Element {
  const add = useAddHealthLog()
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    temperature: 98.6,
    temperature_unit: 'F',
    blood_pressure_systolic: 120,
    blood_pressure_diastolic: 80,
    heart_rate: 70,
    weight: 160,
    weight_unit: 'lbs'
  })
  const [saved, setSaved] = useState(false)

  const submit = (): void => {
    add.mutate(
      {
        date: form.date,
        temperature: form.temperature,
        temperature_unit: form.temperature_unit,
        blood_pressure_systolic: form.blood_pressure_systolic,
        blood_pressure_diastolic: form.blood_pressure_diastolic,
        heart_rate: form.heart_rate,
        weight: form.weight,
        weight_unit: form.weight_unit
      },
      {
        onSuccess: () => {
          setSaved(true)
          setTimeout(() => setSaved(false), 2000)
        }
      }
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-3 p-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date">
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-2 py-1.5 text-[11px]"
          />
        </Field>
        <div />
        <Field label="Temperature">
          <div className="flex gap-1">
            <input
              type="number"
              step="0.1"
              value={form.temperature}
              onChange={(e) => setForm({ ...form, temperature: Number(e.target.value) })}
              className="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-2 py-1.5 font-mono text-[11px]"
            />
            <select
              value={form.temperature_unit}
              onChange={(e) => setForm({ ...form, temperature_unit: e.target.value })}
              className="rounded border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-1 text-[11px]"
            >
              <option>F</option>
              <option>C</option>
            </select>
          </div>
        </Field>
        <Field label="Heart Rate (bpm)">
          <input
            type="number"
            value={form.heart_rate}
            onChange={(e) => setForm({ ...form, heart_rate: Number(e.target.value) })}
            className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-2 py-1.5 font-mono text-[11px]"
          />
        </Field>
        <Field label="BP Systolic">
          <input
            type="number"
            value={form.blood_pressure_systolic}
            onChange={(e) =>
              setForm({ ...form, blood_pressure_systolic: Number(e.target.value) })
            }
            className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-2 py-1.5 font-mono text-[11px]"
          />
        </Field>
        <Field label="BP Diastolic">
          <input
            type="number"
            value={form.blood_pressure_diastolic}
            onChange={(e) =>
              setForm({ ...form, blood_pressure_diastolic: Number(e.target.value) })
            }
            className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-2 py-1.5 font-mono text-[11px]"
          />
        </Field>
        <Field label="Weight">
          <div className="flex gap-1">
            <input
              type="number"
              step="0.1"
              value={form.weight}
              onChange={(e) => setForm({ ...form, weight: Number(e.target.value) })}
              className="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-2 py-1.5 font-mono text-[11px]"
            />
            <select
              value={form.weight_unit}
              onChange={(e) => setForm({ ...form, weight_unit: e.target.value })}
              className="rounded border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-1 text-[11px]"
            >
              <option>lbs</option>
              <option>kg</option>
            </select>
          </div>
        </Field>
      </div>
      <button
        onClick={submit}
        disabled={add.isPending}
        className="rounded bg-[var(--color-info)] px-4 py-2 text-[11px] font-medium text-white disabled:opacity-40"
      >
        {add.isPending ? 'Saving…' : 'Save Vitals'}
      </button>
      {saved && (
        <div className="rounded bg-[var(--color-pos)]/15 p-2 text-[11px] text-[var(--color-pos)]">
          Saved.
        </div>
      )}
    </div>
  )
}

function Field({
  label,
  children
}: {
  label: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <label className="block">
      <div className="mb-1 text-[10px] text-[var(--color-fg-muted)]">{label}</div>
      {children}
    </label>
  )
}
