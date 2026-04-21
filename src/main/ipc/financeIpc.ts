import { ipcMain } from 'electron'
import { z } from 'zod'
import { IPC_CHANNELS } from '../../shared/ipc'
import { fetchHistorical, fetchQuote, searchTickers } from '../services/finance/yahoo'
import { fetchFundamentals } from '../services/finance/fundamentals'
import { fetchOptions, fetchOwnership, fetchStatements } from '../services/finance/statements'
import { fetchNews, fetchRedditMentions, fetchSecFilings } from '../services/finance/news'
import { fetchEarningsCalendar } from '../services/finance/earnings'
import { fetchScreener } from '../services/finance/screener'
import { fetchDividends } from '../services/finance/dividends'

const QuotePayload = z.object({ ticker: z.string().min(1) })
const HistoricalPayload = z.object({ ticker: z.string().min(1), range: z.string().min(1) })
const SearchPayload = z.object({ q: z.string() })

export function registerFinanceIpc(): void {
  ipcMain.handle(IPC_CHANNELS.financeQuote, async (_e, raw) => {
    const { ticker } = QuotePayload.parse(raw)
    return fetchQuote(ticker)
  })
  ipcMain.handle(IPC_CHANNELS.financeHistorical, async (_e, raw) => {
    const { ticker, range } = HistoricalPayload.parse(raw)
    return fetchHistorical(ticker, range)
  })
  ipcMain.handle(IPC_CHANNELS.financeSearch, async (_e, raw) => {
    const { q } = SearchPayload.parse(raw)
    return searchTickers(q)
  })
  ipcMain.handle(IPC_CHANNELS.financeFundamentals, async (_e, raw) => {
    const { ticker } = QuotePayload.parse(raw)
    return fetchFundamentals(ticker)
  })
  ipcMain.handle(IPC_CHANNELS.financeStatements, async (_e, raw) => {
    const { ticker } = QuotePayload.parse(raw)
    return fetchStatements(ticker)
  })
  ipcMain.handle(IPC_CHANNELS.financeOwnership, async (_e, raw) => {
    const { ticker } = QuotePayload.parse(raw)
    return fetchOwnership(ticker)
  })
  ipcMain.handle(IPC_CHANNELS.financeOptions, async (_e, raw) => {
    const parsed = z
      .object({ ticker: z.string().min(1), expiration: z.number().optional() })
      .parse(raw)
    return fetchOptions(parsed.ticker, parsed.expiration)
  })
  ipcMain.handle(IPC_CHANNELS.financeNews, async (_e, raw) => {
    const { ticker } = QuotePayload.parse(raw)
    return fetchNews(ticker)
  })
  ipcMain.handle(IPC_CHANNELS.financeFilings, async (_e, raw) => {
    const { ticker } = QuotePayload.parse(raw)
    return fetchSecFilings(ticker)
  })
  ipcMain.handle(IPC_CHANNELS.financeReddit, async (_e, raw) => {
    const { ticker } = QuotePayload.parse(raw)
    return fetchRedditMentions(ticker)
  })
  ipcMain.handle(IPC_CHANNELS.financeEarningsCal, async (_e, raw) => {
    const parsed = z.object({ daysAhead: z.number().optional() }).parse(raw ?? {})
    return fetchEarningsCalendar(parsed.daysAhead ?? 14)
  })
  ipcMain.handle(IPC_CHANNELS.financeScreener, async (_e, raw) => {
    const parsed = z.object({ id: z.string().min(1), count: z.number().optional() }).parse(raw)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return fetchScreener(parsed.id as any, parsed.count ?? 25)
  })
  ipcMain.handle(IPC_CHANNELS.financeDividends, async (_e, raw) => {
    const { ticker } = QuotePayload.parse(raw)
    return fetchDividends(ticker)
  })
}
