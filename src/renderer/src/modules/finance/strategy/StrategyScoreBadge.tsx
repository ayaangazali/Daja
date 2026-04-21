import { useMemo } from 'react'
import { useActiveStrategies, type Strategy, type StrategyRule } from '../../../hooks/useStrategies'
import type { Fundamentals } from '../../../hooks/useFundamentals'
import { cn } from '../../../lib/cn'

function getMetric(f: Fundamentals, key: string): number | null {
  const map: Record<string, number | null> = {
    market_cap: f.marketCap,
    rev_growth_yoy: f.revenueGrowth != null ? f.revenueGrowth * 100 : null,
    eps_growth_yoy: f.earningsGrowth != null ? f.earningsGrowth * 100 : null,
    pe: f.trailingPE,
    fwd_pe: f.forwardPE,
    peg: f.pegRatio,
    p_s: f.priceToSales,
    p_b: f.priceToBook,
    p_fcf: f.priceToFcf,
    d_e: f.debtToEquity,
    current_ratio: f.currentRatio,
    gross_margin: f.grossMargins != null ? f.grossMargins * 100 : null,
    op_margin: f.operatingMargins != null ? f.operatingMargins * 100 : null,
    net_margin: f.profitMargins != null ? f.profitMargins * 100 : null,
    roe: f.returnOnEquity != null ? f.returnOnEquity * 100 : null,
    roa: f.returnOnAssets != null ? f.returnOnAssets * 100 : null,
    div_yield: f.dividendYield != null ? f.dividendYield * 100 : null,
    insider_pct: f.insiderPercent != null ? f.insiderPercent * 100 : null,
    inst_pct: f.institutionalPercent != null ? f.institutionalPercent * 100 : null,
    short_pct: f.shortPercent != null ? f.shortPercent * 100 : null
  }
  return map[key] ?? null
}

function evalRule(rule: StrategyRule, value: number | null): 'pass' | 'fail' | 'unknown' {
  if (value == null) return 'unknown'
  if (rule.operator === 'between' && Array.isArray(rule.value)) {
    const [lo, hi] = rule.value
    return value >= lo && value <= hi ? 'pass' : 'fail'
  }
  const target = Array.isArray(rule.value) ? rule.value[0] : rule.value
  switch (rule.operator) {
    case '>':
      return value > target ? 'pass' : 'fail'
    case '>=':
      return value >= target ? 'pass' : 'fail'
    case '<':
      return value < target ? 'pass' : 'fail'
    case '<=':
      return value <= target ? 'pass' : 'fail'
    case '==':
      return value === target ? 'pass' : 'fail'
    case '!=':
      return value !== target ? 'pass' : 'fail'
  }
  return 'unknown'
}

export interface StrategyScore {
  strategy: Strategy
  results: { rule: StrategyRule; metric: number | null; status: 'pass' | 'fail' | 'unknown' }[]
  score: number
}

export function useStrategyScores(f: Fundamentals | undefined): StrategyScore[] {
  const { data: strategies = [] } = useActiveStrategies()
  return useMemo<StrategyScore[]>(() => {
    if (!f) return []
    return strategies.map((s) => {
      const results = s.rules.map((r) => {
        const metric = getMetric(f, r.metric)
        return { rule: r, metric, status: evalRule(r, metric) }
      })
      const considered = results.filter((r) => r.status !== 'unknown')
      const passed = considered.filter((r) => r.status === 'pass').length
      const score = considered.length === 0 ? 0 : Math.round((passed / considered.length) * 100)
      return { strategy: s, results, score }
    })
  }, [strategies, f])
}

export function StrategyScoreBadge({
  fundamentals
}: {
  fundamentals: Fundamentals | undefined
}): React.JSX.Element | null {
  const scores = useStrategyScores(fundamentals)
  if (scores.length === 0) return null
  const best = scores.reduce((a, b) => (b.score > a.score ? b : a))
  const tone =
    best.score >= 70 ? 'pos' : best.score <= 40 ? 'neg' : 'warn'
  return (
    <div
      className={cn(
        'rounded px-2 py-1 font-mono text-[10px] font-semibold',
        tone === 'pos' && 'bg-[var(--color-pos)]/15 text-[var(--color-pos)]',
        tone === 'neg' && 'bg-[var(--color-neg)]/15 text-[var(--color-neg)]',
        tone === 'warn' && 'bg-[var(--color-warn)]/15 text-[var(--color-warn)]'
      )}
      title={best.strategy.name}
    >
      Strategy: {best.score}/100
    </div>
  )
}
