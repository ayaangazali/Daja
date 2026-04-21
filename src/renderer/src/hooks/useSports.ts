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

export function useScoreboard(
  league: string
): ReturnType<typeof useQuery<Scoreboard, Error>> {
  return useQuery<Scoreboard, Error>({
    queryKey: ['scoreboard', league],
    queryFn: () => window.nexus.sports.scoreboard(league) as Promise<Scoreboard>,
    staleTime: 30_000,
    refetchInterval: 60_000
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
    queryFn: () => window.nexus.sports.standings(league) as Promise<Standing[]>,
    staleTime: 5 * 60_000
  })
}
