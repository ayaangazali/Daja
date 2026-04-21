import { ipcMain, dialog } from 'electron'
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

export function registerPdfIpc(): void {
  ipcMain.handle(IPC_CHANNELS.pdfMerge, async (_e, raw) => {
    const { paths, outPath } = MergePayload.parse(raw)
    const saved = await mergePdfs(paths, outPath)
    return { ok: true, path: saved }
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
}
