/**
 * Entry Signal Engine — mirror of Exit Signals but detects bullish setups.
 * Ranks technical + fundamental conditions that historically precede up-moves
 * and produces a 0..100 score with BUY / WATCH / IGNORE verdict.
 */

import { sma, logReturns } from './indicators'
import { adx, bollinger, keltnerChannels, macd as macdSingle, rsiSeries } from './indicators2'
import { detectPatterns, type Candle } from './candlePatterns'
import { detectDivergences } from './divergence'
import { detectSRLevels } from './supportResistance'

export type Severity = 'low' | 'medium' | 'high' | 'critical'
export type Category = 'technical' | 'fundamental' | 'momentum' | 'value'

export interface EntrySignal {
  id: string
  category: Category
  severity: Severity
  confidence: number
  title: string
  rationale: string
  points: number
}

export interface EntryTechnicalInputs {
  bars: { high: number; low: number; close: number; open: number; volume: number; time: number }[]
}

export interface EntryFundamentalInputs {
  trailingPE?: number | null
  pegRatio?: number | null
  priceToBook?: number | null
  profitMargins?: number | null
  operatingMargins?: number | null
  revenueGrowth?: number | null
  earningsGrowth?: number | null
  debtToEquity?: number | null
  recommendationMean?: number | null
  targetMean?: number | null
  dividendYield?: number | null
  earningsHistory?: { quarter: string; surprisePercent: number | null }[]
  piotroskiScore?: number | null // 0..9
  altmanZ?: number | null
  insiderSignal?: 'bullish' | 'bearish' | 'mixed' | 'neutral'
  insiderScore?: number
}

export interface EntryEngineInputs {
  ticker: string
  currentPrice: number
  technical: EntryTechnicalInputs
  fundamental?: EntryFundamentalInputs
}

export interface EntryVerdict {
  score: number
  action: 'ignore' | 'watch' | 'buy'
  signals: EntrySignal[]
  headlineMessage: string
}

const SEVERITY_POINTS: Record<Severity, number> = {
  low: 5,
  medium: 15,
  high: 30,
  critical: 50
}

function pt(severity: Severity, confidence: number): number {
  return SEVERITY_POINTS[severity] * confidence
}

// ─── Technical bullish signals ──────────────────────────────────────────

function sigGoldenCross(closes: number[]): EntrySignal | null {
  if (closes.length < 201) return null
  const sma50Now = sma(closes, 50)
  const sma200Now = sma(closes, 200)
  const sma50Prev = sma(closes.slice(0, -1), 50)
  const sma200Prev = sma(closes.slice(0, -1), 200)
  if (sma50Now == null || sma200Now == null || sma50Prev == null || sma200Prev == null) return null
  if (sma50Now > sma200Now && sma50Prev <= sma200Prev) {
    return {
      id: 'golden_cross',
      category: 'technical',
      severity: 'high',
      confidence: 0.9,
      title: 'Golden Cross confirmed',
      rationale:
        '50-day SMA crossed above 200-day SMA — historic cyclical bull-market signal. Momentum aligning with long-term trend.',
      points: pt('high', 0.9)
    }
  }
  return null
}

function sigAbove200SMA(closes: number[]): EntrySignal | null {
  if (closes.length < 201) return null
  const sma200 = sma(closes, 200)
  const sma50 = sma(closes, 50)
  const last = closes[closes.length - 1]
  if (sma200 == null || sma50 == null) return null
  if (last > sma200 && sma50 > sma200 && last < sma50 * 1.05) {
    return {
      id: 'above_200sma_healthy',
      category: 'technical',
      severity: 'medium',
      confidence: 0.7,
      title: 'Price above 200-SMA with healthy pullback',
      rationale: `Price ${last.toFixed(2)} sits above 200-SMA ${sma200.toFixed(2)} but not extended above 50-SMA ${sma50.toFixed(2)} — buy-the-dip setup in an uptrend.`,
      points: pt('medium', 0.7)
    }
  }
  return null
}

