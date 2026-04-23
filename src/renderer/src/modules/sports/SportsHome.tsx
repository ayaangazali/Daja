import { useState } from 'react'
import { Calendar, ListOrdered, Play, Tv2 } from 'lucide-react'
import { useScoreboard, useStandings } from '../../hooks/useSports'
import { cn } from '../../lib/cn'

const LEAGUES = [
  { id: 'nfl', name: 'NFL' },
  { id: 'nba', name: 'NBA' },
  { id: 'mlb', name: 'MLB' },
  { id: 'nhl', name: 'NHL' },
  { id: 'cfb', name: 'CFB' },
  { id: 'cbb', name: 'CBB' },
  { id: 'mls', name: 'MLS' },
  { id: 'epl', name: 'EPL' },
  { id: 'laliga', name: 'La Liga' },
  { id: 'wnba', name: 'WNBA' },
  { id: 'f1', name: 'F1' },
  { id: 'ufc', name: 'UFC' }
]

type Tab = 'scoreboard' | 'standings' | 'live'

export function SportsHome(): React.JSX.Element {
  const [league, setLeague] = useState('nfl')
  const [tab, setTab] = useState<Tab>('scoreboard')
  const [youtubeId, setYoutubeId] = useState('')
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-1 border-b border-[var(--color-border)] bg-[var(--color-bg-elev)] px-2 py-1">
        {LEAGUES.map((l) => (
          <button
            key={l.id}
            onClick={() => setLeague(l.id)}
            className={cn(
              'rounded px-2 py-1 text-[11px] font-medium',
              league === l.id
                ? 'bg-[var(--color-accent)] text-white'
                : 'text-[var(--color-fg-muted)] hover:bg-[var(--color-bg)]'
            )}
          >
            {l.name}
          </button>
        ))}
      </div>
      <div className="flex border-b border-[var(--color-border)]">
        <TabBtn
          tab="scoreboard"
          active={tab}
          onClick={setTab}
          label="Scoreboard"
          icon={<Calendar className="h-3 w-3" />}
        />
        <TabBtn
          tab="standings"
          active={tab}
          onClick={setTab}
          label="Standings"
          icon={<ListOrdered className="h-3 w-3" />}
        />
        <TabBtn
          tab="live"
          active={tab}
          onClick={setTab}
          label="Watch"
          icon={<Tv2 className="h-3 w-3" />}
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {tab === 'scoreboard' && <Scoreboard league={league} />}
        {tab === 'standings' && <Standings league={league} />}
        {tab === 'live' && <LiveEmbed id={youtubeId} onChange={setYoutubeId} />}
      </div>
    </div>
  )
}

function TabBtn({
  tab,
  active,
  onClick,
  label,
  icon
}: {
  tab: Tab
  active: Tab
  onClick: (t: Tab) => void
  label: string
  icon: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      onClick={() => onClick(tab)}
      className={cn(
        'flex items-center gap-1 px-3 py-1.5 text-[11px]',
        active === tab
          ? 'border-b-2 border-[var(--color-info)] text-[var(--color-fg)]'
          : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
      )}
    >
      {icon} {label}
    </button>
  )
}

function Scoreboard({ league }: { league: string }): React.JSX.Element {
  const { data, isLoading, error } = useScoreboard(league)
  if (error)
    return (
      <div className="p-4 text-[11px] text-[var(--color-neg)]">
        Scoreboard failed: {error.message}
      </div>
    )
  if (isLoading || !data)
    return <div className="p-4 text-[11px] text-[var(--color-fg-muted)]">Loading…</div>
  return (
    <div className="p-3">
      {data.games.length === 0 && (
        <div className="py-6 text-center text-[11px] text-[var(--color-fg-muted)]">
          No games scheduled.
        </div>
      )}
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
        {data.games.map((g) => (
          <GameCard key={g.id} game={g} />
        ))}
      </div>
    </div>
  )
}

