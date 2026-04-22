/**
 * Extended technical indicator library. Pure functions, all unit-tested.
 * Paired with existing indicators.ts (sma/ema/rsi/stddev).
 */

import { ema, sma, stddev } from './indicators'

/** Weighted moving average — linear weights (most-recent heaviest). */
export function wma(arr: number[], p: number): number | null {
  if (arr.length < p || p <= 0) return null
  const slice = arr.slice(-p)
  const denom = (p * (p + 1)) / 2
  let num = 0
  for (let i = 0; i < p; i++) num += slice[i] * (i + 1)
  return num / denom
}

/** EMA series — returns value at each index from index p-1 onward, undefined before. */
export function emaSeries(arr: number[], p: number): (number | null)[] {
  const out: (number | null)[] = Array(arr.length).fill(null)
  if (arr.length < p || p <= 0) return out
  const k = 2 / (p + 1)
  let val = arr.slice(0, p).reduce((a, b) => a + b, 0) / p
  out[p - 1] = val
  for (let i = p; i < arr.length; i++) {
    val = arr[i] * k + val * (1 - k)
    out[i] = val
  }
  return out
}

/** SMA series. */
export function smaSeries(arr: number[], p: number): (number | null)[] {
  const out: (number | null)[] = Array(arr.length).fill(null)
  if (p <= 0) return out
  let sum = 0
  for (let i = 0; i < arr.length; i++) {
    sum += arr[i]
    if (i >= p) sum -= arr[i - p]
    if (i >= p - 1) out[i] = sum / p
  }
  return out
}

/** Double EMA — 2*EMA - EMA(EMA). Reduces lag vs single EMA. */
export function dema(arr: number[], p: number): number | null {
  const e1 = ema(arr, p)
  if (e1 == null) return null
  const eSeries = emaSeries(arr, p).filter((v): v is number => v != null)
  const e2 = ema(eSeries, p)
  if (e2 == null) return null
  return 2 * e1 - e2
}

/** Triple EMA — 3*EMA - 3*EMA(EMA) + EMA(EMA(EMA)). Smoother than DEMA. */
export function tema(arr: number[], p: number): number | null {
  if (arr.length < p * 3) return null
  const e1Series = emaSeries(arr, p).filter((v): v is number => v != null)
  const e2Series = emaSeries(e1Series, p).filter((v): v is number => v != null)
  const e3Series = emaSeries(e2Series, p).filter((v): v is number => v != null)
  const e1 = e1Series[e1Series.length - 1]
  const e2 = e2Series[e2Series.length - 1]
  const e3 = e3Series[e3Series.length - 1]
  if (e1 == null || e2 == null || e3 == null) return null
  return 3 * e1 - 3 * e2 + e3
}

/** Bollinger Bands — (middle=SMA, upper=SMA+k·σ, lower=SMA-k·σ). */
export function bollinger(
  arr: number[],
  p = 20,
  k = 2
): { upper: number; middle: number; lower: number } | null {
  if (arr.length < p) return null
  const window = arr.slice(-p)
  const mid = window.reduce((a, b) => a + b, 0) / p
  const sd = stddev(window)
  return { middle: mid, upper: mid + k * sd, lower: mid - k * sd }
}

/** Bollinger Bands series for charting. */
export function bollingerSeries(
  arr: number[],
  p = 20,
  k = 2
): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
  const upper: (number | null)[] = Array(arr.length).fill(null)
  const middle: (number | null)[] = Array(arr.length).fill(null)
  const lower: (number | null)[] = Array(arr.length).fill(null)
  for (let i = p - 1; i < arr.length; i++) {
    const window = arr.slice(i - p + 1, i + 1)
    const mid = window.reduce((a, b) => a + b, 0) / p
    const sd = stddev(window)
    middle[i] = mid
    upper[i] = mid + k * sd
    lower[i] = mid - k * sd
  }
  return { upper, middle, lower }
}