function sigMacdBullCross(closes: number[]): EntrySignal | null {
  const curr = macdSingle(closes)
  const prev = macdSingle(closes.slice(0, -1))
  if (!curr || !prev) return null
  if (curr.macd > curr.signal && prev.macd <= prev.signal && curr.macd < 0) {
    return {
      id: 'macd_bull_cross_low',
      category: 'momentum',
      severity: 'high',
      confidence: 0.8,
      title: 'MACD bullish cross below zero',
      rationale:
        'MACD crossed above signal line while still in negative territory — early-cycle momentum reversal, high reward/risk setup.',
      points: pt('high', 0.8)
    }
  }
  if (curr.macd > curr.signal && prev.macd <= prev.signal) {
    return {
      id: 'macd_bull_cross',
      category: 'momentum',
      severity: 'medium',
      confidence: 0.7,
      title: 'MACD bullish crossover',
      rationale: 'MACD crossed above its signal line — trend-following confirmation.',
      points: pt('medium', 0.7)
    }
  }
  return null
}

function sigRsiOversoldBounce(closes: number[]): EntrySignal | null {
  const series = rsiSeries(closes, 14)
  const last = series[series.length - 1]
  const prev = series[series.length - 2]
  const prev2 = series[series.length - 3]
  if (last == null || prev == null || prev2 == null) return null
  if (prev2 <= 30 && prev > 30 && last > prev) {
    return {
      id: 'rsi_oversold_bounce',
      category: 'momentum',
      severity: 'high',
      confidence: 0.75,
      title: 'RSI bouncing out of oversold',
      rationale: `RSI left oversold territory (${prev2.toFixed(0)} → ${last.toFixed(0)}) and is turning up — classic mean-reversion entry.`,
      points: pt('high', 0.75)
    }
  }
  if (last < 30) {
    return {
      id: 'rsi_deep_oversold',
      category: 'momentum',
      severity: 'medium',
      confidence: 0.6,
      title: 'RSI deeply oversold',
      rationale: `RSI at ${last.toFixed(0)} — statistically stretched to the downside. Watch for reversal confirmation.`,
      points: pt('medium', 0.6)
    }
  }
  return null
}

function sigBullishDivergence(closes: number[]): EntrySignal | null {
  const rsiArr = rsiSeries(closes, 14)
  const divs = detectDivergences(closes, rsiArr, 60, 3)
  const recent = divs.filter((d) => d.type === 'bullish' && d.secondIdx >= closes.length - 20)
  if (recent.length === 0) return null
  return {
    id: 'bullish_divergence',
    category: 'momentum',
    severity: 'high',
    confidence: 0.75,
    title: 'Bullish RSI divergence',
    rationale:
      'Price is making lower lows while RSI is making higher lows — selling pressure is exhausting even as price declines. Reversal setup.',
    points: pt('high', 0.75)
  }
}

function sigBounceOffSupport(
  bars: EntryTechnicalInputs['bars'],
  price: number
): EntrySignal | null {
  if (bars.length < 30) return null
  const highs = bars.map((b) => b.high)
  const lows = bars.map((b) => b.low)
  const levels = detectSRLevels(highs, lows, {
    radius: 3,
    tolerancePct: 1,
    minTouches: 2,
    topN: 10
  })
  const supports = levels.filter((l) => l.type === 'support')
  const nearby = supports.find((s) => price >= s.price * 0.99 && price <= s.price * 1.02)
  if (nearby) {
    return {
      id: 'support_test',
      category: 'technical',
      severity: 'medium',
      confidence: 0.7,
      title: `Testing support at $${nearby.price.toFixed(2)}`,
      rationale: `Price is within 2% of a ${nearby.touches}-touch support level — potential low-risk entry with clear invalidation.`,
      points: pt('medium', 0.7)
    }
  }
  return null
}

function sigBullishCandle(bars: EntryTechnicalInputs['bars']): EntrySignal | null {
  if (bars.length < 5) return null
  const candles: Candle[] = bars.map((b) => ({
    open: b.open,
    high: b.high,
    low: b.low,
    close: b.close
  }))
  const hits = detectPatterns(candles)
  const last = hits[hits.length - 1]
  if (!last) return null
  const barsAgo = candles.length - 1 - last.index
  if (barsAgo > 2 || last.bias !== 'bullish') return null
  return {
    id: 'bullish_candle',
    category: 'technical',
    severity: 'medium',
    confidence: 0.65,
    title: `Recent bullish candle: ${last.pattern}`,
    rationale: `A ${last.pattern} formed ${barsAgo} bar(s) ago — short-term reversal/continuation in your favor.`,
    points: pt('medium', 0.65)
  }
}

