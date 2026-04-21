import { ipcMain } from 'electron'
import { z } from 'zod'
import { IPC_CHANNELS } from '../../shared/ipc'
import { fetchScoreboard, fetchStandings } from '../services/sports/espn'

const LeaguePayload = z.object({ league: z.string().min(1) })
const SchedulePayload = z.object({ league: z.string().min(1), team: z.string() })

export function registerSportsIpc(): void {
  ipcMain.handle(IPC_CHANNELS.sportsScoreboard, async (_e, raw) => {
    const { league } = LeaguePayload.parse(raw)
    return fetchScoreboard(league)
  })
  ipcMain.handle(IPC_CHANNELS.sportsStandings, async (_e, raw) => {
    const { league } = LeaguePayload.parse(raw)
    return fetchStandings(league)
  })
  ipcMain.handle(IPC_CHANNELS.sportsSchedule, async (_e, raw) => {
    // reuse scoreboard as schedule surrogate (ESPN schedule varies per league)
    const { league } = SchedulePayload.parse(raw)
    return fetchScoreboard(league)
  })
}