/** MACD = EMA12 - EMA26, signal = EMA9 of MACD, hist = MACD - signal. */
export function macd(
  arr: number[],
  fast = 12,
  slow = 26,
  signal = 9
): { macd: number; signal: number; hist: number } | null {
  if (arr.length < slow + signal) return null
  const fastSeries = emaSeries(arr, fast)
  const slowSeries = emaSeries(arr, slow)
  const macdLine: number[] = []
  for (let i = 0; i < arr.length; i++) {
    const f = fastSeries[i]
    const s = slowSeries[i]
    if (f != null && s != null) macdLine.push(f - s)
  }
  const sigVal = ema(macdLine, signal)
  if (sigVal == null) return null
  const m = macdLine[macdLine.length - 1]
  return { macd: m, signal: sigVal, hist: m - sigVal }
}

/** MACD series for charting. */
export function macdSeries(
  arr: number[],
  fast = 12,
  slow = 26,
  signal = 9
): { macd: (number | null)[]; signal: (number | null)[]; hist: (number | null)[] } {
  const fastSeries = emaSeries(arr, fast)
  const slowSeries = emaSeries(arr, slow)
  const macdLine: (number | null)[] = arr.map((_, i) => {
    const f = fastSeries[i]
    const s = slowSeries[i]
    return f != null && s != null ? f - s : null
  })
  const macdCompact = macdLine.filter((v): v is number => v != null)
  const sigCompactSeries = emaSeries(macdCompact, signal)
  let firstMacdIdx = macdLine.findIndex((v) => v != null)
  if (firstMacdIdx < 0) firstMacdIdx = arr.length
  const signalSeries: (number | null)[] = Array(arr.length).fill(null)
  for (let i = 0; i < sigCompactSeries.length; i++) {
    const origIdx = firstMacdIdx + i
    signalSeries[origIdx] = sigCompactSeries[i]
  }
  const histSeries = macdLine.map((m, i) => {
    const s = signalSeries[i]
    return m != null && s != null ? m - s : null
  })
  return { macd: macdLine, signal: signalSeries, hist: histSeries }
}

/** RSI series — Wilder's smoothing. */
export function rsiSeries(arr: number[], p = 14): (number | null)[] {
  const out: (number | null)[] = Array(arr.length).fill(null)
  if (arr.length <= p) return out
  let gains = 0
  let losses = 0
  for (let i = 1; i <= p; i++) {
    const d = arr[i] - arr[i - 1]
    if (d >= 0) gains += d
    else losses -= d
  }
  let avgGain = gains / p
  let avgLoss = losses / p
  out[p] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)
  for (let i = p + 1; i < arr.length; i++) {
    const d = arr[i] - arr[i - 1]
    const g = d >= 0 ? d : 0
    const l = d < 0 ? -d : 0
    avgGain = (avgGain * (p - 1) + g) / p
    avgLoss = (avgLoss * (p - 1) + l) / p
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)
  }
  return out
}

/** On-Balance Volume — cumulative volume flow based on close direction. */
export function obv(closes: number[], volumes: number[]): number[] {
  const out: number[] = []
  if (closes.length === 0) return out
  let cum = 0
  out.push(0)
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1]) cum += volumes[i] ?? 0
    else if (closes[i] < closes[i - 1]) cum -= volumes[i] ?? 0
    out.push(cum)
  }
  return out
}

/** Volume-Weighted Average Price (cumulative over the series). */
export function vwap(
  highs: number[],
  lows: number[],
  closes: number[],
  volumes: number[]
): number[] {
  const out: number[] = []
  let cumPV = 0
  let cumV = 0
  for (let i = 0; i < closes.length; i++) {
    const typical = (highs[i] + lows[i] + closes[i]) / 3
    const v = volumes[i] ?? 0
    cumPV += typical * v
    cumV += v
    out.push(cumV > 0 ? cumPV / cumV : typical)
  }
  return out
}

/** Commodity Channel Index — (typical - SMA(typical)) / (0.015 · mean deviation). */
export function cci(highs: number[], lows: number[], closes: number[], p = 20): number | null {
  if (closes.length < p) return null
  const typical = highs.map((_, i) => (highs[i] + lows[i] + closes[i]) / 3)
  const window = typical.slice(-p)
  const avg = window.reduce((a, b) => a + b, 0) / p
  const meanDev = window.reduce((a, b) => a + Math.abs(b - avg), 0) / p
  if (meanDev === 0) return 0
  return (typical[typical.length - 1] - avg) / (0.015 * meanDev)
}

