/**
 * Exit Signal Engine — detects bearish technical and fundamental conditions for
 * open positions and produces ranked, justified recommendations.
 *
 * Design goals:
 *  - Pure functions (easy to test, deterministic given inputs)
 *  - Returns array of signals, each with severity, confidence, category, rationale
 *  - Aggregator produces overall verdict: hold / trim / exit with score 0..100
 *  - Built for proactive use (portfolio scan) as well as on-demand.
 */

import { sma, maxDrawdown, stddev, logReturns } from './indicators'
import { adx, bollinger, macd as macdSingle, rsiSeries } from './indicators2'
import { detectPatterns, type Candle } from './candlePatterns'
import { detectDivergences } from './divergence'
import { detectSRLevels } from './supportResistance'

export type Severity = 'low' | 'medium' | 'high' | 'critical'
export type Category = 'technical' | 'fundamental' | 'risk' | 'position'

export interface ExitSignal {
  id: string
  category: Category
  severity: Severity
  confidence: number
  title: string
  rationale: string
  points: number
}

export interface PositionInfo {
  ticker: string
  shares: number
  avgCost: number
  currentPrice: number
}

export interface TechnicalInputs {
  bars: { high: number; low: number; close: number; open: number; volume: number; time: number }[]
}

export interface FundamentalInputs {
  trailingPE?: number | null
  forwardPE?: number | null
  pegRatio?: number | null
  priceToSales?: number | null
  priceToBook?: number | null
  profitMargins?: number | null
  operatingMargins?: number | null
  grossMargins?: number | null
  revenueGrowth?: number | null
  earningsGrowth?: number | null
  debtToEquity?: number | null
  recommendationMean?: number | null
  targetMean?: number | null
  dividendYield?: number | null
  payoutRatio?: number | null
  earningsHistory?: { quarter: string; surprisePercent: number | null }[]
  insiderSignal?: 'bullish' | 'bearish' | 'mixed' | 'neutral'
  insiderScore?: number
}

export interface EngineInputs {
  position: PositionInfo
  technical: TechnicalInputs
  fundamental?: FundamentalInputs
  options?: {
    stopLossPct?: number
    trailingStopPct?: number
    profitTakePct?: number
  }
}

