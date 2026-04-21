import { readFile, writeFile } from 'fs/promises'
import { join, basename, extname } from 'path'
import { PDFDocument } from 'pdf-lib'

export async function mergePdfs(paths: string[], outPath: string): Promise<string> {
  if (paths.length === 0) throw new Error('No files to merge')
  const out = await PDFDocument.create()
  for (const p of paths) {
    const bytes = await readFile(p)
    const src = await PDFDocument.load(bytes)
    const pages = await out.copyPages(src, src.getPageIndices())
    for (const page of pages) out.addPage(page)
  }
  const bytes = await out.save()
  await writeFile(outPath, bytes)
  return outPath
}

export interface SplitRange {
  name: string
  from: number // 1-indexed inclusive
  to: number // 1-indexed inclusive
}

export async function splitPdf(
  path: string,
  outDir: string,
  ranges: SplitRange[]
): Promise<string[]> {
  const bytes = await readFile(path)
  const src = await PDFDocument.load(bytes)
  const total = src.getPageCount()
  const stem = basename(path, extname(path))
  const out: string[] = []
  for (const r of ranges) {
    const from = Math.max(1, Math.min(r.from, total))
    const to = Math.max(from, Math.min(r.to, total))
    const doc = await PDFDocument.create()
    const indices = Array.from({ length: to - from + 1 }, (_, i) => from - 1 + i)
    const pages = await doc.copyPages(src, indices)
    for (const p of pages) doc.addPage(p)
    const outFile = join(outDir, `${stem}_${r.name || `${from}-${to}`}.pdf`)
    await writeFile(outFile, await doc.save())
    out.push(outFile)
  }
  return out
}

export async function infoPdf(
  path: string
): Promise<{ pages: number; title: string | null; author: string | null }> {
  const bytes = await readFile(path)
  const doc = await PDFDocument.load(bytes, { updateMetadata: false })
  return {
    pages: doc.getPageCount(),
    title: doc.getTitle() ?? null,
    author: doc.getAuthor() ?? null
  }
}
