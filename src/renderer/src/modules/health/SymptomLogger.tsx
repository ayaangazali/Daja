import { useState } from 'react'
import { useAddHealthLog } from '../../hooks/useHealth'
import { cn } from '../../lib/cn'

export function SymptomLogger(): React.JSX.Element {
  const add = useAddHealthLog()
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    symptoms: '',
    severity: 5,
    mood: 5,
    energy: 5,
    sleep_hours: 7,
    sleep_quality: 5,
    water_intake_oz: 64,
    notes: ''
  })
  const [saved, setSaved] = useState(false)

  const submit = (): void => {
    add.mutate(
      {
        date: form.date,
        symptoms: form.symptoms || null,
        severity: form.severity,
        mood: form.mood,
        energy: form.energy,
        sleep_hours: form.sleep_hours,
        sleep_quality: form.sleep_quality,
        water_intake_oz: form.water_intake_oz,
        notes: form.notes || null
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
      <Field label="Date">
        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-2 py-1.5 text-[11px]"
        />
      </Field>
      <Field label="Symptoms (comma-separated)">
        <input
          value={form.symptoms}
          onChange={(e) => setForm({ ...form, symptoms: e.target.value })}
          placeholder="headache, fatigue, sore throat"
          className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-2 py-1.5 text-[11px]"
        />
      </Field>
      <Slider
        label="Symptom Severity"
        value={form.severity}
        min={1}
        max={10}
        onChange={(v) => setForm({ ...form, severity: v })}
      />
      <div className="grid grid-cols-2 gap-3">
        <Slider
          label="Mood"
          value={form.mood}
          min={1}
          max={10}
          onChange={(v) => setForm({ ...form, mood: v })}
        />
        <Slider
          label="Energy"
          value={form.energy}
          min={1}
          max={10}
          onChange={(v) => setForm({ ...form, energy: v })}
        />
        <Slider
          label="Sleep Hours"
          value={form.sleep_hours}
          min={0}
          max={12}
          step={0.5}
          onChange={(v) => setForm({ ...form, sleep_hours: v })}
        />
        <Slider
          label="Sleep Quality"
          value={form.sleep_quality}
          min={1}
          max={10}
          onChange={(v) => setForm({ ...form, sleep_quality: v })}
        />
      </div>
      <Slider
        label="Water (oz)"
        value={form.water_intake_oz}
        min={0}
        max={150}
        onChange={(v) => setForm({ ...form, water_intake_oz: v })}
      />
      <Field label="Notes">
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={3}
          className="w-full resize-none rounded border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-2 py-1.5 text-[11px]"
        />
      </Field>
      <button
        onClick={submit}
        disabled={add.isPending}
        className="rounded bg-[var(--color-info)] px-4 py-2 text-[11px] font-medium text-white disabled:opacity-40"
      >
        {add.isPending ? 'Saving…' : 'Log Day'}
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

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
}): React.JSX.Element {
  return (
    <div>
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-[var(--color-fg-muted)]">{label}</span>
        <span className="font-mono tabular">{value}</span>
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn('mt-1 w-full')}
      />
    </div>
  )
}
