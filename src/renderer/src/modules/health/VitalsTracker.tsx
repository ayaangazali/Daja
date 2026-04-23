import { useState } from 'react'
import { useAddHealthLog } from '../../hooks/useHealth'

/**
 * Physiological plausibility ranges. These are *warn* thresholds — we permit
 * entry but surface a clinical-safety banner. Values outside these ranges
 * usually indicate a typo (e.g., °C entered in °F field).
 */
const RANGES = {
  temperatureF: { min: 95, max: 108, name: 'Temperature (°F)' },
  temperatureC: { min: 35, max: 42, name: 'Temperature (°C)' },
  heart_rate: { min: 30, max: 220, name: 'Heart rate' },
  bp_systolic: { min: 60, max: 250, name: 'BP systolic' },
  bp_diastolic: { min: 30, max: 150, name: 'BP diastolic' },
  weightLbs: { min: 40, max: 700, name: 'Weight (lbs)' },
  weightKg: { min: 18, max: 320, name: 'Weight (kg)' }
}

function validate(form: {
  temperature: number
  temperature_unit: string
  heart_rate: number
  blood_pressure_systolic: number
  blood_pressure_diastolic: number
  weight: number
  weight_unit: string
}): string[] {
  const errs: string[] = []
  const tempRange = form.temperature_unit === 'C' ? RANGES.temperatureC : RANGES.temperatureF
  if (form.temperature < tempRange.min || form.temperature > tempRange.max) {
    errs.push(`${tempRange.name} ${form.temperature} is outside ${tempRange.min}–${tempRange.max}`)
  }
  if (form.heart_rate < RANGES.heart_rate.min || form.heart_rate > RANGES.heart_rate.max) {
    errs.push(`Heart rate ${form.heart_rate} bpm is outside ${RANGES.heart_rate.min}–${RANGES.heart_rate.max}`)
  }
  if (
    form.blood_pressure_systolic < RANGES.bp_systolic.min ||
    form.blood_pressure_systolic > RANGES.bp_systolic.max
  ) {
    errs.push(`BP systolic ${form.blood_pressure_systolic} is outside ${RANGES.bp_systolic.min}–${RANGES.bp_systolic.max}`)
  }
  if (
    form.blood_pressure_diastolic < RANGES.bp_diastolic.min ||
    form.blood_pressure_diastolic > RANGES.bp_diastolic.max
  ) {
    errs.push(`BP diastolic ${form.blood_pressure_diastolic} is outside ${RANGES.bp_diastolic.min}–${RANGES.bp_diastolic.max}`)
  }
  if (form.blood_pressure_systolic <= form.blood_pressure_diastolic) {
    errs.push(`Systolic must be greater than diastolic (got ${form.blood_pressure_systolic}/${form.blood_pressure_diastolic})`)
  }
  const wRange = form.weight_unit === 'kg' ? RANGES.weightKg : RANGES.weightLbs
  if (form.weight < wRange.min || form.weight > wRange.max) {
    errs.push(`${wRange.name} ${form.weight} is outside ${wRange.min}–${wRange.max}`)
  }
  return errs
}

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
  const [warnings, setWarnings] = useState<string[]>([])
  const [confirmOverride, setConfirmOverride] = useState(false)

  const submit = (): void => {
    const errs = validate(form)
    if (errs.length > 0 && !confirmOverride) {
      setWarnings(errs)
      return
    }
    setWarnings([])
    setConfirmOverride(false)
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
            onChange={(e) => setForm({ ...form, blood_pressure_systolic: Number(e.target.value) })}
            className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-2 py-1.5 font-mono text-[11px]"
          />
        </Field>
        <Field label="BP Diastolic">
          <input
            type="number"
            value={form.blood_pressure_diastolic}
            onChange={(e) => setForm({ ...form, blood_pressure_diastolic: Number(e.target.value) })}
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
      {warnings.length > 0 && (
        <div className="rounded-md border border-[var(--color-warn)]/40 bg-[var(--color-warn)]/10 p-3 text-[11px] text-[var(--color-warn)]">
          <div className="mb-1 font-semibold">These values look out of the usual range:</div>
          <ul className="ml-4 list-disc space-y-0.5">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => {
                setConfirmOverride(true)
                setTimeout(submit, 0)
              }}
              className="rounded bg-[var(--color-warn)] px-2 py-1 text-[10px] font-medium text-white"
            >
              Save anyway
            </button>
            <button
              onClick={() => setWarnings([])}
              className="rounded border border-[var(--color-border)] px-2 py-1 text-[10px]"
            >
              Go back + edit
            </button>
          </div>
        </div>
      )}
      <button
        onClick={submit}
        disabled={add.isPending}
        aria-busy={add.isPending}
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