/** Chaikin Money Flow — money flow multiplier × volume, summed and normalized. */
export function cmf(
  highs: number[],
  lows: number[],
  closes: number[],
  volumes: number[],
  p = 20
): number | null {
  if (closes.length < p) return null
  let mfvSum = 0
  let vSum = 0
  for (let i = closes.length - p; i < closes.length; i++) {
    const h = highs[i]
    const l = lows[i]
    const c = closes[i]
    const v = volumes[i] ?? 0
    const range = h - l
    const mult = range === 0 ? 0 : ((c - l) - (h - c)) / range
    mfvSum += mult * v
    vSum += v
  }
  if (vSum === 0) return 0
  return mfvSum / vSum
}

/** Average True Range — Wilder smoothing over p periods. */
export function atr(
  highs: number[],
  lows: number[],
  closes: number[],
  p = 14
): number | null {
  if (closes.length < p + 1) return null
  const trs: number[] = []
  for (let i = 1; i < closes.length; i++) {
    const h = highs[i]
    const l = lows[i]
    const prev = closes[i - 1]
    trs.push(Math.max(h - l, Math.abs(h - prev), Math.abs(l - prev)))
  }
  // Wilder: first ATR = SMA of first p TRs, then ATR_n = (ATR_{n-1}*(p-1) + TR_n)/p
  let at = trs.slice(0, p).reduce((a, b) => a + b, 0) / p
  for (let i = p; i < trs.length; i++) {
    at = (at * (p - 1) + trs[i]) / p
  }
  return at
}

/** ADX — average directional index (trend strength). */
export function adx(
  highs: number[],
  lows: number[],
  closes: number[],
  p = 14
): { adx: number; plusDI: number; minusDI: number } | null {
  if (closes.length < p * 2) return null
  const plusDM: number[] = []
  const minusDM: number[] = []
  const tr: number[] = []
  for (let i = 1; i < closes.length; i++) {
    const upMove = highs[i] - highs[i - 1]
    const downMove = lows[i - 1] - lows[i]
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0)
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0)
    tr.push(
      Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      )
    )
  }
  const smooth = (arr: number[]): number[] => {
    const out: number[] = []
    let v = arr.slice(0, p).reduce((a, b) => a + b, 0)
    out.push(v)
    for (let i = p; i < arr.length; i++) {
      v = v - v / p + arr[i]
      out.push(v)
    }
    return out
  }
  const smPlus = smooth(plusDM)
  const smMinus = smooth(minusDM)
  const smTr = smooth(tr)
  const dxs: number[] = []
  for (let i = 0; i < smTr.length; i++) {
    const pDI = (smPlus[i] / smTr[i]) * 100
    const mDI = (smMinus[i] / smTr[i]) * 100
    const dx = pDI + mDI === 0 ? 0 : (Math.abs(pDI - mDI) / (pDI + mDI)) * 100
    dxs.push(dx)
  }
  if (dxs.length < p) return null
  let adxVal = dxs.slice(0, p).reduce((a, b) => a + b, 0) / p
  for (let i = p; i < dxs.length; i++) adxVal = (adxVal * (p - 1) + dxs[i]) / p
  const lastTR = smTr[smTr.length - 1]
  const plusDI = (smPlus[smPlus.length - 1] / lastTR) * 100
  const minusDI = (smMinus[smMinus.length - 1] / lastTR) * 100
  return { adx: adxVal, plusDI, minusDI }
}

/** Williams %R — momentum oscillator, -100..0. */
export function williamsR(
  highs: number[],
  lows: number[],
  closes: number[],
  p = 14
): number | null {
  if (closes.length < p) return null
  const hh = Math.max(...highs.slice(-p))
  const ll = Math.min(...lows.slice(-p))
  if (hh === ll) return 0
  return ((hh - closes[closes.length - 1]) / (hh - ll)) * -100
}

/** Stochastic %K, %D — momentum oscillator. */
export function stochastic(
  highs: number[],
  lows: number[],
  closes: number[],
  p = 14,
  smoothK = 3,
  smoothD = 3
): { k: number; d: number } | null {
  if (closes.length < p) return null
  const kSeries: number[] = []
  for (let i = p - 1; i < closes.length; i++) {
    const hh = Math.max(...highs.slice(i - p + 1, i + 1))
    const ll = Math.min(...lows.slice(i - p + 1, i + 1))
    kSeries.push(hh === ll ? 50 : ((closes[i] - ll) / (hh - ll)) * 100)
  }
  const kSmooth = sma(kSeries, smoothK)
  const dVal = sma(kSeries.slice(-smoothK - smoothD + 1), smoothD)
  if (kSmooth == null || dVal == null) return null
  return { k: kSmooth, d: dVal }
}

