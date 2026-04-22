import { describe, expect, it } from 'vitest'
import {
  breakEvens,
  legPayoffAtPrice,
  maxLoss,
  maxProfit,
  payoffCurve,
  portfolioPayoff,
  type OptionLeg
} from './optionsPayoff'

describe('legPayoffAtPrice', () => {
  it('long call profit above strike', () => {
    const leg: OptionLeg = { type: 'call', side: 'long', strike: 100, premium: 5, quantity: 1 }
    expect(legPayoffAtPrice(leg, 110)).toBe((10 - 5) * 100) // 500
  })
  it('long call max loss = premium × mult when S < strike', () => {
    const leg: OptionLeg = { type: 'call', side: 'long', strike: 100, premium: 5, quantity: 1 }
    expect(legPayoffAtPrice(leg, 80)).toBe(-500)
  })
  it('short put: max profit = premium when S ≥ strike', () => {
    const leg: OptionLeg = { type: 'put', side: 'short', strike: 100, premium: 3, quantity: 1 }
    expect(legPayoffAtPrice(leg, 105)).toBe(300)
  })
  it('short call: loss when S > strike + premium', () => {
    const leg: OptionLeg = { type: 'call', side: 'short', strike: 100, premium: 5, quantity: 1 }
    expect(legPayoffAtPrice(leg, 120)).toBe((5 - 20) * 100) // -1500
  })
  it('quantity scales payoff', () => {
    const leg: OptionLeg = { type: 'call', side: 'long', strike: 100, premium: 5, quantity: 3 }
    expect(legPayoffAtPrice(leg, 110)).toBe((10 - 5) * 100 * 3)
  })
})

describe('portfolioPayoff — common strategies', () => {
  it('bull call spread: buy 100C, sell 110C', () => {
    const legs: OptionLeg[] = [
      { type: 'call', side: 'long', strike: 100, premium: 5, quantity: 1 },
      { type: 'call', side: 'short', strike: 110, premium: 2, quantity: 1 }
    ]
    // At S=120: long = (20-5)*100=1500, short = (2-20)*100=-1800 → total -300. NO wait:
    // Actually: at S=120, long pays 15 ((20-5)*100=1500), short loses 18 (negative -(20-2)*100=-1800)
    // Sum = -300. Hmm but bull call spread max is strike diff - net premium = (110-100) - (5-2) = 7 per share = 700.
    // Let me re-examine. Max at S ≥ 110: long = (110-100)-5=5 → 500, short = 2-(110-110)=2 → 200. Sum = 700. ✓
    // At S=120: long = (120-100)-5=15 → 1500, short = 2-(120-110)=-8 → -800. Sum = 700. ✓
    expect(portfolioPayoff(legs, 120)).toBe(700)
  })
  it('long straddle: long call + long put at same strike', () => {
    const legs: OptionLeg[] = [
      { type: 'call', side: 'long', strike: 100, premium: 5, quantity: 1 },
      { type: 'put', side: 'long', strike: 100, premium: 5, quantity: 1 }
    ]
    // At S=100: both worthless, loss = -1000
    expect(portfolioPayoff(legs, 100)).toBe(-1000)
    // At S=120: call intrinsic 20 - premium 5 = 15 → +1500, put worthless - 5 → -500. Total = 1000
    expect(portfolioPayoff(legs, 120)).toBe(1000)
  })
})

describe('payoffCurve + breakEvens + max', () => {
  it('long call break-even at strike + premium', () => {
    const legs: OptionLeg[] = [{ type: 'call', side: 'long', strike: 100, premium: 5, quantity: 1 }]
    const curve = payoffCurve(legs, 80, 130, 200)
    const bes = breakEvens(curve)
    expect(bes[0]).toBeCloseTo(105, 0)
  })
  it('max profit of long call rises with price', () => {
    const legs: OptionLeg[] = [{ type: 'call', side: 'long', strike: 100, premium: 5, quantity: 1 }]
    const curve = payoffCurve(legs, 80, 150, 50)
    expect(maxProfit(curve).price).toBeGreaterThan(100)
  })
  it('max loss of long call = -premium × mult', () => {
    const legs: OptionLeg[] = [{ type: 'call', side: 'long', strike: 100, premium: 5, quantity: 1 }]
    const curve = payoffCurve(legs, 80, 150, 50)
    expect(maxLoss(curve).pnl).toBeCloseTo(-500, 0)
  })
})