function sigAccumulation(bars: EntryTechnicalInputs['bars']): EntrySignal | null {
  if (bars.length < 30) return null
  const last = bars[bars.length - 1]
  if (!last) return null
  const avgVol = bars.slice(-21, -1).reduce((a, b) => a + (b.volume ?? 0), 0) / 20
  if (avgVol <= 0) return null
  const volRatio = (last.volume ?? 0) / avgVol
  if (volRatio > 1.8 && last.close > last.open) {
    return {
      id: 'accumulation_day',
      category: 'technical',
      severity: 'high',
      confidence: 0.75,
      title: 'Institutional accumulation day',
      rationale: `Volume spiked to ${volRatio.toFixed(1)}× average on an up day — institutional buying footprint.`,
      points: pt('high', 0.75)
    }
  }
  return null
}

function sigADXBullish(bars: EntryTechnicalInputs['bars']): EntrySignal | null {
  const highs = bars.map((b) => b.high)
  const lows = bars.map((b) => b.low)
  const closes = bars.map((b) => b.close)
  const a = adx(highs, lows, closes, 14)
  if (!a) return null
  if (a.adx > 25 && a.plusDI > a.minusDI + 5) {
    return {
      id: 'adx_bullish_strong',
      category: 'technical',
      severity: 'high',
      confidence: 0.8,
      title: 'Strong bullish trend active',
      rationale: `ADX ${a.adx.toFixed(0)} with +DI firmly above -DI — a confirmed uptrend is in place.`,
      points: pt('high', 0.8)
    }
  }
  return null
}

function sigBollingerBottomBounce(closes: number[]): EntrySignal | null {
  const bb = bollinger(closes, 20, 2)
  const last = closes[closes.length - 1]
  const prev = closes[closes.length - 2]
  if (!bb || prev == null) return null
  if (prev <= bb.lower * 1.005 && last > bb.lower * 1.01) {
    return {
      id: 'bb_lower_bounce',
      category: 'technical',
      severity: 'medium',
      confidence: 0.65,
      title: 'Bouncing off lower Bollinger band',
      rationale: `Price touched the lower band at ~$${bb.lower.toFixed(2)} and turned up — statistical oversold bounce.`,
      points: pt('medium', 0.65)
    }
  }
  return null
}

function sigSqueezeRelease(bars: EntryTechnicalInputs['bars']): EntrySignal | null {
  if (bars.length < 30) return null
  const highs = bars.map((b) => b.high)
  const lows = bars.map((b) => b.low)
  const closes = bars.map((b) => b.close)
  const bb = bollinger(closes, 20, 2)
  const kc = keltnerChannels(highs, lows, closes, 20, 2)
  const kcLast = kc.upper.length - 1
  const bbPrev = bollinger(closes.slice(0, -1), 20, 2)
  if (!bb || !bbPrev || kc.upper[kcLast] == null || kc.lower[kcLast] == null) return null
  // Prev bar: BB inside KC (squeeze on). Current: BB breaks out.
  const kcUpperNow = kc.upper[kcLast] as number
  const kcLowerNow = kc.lower[kcLast] as number
  const kcUpperPrev = kc.upper[kcLast - 1] as number
  const kcLowerPrev = kc.lower[kcLast - 1] as number
  if (kcUpperPrev == null || kcLowerPrev == null) return null
  const wasSqueeze = bbPrev.upper < kcUpperPrev && bbPrev.lower > kcLowerPrev
  const nowOut = bb.upper > kcUpperNow || bb.lower < kcLowerNow
  const upBias = closes[closes.length - 1] > closes[closes.length - 2]
  if (wasSqueeze && nowOut && upBias) {
    return {
      id: 'squeeze_release_up',
      category: 'technical',
      severity: 'high',
      confidence: 0.75,
      title: 'TTM Squeeze releasing up',
      rationale:
        'Bollinger was inside Keltner (volatility compressed). Bands just expanded with price ticking up — breakout in motion.',
      points: pt('high', 0.75)
    }
  }
  return null
}

