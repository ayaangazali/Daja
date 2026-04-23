import { readFile, writeFile, stat, mkdir, readdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, basename, extname, dirname, resolve } from 'path'
import { PDFDocument } from 'pdf-lib'

export interface ValidationResult {
  valid: string[]
  rejected: { path: string; reason: string }[]
}

export interface MergeResult {
  path: string
  mergedCount: number
  pageCount: number
  rejected: { path: string; reason: string }[]
}

/** List .pdf files directly inside a directory (non-recursive), sorted alphabetically. */
export async function expandDirectoryToPDFs(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const out: string[] = []
  for (const e of entries) {
    if (e.isFile() && e.name.toLowerCase().endsWith('.pdf')) {
      out.push(join(dir, e.name))
    }
  }
  return out.sort((a, b) => a.localeCompare(b))
}

/**
 * Validate + expand a list of paths. Directories are expanded to contained
 * .pdf files. Non-existent or non-PDF entries are rejected with a reason.
 */
export async function validateInputPaths(paths: string[]): Promise<ValidationResult> {
  const valid: string[] = []
  const rejected: { path: string; reason: string }[] = []
  for (const raw of paths) {
    const p = raw.replace(/\/+$/, '')
    if (!p) {
      rejected.push({ path: raw, reason: 'empty path' })
      continue
    }
    if (!existsSync(p)) {
      rejected.push({ path: raw, reason: 'file or directory does not exist' })
      continue
    }
    try {
      const s = await stat(p)
      if (s.isDirectory()) {
        const children = await expandDirectoryToPDFs(p)
        if (children.length === 0) {
          rejected.push({ path: raw, reason: 'directory contains no .pdf files' })
        } else {
          valid.push(...children)
        }
        continue
      }
      if (!s.isFile()) {
        rejected.push({ path: raw, reason: 'not a regular file' })
        continue
      }
      if (extname(p).toLowerCase() !== '.pdf') {
        rejected.push({ path: raw, reason: 'not a .pdf file' })
        continue
      }
      valid.push(p)
    } catch (err) {
      rejected.push({
        path: raw,
        reason: err instanceof Error ? err.message : 'stat failed'
      })
    }
  }
  return { valid, rejected }
}