export interface ExitVerdict {
  score: number
  action: 'hold' | 'trim' | 'exit'
  signals: ExitSignal[]
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

function sigDeathCross(closes: number[]): ExitSignal | null {
  if (closes.length < 201) return null
  const sma50Now = sma(closes, 50)
  const sma200Now = sma(closes, 200)
  const sma50Prev = sma(closes.slice(0, -1), 50)
  const sma200Prev = sma(closes.slice(0, -1), 200)
  if (sma50Now == null || sma200Now == null || sma50Prev == null || sma200Prev == null) return null
  if (sma50Now < sma200Now && sma50Prev >= sma200Prev) {
    return {
      id: 'death_cross',
      category: 'technical',
      severity: 'high',
      confidence: 0.9,
      title: 'Death Cross detected',
      rationale:
        '50-day SMA crossed below 200-day SMA — classic long-term bearish trend change. Historically precedes extended downtrends.',
      points: pt('high', 0.9)
    }
  }
  return null
}

function sigBelow200SMA(closes: number[]): ExitSignal | null {
  if (closes.length < 201) return null
  const sma200 = sma(closes, 200)
  const last = closes[closes.length - 1]
  if (sma200 == null) return null
  if (last < sma200 && last > sma200 * 0.97) {
    return {
      id: 'below_200sma',
      category: 'technical',
      severity: 'medium',
      confidence: 0.7,
      title: 'Price below 200-day SMA',
      rationale: `Price ${last.toFixed(2)} fell below the 200-day SMA (${sma200.toFixed(2)}) — commonly used as the cyclical bull/bear divide.`,
      points: pt('medium', 0.7)
    }
  }
  if (last < sma200 * 0.97) {
    return {
      id: 'below_200sma_deep',
      category: 'technical',
      severity: 'high',
      confidence: 0.85,
      title: 'Price firmly below 200-SMA',
      rationale: `Price is more than 3% below the 200-day SMA — strong trend confirmation that long-term buyers have lost control.`,
      points: pt('high', 0.85)
    }
  }
  return null
}

function sigMacdBearishCross(closes: number[]): ExitSignal | null {
  const curr = macdSingle(closes)
  const prev = macdSingle(closes.slice(0, -1))
  if (!curr || !prev) return null
  if (curr.macd < curr.signal && prev.macd >= prev.signal && curr.macd > 0) {
    return {
      id: 'macd_bearish_cross_high',
      category: 'technical',
      severity: 'medium',
      confidence: 0.7,
      title: 'MACD bearish crossover (above zero)',
      rationale:
        'MACD crossed below its signal line while still above zero — momentum weakening within an uptrend.',
      points: pt('medium', 0.7)
    }
  }
  if (curr.macd < curr.signal && prev.macd >= prev.signal) {
    return {
      id: 'macd_bearish_cross',
      category: 'technical',
      severity: 'high',
      confidence: 0.8,
      title: 'MACD bearish crossover below zero',
      rationale:
        'MACD crossed below its signal line in negative territory — bearish momentum confirmation.',
      points: pt('high', 0.8)
    }
  }
  return null
}

function sigRsiOverboughtFade(closes: number[]): ExitSignal | null {
  const series = rsiSeries(closes, 14)
  const last = series[series.length - 1]
  const prev = series[series.length - 2]
  if (last == null || prev == null) return null
  if (prev >= 75 && last < prev && last >= 65) {
    return {
      id: 'rsi_overbought_fade',
      category: 'technical',
      severity: 'medium',
      confidence: 0.7,
      title: 'RSI fading from overbought',
      rationale: `RSI peaked at ${prev.toFixed(0)} and is now ${last.toFixed(0)} — profit-taking window as upside momentum fades.`,
      points: pt('medium', 0.7)
    }
  }
  if (last > 80) {
    return {
      id: 'rsi_extreme',
      category: 'technical',
      severity: 'medium',
      confidence: 0.6,
      title: 'RSI in extreme overbought zone',
      rationale: `RSI at ${last.toFixed(0)} — historically sees mean reversion. Consider trimming.`,
      points: pt('medium', 0.6)
    }
  }
  return null
}

function sigBearishDivergence(closes: number[]): ExitSignal | null {
  const rsiArr = rsiSeries(closes, 14)
  const divs = detectDivergences(closes, rsiArr, 60, 3)
  const recent = divs.filter(
    (d) => d.type === 'bearish' && d.secondIdx >= closes.length - 20
  )
  if (recent.length === 0) return null
  return {
    id: 'bearish_divergence',
    category: 'technical',
    severity: 'high',
    confidence: 0.75,
    title: 'Bearish RSI divergence',
    rationale:
      'Price is making higher highs while RSI is making lower highs — a classic early reversal warning. Upside momentum is evaporating even as price climbs.',
    points: pt('high', 0.75)
  }
}

function sigBelowSupport(
  bars: TechnicalInputs['bars'],
  price: number
): ExitSignal | null {
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
  const broken = supports.find((s) => price < s.price * 0.99 && price > s.price * 0.95)
  if (broken) {
    return {
      id: 'support_break',
      category: 'technical',
      severity: 'high',
      confidence: 0.8,
      title: `Broke support at $${broken.price.toFixed(2)}`,
      rationale: `Price fell through a ${broken.touches}-touch support level. Broken support often becomes new resistance.`,
      points: pt('high', 0.8)
    }
  }
  return null
}

function sigBearishCandle(bars: TechnicalInputs['bars']): ExitSignal | null {
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
  if (barsAgo > 2 || last.bias !== 'bearish') return null
  return {
    id: 'bearish_candle',
    category: 'technical',
    severity: 'medium',
    confidence: 0.65,
    title: `Recent bearish candle: ${last.pattern}`,
    rationale: `A ${last.pattern} formed ${barsAgo} bar(s) ago after the current move — short-term reversal warning.`,
    points: pt('medium', 0.65)
  }
}

function sigVolumeClimax(bars: TechnicalInputs['bars']): ExitSignal | null {
  if (bars.length < 30) return null
  const last = bars[bars.length - 1]
  const prev = bars[bars.length - 2]
  if (!last || !prev) return null
  const avgVol =
    bars.slice(-21, -1).reduce((a, b) => a + (b.volume ?? 0), 0) / 20
  if (avgVol <= 0) return null
  const volRatio = (last.volume ?? 0) / avgVol
  if (volRatio > 2 && last.close < last.open) {
    return {
      id: 'volume_climax_down',
      category: 'technical',
      severity: 'high',
      confidence: 0.75,
      title: 'Heavy distribution day',
      rationale: `Volume spiked to ${volRatio.toFixed(1)}× average on a down day — institutional distribution signature.`,
      points: pt('high', 0.75)
    }
  }
  return null
}

function sigADXFading(bars: TechnicalInputs['bars']): ExitSignal | null {
  const highs = bars.map((b) => b.high)
  const lows = bars.map((b) => b.low)
  const closes = bars.map((b) => b.close)
  const a = adx(highs, lows, closes, 14)
  if (!a) return null
  if (a.adx < 20 && a.minusDI > a.plusDI) {
    return {
      id: 'adx_bearish_weak',
      category: 'technical',
      severity: 'low',
      confidence: 0.55,
      title: 'Trend weak with bearish bias',
      rationale: `ADX at ${a.adx.toFixed(0)} (<20 = weak trend) and -DI > +DI — range-bound with slight downward pressure.`,
      points: pt('low', 0.55)
    }
  }
  if (a.adx > 25 && a.minusDI > a.plusDI + 5) {
    return {
      id: 'adx_bearish_strong',
      category: 'technical',
      severity: 'high',
      confidence: 0.8,
      title: 'Strong bearish trend active',
      rationale: `ADX ${a.adx.toFixed(0)} with -DI firmly above +DI — a confirmed downtrend is in place.`,
      points: pt('high', 0.8)
    }
  }
  return null
}

function sigBollingerTopReject(closes: number[]): ExitSignal | null {
  const bb = bollinger(closes, 20, 2)
  const last = closes[closes.length - 1]
  const prev = closes[closes.length - 2]
  if (!bb || prev == null) return null
  if (prev >= bb.upper * 0.995 && last < bb.upper * 0.97) {
    return {
      id: 'bb_upper_reject',
      category: 'technical',
      severity: 'medium',
      confidence: 0.65,
      title: 'Rejected from upper Bollinger band',
      rationale: `Price touched the upper band at ~$${bb.upper.toFixed(2)} and pulled back — common local top signature.`,
      points: pt('medium', 0.65)
    }
  }
  return null
}

function sigHighVolatility(closes: number[]): ExitSignal | null {
  const rets = logReturns(closes)
  if (rets.length < 30) return null
  const recent = rets.slice(-20)
  const longterm = rets.slice(-252)
  const recentVol = stddev(recent) * Math.sqrt(252) * 100
  const longVol = stddev(longterm) * Math.sqrt(252) * 100
  if (recentVol > longVol * 1.6 && recentVol > 40) {
    return {
      id: 'vol_expansion',
      category: 'risk',
      severity: 'medium',
      confidence: 0.7,
      title: 'Volatility expansion',
      rationale: `Recent 20d ann vol ${recentVol.toFixed(0)}% vs 1y baseline ${longVol.toFixed(0)}%. Rising vol with falling price warrants smaller position sizing or exit.`,
      points: pt('medium', 0.7)
    }
  }
  return null
}

function sigDrawdownBreach(closes: number[]): ExitSignal | null {
  const dd = maxDrawdown(closes.slice(-252))
  if (dd <= -25) {
    return {
      id: 'deep_drawdown',
      category: 'risk',
      severity: 'high',
      confidence: 0.8,
      title: 'Position in deep drawdown',
      rationale: `Stock is ${Math.abs(dd).toFixed(1)}% off its 1-year high. Failed recoveries from >25% drawdowns often extend.`,
      points: pt('high', 0.8)
    }
  }
  return null
}

function sigStopLoss(pos: PositionInfo, stopPct?: number): ExitSignal | null {
  const threshold = stopPct ?? 8
  const lossPct = ((pos.currentPrice - pos.avgCost) / pos.avgCost) * 100
  if (lossPct <= -threshold) {
    return {
      id: 'stop_loss_hit',
      category: 'position',
      severity: 'critical',
      confidence: 1,
      title: `Stop-loss breached (-${Math.abs(lossPct).toFixed(1)}%)`,
      rationale: `Position is ${lossPct.toFixed(1)}% below your ${pos.avgCost.toFixed(2)} cost basis. Discipline rule: cut the loser.`,
      points: pt('critical', 1)
    }
  }
  return null
}

function sigTrailingStop(
  pos: PositionInfo,
  closes: number[],
  trailPct?: number
): ExitSignal | null {
  const threshold = trailPct ?? 15
  const peak = Math.max(...closes)
  const drawFromPeak = ((pos.currentPrice - peak) / peak) * 100
  if (drawFromPeak <= -threshold && pos.currentPrice > pos.avgCost) {
    return {
      id: 'trailing_stop',
      category: 'position',
      severity: 'high',
      confidence: 0.9,
      title: `Trailing stop hit (-${Math.abs(drawFromPeak).toFixed(1)}% from peak)`,
      rationale: `Price is ${drawFromPeak.toFixed(1)}% off its peak of $${peak.toFixed(2)} — lock in gains before the reversal deepens.`,
      points: pt('high', 0.9)
    }
  }
  return null
}

function sigProfitTake(pos: PositionInfo, targetPct?: number): ExitSignal | null {
  const threshold = targetPct ?? 50
  const gainPct = ((pos.currentPrice - pos.avgCost) / pos.avgCost) * 100
  if (gainPct >= threshold) {
    return {
      id: 'profit_target',
      category: 'position',
      severity: 'medium',
      confidence: 0.6,
      title: `Profit target hit (+${gainPct.toFixed(1)}%)`,
      rationale: `Position is up ${gainPct.toFixed(1)}% — at or beyond your ${threshold}% target. Consider scaling out to bank the win.`,
      points: pt('medium', 0.6)
    }
  }
  return null
}

function sigNegativeGrowth(f: FundamentalInputs): ExitSignal | null {
  if (f.revenueGrowth != null && f.revenueGrowth < -0.05) {
    return {
      id: 'revenue_contraction',
      category: 'fundamental',
      severity: 'high',
      confidence: 0.85,
      title: 'Revenue contracting',
      rationale: `YoY revenue growth is ${(f.revenueGrowth * 100).toFixed(1)}% — top-line shrinkage. Multiple compression risk.`,
      points: pt('high', 0.85)
    }
  }
  return null
}

function sigEarningsMiss(f: FundamentalInputs): ExitSignal | null {
  const hist = f.earningsHistory
  if (!hist || hist.length === 0) return null
  const last = hist[0]
  if (last.surprisePercent != null && last.surprisePercent < -0.05) {
    return {
      id: 'earnings_miss',
      category: 'fundamental',
      severity: 'high',
      confidence: 0.85,
      title: `Recent earnings miss (${(last.surprisePercent * 100).toFixed(1)}%)`,
      rationale: `Last quarter (${last.quarter}) missed consensus by ${Math.abs(last.surprisePercent * 100).toFixed(1)}%. Post-earnings drift down typical.`,
      points: pt('high', 0.85)
    }
  }
  return null
}

function sigTargetBelowPrice(f: FundamentalInputs, price: number): ExitSignal | null {
  if (f.targetMean == null) return null
  const gap = ((f.targetMean - price) / price) * 100
  if (gap < -5) {
    return {
      id: 'target_below_price',
      category: 'fundamental',
      severity: 'medium',
      confidence: 0.7,
      title: 'Price above analyst target',
      rationale: `Analyst mean target is $${f.targetMean.toFixed(2)} — ${Math.abs(gap).toFixed(1)}% below current price. Street sees downside.`,
      points: pt('medium', 0.7)
    }
  }
  return null
}

function sigAnalystDowngrade(f: FundamentalInputs): ExitSignal | null {
  if (f.recommendationMean == null) return null
  if (f.recommendationMean >= 3.5) {
    return {
      id: 'analyst_hold_or_sell',
      category: 'fundamental',
      severity: 'medium',
      confidence: 0.65,
      title: 'Analyst consensus leans sell',
      rationale: `Recommendation mean ${f.recommendationMean.toFixed(2)} (1=strong buy, 5=strong sell) indicates broad Street bearishness.`,
      points: pt('medium', 0.65)
    }
  }
  return null
}

function sigInsiderBearish(f: FundamentalInputs): ExitSignal | null {
  if (f.insiderSignal === 'bearish') {
    return {
      id: 'insider_bearish',
      category: 'fundamental',
      severity: 'high',
      confidence: 0.8,
      title: 'Insider cluster bearish',
      rationale: `Multiple insiders have been net-selling in the last 90 days${f.insiderScore != null ? ` (score ${f.insiderScore})` : ''}. They know the business best.`,
      points: pt('high', 0.8)
    }
  }
  return null
}

function sigRichValuation(f: FundamentalInputs): ExitSignal | null {
  if (f.trailingPE != null && f.trailingPE > 60 && f.pegRatio != null && f.pegRatio > 3) {
    return {
      id: 'stretched_valuation',
      category: 'fundamental',
      severity: 'medium',
      confidence: 0.65,
      title: 'Stretched valuation',
      rationale: `Trailing P/E ${f.trailingPE.toFixed(0)} with PEG ${f.pegRatio.toFixed(1)} — not supported by growth. Mean-reversion risk on any disappointment.`,
      points: pt('medium', 0.65)
    }
  }
  return null
}

function sigMarginCompression(f: FundamentalInputs): ExitSignal | null {
  if (f.operatingMargins != null && f.operatingMargins < 0.05) {
    return {
      id: 'margin_compression',
      category: 'fundamental',
      severity: 'medium',
      confidence: 0.7,
      title: 'Operating margins compressed',
      rationale: `Operating margin at ${(f.operatingMargins * 100).toFixed(1)}% is low in absolute terms — vulnerable to fixed-cost leverage breaking the wrong way.`,
      points: pt('medium', 0.7)
    }
  }
  return null
}

function sigHighDebt(f: FundamentalInputs): ExitSignal | null {
  if (f.debtToEquity != null && f.debtToEquity > 200) {
    return {
      id: 'high_leverage',
      category: 'fundamental',
      severity: 'medium',
      confidence: 0.7,
      title: 'Elevated leverage',
      rationale: `Debt/Equity at ${f.debtToEquity.toFixed(0)}% — balance-sheet risk in a higher-rate environment.`,
      points: pt('medium', 0.7)
    }
  }
  return null
}

export function computeExitSignals(inputs: EngineInputs): ExitVerdict {
  const signals: ExitSignal[] = []
  const bars = inputs.technical.bars
  const closes = bars.map((b) => b.close).filter((v) => Number.isFinite(v))
  const price = inputs.position.currentPrice

  if (closes.length >= 30) {
    const all = [
      sigDeathCross(closes),
      sigBelow200SMA(closes),
      sigMacdBearishCross(closes),
      sigRsiOverboughtFade(closes),
      sigBearishDivergence(closes),
      sigBelowSupport(bars, price),
      sigBearishCandle(bars),
      sigVolumeClimax(bars),
      sigADXFading(bars),
      sigBollingerTopReject(closes),
      sigHighVolatility(closes),
      sigDrawdownBreach(closes)
    ]
    for (const s of all) if (s) signals.push(s)
  }

  signals.push(
    ...([
      sigStopLoss(inputs.position, inputs.options?.stopLossPct),
      closes.length >= 10
        ? sigTrailingStop(inputs.position, closes, inputs.options?.trailingStopPct)
        : null,
      sigProfitTake(inputs.position, inputs.options?.profitTakePct)
    ].filter((s): s is ExitSignal => !!s))
  )

  if (inputs.fundamental) {
    const f = inputs.fundamental
    const all = [
      sigNegativeGrowth(f),
      sigEarningsMiss(f),
      sigTargetBelowPrice(f, price),
      sigAnalystDowngrade(f),
      sigInsiderBearish(f),
      sigRichValuation(f),
      sigMarginCompression(f),
      sigHighDebt(f)
    ]
    for (const s of all) if (s) signals.push(s)
  }

  const totalPts = signals.reduce((a, s) => a + s.points, 0)
  const score = Math.min(100, Math.round(totalPts))

  let action: ExitVerdict['action'] = 'hold'
  if (score >= 60) action = 'exit'
  else if (score >= 30) action = 'trim'

  const criticalCount = signals.filter((s) => s.severity === 'critical').length
  const highCount = signals.filter((s) => s.severity === 'high').length

  let headlineMessage = ''
  if (action === 'exit') {
    headlineMessage = `EXIT signal: ${criticalCount} critical + ${highCount} high-severity flags.`
  } else if (action === 'trim') {
    headlineMessage = `TRIM signal: ${signals.length} warning${signals.length === 1 ? '' : 's'} active.`
  } else {
    headlineMessage =
      signals.length === 0
        ? 'No exit signals — thesis intact.'
        : `HOLD — ${signals.length} minor concern${signals.length === 1 ? '' : 's'}.`
  }

  signals.sort((a, b) => b.points - a.points)

  return { score, action, signals, headlineMessage }
}
