import { ipcMain, dialog, shell } from 'electron'
import { z } from 'zod'
import { IPC_CHANNELS } from '../../shared/ipc'
import { infoPdf, mergePdfs, splitPdf } from '../services/pdf/ops'

const MergePayload = z.object({
  paths: z.array(z.string().min(1)).min(1),
  outPath: z.string().min(1)
})
const SplitPayload = z.object({
  path: z.string().min(1),
  outDir: z.string().min(1),
  ranges: z.array(z.object({ name: z.string(), from: z.number(), to: z.number() })).min(1)
})
const InfoPayload = z.object({ path: z.string().min(1) })
const SaveDialogPayload = z.object({ defaultName: z.string().optional() })
const RevealPayload = z.object({ path: z.string().min(1) })

export function registerPdfIpc(): void {
  ipcMain.handle(IPC_CHANNELS.pdfMerge, async (_e, raw) => {
    const { paths, outPath } = MergePayload.parse(raw)
    const result = await mergePdfs(paths, outPath)
    return { ok: true, ...result }
  })
  ipcMain.handle(IPC_CHANNELS.pdfSplit, async (_e, raw) => {
    const { path, outDir, ranges } = SplitPayload.parse(raw)
    const files = await splitPdf(path, outDir, ranges)
    return { ok: true, files }
  })
  ipcMain.handle(IPC_CHANNELS.pdfInfo, async (_e, raw) => {
    const { path } = InfoPayload.parse(raw)
    return infoPdf(path)
  })
  ipcMain.handle(IPC_CHANNELS.pdfOpen, async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })
    return result.filePaths ?? []
  })
  ipcMain.handle(IPC_CHANNELS.pdfSaveDialog, async (_e, raw) => {
    const { defaultName } = SaveDialogPayload.parse(raw ?? {})
    const result = await dialog.showSaveDialog({
      title: 'Save merged PDF as…',
      defaultPath: defaultName ?? `merged-${new Date().toISOString().slice(0, 10)}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })
    return result.canceled ? '' : (result.filePath ?? '')
  })
  ipcMain.handle(IPC_CHANNELS.pdfPickDir, async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory']
    })
    return result.filePaths?.[0] ?? ''
  })
  ipcMain.handle(IPC_CHANNELS.pdfRevealInFinder, async (_e, raw) => {
    const { path } = RevealPayload.parse(raw)
    shell.showItemInFolder(path)
    return { ok: true }
  })
}
