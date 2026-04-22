import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IPC_CHANNELS } from '../shared/ipc'
import type { AIProviderId, KeyMeta, ModuleId, Prefs, ProviderId, TestResult } from '../shared/ipc'

type Unsubscribe = () => void

const daja = {
  keys: {
    list: (): Promise<KeyMeta[]> => ipcRenderer.invoke(IPC_CHANNELS.keysList),
    set: (provider: ProviderId, key: string): Promise<{ ok: boolean }> =>
      ipcRenderer.invoke(IPC_CHANNELS.keysSet, { provider, key }),
    delete: (provider: ProviderId): Promise<{ ok: boolean }> =>
      ipcRenderer.invoke(IPC_CHANNELS.keysDelete, { provider }),
    test: (provider: ProviderId): Promise<TestResult> =>
      ipcRenderer.invoke(IPC_CHANNELS.keysTest, { provider })
  },
  prefs: {
    get: (): Promise<Prefs> => ipcRenderer.invoke(IPC_CHANNELS.prefsGet),
    setAiForModule: (module: ModuleId, provider: AIProviderId): Promise<{ ok: boolean }> =>
      ipcRenderer.invoke(IPC_CHANNELS.prefsSetAiModule, { module, provider }),
    setModel: (provider: AIProviderId, model: string): Promise<{ ok: boolean }> =>
      ipcRenderer.invoke(IPC_CHANNELS.prefsSetModel, { provider, model }),
    setTheme: (theme: 'dark' | 'light'): Promise<{ ok: boolean }> =>
      ipcRenderer.invoke(IPC_CHANNELS.prefsSetTheme, { theme })
  },
  ai: {
    start: (payload: unknown): Promise<{ requestId: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.aiChatStart, payload),
    onChunk: (requestId: string, cb: (text: string) => void): Unsubscribe => {
      const h = (_e: unknown, id: string, text: string): void => {
        if (id === requestId) cb(text)
      }
      ipcRenderer.on(IPC_CHANNELS.aiChatChunk, h)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.aiChatChunk, h)
    },
    onDone: (requestId: string, cb: () => void): Unsubscribe => {
      const h = (_e: unknown, id: string): void => {
        if (id === requestId) cb()
      }
      ipcRenderer.on(IPC_CHANNELS.aiChatDone, h)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.aiChatDone, h)
    },
    onError: (requestId: string, cb: (msg: string) => void): Unsubscribe => {
      const h = (_e: unknown, id: string, msg: string): void => {
        if (id === requestId) cb(msg)
      }
      ipcRenderer.on(IPC_CHANNELS.aiChatError, h)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.aiChatError, h)
    },
    cancel: (requestId: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.aiChatCancel, { requestId })
  },
  db: {
    call: <T = unknown>(repo: string, method: string, args: unknown[] = []): Promise<T> =>
      ipcRenderer.invoke('db:call', { repo, method, args })
  },
  finance: {
    quote: (ticker: string): Promise<unknown> =>
      ipcRenderer.invoke(IPC_CHANNELS.financeQuote, { ticker }),
    historical: (ticker: string, range: string): Promise<unknown> =>
      ipcRenderer.invoke(IPC_CHANNELS.financeHistorical, { ticker, range }),
    search: (q: string): Promise<unknown> => ipcRenderer.invoke(IPC_CHANNELS.financeSearch, { q }),
    fundamentals: (ticker: string): Promise<unknown> =>
      ipcRenderer.invoke(IPC_CHANNELS.financeFundamentals, { ticker }),
    statements: (ticker: string): Promise<unknown> =>
      ipcRenderer.invoke(IPC_CHANNELS.financeStatements, { ticker }),
    ownership: (ticker: string): Promise<unknown> =>
      ipcRenderer.invoke(IPC_CHANNELS.financeOwnership, { ticker }),
    options: (ticker: string, expiration?: number): Promise<unknown> =>
      ipcRenderer.invoke(IPC_CHANNELS.financeOptions, { ticker, expiration }),
    news: (ticker: string): Promise<unknown> =>
      ipcRenderer.invoke(IPC_CHANNELS.financeNews, { ticker }),
    filings: (ticker: string): Promise<unknown> =>
      ipcRenderer.invoke(IPC_CHANNELS.financeFilings, { ticker }),
    reddit: (ticker: string): Promise<unknown> =>
      ipcRenderer.invoke(IPC_CHANNELS.financeReddit, { ticker }),
    earningsCalendar: (daysAhead = 14): Promise<unknown> =>
      ipcRenderer.invoke(IPC_CHANNELS.financeEarningsCal, { daysAhead }),
    screener: (id: string, count = 25): Promise<unknown> =>
      ipcRenderer.invoke(IPC_CHANNELS.financeScreener, { id, count }),
    dividends: (ticker: string): Promise<unknown> =>
      ipcRenderer.invoke(IPC_CHANNELS.financeDividends, { ticker }),
    peers: (ticker: string): Promise<unknown> =>
      ipcRenderer.invoke(IPC_CHANNELS.financePeers, { ticker })
  },
  pdf: {
    merge: (paths: string[], outPath: string): Promise<{ ok: boolean; path: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.pdfMerge, { paths, outPath }),
    split: (
      path: string,
      outDir: string,
      ranges: { name: string; from: number; to: number }[]
    ): Promise<{ ok: boolean; files: string[] }> =>
      ipcRenderer.invoke(IPC_CHANNELS.pdfSplit, { path, outDir, ranges }),
    info: (path: string): Promise<{ pages: number; title: string | null; author: string | null }> =>
      ipcRenderer.invoke(IPC_CHANNELS.pdfInfo, { path }),
    open: (): Promise<string[]> => ipcRenderer.invoke(IPC_CHANNELS.pdfOpen)
  },
  sports: {
    scoreboard: (league: string): Promise<unknown> =>
      ipcRenderer.invoke(IPC_CHANNELS.sportsScoreboard, { league }),
    standings: (league: string): Promise<unknown> =>
      ipcRenderer.invoke(IPC_CHANNELS.sportsStandings, { league }),
    schedule: (league: string, team: string): Promise<unknown> =>
      ipcRenderer.invoke(IPC_CHANNELS.sportsSchedule, { league, team })
  },
  window: {
    setAlwaysOnTop: (enabled: boolean): Promise<{ ok: boolean; enabled: boolean }> =>
      ipcRenderer.invoke(IPC_CHANNELS.windowAlwaysOnTop, { enabled }),
    toggleDevTools: (): Promise<{ ok: boolean }> =>
      ipcRenderer.invoke(IPC_CHANNELS.windowToggleDevtools)
  },
  system: {
    notify: (args: { title: string; body: string; openUrl?: string }): Promise<{ ok: boolean }> =>
      ipcRenderer.invoke(IPC_CHANNELS.notify, args),
    saveFile: (args: {
      defaultPath?: string
      filters?: { name: string; extensions: string[] }[]
      contents: string
    }): Promise<{ ok: boolean; path: string | null }> =>
      ipcRenderer.invoke(IPC_CHANNELS.fsSavePath, args)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('daja', daja)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore legacy fallback
  window.electron = electronAPI
  // @ts-ignore legacy fallback
  window.daja = daja
}

export type DajaBridge = typeof daja