function GameCard({
  game
}: {
  game: {
    id: string
    status: string
    statusDetail: string
    startDate: string
    competitors: {
      name: string
      abbreviation: string
      score: string | null
      homeAway: string
      winner: boolean
      logo: string | null
    }[]
    venue: string | null
    broadcasts: string[]
  }
}): React.JSX.Element {
  const away = game.competitors.find((c) => c.homeAway === 'away') ?? game.competitors[0]
  const home = game.competitors.find((c) => c.homeAway === 'home') ?? game.competitors[1]
  const live = game.status.toLowerCase().includes('in')
  return (
    <div
      className={cn(
        'rounded-md border p-3 text-[11px]',
        'border-[var(--color-border)] bg-[var(--color-bg-elev)]'
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <div
          className={cn(
            'rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase',
            live
              ? 'bg-[var(--color-neg)]/20 text-[var(--color-neg)]'
              : 'bg-[var(--color-fg-muted)]/10 text-[var(--color-fg-muted)]'
          )}
        >
          {game.statusDetail}
        </div>
        {game.broadcasts.length > 0 && (
          <div className="text-[9px] text-[var(--color-fg-muted)]">
            {game.broadcasts.join(', ')}
          </div>
        )}
      </div>
      {[away, home].filter(Boolean).map((c) => (
        <div
          key={c!.abbreviation + c!.name}
          className={cn('flex items-center justify-between py-1', c!.winner && 'font-semibold')}
        >
          <div className="flex items-center gap-2">
            {c!.logo && <img src={c!.logo} alt="" className="h-5 w-5 object-contain" />}
            <div>
              <div>{c!.name}</div>
              <div className="text-[9px] text-[var(--color-fg-muted)]">
                {c!.homeAway === 'home' ? 'HOME' : 'AWAY'}
              </div>
            </div>
          </div>
          <div className="font-mono text-base tabular">{c!.score ?? '—'}</div>
        </div>
      ))}
      {game.venue && (
        <div className="mt-1 text-[9px] text-[var(--color-fg-muted)]">{game.venue}</div>
      )}
    </div>
  )
}

function Standings({ league }: { league: string }): React.JSX.Element {
  const { data = [], isLoading, error } = useStandings(league)
  if (error)
    return (
      <div className="p-4 text-[11px] text-[var(--color-neg)]">
        Standings failed: {error.message}
      </div>
    )
  if (isLoading) return <div className="p-4 text-[11px] text-[var(--color-fg-muted)]">Loading…</div>
  if (data.length === 0)
    return (
      <div className="p-6 text-center text-[11px] text-[var(--color-fg-muted)]">
        No standings available for this league right now.
      </div>
    )
  return (
    <div className="p-3">
      <div className="overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)]">
        <table className="w-full text-[11px]">
          <thead className="border-b border-[var(--color-border)] text-[10px] uppercase text-[var(--color-fg-muted)]">
            <tr>
              <th className="px-2 py-1 text-left">Team</th>
              <th className="px-2 py-1 text-right">W</th>
              <th className="px-2 py-1 text-right">L</th>
              <th className="px-2 py-1 text-right">Pct</th>
              <th className="px-2 py-1 text-right">GB</th>
            </tr>
          </thead>
          <tbody>
            {data.map((s) => (
              <tr
                key={s.team + s.abbreviation}
                className="border-t border-[var(--color-border)] hover:bg-[var(--color-bg)]"
              >
                <td className="px-2 py-1">
                  <div className="flex items-center gap-2">
                    {s.logo && <img src={s.logo} alt="" className="h-4 w-4 object-contain" />}
                    <span>{s.team}</span>
                  </div>
                </td>
                <td className="px-2 py-1 text-right font-mono tabular">{s.wins ?? '—'}</td>
                <td className="px-2 py-1 text-right font-mono tabular">{s.losses ?? '—'}</td>
                <td className="px-2 py-1 text-right font-mono tabular">
                  {s.pct != null ? s.pct.toFixed(3) : '—'}
                </td>
                <td className="px-2 py-1 text-right font-mono tabular">{s.gamesBack ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function parseYouTubeId(input: string): string {
  const m = input.match(/(?:v=|youtu\.be\/|embed\/|live\/)([A-Za-z0-9_-]{11})/)
  if (m) return m[1]
  if (/^[A-Za-z0-9_-]{11}$/.test(input.trim())) return input.trim()
  return ''
}

function LiveEmbed({
  id,
  onChange
}: {
  id: string
  onChange: (s: string) => void
}): React.JSX.Element {
  const [input, setInput] = useState('')
  const videoId = parseYouTubeId(id)
  return (
    <div className="p-3">
      <div className="mb-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="YouTube URL or video ID"
          className="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-2 py-1 text-[11px] outline-none"
        />
        <button
          onClick={() => onChange(parseYouTubeId(input))}
          className="flex items-center gap-1 rounded bg-[var(--color-info)] px-3 py-1 text-[11px] font-medium text-white"
        >
          <Play className="h-3 w-3" /> Load
        </button>
      </div>
      {videoId ? (
        <div className="aspect-video w-full overflow-hidden rounded-md border border-[var(--color-border)] bg-black">
          <iframe
            className="h-full w-full"
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
            title="YouTube"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-[var(--color-border)] p-8 text-center text-[11px] text-[var(--color-fg-muted)]">
          Paste a YouTube live stream URL to watch inside Daja.
        </div>
      )}
    </div>
  )
}
