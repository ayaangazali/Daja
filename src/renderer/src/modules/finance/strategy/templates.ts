import type { StrategyRule } from '../../../hooks/useStrategies'

export interface StrategyTemplate {
  key: string
  name: string
  description: string
  natural_language: string
  rules: StrategyRule[]
}

export const STRATEGY_TEMPLATES: StrategyTemplate[] = [
  {
    key: 'buffett_value',
    name: 'Buffett-style value',
    description: 'Cheap quality w/ durable moat',
    natural_language:
      'Prefer profitable businesses with strong ROE, low D/E, reasonable P/E and P/B, and rising margins.',
    rules: [
      { metric: 'roe', operator: '>', value: 15 },
      { metric: 'd_e', operator: '<', value: 0.8 },
      { metric: 'pe', operator: '<', value: 20 },
      { metric: 'p_b', operator: '<', value: 3 },
      { metric: 'net_margin', operator: '>', value: 10 },
      { metric: 'current_ratio', operator: '>', value: 1.2 }
    ]
  },
  {
    key: 'lynch_growth',
    name: 'Lynch-style growth',
    description: 'GARP: reasonable price for growth',
    natural_language:
      'Look for growth at a reasonable price: PEG under 1, strong earnings and revenue growth.',
    rules: [
      { metric: 'peg', operator: '<', value: 1 },
      { metric: 'eps_growth_yoy', operator: '>', value: 15 },
      { metric: 'rev_growth_yoy', operator: '>', value: 10 },
      { metric: 'roe', operator: '>', value: 10 }
    ]
  },
  {
    key: 'dividend_income',
    name: 'Dividend income',
    description: 'Sustainable yield + balance sheet',
    natural_language:
      'Dividend yield above 2.5%, reasonable payout ratio, stable leverage.',
    rules: [
      { metric: 'div_yield', operator: '>', value: 2.5 },
      { metric: 'd_e', operator: '<', value: 1.5 },
      { metric: 'roe', operator: '>', value: 8 }
    ]
  },
  {
    key: 'high_growth_tech',
    name: 'High-growth tech',
    description: 'Hypergrowth w/ margin expansion',
    natural_language: 'Rev growth >25%, gross margins >50%, insider skin in the game.',
    rules: [
      { metric: 'rev_growth_yoy', operator: '>', value: 25 },
      { metric: 'gross_margin', operator: '>', value: 50 },
      { metric: 'op_margin', operator: '>', value: 0 },
      { metric: 'insider_pct', operator: '>', value: 1 }
    ]
  },
  {
    key: 'short_squeeze',
    name: 'Short squeeze radar',
    description: 'High short interest + institutional',
    natural_language:
      'High short interest relative to float, institutional ownership for conviction.',
    rules: [
      { metric: 'short_pct', operator: '>', value: 10 },
      { metric: 'inst_pct', operator: '>', value: 40 }
    ]
  },
  {
    key: 'deep_value',
    name: 'Deep value / contrarian',
    description: 'Cheap on multiple axes',
    natural_language:
      'Very cheap on P/S, P/B, P/E simultaneously with positive current ratio.',
    rules: [
      { metric: 'p_s', operator: '<', value: 2 },
      { metric: 'p_b', operator: '<', value: 1.5 },
      { metric: 'pe', operator: '<', value: 12 },
      { metric: 'current_ratio', operator: '>', value: 1.5 }
    ]
  }
]
