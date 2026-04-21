export type MarketStatus = 'open' | 'pre' | 'post' | 'closed'

// Trading calendar: NYSE/NASDAQ regular hours 9:30-16:00 ET, pre 4:00-9:30, post 16:00-20:00.
// Weekends always closed. Market holidays not accounted for.
export function marketStatusAt(date: Date): MarketStatus {
  const et = new Date(
    date.toLocaleString('en-US', { timeZone: 'America/New_York' })
  )
  const day = et.getDay()
  if (day === 0 || day === 6) return 'closed'
  const mins = et.getHours() * 60 + et.getMinutes()
  if (mins >= 9 * 60 + 30 && mins < 16 * 60) return 'open'
  if (mins >= 4 * 60 && mins < 9 * 60 + 30) return 'pre'
  if (mins >= 16 * 60 && mins < 20 * 60) return 'post'
  return 'closed'
}