function sigTrendStrength(closes: number[]): EntrySignal | null {
  if (closes.length < 252) return null
  const rets = logReturns(closes)
  const recent = rets.slice(-63) // 3 months
  const wins = recent.filter((r) => r > 0).length
  const pctUpDays = (wins / recent.length) * 100
  if (pctUpDays > 58) {
    return {
      id: 'high_up_day_rate',
      category: 'momentum',
      severity: 'medium',
      confidence: 0.65,
      title: 'Persistent upside skew',
      rationale: `${pctUpDays.toFixed(0)}% of the last 63 trading days closed green — sustained buy-the-dip behavior.`,
      points: pt('medium', 0.65)
    }
  }
  return null
}

// ─── Fundamental bullish signals ────────────────────────────────────────

function sigPiotroski(f: EntryFundamentalInputs): EntrySignal | null {
  if (f.piotroskiScore != null && f.piotroskiScore >= 8) {
    return {
      id: 'piotroski_strong',
      category: 'fundamental',
      severity: 'high',
      confidence: 0.85,
      title: `Piotroski F-score ${f.piotroskiScore}/9`,
      rationale: `Score of ${f.piotroskiScore} indicates strong improving fundamentals — Piotroski's backtested ≥8 basket has historically beat the market.`,
      points: pt('high', 0.85)
    }
  }
  return null
}

function sigAltmanSafe(f: EntryFundamentalInputs): EntrySignal | null {
  if (f.altmanZ != null && f.altmanZ > 3) {
    return {
      id: 'altman_safe',
      category: 'fundamental',
      severity: 'low',
      confidence: 0.6,
      title: `Altman Z ${f.altmanZ.toFixed(2)} (safe zone)`,
      rationale: `Z-score above 3 suggests very low bankruptcy risk — balance-sheet foundation for a long-term hold.`,
      points: pt('low', 0.6)
    }
  }
  return null
}

function sigEarningsBeat(f: EntryFundamentalInputs): EntrySignal | null {
  const h = f.earningsHistory
  if (!h || h.length === 0) return null
  const last = h[0]
  if (last.surprisePercent != null && last.surprisePercent > 0.05) {
    return {
      id: 'earnings_beat',
      category: 'fundamental',
      severity: 'high',
      confidence: 0.85,
      title: `Recent earnings beat (${(last.surprisePercent * 100).toFixed(1)}%)`,
      rationale: `Last quarter (${last.quarter}) beat consensus by ${(last.surprisePercent * 100).toFixed(1)}% — post-earnings drift up tends to persist.`,
      points: pt('high', 0.85)
    }
  }
  return null
}

function sigTargetAbovePrice(f: EntryFundamentalInputs, price: number): EntrySignal | null {
  if (f.targetMean == null) return null
  const upside = ((f.targetMean - price) / price) * 100
  if (upside > 15) {
    return {
      id: 'analyst_upside',
      category: 'fundamental',
      severity: 'medium',
      confidence: 0.7,
      title: `Analyst upside +${upside.toFixed(1)}%`,
      rationale: `Mean target $${f.targetMean.toFixed(2)} vs price $${price.toFixed(2)} — Street sees meaningful upside.`,
      points: pt('medium', 0.7)
    }
  }
  return null
}

function sigAnalystBuy(f: EntryFundamentalInputs): EntrySignal | null {
  if (f.recommendationMean == null) return null
  if (f.recommendationMean <= 2) {
    return {
      id: 'analyst_buy_consensus',
      category: 'fundamental',
      severity: 'medium',
      confidence: 0.65,
      title: 'Analyst consensus: Buy',
      rationale: `Recommendation mean ${f.recommendationMean.toFixed(2)} (1=strong buy, 5=strong sell) — street leans bullish.`,
      points: pt('medium', 0.65)
    }
  }
  return null
}

function sigInsiderBullish(f: EntryFundamentalInputs): EntrySignal | null {
  if (f.insiderSignal === 'bullish') {
    return {
      id: 'insider_bullish',
      category: 'fundamental',
      severity: 'high',
      confidence: 0.8,
      title: 'Insider cluster bullish',
      rationale: `Multiple insiders net-buying in the last 90 days${f.insiderScore != null ? ` (score ${f.insiderScore})` : ''}. High-conviction signal — insiders only buy for one reason.`,
      points: pt('high', 0.8)
    }
  }
  return null
}

