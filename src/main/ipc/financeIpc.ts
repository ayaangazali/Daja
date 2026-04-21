import { ipcMain } from 'electron'
import { z } from 'zod'
import { IPC_CHANNELS } from '../../shared/ipc'
import { fetchHistorical, fetchQuote, searchTickers } from '../services/finance/yahoo'
import { fetchFundamentals } from '../services/finance/fundamentals'

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
}
