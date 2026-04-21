type Obj = Record<string, unknown>

const LEAGUE_PATHS: Record<string, string> = {
  nfl: 'football/nfl',
  nba: 'basketball/nba',
  mlb: 'baseball/mlb',
  nhl: 'hockey/nhl',
  cfb: 'football/college-football',
  cbb: 'basketball/mens-college-basketball',
  mls: 'soccer/usa.1',
  epl: 'soccer/eng.1',
  laliga: 'soccer/esp.1',
  wnba: 'basketball/wnba',
  f1: 'racing/f1',
  ufc: 'mma/ufc'
}

export const SUPPORTED_LEAGUES = Object.keys(LEAGUE_PATHS)

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

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (NexusHub Sports)',
      Accept: 'application/json'
    }
  })
  if (!res.ok) throw new Error(`ESPN ${res.status}: ${url}`)
  return (await res.json()) as T
}

export async function fetchScoreboard(league: string): Promise<Scoreboard> {
  const path = LEAGUE_PATHS[league.toLowerCase()]
  if (!path) throw new Error(`Unknown league: ${league}`)
  const url = `https://site.api.espn.com/apis/site/v2/sports/${path}/scoreboard`
  const data = await fetchJson<Obj>(url)
  const events = (data.events as Obj[]) ?? []
  const games: Game[] = events.map((e) => {
    const comp = ((e.competitions as Obj[]) ?? [])[0] ?? {}
    const competitors = (((comp as Obj).competitors as Obj[]) ?? []).map((c) => {
      const team = (c.team as Obj) ?? {}
      return {
        id: String(team.id ?? ''),
        name: String((team.displayName as string) ?? (team.name as string) ?? ''),
        abbreviation: String(team.abbreviation ?? ''),
        score: c.score != null ? String(c.score) : null,
        homeAway: String(c.homeAway ?? ''),
        winner: Boolean(c.winner),
        logo:
          typeof team.logo === 'string'
            ? team.logo
            : (((team.logos as Obj[])?.[0] as Obj)?.href as string) ?? null
      } as Competitor
    })
    const status = (e.status as Obj) ?? {}
    const st = (status.type as Obj) ?? {}
    const venue = ((comp as Obj).venue as Obj) ?? null
    const bcasts = (((comp as Obj).broadcasts as Obj[]) ?? [])
      .flatMap((b) => ((b.names as string[]) ?? []))
    return {
      id: String(e.id ?? ''),
      shortName: String(e.shortName ?? ''),
      status: String(st.name ?? ''),
      statusDetail: String(st.detail ?? st.shortDetail ?? ''),
      startDate: String(e.date ?? ''),
      competitors,
      venue: venue ? String((venue as Obj).fullName ?? '') : null,
      broadcasts: Array.from(new Set(bcasts))
    }
  })
  const season = data.season
    ? {
        year: Number((data.season as Obj).year ?? 0),
        type: Number((data.season as Obj).type ?? 0)
      }
    : null
  const week = data.week ? { number: Number((data.week as Obj).number ?? 0) } : null
  return { league, games, season, week }
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

export async function fetchStandings(league: string): Promise<Standing[]> {
  const path = LEAGUE_PATHS[league.toLowerCase()]
  if (!path) throw new Error(`Unknown league: ${league}`)
  const url = `https://site.api.espn.com/apis/v2/sports/${path}/standings`
  try {
    const data = await fetchJson<Obj>(url)
    const children = (data.children as Obj[]) ?? []
    const out: Standing[] = []
    for (const group of children) {
      const entries = ((group.standings as Obj)?.entries as Obj[]) ?? []
      for (const e of entries) {
        const team = (e.team as Obj) ?? {}
        const stats = ((e.stats as Obj[]) ?? []).map((s) => ({
          name: String(s.name ?? ''),
          display: String(s.displayValue ?? '')
        }))
        const wins = stats.find((s) => s.name === 'wins')?.display ?? null
        const losses = stats.find((s) => s.name === 'losses')?.display ?? null
        const pct = stats.find((s) => s.name === 'winPercent')?.display ?? null
        const gb = stats.find((s) => s.name === 'gamesBehind')?.display ?? null
        out.push({
          team: String(team.displayName ?? ''),
          abbreviation: String(team.abbreviation ?? ''),
          logo:
            typeof team.logos === 'object'
              ? ((((team.logos as Obj[])?.[0] as Obj)?.href as string) ?? null)
              : null,
          stats,
          wins: wins ? Number(wins) : null,
          losses: losses ? Number(losses) : null,
          pct: pct ? Number(pct) : null,
          gamesBack: gb
        })
      }
    }
    return out
  } catch {
    return []
  }
}
