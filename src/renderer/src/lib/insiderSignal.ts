export interface InsiderTxn {
  name: string
  transaction: string // free-text from Yahoo — contains "Purchase" or "Sale"
  shares: number | null
  value: number | null
  date: string // ISO
}

export interface InsiderSignal {
  signal: 'bullish' | 'bearish' | 'mixed' | 'neutral'
  score: number // -100..100; positive = buying
  purchases90d: number
  sales90d: number
  purchaseValue90d: number
  saleValue90d: number
  uniqueBuyers90d: number
  uniqueSellers90d: number
  lastTxnDays: number | null
}

function isPurchase(t: InsiderTxn): boolean {
  const s = (t.transaction || '').toLowerCase()
  return s.includes('purchase') || s.includes('award') === false && s.includes('buy')
}

function isSale(t: InsiderTxn): boolean {
  const s = (t.transaction || '').toLowerCase()
  return s.includes('sale') || s.includes('sell')
}

export function analyzeInsiderActivity(txns: InsiderTxn[], refDate = new Date()): InsiderSignal {
  const cutoff = refDate.getTime() - 90 * 24 * 60 * 60 * 1000
  let purchases = 0
  let sales = 0
  let purchaseValue = 0
  let saleValue = 0
  const buyers = new Set<string>()
  const sellers = new Set<string>()
  let mostRecent = 0

  for (const t of txns) {
    if (!t.date) continue
    const tstamp = new Date(t.date).getTime()
    if (Number.isNaN(tstamp)) continue
    if (tstamp > mostRecent) mostRecent = tstamp
    if (tstamp < cutoff) continue
    const value = Math.abs(t.value ?? 0)
    if (isPurchase(t) && !isSale(t)) {
      purchases++
      purchaseValue += value
      if (t.name) buyers.add(t.name)
    } else if (isSale(t)) {
      sales++
      saleValue += value
      if (t.name) sellers.add(t.name)
    }
  }

  const lastTxnDays = mostRecent > 0 ? Math.floor((refDate.getTime() - mostRecent) / (1000 * 60 * 60 * 24)) : null

  let signal: InsiderSignal['signal'] = 'neutral'
  let score = 0
  const totalValue = purchaseValue + saleValue
  if (totalValue > 0) {
    score = Math.round(((purchaseValue - saleValue) / totalValue) * 100)
  }
  if (purchases >= 3 && purchases > sales * 2) signal = 'bullish'
  else if (sales >= 3 && sales > purchases * 2) signal = 'bearish'
  else if (purchases > 0 && sales > 0) signal = 'mixed'

  return {
    signal,
    score,
    purchases90d: purchases,
    sales90d: sales,
    purchaseValue90d: purchaseValue,
    saleValue90d: saleValue,
    uniqueBuyers90d: buyers.size,
    uniqueSellers90d: sellers.size,
    lastTxnDays
  }
}
