// @vitest-environment node
import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { PDFDocument } from 'pdf-lib'
import { expandDirectoryToPDFs, mergePdfs, resolveMergeOutputPath, validateInputPaths } from './ops'

let tmpRoot: string

async function createSamplePdf(path: string, pages = 1): Promise<void> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pages; i++) {
    doc.addPage([300, 400])
  }
  const bytes = await doc.save()
  writeFileSync(path, bytes)
}

beforeAll(async () => {
  tmpRoot = mkdtempSync(join(tmpdir(), 'daja-pdf-test-'))
  // 3 sample PDFs of varying page counts
  await createSamplePdf(join(tmpRoot, 'a.pdf'), 1)
  await createSamplePdf(join(tmpRoot, 'b.pdf'), 2)
  await createSamplePdf(join(tmpRoot, 'c.pdf'), 3)
  // One non-PDF file
  writeFileSync(join(tmpRoot, 'not-a-pdf.txt'), 'plain text')
  // Subfolder with PDFs
  mkdirSync(join(tmpRoot, 'sub'))
  await createSamplePdf(join(tmpRoot, 'sub', 'd.pdf'), 2)
  await createSamplePdf(join(tmpRoot, 'sub', 'e.pdf'), 1)
})

afterAll(() => {
  rmSync(tmpRoot, { recursive: true, force: true })
})

describe('validateInputPaths', () => {
  it('accepts valid pdf files', async () => {
    const r = await validateInputPaths([join(tmpRoot, 'a.pdf'), join(tmpRoot, 'b.pdf')])
    expect(r.valid).toHaveLength(2)
    expect(r.rejected).toHaveLength(0)
  })
  it('rejects non-existent path', async () => {
    const r = await validateInputPaths([join(tmpRoot, 'missing.pdf')])
    expect(r.rejected).toHaveLength(1)
    expect(r.rejected[0].reason).toContain('does not exist')
  })
  it('rejects non-pdf file', async () => {
    const r = await validateInputPaths([join(tmpRoot, 'not-a-pdf.txt')])
    expect(r.rejected).toHaveLength(1)
    expect(r.rejected[0].reason).toContain('not a .pdf')
  })
  it('expands directory to contained pdfs', async () => {
    const r = await validateInputPaths([join(tmpRoot, 'sub')])
    expect(r.valid).toHaveLength(2)
    expect(r.valid.every((p) => p.endsWith('.pdf'))).toBe(true)
  })
  it('strips trailing slash', async () => {
    const r = await validateInputPaths([join(tmpRoot, 'sub') + '/'])
    expect(r.valid).toHaveLength(2)
  })
  it('rejects empty string', async () => {
    const r = await validateInputPaths([''])
    expect(r.rejected[0].reason).toBe('empty path')
  })
  it('mix of valid, folder, and invalid preserves all three classifications', async () => {
    const r = await validateInputPaths([
      join(tmpRoot, 'a.pdf'),
      join(tmpRoot, 'sub'),
      join(tmpRoot, 'not-a-pdf.txt'),
      join(tmpRoot, 'zzz-missing.pdf')
    ])
    expect(r.valid).toHaveLength(3) // a.pdf + 2 in sub
    expect(r.rejected).toHaveLength(2)
  })
})

describe('expandDirectoryToPDFs', () => {
  it('lists pdfs alphabetically', async () => {
    const list = await expandDirectoryToPDFs(join(tmpRoot, 'sub'))
    expect(list.map((p) => p.split('/').pop())).toEqual(['d.pdf', 'e.pdf'])
  })
  it('returns empty list for empty directory', async () => {
    const empty = join(tmpRoot, 'empty-dir')
    mkdirSync(empty)
    expect(await expandDirectoryToPDFs(empty)).toEqual([])
  })
})

describe('resolveMergeOutputPath', () => {
  it('rejects empty string', async () => {
    await expect(resolveMergeOutputPath('')).rejects.toThrow('empty')
    await expect(resolveMergeOutputPath('   ')).rejects.toThrow('empty')
  })
  it('appends .pdf when missing extension', async () => {
    const p = await resolveMergeOutputPath(join(tmpRoot, 'out-noext'))
    expect(p.endsWith('.pdf')).toBe(true)
  })
  it('forces .pdf when wrong extension', async () => {
    const p = await resolveMergeOutputPath(join(tmpRoot, 'out.txt'))
    expect(p.endsWith('.pdf')).toBe(true)
  })
  it('appends merged-<timestamp>.pdf when path is an existing directory', async () => {
    const p = await resolveMergeOutputPath(tmpRoot)
    expect(p.startsWith(tmpRoot)).toBe(true)
    expect(/merged-\d+-\d+\.pdf$/.test(p)).toBe(true)
  })
  it('treats trailing-slash path as directory and fills filename', async () => {
    const p = await resolveMergeOutputPath(tmpRoot + '/')
    expect(/merged-\d+-\d+\.pdf$/.test(p)).toBe(true)
  })
  it('creates parent directory if missing', async () => {
    const target = join(tmpRoot, 'new-parent', 'out.pdf')
    const p = await resolveMergeOutputPath(target)
    expect(p).toBe(target)
    expect(existsSync(join(tmpRoot, 'new-parent'))).toBe(true)
  })
})

describe('mergePdfs', () => {
  it('merges 3 input PDFs into one file with correct page count', async () => {
    const out = join(tmpRoot, 'merged-1.pdf')
    const result = await mergePdfs(
      [join(tmpRoot, 'a.pdf'), join(tmpRoot, 'b.pdf'), join(tmpRoot, 'c.pdf')],
      out
    )
    expect(result.mergedCount).toBe(3)
    expect(result.pageCount).toBe(1 + 2 + 3)
    expect(result.rejected).toEqual([])
    expect(existsSync(out)).toBe(true)
  })
  it('merges files from a directory input', async () => {
    const out = join(tmpRoot, 'merged-from-dir.pdf')
    const result = await mergePdfs([join(tmpRoot, 'sub')], out)
    expect(result.mergedCount).toBe(2)
    expect(result.pageCount).toBe(2 + 1)
  })
  it('gracefully handles a directory-only output by auto-naming the file', async () => {
    const result = await mergePdfs([join(tmpRoot, 'a.pdf')], tmpRoot + '/')
    expect(result.path.endsWith('.pdf')).toBe(true)
    expect(existsSync(result.path)).toBe(true)
  })
  it('reports rejected files but still merges the valid ones', async () => {
    const out = join(tmpRoot, 'merged-partial.pdf')
    const result = await mergePdfs(
      [join(tmpRoot, 'a.pdf'), join(tmpRoot, 'not-a-pdf.txt'), join(tmpRoot, 'missing.pdf')],
      out
    )
    expect(result.mergedCount).toBe(1)
    expect(result.rejected.length).toBe(2)
  })
  it('throws clearly when no valid files to merge', async () => {
    await expect(
      mergePdfs(
        [join(tmpRoot, 'missing1.pdf'), join(tmpRoot, 'not-a-pdf.txt')],
        join(tmpRoot, 'x.pdf')
      )
    ).rejects.toThrow('No valid PDF files')
  })
  it('throws when no paths supplied', async () => {
    await expect(mergePdfs([], join(tmpRoot, 'x.pdf'))).rejects.toThrow('No files supplied')
  })
})