/** Parabolic SAR — simplified. Returns current SAR value. */
export function parabolicSAR(
  highs: number[],
  lows: number[],
  afStep = 0.02,
  afMax = 0.2
): number | null {
  if (highs.length < 2) return null
  let bull = highs[1] > highs[0]
  let sar = bull ? lows[0] : highs[0]
  let ep = bull ? highs[0] : lows[0]
  let af = afStep
  for (let i = 1; i < highs.length; i++) {
    sar = sar + af * (ep - sar)
    if (bull) {
      if (lows[i] < sar) {
        bull = false
        sar = ep
        ep = lows[i]
        af = afStep
      } else if (highs[i] > ep) {
        ep = highs[i]
        af = Math.min(afMax, af + afStep)
      }
    } else {
      if (highs[i] > sar) {
        bull = true
        sar = ep
        ep = highs[i]
        af = afStep
      } else if (lows[i] < ep) {
        ep = lows[i]
        af = Math.min(afMax, af + afStep)
      }
    }
  }
  return sar
}

/** Rate of Change — percent change over p periods. */
export function roc(arr: number[], p = 12): number | null {
  if (arr.length <= p) return null
  const past = arr[arr.length - 1 - p]
  if (past === 0) return null
  return ((arr[arr.length - 1] - past) / past) * 100
}

/** Ichimoku Cloud — Tenkan, Kijun, Senkou A, Senkou B, Chikou. */
export function ichimoku(
  highs: number[],
  lows: number[],
  closes: number[],
  tenkanP = 9,
  kijunP = 26,
  senkouBP = 52,
  chikouShift = 26
): {
  tenkan: (number | null)[]
  kijun: (number | null)[]
  senkouA: (number | null)[]
  senkouB: (number | null)[]
  chikou: (number | null)[]
} {
  const midPeriod = (i: number, p: number): number | null => {
    if (i < p - 1) return null
    let hi = -Infinity
    let lo = Infinity
    for (let j = i - p + 1; j <= i; j++) {
      if (highs[j] > hi) hi = highs[j]
      if (lows[j] < lo) lo = lows[j]
    }
    return (hi + lo) / 2
  }
  const n = closes.length
  const tenkan: (number | null)[] = Array(n).fill(null)
  const kijun: (number | null)[] = Array(n).fill(null)
  const senkouA: (number | null)[] = Array(n).fill(null)
  const senkouB: (number | null)[] = Array(n).fill(null)
  const chikou: (number | null)[] = Array(n).fill(null)
  for (let i = 0; i < n; i++) {
    tenkan[i] = midPeriod(i, tenkanP)
    kijun[i] = midPeriod(i, kijunP)
    const sbMid = midPeriod(i, senkouBP)
    const shifted = i + chikouShift
    if (shifted < n) {
      senkouA[shifted] =
        tenkan[i] != null && kijun[i] != null ? ((tenkan[i] as number) + (kijun[i] as number)) / 2 : null
      senkouB[shifted] = sbMid
    }
    // chikou = current close shifted backwards
    const back = i - chikouShift
    if (back >= 0) chikou[back] = closes[i]
  }
  return { tenkan, kijun, senkouA, senkouB, chikou }
}

/** Keltner Channels — EMA middle, ATR-based bands. */
export function keltnerChannels(
  highs: number[],
  lows: number[],
  closes: number[],
  p = 20,
  mult = 2
): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
  const n = closes.length
  const mid = emaSeries(closes, p)
  const atrSer = atrSeries(highs, lows, closes, p)
  const upper: (number | null)[] = Array(n).fill(null)
  const lower: (number | null)[] = Array(n).fill(null)
  for (let i = 0; i < n; i++) {
    const m = mid[i]
    const a = atrSer[i]
    if (m != null && a != null) {
      upper[i] = m + mult * a
      lower[i] = m - mult * a
    }
  }
  return { upper, middle: mid, lower }
}

