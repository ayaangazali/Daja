import { describe, expect, it } from 'vitest'
import { trendScore, ttmSqueeze } from './trendScore'

describe('trendScore', () => {
  it('returns 0 with no inputs', () => {
    const r = trendScore({
      price: 100,
      sma20: null, sma50: null, sma200: null,
      ema9: null, ema21: null,
      rsi: null, macd: null, macdSignal: null,
      adx: null, plusDI: null, minusDI: null
    })
    expect(r.score).toBe(0)
    expect(r.strength).toBe('neutral')
  })
  it('strong bull when all MAs below price + MACD up + ADX trending', () => {
    const r = trendScore({
      price: 200,
      sma20: 180, sma50: 170, sma200: 150,
      ema9: 195, ema21: 185,
      rsi: 65, macd: 3, macdSignal: 1,
      adx: 35, plusDI: 28, minusDI: 15
    })
    expect(r.score).toBeGreaterThan(60)
    expect(r.strength).toBe('strong_bull')
  })
  it('strong bear when price below all MAs + MACD down', () => {
    const r = trendScore({
      price: 100,
      sma20: 120, sma50: 140, sma200: 160,
      ema9: 110, ema21: 115,
      rsi: 32, macd: -3, macdSignal: -1,
      adx: 35, plusDI: 10, minusDI: 25
    })
    expect(r.score).toBeLessThan(-60)
    expect(r.strength).toBe('strong_bear')
  })
  it('weights SMA 200 highest', () => {
    const base = {
      price: 100,
      sma20: null, sma50: null,
      ema9: null, ema21: null,
      rsi: null, macd: null, macdSignal: null,
      adx: null, plusDI: null, minusDI: null
    }
    const bull = trendScore({ ...base, sma200: 90 })
    const bear = trendScore({ ...base, sma200: 110 })
    expect(bull.score).toBeGreaterThan(bear.score)
  })
})

describe('ttmSqueeze', () => {
  it('squeeze on when BB fully inside KC', () => {
    expect(ttmSqueeze(105, 95, 110, 90)).toBe('squeeze_on')
  })
  it('squeeze off when BB breaks out of KC', () => {
    expect(ttmSqueeze(115, 85, 110, 90)).toBe('squeeze_off')
  })
})
