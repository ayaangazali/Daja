/**
 * US macroeconomic calendar — major market-moving events.
 * Hardcoded 2026 dates sourced from:
 *   - FOMC meetings (Federal Reserve calendar)
 *   - BLS CPI / NFP release dates
 *   - BEA GDP schedule
 *   - Treasury auction calendar (quarterly refunding)
 *
 * Update annually when schedules publish.
 */

export type MacroCategory = 'fed' | 'inflation' | 'jobs' | 'growth' | 'treasury' | 'consumer'
export type MacroImpact = 'high' | 'medium' | 'low'

export interface MacroEvent {
  date: string // ISO yyyy-mm-dd
  name: string
  category: MacroCategory
  impact: MacroImpact
  description: string
}

// 2026 schedule (approximate; update when sources finalize)
export const MACRO_EVENTS_2026: MacroEvent[] = [
  {
    date: '2026-01-15',
    name: 'CPI December',
    category: 'inflation',
    impact: 'high',
    description: 'Consumer Price Index — core inflation print watched by Fed'
  },
  {
    date: '2026-01-28',
    name: 'FOMC rate decision',
    category: 'fed',
    impact: 'high',
    description: 'Federal Open Market Committee meeting — rate change or hold'
  },
  {
    date: '2026-01-30',
    name: 'GDP Q4 advance',
    category: 'growth',
    impact: 'high',
    description: 'Q4 GDP first estimate — broad growth signal'
  },
  {
    date: '2026-02-06',
    name: 'Nonfarm Payrolls',
    category: 'jobs',
    impact: 'high',
    description: 'January employment situation — jobs, wages, unemployment rate'
  },
  {
    date: '2026-02-12',
    name: 'CPI January',
    category: 'inflation',
    impact: 'high',
    description: 'Consumer Price Index'
  },
  {
    date: '2026-03-06',
    name: 'Nonfarm Payrolls',
    category: 'jobs',
    impact: 'high',
    description: 'February employment situation'
  },
  {
    date: '2026-03-12',
    name: 'CPI February',
    category: 'inflation',
    impact: 'high',
    description: 'Consumer Price Index'
  },
  {
    date: '2026-03-18',
    name: 'FOMC rate decision + SEP',
    category: 'fed',
    impact: 'high',
    description: 'Rate decision + Summary of Economic Projections (dot plot)'
  },
  {
    date: '2026-04-03',
    name: 'Nonfarm Payrolls',
    category: 'jobs',
    impact: 'high',
    description: 'March employment situation'
  },
  {
    date: '2026-04-10',
    name: 'CPI March',
    category: 'inflation',
    impact: 'high',
    description: 'Consumer Price Index'
  },
  {
    date: '2026-04-29',
    name: 'FOMC rate decision',
    category: 'fed',
    impact: 'high',
    description: 'Federal Open Market Committee meeting'
  },
  {
    date: '2026-04-30',
    name: 'GDP Q1 advance',
    category: 'growth',
    impact: 'high',
    description: 'Q1 GDP first estimate'
  },
  {
    date: '2026-05-01',
    name: 'Nonfarm Payrolls',
    category: 'jobs',
    impact: 'high',
    description: 'April employment situation'
  },
  {
    date: '2026-05-13',
    name: 'CPI April',
    category: 'inflation',
    impact: 'high',
    description: 'Consumer Price Index'
  },
  {
    date: '2026-06-05',
    name: 'Nonfarm Payrolls',
    category: 'jobs',
    impact: 'high',
    description: 'May employment situation'
  },
  {
    date: '2026-06-10',
    name: 'CPI May',
    category: 'inflation',
    impact: 'high',
    description: 'Consumer Price Index'
  },
  {
    date: '2026-06-17',
    name: 'FOMC rate decision + SEP',
    category: 'fed',
    impact: 'high',
    description: 'Rate decision + dot plot + Powell press conference'
  },
  {
    date: '2026-07-30',
    name: 'GDP Q2 advance',
    category: 'growth',
    impact: 'high',
    description: 'Q2 GDP first estimate'
  },
  {
    date: '2026-07-29',
    name: 'FOMC rate decision',
    category: 'fed',
    impact: 'high',
    description: 'Federal Open Market Committee meeting'
  },
  {
    date: '2026-09-16',
    name: 'FOMC rate decision + SEP',
    category: 'fed',
    impact: 'high',
    description: 'Rate decision + dot plot'
  },
  {
    date: '2026-10-29',
    name: 'FOMC rate decision',
    category: 'fed',
    impact: 'high',
    description: 'Federal Open Market Committee meeting'
  },
  {
    date: '2026-12-16',
    name: 'FOMC rate decision + SEP',
    category: 'fed',
    impact: 'high',
    description: 'Rate decision + dot plot — final of year'
  }
]

export function getUpcomingMacroEvents(
  refDate: Date = new Date(),
  daysAhead = 60
): MacroEvent[] {
  const refSec = refDate.getTime()
  const cutoff = refSec + daysAhead * 86400 * 1000
  return MACRO_EVENTS_2026.filter((e) => {
    const t = new Date(e.date + 'T00:00:00Z').getTime()
    return t >= refSec - 86400_000 && t <= cutoff
  }).sort((a, b) => a.date.localeCompare(b.date))
}

export function daysUntil(event: MacroEvent, refDate: Date = new Date()): number {
  const t = new Date(event.date + 'T00:00:00Z').getTime()
  return Math.round((t - refDate.getTime()) / 86400_000)
}
