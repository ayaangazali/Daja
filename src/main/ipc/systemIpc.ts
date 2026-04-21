import { BrowserWindow, Notification, dialog, ipcMain, shell } from 'electron'
import { writeFileSync } from 'fs'
import { z } from 'zod'
import { IPC_CHANNELS } from '../../shared/ipc'

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
    if (openUrl) n.on('click', () => void shell.openExternal(openUrl))
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
}
