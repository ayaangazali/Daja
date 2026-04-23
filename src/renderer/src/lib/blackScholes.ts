// Black-Scholes option pricing + Greeks.
// All times in years; volatility as decimal (0.30 = 30%); rates as decimal.

export type OptionType = 'call' | 'put'

export interface BsInput {
  S: number // spot price
  K: number // strike
  T: number // time to expiry (years)
  r: number // risk-free rate (decimal, e.g. 0.045)
  sigma: number // implied volatility (decimal)
  q?: number // continuous dividend yield (decimal)
}

export interface Greeks {
  price: number
  delta: number
  gamma: number
  theta: number // per year — divide by 365 for per-day
  vega: number // per 1.00 change in sigma — divide by 100 for per-1%
  rho: number // per 1.00 change in r — divide by 100 for per-1%
  d1: number
  d2: number
}

// Abramowitz & Stegun 26.2.17 CDF approximation — accurate to ~1e-7
export function normCdf(x: number): number {
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911
  const sign = x < 0 ? -1 : 1
  const ax = Math.abs(x) / Math.SQRT2
  const t = 1 / (1 + p * ax)
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax)
  return 0.5 * (1 + sign * y)
}

export function normPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI)
}

// Below this sigma, the Black-Scholes formula's sigma*sqrtT denominator
// explodes d1 to ±Infinity before the caller ever gets a useful delta/gamma.
// We clamp to the intrinsic fallback rather than returning NaN-adjacent output.
const MIN_SIGMA = 1e-4

export function blackScholes(type: OptionType, input: BsInput): Greeks {
  const { S, K, T, r, sigma } = input
  const q = input.q ?? 0

  if (T <= 0 || sigma < MIN_SIGMA || S <= 0 || K <= 0) {
    // Intrinsic fallback. For expired contracts and near-zero sigma, delta
    // asymptotically becomes the hard {0,1} indicator — surface that rather
    // than 0, so caller can tell "we know it's deep ITM" from "we have no
    // information". Sign matches call/put convention.
    const intrinsic = type === 'call' ? Math.max(S - K, 0) : Math.max(K - S, 0)
    const asymptoticDelta =
      type === 'call' ? (S > K ? 1 : 0) : S < K ? -1 : 0
    return {
      price: intrinsic,
      delta: asymptoticDelta,
      gamma: 0,
      theta: 0,
      vega: 0,
      rho: 0,
      d1: 0,
      d2: 0
    }
  }

  const sqrtT = Math.sqrt(T)
  const d1 = (Math.log(S / K) + (r - q + 0.5 * sigma * sigma) * T) / (sigma * sqrtT)
  const d2 = d1 - sigma * sqrtT
  const Nd1 = normCdf(d1)
  const Nd2 = normCdf(d2)
  const nPrime = normPdf(d1)

  let price: number
  let delta: number
  let theta: number
  let rho: number

  if (type === 'call') {
    price = S * Math.exp(-q * T) * Nd1 - K * Math.exp(-r * T) * Nd2
    delta = Math.exp(-q * T) * Nd1
    theta =
      -(S * Math.exp(-q * T) * nPrime * sigma) / (2 * sqrtT) -
      r * K * Math.exp(-r * T) * Nd2 +
      q * S * Math.exp(-q * T) * Nd1
    rho = K * T * Math.exp(-r * T) * Nd2
  } else {
    price = K * Math.exp(-r * T) * normCdf(-d2) - S * Math.exp(-q * T) * normCdf(-d1)
    delta = -Math.exp(-q * T) * normCdf(-d1)
    theta =
      -(S * Math.exp(-q * T) * nPrime * sigma) / (2 * sqrtT) +
      r * K * Math.exp(-r * T) * normCdf(-d2) -
      q * S * Math.exp(-q * T) * normCdf(-d1)
    rho = -K * T * Math.exp(-r * T) * normCdf(-d2)
  }

  const gamma = (Math.exp(-q * T) * nPrime) / (S * sigma * sqrtT)
  const vega = S * Math.exp(-q * T) * nPrime * sqrtT

  return { price, delta, gamma, theta, vega, rho, d1, d2 }
}

/**
 * Implied volatility via Newton-Raphson.
 * Returns null if no convergence within maxIter / result outside [0.001, 5].
 */
export function impliedVolatility(
  type: OptionType,
  marketPrice: number,
  input: Omit<BsInput, 'sigma'>,
  opts: { maxIter?: number; tol?: number; initialGuess?: number } = {}
): number | null {
  const { S, K, T } = input
  if (T <= 0 || S <= 0 || K <= 0 || marketPrice <= 0) return null
  const maxIter = opts.maxIter ?? 50
  const tol = opts.tol ?? 1e-5
  let sigma = opts.initialGuess ?? 0.3
  for (let i = 0; i < maxIter; i++) {
    const g = blackScholes(type, { ...input, sigma })
    const diff = g.price - marketPrice
    if (Math.abs(diff) < tol) {
      if (sigma < 0.001 || sigma > 5) return null
      return sigma
    }
    if (g.vega === 0) return null
    sigma = sigma - diff / g.vega
    if (!Number.isFinite(sigma) || sigma < 0.001) sigma = 0.01
    if (sigma > 5) sigma = 5
  }
  return null
}
