import { describe, expect, it } from 'vitest'
import { estimateDriftVol, seedRng, simulateGBM } from './monteCarlo'

describe('seedRng', () => {
  it('deterministic for same seed', () => {
    const r1 = seedRng(123)
    const r2 = seedRng(123)
    expect(r1()).toBe(r2())
    expect(r1()).toBe(r2())
  })
  it('different seeds → different values', () => {
    const r1 = seedRng(1)
    const r2 = seedRng(2)
    expect(r1()).not.toBe(r2())
  })
  it('outputs in [0,1)', () => {
    const r = seedRng(42)
    for (let i = 0; i < 100; i++) {
      const v = r()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('estimateDriftVol', () => {
  it('0/0 on empty', () => {
    expect(estimateDriftVol([])).toEqual({ mu: 0, sigma: 0 })
  })
  it('mu matches mean of logs', () => {
    const r = [0.01, 0.02, 0.03]
    const { mu } = estimateDriftVol(r)
    expect(mu).toBeCloseTo(0.02, 6)
  })
})

describe('simulateGBM', () => {
  it('paths have length nSteps + 1', () => {
    const r = simulateGBM({
      startPrice: 100,
      mu: 0.001,
      sigma: 0.02,
      nSteps: 50,
      nPaths: 100
    })
    expect(r.paths[0]).toHaveLength(51)
    expect(r.paths.length).toBe(100)
  })
  it('start price equals input at step 0', () => {
    const r = simulateGBM({
      startPrice: 100,
      mu: 0.001,
      sigma: 0.02,
      nSteps: 10,
      nPaths: 10
    })
    expect(r.p50[0]).toBe(100)
    expect(r.mean[0]).toBe(100)
  })
  it('percentiles ordered p05 ≤ p25 ≤ p50 ≤ p75 ≤ p95 at any step', () => {
    const r = simulateGBM({
      startPrice: 100,
      mu: 0.001,
      sigma: 0.02,
      nSteps: 20,
      nPaths: 200
    })
    const step = 20
    expect(r.p05[step]).toBeLessThanOrEqual(r.p25[step])
    expect(r.p25[step]).toBeLessThanOrEqual(r.p50[step])
    expect(r.p50[step]).toBeLessThanOrEqual(r.p75[step])
    expect(r.p75[step]).toBeLessThanOrEqual(r.p95[step])
  })
  it('reproducible with seed', () => {
    const a = simulateGBM({
      startPrice: 100,
      mu: 0.001,
      sigma: 0.02,
      nSteps: 10,
      nPaths: 50,
      seed: 7
    })
    const b = simulateGBM({
      startPrice: 100,
      mu: 0.001,
      sigma: 0.02,
      nSteps: 10,
      nPaths: 50,
      seed: 7
    })
    expect(a.p50[10]).toBeCloseTo(b.p50[10], 10)
  })
})
