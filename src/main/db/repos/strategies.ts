import { getDb } from '../client'
import { z } from 'zod'

/** Metrics a rule can reference. Keep in sync with the scorer in the renderer. */
export const STRATEGY_METRICS = [
  // valuation
  'trailingPE',
  'forwardPE',
  'pegRatio',
  'priceToSales',
  'priceToBook',
  'priceToFcf',
  'marketCap',
  // growth
  'revenueGrowth',
  'earningsGrowth',
  // margins
  'profitMargins',
  'operatingMargins',
  'grossMargins',
  // balance
  'debtToEquity',
  'currentRatio',
  'totalCash',
  'totalDebt',
  // returns
  'returnOnEquity',
  'returnOnAssets',
  // yields
  'dividendYield',
  'payoutRatio',
  // ownership
  'insiderPercent',
  'institutionalPercent',
  'shortPercent',
  // price action
  'changePercent',
  'price'
] as const
export type StrategyMetric = (typeof STRATEGY_METRICS)[number]

export const StrategyRuleSchema = z
  .object({
    metric: z.enum(STRATEGY_METRICS),
    operator: z.enum(['>', '>=', '<', '<=', '==', '!=', 'between']),
    value: z.union([z.number(), z.tuple([z.number(), z.number()])]),
    label: z.string().max(200).optional()
  })
  .superRefine((rule, ctx) => {
    // 'between' requires a tuple value, comparisons require a scalar.
    if (rule.operator === 'between') {
      if (!Array.isArray(rule.value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "operator 'between' requires value tuple [min, max]"
        })
      } else if (rule.value[0] > rule.value[1]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `between tuple min (${rule.value[0]}) must be ≤ max (${rule.value[1]})`
        })
      }
    } else {
      if (Array.isArray(rule.value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `operator '${rule.operator}' requires scalar value, got tuple`
        })
      }
    }
  })

export type StrategyRule = z.infer<typeof StrategyRuleSchema>
export const StrategyRuleArraySchema = z.array(StrategyRuleSchema)

/** Validate + coerce raw JSON into typed rules. Throws with human-friendly error. */
export function parseStrategyRules(raw: unknown): StrategyRule[] {
  const result = StrategyRuleArraySchema.safeParse(raw)
  if (result.success) return result.data
  const issues = result.error.issues.map((i) => `  • [${i.path.join('.')}] ${i.message}`).join('\n')
  throw new Error(`Strategy rules failed validation:\n${issues}`)
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
  // Defensive parse — DB blob could be corrupt, wash through the typed parser
  // rather than trusting an `as` cast. Yields a clear error at the repo
  // boundary instead of a mysterious crash deep inside the scorer.
  let rules: StrategyRule[] = []
  try {
    rules = parseStrategyRules(JSON.parse(r.rules))
  } catch (err) {
    console.error(`[strategies] row ${r.id} has invalid rules:`, err)
  }
  let assetClasses: string[] = ['stock']
  try {
    const parsed = JSON.parse(r.asset_classes)
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) {
      assetClasses = parsed
    }
  } catch {
    /* fall back to default */
  }
  return {
    ...r,
    rules,
    asset_classes: assetClasses
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
    // Validate rules before persisting — catches malformed AI output at the
    // trust boundary. Throws a descriptive error the caller can surface.
    const validated = parseStrategyRules(s.rules)
    const info = getDb()
      .prepare(
        `INSERT INTO strategies (name, description, rules, natural_language, asset_classes) VALUES (?,?,?,?,?)`
      )
      .run(
        s.name,
        s.description ?? null,
        JSON.stringify(validated),
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
    // Re-validate rules if the patch touches them
    const validatedRules = patch.rules != null ? parseStrategyRules(patch.rules) : cur.rules
    const merged: Strategy = {
      ...cur,
      ...patch,
      rules: validatedRules,
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