/** Donchian Channels — highest high / lowest low over p periods. */
export function donchianChannels(
  highs: number[],
  lows: number[],
  p = 20
): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
  const n = highs.length
  const upper: (number | null)[] = Array(n).fill(null)
  const middle: (number | null)[] = Array(n).fill(null)
  const lower: (number | null)[] = Array(n).fill(null)
  for (let i = p - 1; i < n; i++) {
    const hh = Math.max(...highs.slice(i - p + 1, i + 1))
    const ll = Math.min(...lows.slice(i - p + 1, i + 1))
    upper[i] = hh
    lower[i] = ll
    middle[i] = (hh + ll) / 2
  }
  return { upper, middle, lower }
}

/** Stochastic K series for charting. */
export function stochasticSeries(
  highs: number[],
  lows: number[],
  closes: number[],
  p = 14
): (number | null)[] {
  const out: (number | null)[] = Array(closes.length).fill(null)
  for (let i = p - 1; i < closes.length; i++) {
    const hh = Math.max(...highs.slice(i - p + 1, i + 1))
    const ll = Math.min(...lows.slice(i - p + 1, i + 1))
    out[i] = hh === ll ? 50 : ((closes[i] - ll) / (hh - ll)) * 100
  }
  return out
}

/** Williams %R series. */
export function williamsRSeries(
  highs: number[],
  lows: number[],
  closes: number[],
  p = 14
): (number | null)[] {
  const out: (number | null)[] = Array(closes.length).fill(null)
  for (let i = p - 1; i < closes.length; i++) {
    const hh = Math.max(...highs.slice(i - p + 1, i + 1))
    const ll = Math.min(...lows.slice(i - p + 1, i + 1))
    out[i] = hh === ll ? 0 : ((hh - closes[i]) / (hh - ll)) * -100
  }
  return out
}

/** CCI series. */
export function cciSeries(
  highs: number[],
  lows: number[],
  closes: number[],
  p = 20
): (number | null)[] {
  const out: (number | null)[] = Array(closes.length).fill(null)
  const typical = highs.map((_, i) => (highs[i] + lows[i] + closes[i]) / 3)
  for (let i = p - 1; i < closes.length; i++) {
    const window = typical.slice(i - p + 1, i + 1)
    const avg = window.reduce((a, b) => a + b, 0) / p
    const meanDev = window.reduce((a, b) => a + Math.abs(b - avg), 0) / p
    out[i] = meanDev === 0 ? 0 : (typical[i] - avg) / (0.015 * meanDev)
  }
  return out
}

/** ATR series. */
export function atrSeries(
  highs: number[],
  lows: number[],
  closes: number[],
  p = 14
): (number | null)[] {
  const out: (number | null)[] = Array(closes.length).fill(null)
  if (closes.length < p + 1) return out
  const trs: number[] = [0]
  for (let i = 1; i < closes.length; i++) {
    const h = highs[i]
    const l = lows[i]
    const prev = closes[i - 1]
    trs.push(Math.max(h - l, Math.abs(h - prev), Math.abs(l - prev)))
  }
  let at = trs.slice(1, p + 1).reduce((a, b) => a + b, 0) / p
  out[p] = at
  for (let i = p + 1; i < trs.length; i++) {
    at = (at * (p - 1) + trs[i]) / p
    out[i] = at
  }
  return out
}

/** ROC series. */
export function rocSeries(arr: number[], p = 12): (number | null)[] {
  const out: (number | null)[] = Array(arr.length).fill(null)
  for (let i = p; i < arr.length; i++) {
    const past = arr[i - p]
    if (past === 0) continue
    out[i] = ((arr[i] - past) / past) * 100
  }
  return out
}

/** Money Flow Index — volume-weighted RSI (0..100). */
export function mfi(
  highs: number[],
  lows: number[],
  closes: number[],
  volumes: number[],
  p = 14
): number | null {
  if (closes.length < p + 1) return null
  let posFlow = 0
  let negFlow = 0
  const typical = closes.map((_, i) => (highs[i] + lows[i] + closes[i]) / 3)
  for (let i = closes.length - p; i < closes.length; i++) {
    const money = typical[i] * (volumes[i] ?? 0)
    if (typical[i] > typical[i - 1]) posFlow += money
    else if (typical[i] < typical[i - 1]) negFlow += money
  }
  if (negFlow === 0) return 100
  const mr = posFlow / negFlow
  return 100 - 100 / (1 + mr)
}
