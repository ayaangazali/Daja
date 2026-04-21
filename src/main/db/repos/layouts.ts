import { getDb } from '../client'

export interface DashboardLayout {
  id: number
  module: string
  name: string
  layout_config: string
  is_default: 0 | 1
  created_at: string
  updated_at: string
}

export const layoutsRepo = {
  list(module: string): DashboardLayout[] {
    return getDb()
      .prepare('SELECT * FROM dashboard_layouts WHERE module = ? ORDER BY is_default DESC, name')
      .all(module) as DashboardLayout[]
  },
  get(module: string, name: string): DashboardLayout | null {
    return (
      (getDb()
        .prepare('SELECT * FROM dashboard_layouts WHERE module = ? AND name = ?')
        .get(module, name) as DashboardLayout | undefined) ?? null
    )
  },
  save(module: string, name: string, config: unknown, isDefault = false): DashboardLayout {
    const existing = this.get(module, name)
    if (existing) {
      getDb()
        .prepare(
          "UPDATE dashboard_layouts SET layout_config = ?, is_default = ?, updated_at = datetime('now') WHERE id = ?"
        )
        .run(JSON.stringify(config), isDefault ? 1 : 0, existing.id)
      return this.get(module, name) as DashboardLayout
    }
    const info = getDb()
      .prepare(
        'INSERT INTO dashboard_layouts (module, name, layout_config, is_default) VALUES (?,?,?,?)'
      )
      .run(module, name, JSON.stringify(config), isDefault ? 1 : 0)
    return getDb()
      .prepare('SELECT * FROM dashboard_layouts WHERE id = ?')
      .get(info.lastInsertRowid) as DashboardLayout
  },
  remove(id: number): void {
    getDb().prepare('DELETE FROM dashboard_layouts WHERE id = ?').run(id)
  }
}
