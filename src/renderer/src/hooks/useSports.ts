import { useQuery } from '@tanstack/react-query'

export interface Competitor {
  id: string
  name: string
  abbreviation: string
  score: string | null
  homeAway: string
  winner: boolean
  logo: string | null
}
export interface Game {
  id: string
  shortName: string
  status: string
  statusDetail: string
  startDate: string
  competitors: Competitor[]
  venue: string | null
  broadcasts: string[]
}
export interface Scoreboard {
  league: string
  games: Game[]
  season: { year: number; type: number } | null
  week: { number: number } | null
}

/**
 * Scoreboard refresh cadence — adapts to whether games are live.
 * - At least one live game → 30s refresh for near-real-time score updates.
 * - All games scheduled or final → 5 min (no reason to hammer the API).
 * The query callback mutates its own refetchInterval via react-query's
 * function signature.
 */
export function useScoreboard(league: string): ReturnType<typeof useQuery<Scoreboard, Error>> {
  return useQuery<Scoreboard, Error>({
    queryKey: ['scoreboard', league],
    queryFn: () => window.daja.sports.scoreboard(league) as Promise<Scoreboard>,
    staleTime: 30_000,
    refetchInterval: (q) => {
      const data = q.state.data as Scoreboard | undefined
      if (!data) return 60_000
      const hasLive = data.games.some((g) => {
        const s = (g.status || '').toLowerCase()
        return (
          s.includes('in progress') || s.includes('half') || s.includes('quarter') || s === 'in'
        )
      })
      return hasLive ? 30_000 : 5 * 60_000
    }
  })
}

export interface Standing {
  team: string
  abbreviation: string
  logo: string | null
  stats: { name: string; display: string }[]
  wins: number | null
  losses: number | null
  pct: number | null
  gamesBack: string | null
}

export function useStandings(league: string): ReturnType<typeof useQuery<Standing[], Error>> {
  return useQuery<Standing[], Error>({
    queryKey: ['standings', league],
    queryFn: () => window.daja.sports.standings(league) as Promise<Standing[]>,
    staleTime: 5 * 60_000
  })
}
