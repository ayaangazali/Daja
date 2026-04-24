import { BrowserWindow, Notification, dialog, ipcMain, shell } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import { z } from 'zod'
import { IPC_CHANNELS } from '../../shared/ipc'
import { exportBackup, restoreBackup, listPreRestoreBackups } from '../services/backup'
import { clearUsage, getUsage, summarizeUsage } from '../services/aiUsage'
import { closeDatabase } from '../db/client'

/**
 * Guard shell.openExternal — only permit http(s) and mailto, reject
 * file://, javascript:, data:, and other schemes that can bypass the
 * browser's security model when Electron opens them in the default app.
 */
function safeOpenExternal(raw: string): void {
  try {
    const u = new URL(raw)
    if (u.protocol === 'http:' || u.protocol === 'https:' || u.protocol === 'mailto:') {
      void shell.openExternal(u.toString())
    } else {
      console.warn(`[systemIpc] rejecting openExternal scheme "${u.protocol}" for url ${raw}`)
    }
  } catch (err) {
    console.warn('[systemIpc] malformed URL passed to openExternal:', raw, err)
  }
}

export function registerSystemIpc(): void {
  ipcMain.handle(IPC_CHANNELS.windowAlwaysOnTop, async (e, raw) => {
    const { enabled } = z.object({ enabled: z.boolean() }).parse(raw)
    const win = BrowserWindow.fromWebContents(e.sender)
    win?.setAlwaysOnTop(enabled, 'floating')
    return { ok: true, enabled }
  })

  ipcMain.handle(IPC_CHANNELS.windowToggleDevtools, async (e) => {
    e.sender.toggleDevTools()
    return { ok: true }
  })

  ipcMain.handle(IPC_CHANNELS.notify, async (_e, raw) => {
    const { title, body, openUrl } = z
      .object({
        title: z.string().min(1),
        body: z.string().min(1),
        openUrl: z.string().optional()
      })
      .parse(raw)
    const n = new Notification({ title, body })
    if (openUrl) n.on('click', () => safeOpenExternal(openUrl))
    n.show()
    return { ok: true }
  })

  ipcMain.handle(IPC_CHANNELS.fsSavePath, async (_e, raw) => {
    const { defaultPath, filters, contents } = z
      .object({
        defaultPath: z.string().optional(),
        filters: z
          .array(z.object({ name: z.string(), extensions: z.array(z.string()) }))
          .optional(),
        contents: z.string()
      })
      .parse(raw)
    const result = await dialog.showSaveDialog({
      defaultPath,
      filters: filters ?? []
    })
    if (result.canceled || !result.filePath) return { ok: false, path: null }
    writeFileSync(result.filePath, contents, 'utf8')
    return { ok: true, path: result.filePath }
  })

  ipcMain.handle(IPC_CHANNELS.backupExport, async () => {
    const { manifestJson, filename } = exportBackup()
    const r = await dialog.showSaveDialog({
      defaultPath: filename,
      filters: [{ name: 'Daja Backup', extensions: ['json'] }]
    })
    if (r.canceled || !r.filePath) return { ok: false, path: null }
    writeFileSync(r.filePath, manifestJson, 'utf8')
    return { ok: true, path: r.filePath }
  })

  ipcMain.handle(IPC_CHANNELS.backupRestore, async () => {
    const r = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Daja Backup', extensions: ['json'] }]
    })
    if (r.canceled || r.filePaths.length === 0) return { ok: false }
    const manifestJson = readFileSync(r.filePaths[0], 'utf8')
    // Close DB before overwriting daja.db — main must reopen after restore
    closeDatabase()
    const result = restoreBackup(manifestJson)
    return {
      ok: true,
      restored: result.restored,
      backedUp: result.backedUp,
      manifestDate: result.manifestDate,
      requiresRestart: result.restored.includes('daja.db')
    }
  })

  ipcMain.handle(IPC_CHANNELS.backupListPreRestore, async () => {
    return { ok: true, list: listPreRestoreBackups() }
  })

  ipcMain.handle(IPC_CHANNELS.aiUsageSummary, async (_e, raw) => {
    const { days } = z
      .object({ days: z.number().int().min(1).max(365).optional() })
      .parse(raw ?? {})
    return summarizeUsage(days ?? 30)
  })

  ipcMain.handle(IPC_CHANNELS.aiUsageList, async (_e, raw) => {
    const { limit } = z
      .object({ limit: z.number().int().min(1).max(10_000).optional() })
      .parse(raw ?? {})
    return getUsage(limit ?? 200)
  })

  ipcMain.handle(IPC_CHANNELS.aiUsageClear, async () => {
    clearUsage()
    return { ok: true }
  })
}
