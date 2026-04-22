/**
 * Dividend Reinvestment Plan (DRIP) calculator. Given starting capital, share
 * price, dividend yield, price-growth rate, and dividend-growth rate, projects
 * the trajectory of total value with dividends reinvested into new shares
 * each quarter.
 */

export interface DripYearRow {
  year: number
  shares: number
  price: number
  annualDividend: number
  dividendsReinvested: number
  contributionsYear: number
  totalValue: number
  totalDividends: number
  totalContributed: number
}

export interface DripInput {
  startAmount: number // Initial capital invested
  sharePrice: number // Starting share price
  dividendYieldPct: number // Annual dividend yield % (0..100)
  priceGrowthPct: number // Annual stock price growth %
  dividendGrowthPct: number // Annual dividend per share growth %
  years: number
  monthlyContribution?: number // Optional monthly DCA contribution
  taxDragPct?: number // % of dividends lost to taxes (reduces reinvestment)
}

/**
 * Compound quarterly: each quarter shares grow by (dividend/share)/4 per share
 * reinvested, and price compounds at (1 + priceGrowth)^(1/4) per quarter.
 */
export function projectDrip(input: DripInput): DripYearRow[] {
  const {
    startAmount,
    sharePrice,
    dividendYieldPct,
    priceGrowthPct,
    dividendGrowthPct,
    years,
    monthlyContribution = 0,
    taxDragPct = 0
  } = input

  const rows: DripYearRow[] = []
  if (startAmount <= 0 || sharePrice <= 0 || years <= 0) return rows

  let shares = startAmount / sharePrice
  let price = sharePrice
  let divPerShare = (sharePrice * dividendYieldPct) / 100
  const taxMult = 1 - taxDragPct / 100
  let totalDividends = 0
  let totalContributed = startAmount

  for (let y = 1; y <= years; y++) {
    let dividendsThisYear = 0
    let contributionsThisYear = 0
    for (let q = 0; q < 4; q++) {
      // Monthly contributions (3 months per quarter)
      for (let m = 0; m < 3; m++) {
        if (monthlyContribution > 0) {
          const addShares = monthlyContribution / price
          shares += addShares
          contributionsThisYear += monthlyContribution
          totalContributed += monthlyContribution
        }
        // Price compounds each month
        price = price * Math.pow(1 + priceGrowthPct / 100, 1 / 12)
      }
      // Quarterly dividend
      const divThisQuarter = shares * (divPerShare / 4) * taxMult
      dividendsThisYear += divThisQuarter
      totalDividends += divThisQuarter
      // Reinvest dividend into shares at current price
      shares += divThisQuarter / price
    }
    // Dividend grows annually
    divPerShare = divPerShare * (1 + dividendGrowthPct / 100)
    rows.push({
      year: y,
      shares,
      price,
      annualDividend: divPerShare,
      dividendsReinvested: dividendsThisYear,
      contributionsYear: contributionsThisYear,
      totalValue: shares * price,
      totalDividends,
      totalContributed
    })
  }
  return rows
}

/**
 * Total CAGR including dividend reinvestment.
 */
export function dripCAGR(rows: DripYearRow[], startValue: number): number {
  if (rows.length === 0 || startValue <= 0) return 0
  const final = rows[rows.length - 1].totalValue
  const years = rows.length
  return (Math.pow(final / startValue, 1 / years) - 1) * 100
}
