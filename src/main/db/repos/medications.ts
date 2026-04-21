import { getDb } from '../client'

export interface Medication {
  id: number
  name: string
  dosage: string | null
  frequency: string | null
  purpose: string | null
  start_date: string | null
  end_date: string | null
  side_effects: string | null
  notes: string | null
  is_active: 0 | 1
  created_at: string
}

export const medicationsRepo = {
  list(): Medication[] {
    return getDb()
      .prepare('SELECT * FROM medications ORDER BY is_active DESC, created_at DESC')
      .all() as Medication[]
  },
  add(m: Omit<Medication, 'id' | 'created_at' | 'is_active'> & { is_active?: 0 | 1 }): Medication {
    const info = getDb()
      .prepare(
        `INSERT INTO medications (name, dosage, frequency, purpose, start_date, end_date, side_effects, notes, is_active)
         VALUES (?,?,?,?,?,?,?,?,?)`
      )
      .run(
        m.name,
        m.dosage,
        m.frequency,
        m.purpose,
        m.start_date,
        m.end_date,
        m.side_effects,
        m.notes,
        m.is_active ?? 1
      )
    return getDb()
      .prepare('SELECT * FROM medications WHERE id = ?')
      .get(info.lastInsertRowid) as Medication
  },
  setActive(id: number, active: 0 | 1): void {
    getDb().prepare('UPDATE medications SET is_active = ? WHERE id = ?').run(active, id)
  },
  remove(id: number): void {
    getDb().prepare('DELETE FROM medications WHERE id = ?').run(id)
  }
}
