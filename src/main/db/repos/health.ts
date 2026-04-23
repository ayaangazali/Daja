import { getDb } from '../client'

export interface HealthLog {
  id: number
  date: string
  symptoms: string | null
  severity: number | null
  temperature: number | null
  temperature_unit: string
  blood_pressure_systolic: number | null
  blood_pressure_diastolic: number | null
  heart_rate: number | null
  weight: number | null
  weight_unit: string
  sleep_hours: number | null
  sleep_quality: number | null
  mood: number | null
  energy: number | null
  water_intake_oz: number | null
  notes: string | null
  created_at: string
}

export const healthRepo = {
  list(): HealthLog[] {
    return getDb()
      .prepare('SELECT * FROM health_logs ORDER BY date DESC, id DESC')
      .all() as HealthLog[]
  },
  recent(days = 30): HealthLog[] {
    return getDb()
      .prepare(
        "SELECT * FROM health_logs WHERE date >= date('now', '-' || ? || ' days') ORDER BY date DESC"
      )
      .all(days) as HealthLog[]
  },
  add(
    log: Omit<HealthLog, 'id' | 'created_at' | 'temperature_unit' | 'weight_unit'> & {
      temperature_unit?: string
      weight_unit?: string
    }
  ): HealthLog {
    const info = getDb()
      .prepare(
        `INSERT INTO health_logs
         (date, symptoms, severity, temperature, temperature_unit, blood_pressure_systolic,
          blood_pressure_diastolic, heart_rate, weight, weight_unit, sleep_hours, sleep_quality,
          mood, energy, water_intake_oz, notes)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      )
      .run(
        log.date,
        log.symptoms,
        log.severity,
        log.temperature,
        log.temperature_unit ?? 'F',
        log.blood_pressure_systolic,
        log.blood_pressure_diastolic,
        log.heart_rate,
        log.weight,
        log.weight_unit ?? 'lbs',
        log.sleep_hours,
        log.sleep_quality,
        log.mood,
        log.energy,
        log.water_intake_oz,
        log.notes
      )
    return getDb()
      .prepare('SELECT * FROM health_logs WHERE id = ?')
      .get(info.lastInsertRowid) as HealthLog
  },
  remove(id: number): void {
    getDb().prepare('DELETE FROM health_logs WHERE id = ?').run(id)
  },
  update(id: number, patch: Partial<Omit<HealthLog, 'id' | 'created_at'>>): HealthLog {
    // Whitelist updatable columns to prevent caller-injected SQL identifiers.
    const updatable = new Set([
      'date',
      'symptoms',
      'severity',
      'temperature',
      'temperature_unit',
      'blood_pressure_systolic',
      'blood_pressure_diastolic',
      'heart_rate',
      'weight',
      'weight_unit',
      'sleep_hours',
      'sleep_quality',
      'mood',
      'energy',
      'water_intake_oz',
      'notes'
    ])
    const cols: string[] = []
    const vals: unknown[] = []
    for (const [k, v] of Object.entries(patch)) {
      if (!updatable.has(k)) continue
      cols.push(`${k} = ?`)
      vals.push(v)
    }
    if (cols.length === 0) {
      const row = getDb()
        .prepare('SELECT * FROM health_logs WHERE id = ?')
        .get(id) as HealthLog | undefined
      if (!row) throw new Error(`health_log ${id} not found`)
      return row
    }
    vals.push(id)
    getDb()
      .prepare(`UPDATE health_logs SET ${cols.join(', ')} WHERE id = ?`)
      .run(...vals)
    const row = getDb()
      .prepare('SELECT * FROM health_logs WHERE id = ?')
      .get(id) as HealthLog | undefined
    if (!row) throw new Error(`health_log ${id} not found after update`)
    return row
  }
}