function sigCheapValuation(f: EntryFundamentalInputs): EntrySignal | null {
  if (f.pegRatio != null && f.pegRatio > 0 && f.pegRatio < 1) {
    return {
      id: 'peg_under_one',
      category: 'value',
      severity: 'medium',
      confidence: 0.7,
      title: `PEG ${f.pegRatio.toFixed(2)} < 1`,
      rationale: `Price-to-earnings-growth ratio below 1 — growth not fully priced in (Lynch's classic threshold).`,
      points: pt('medium', 0.7)
    }
  }
  return null
}

function sigRevenueAcceleration(f: EntryFundamentalInputs): EntrySignal | null {
  if (f.revenueGrowth != null && f.revenueGrowth > 0.15) {
    return {
      id: 'revenue_acceleration',
      category: 'fundamental',
      severity: 'medium',
      confidence: 0.7,
      title: 'Revenue growth >15% YoY',
      rationale: `Top-line growth at ${(f.revenueGrowth * 100).toFixed(1)}% — the fuel for multiple expansion.`,
      points: pt('medium', 0.7)
    }
  }
  return null
}

function sigHighMargins(f: EntryFundamentalInputs): EntrySignal | null {
  if (f.operatingMargins != null && f.operatingMargins > 0.2) {
    return {
      id: 'high_op_margin',
      category: 'fundamental',
      severity: 'low',
      confidence: 0.6,
      title: 'Operating margin >20%',
      rationale: `Operating margin at ${(f.operatingMargins * 100).toFixed(1)}% — pricing power and operational leverage are strong.`,
      points: pt('low', 0.6)
    }
  }
  return null
}

function sigLowLeverage(f: EntryFundamentalInputs): EntrySignal | null {
  if (f.debtToEquity != null && f.debtToEquity < 50) {
    return {
      id: 'low_leverage',
      category: 'fundamental',
      severity: 'low',
      confidence: 0.55,
      title: 'Low leverage',
      rationale: `Debt/Equity at ${f.debtToEquity.toFixed(0)}% — clean balance sheet, flexibility in downturns.`,
      points: pt('low', 0.55)
    }
  }
  return null
}

// ─── Public engine ──────────────────────────────────────────────────────

export function computeEntrySignals(inputs: EntryEngineInputs): EntryVerdict {
  const signals: EntrySignal[] = []
  const bars = inputs.technical.bars
  const closes = bars.map((b) => b.close).filter((v) => Number.isFinite(v))
  const price = inputs.currentPrice

  if (closes.length >= 30) {
    const all = [
      sigGoldenCross(closes),
      sigAbove200SMA(closes),
      sigMacdBullCross(closes),
      sigRsiOversoldBounce(closes),
      sigBullishDivergence(closes),
      sigBounceOffSupport(bars, price),
      sigBullishCandle(bars),
      sigAccumulation(bars),
      sigADXBullish(bars),
      sigBollingerBottomBounce(closes),
      sigSqueezeRelease(bars),
      sigTrendStrength(closes)
    ]
    for (const s of all) if (s) signals.push(s)
  }

  if (inputs.fundamental) {
    const f = inputs.fundamental
    const all = [
      sigPiotroski(f),
      sigAltmanSafe(f),
      sigEarningsBeat(f),
      sigTargetAbovePrice(f, price),
      sigAnalystBuy(f),
      sigInsiderBullish(f),
      sigCheapValuation(f),
      sigRevenueAcceleration(f),
      sigHighMargins(f),
      sigLowLeverage(f)
    ]
    for (const s of all) if (s) signals.push(s)
  }

  const totalPts = signals.reduce((a, s) => a + s.points, 0)
  const score = Math.min(100, Math.round(totalPts))

  let action: EntryVerdict['action'] = 'ignore'
  if (score >= 60) action = 'buy'
  else if (score >= 30) action = 'watch'

  const highCount = signals.filter((s) => s.severity === 'high').length

  let headlineMessage = ''
  if (action === 'buy') {
    headlineMessage = `BUY setup: ${highCount} high-conviction signals active.`
  } else if (action === 'watch') {
    headlineMessage = `WATCH — ${signals.length} positive signal${signals.length === 1 ? '' : 's'} building.`
  } else {
    headlineMessage =
      signals.length === 0
        ? 'No entry signals — wait for setup.'
        : `Monitor — ${signals.length} weak signal${signals.length === 1 ? '' : 's'}.`
  }

  signals.sort((a, b) => b.points - a.points)

  return { score, action, signals, headlineMessage }
}
