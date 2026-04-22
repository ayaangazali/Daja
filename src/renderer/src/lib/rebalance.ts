export interface RebalancePosition {
  ticker: string
  currentValue: number
  price: number
  targetWeight: number // 0..1
}

export interface RebalanceAction {
  ticker: string
  currentValue: number
  currentWeight: number
  targetWeight: number
  targetValue: number
  deltaValue: number // positive = buy, negative = sell
  deltaShares: number
  action: 'buy' | 'sell' | 'hold'
}

export interface RebalanceResult {
  actions: RebalanceAction[]
  totalTrades: number
  totalVolume: number // |delta| summed
  outOfWhackMax: number // largest absolute weight deviation
  unallocatedWeight: number // sum of targetWeight across positions
}

/**
 * Compute buy/sell actions to move from current allocation to target weights.
 *
 * Extra cash from user.cash is distributed proportionally to any positive
 * target deltas. Under/over-target within threshold counted as 'hold'.
 */
export function computeRebalance(
  positions: RebalancePosition[],
  opts: { cash?: number; holdThresholdPct?: number } = {}
): RebalanceResult {
  const cash = opts.cash ?? 0
  const threshold = (opts.holdThresholdPct ?? 0.5) / 100
  const currentTotal = positions.reduce((s, p) => s + p.currentValue, 0) + cash
  const targetWeightSum = positions.reduce((s, p) => s + p.targetWeight, 0)

  const actions: RebalanceAction[] = positions.map((p) => {
    const currentWeight = currentTotal > 0 ? p.currentValue / currentTotal : 0
    const targetValue = p.targetWeight * currentTotal
    const deltaValue = targetValue - p.currentValue
    const deltaShares = p.price > 0 ? deltaValue / p.price : 0
    const weightDrift = Math.abs(p.targetWeight - currentWeight)
    let action: RebalanceAction['action'] = 'hold'
    if (weightDrift > threshold) {
      action = deltaValue > 0 ? 'buy' : 'sell'
    }
    return {
      ticker: p.ticker,
      currentValue: p.currentValue,
      currentWeight,
      targetWeight: p.targetWeight,
      targetValue,
      deltaValue,
      deltaShares,
      action
    }
  })

  const totalTrades = actions.filter((a) => a.action !== 'hold').length
  const totalVolume = actions.reduce((s, a) => s + Math.abs(a.deltaValue), 0)
  const outOfWhackMax = actions.reduce(
    (max, a) => Math.max(max, Math.abs(a.targetWeight - a.currentWeight)),
    0
  )

  return {
    actions,
    totalTrades,
    totalVolume,
    outOfWhackMax,
    unallocatedWeight: 1 - targetWeightSum
  }
}
