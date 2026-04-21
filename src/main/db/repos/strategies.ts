import { getDb } from '../client'

export interface StrategyRule {
  metric: string
  operator: '>' | '>=' | '<' | '<=' | '==' | '!=' | 'between'
  value: number | [number, number]
  label?: string
}

export interface Strategy {
  id: number
  name: string
  description: string | null
  rules: StrategyRule[]
  natural_language: string | null
  asset_classes: string[]
  is_active: 0 | 1
  backtest_results: string | null
  created_at: string
  updated_at: string
}

interface Row {
  id: number
  name: string
  description: string | null
  rules: string
  natural_language: string | null
  asset_classes: string
  is_active: 0 | 1
  backtest_results: string | null
  created_at: string
  updated_at: string
}

function hydrate(r: Row): Strategy {
  return {
    ...r,
    rules: JSON.parse(r.rules) as StrategyRule[],
    asset_classes: JSON.parse(r.asset_classes) as string[]
  }
}

export const strategiesRepo = {
  list(): Strategy[] {
    const rows = getDb().prepare('SELECT * FROM strategies ORDER BY updated_at DESC').all() as Row[]
    return rows.map(hydrate)
  },
  listActive(): Strategy[] {
    const rows = getDb()
      .prepare('SELECT * FROM strategies WHERE is_active = 1 ORDER BY updated_at DESC')
      .all() as Row[]
    return rows.map(hydrate)
  },
  get(id: number): Strategy | null {
    const r = getDb().prepare('SELECT * FROM strategies WHERE id = ?').get(id) as Row | undefined
    return r ? hydrate(r) : null
  },
  add(s: {
    name: string
    description?: string
    rules: StrategyRule[]
    natural_language?: string
    asset_classes?: string[]
  }): Strategy {
    const info = getDb()
      .prepare(
        `INSERT INTO strategies (name, description, rules, natural_language, asset_classes) VALUES (?,?,?,?,?)`
      )
      .run(
        s.name,
        s.description ?? null,
        JSON.stringify(s.rules),
        s.natural_language ?? null,
        JSON.stringify(s.asset_classes ?? ['stock'])
      )
    return this.get(info.lastInsertRowid as number) as Strategy
  },
  update(
    id: number,
    patch: Partial<Omit<Strategy, 'id' | 'created_at' | 'updated_at'>>
  ): Strategy | null {
    const cur = this.get(id)
    if (!cur) return null
    const merged: Strategy = {
      ...cur,
      ...patch,
      rules: patch.rules ?? cur.rules,
      asset_classes: patch.asset_classes ?? cur.asset_classes
    } as Strategy
    getDb()
      .prepare(
        `UPDATE strategies SET name=?, description=?, rules=?, natural_language=?, asset_classes=?, is_active=?, backtest_results=?, updated_at=datetime('now') WHERE id=?`
      )
      .run(
        merged.name,
        merged.description,
        JSON.stringify(merged.rules),
        merged.natural_language,
        JSON.stringify(merged.asset_classes),
        merged.is_active,
        merged.backtest_results,
        id
      )
    return this.get(id)
  },
  remove(id: number): void {
    getDb().prepare('DELETE FROM strategies WHERE id = ?').run(id)
  }
}