function timestamp(): string {
  const d = new Date()
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

/**
 * Normalize an output path for PDF merge.
 * - Trailing slash or existing directory → append merged-<timestamp>.pdf
 * - Missing extension → append .pdf
 * - Wrong extension → replace with .pdf
 * - Ensure parent directory exists (mkdir -p)
 */
export async function resolveMergeOutputPath(outPath: string): Promise<string> {
  if (!outPath || !outPath.trim()) {
    throw new Error('Output path is empty — specify a target file path or directory.')
  }
  const trimmed = outPath.trim()
  let p = resolve(trimmed)
  const endsInSlash = /[\\/]$/.test(trimmed)
  let isExistingDir = false
  try {
    const s = await stat(p)
    isExistingDir = s.isDirectory()
  } catch {
    // doesn't exist — not a directory
  }
  if (endsInSlash || isExistingDir) {
    p = join(p, `merged-${timestamp()}.pdf`)
  } else if (extname(p) === '') {
    p = `${p}.pdf`
  } else if (extname(p).toLowerCase() !== '.pdf') {
    p = `${p.slice(0, -extname(p).length)}.pdf`
  }
  const parent = dirname(p)
  if (!existsSync(parent)) {
    await mkdir(parent, { recursive: true })
  }
  return p
}

/**
 * pdf-lib parses entire PDFs into memory. Merging more than a few hundred MB
 * of inputs risks node heap OOM. This guard short-circuits obviously-too-big
 * jobs with an actionable error before we start allocating.
 */
const MAX_TOTAL_BYTES = 256 * 1024 * 1024 // 256 MB combined

export async function mergePdfs(paths: string[], outPath: string): Promise<MergeResult> {
  if (paths.length === 0) throw new Error('No files supplied to merge.')
  const { valid, rejected } = await validateInputPaths(paths)
  if (valid.length === 0) {
    const reasons = rejected.map((r) => `  • ${r.path} — ${r.reason}`).join('\n')
    throw new Error(`No valid PDF files to merge.\n${reasons}`)
  }
  // Pre-flight size check. Using stat avoids actually loading the bytes.
  const { stat } = await import('fs/promises')
  let totalBytes = 0
  for (const p of valid) {
    try {
      totalBytes += (await stat(p)).size
    } catch {
      /* ignore — read will surface a specific error */
    }
  }
  if (totalBytes > MAX_TOTAL_BYTES) {
    const mb = Math.round(totalBytes / 1024 / 1024)
    throw new Error(
      `Combined input size is ${mb} MB (> ${MAX_TOTAL_BYTES / 1024 / 1024} MB limit). ` +
        `pdf-lib holds entire PDFs in memory during merge; this size risks OOM. ` +
        `Split the batch into smaller groups or compress inputs first.`
    )
  }
  const resolvedOut = await resolveMergeOutputPath(outPath)
  const out = await PDFDocument.create()
  // Preserve metadata from the first PDF that has non-empty title/author/etc.
  let metadataSeeded = false
  for (const p of valid) {
    let bytes: Uint8Array
    try {
      bytes = await readFile(p)
    } catch (err) {
      throw new Error(
        `Failed to read "${p}": ${err instanceof Error ? err.message : 'unknown error'}`
      )
    }
    let src: PDFDocument
    try {
      src = await PDFDocument.load(bytes, { ignoreEncryption: true })
    } catch (err) {
      throw new Error(
        `Could not parse "${p}" as PDF — may be corrupt or password-protected. (${err instanceof Error ? err.message : 'unknown error'})`
      )
    }
    if (!metadataSeeded) {
      const title = src.getTitle()
      const author = src.getAuthor()
      const subject = src.getSubject()
      const keywords = src.getKeywords()
      if (title) out.setTitle(title)
      if (author) out.setAuthor(author)
      if (subject) out.setSubject(subject)
      if (keywords) out.setKeywords(keywords.split(',').map((s) => s.trim()))
      metadataSeeded = title != null || author != null || subject != null || keywords != null
    }
    const pages = await out.copyPages(src, src.getPageIndices())
    for (const page of pages) out.addPage(page)
  }
  // Always stamp the producer + modification date so the merged file
  // identifies itself as produced by Daja.
  out.setProducer('Daja PDF Merge')
  out.setCreator('Daja')
  out.setModificationDate(new Date())
  const mergedBytes = await out.save()
  try {
    await writeFile(resolvedOut, mergedBytes)
  } catch (err) {
    throw new Error(
      `Failed to write merged PDF to "${resolvedOut}": ${err instanceof Error ? err.message : 'unknown error'}`
    )
  }
  return {
    path: resolvedOut,
    mergedCount: valid.length,
    pageCount: out.getPageCount(),
    rejected
  }
}

export interface SplitRange {
  name: string
  from: number
  to: number
}

export async function splitPdf(
  path: string,
  outDir: string,
  ranges: SplitRange[]
): Promise<string[]> {
  if (!existsSync(path)) {
    throw new Error(`Source PDF does not exist: ${path}`)
  }
  if (!existsSync(outDir)) {
    await mkdir(outDir, { recursive: true })
  }
  const bytes = await readFile(path)
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true })
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
  if (!existsSync(path)) {
    throw new Error(`PDF does not exist: ${path}`)
  }
  const bytes = await readFile(path)
  const doc = await PDFDocument.load(bytes, { updateMetadata: false, ignoreEncryption: true })
  return {
    pages: doc.getPageCount(),
    title: doc.getTitle() ?? null,
    author: doc.getAuthor() ?? null
  }
}
