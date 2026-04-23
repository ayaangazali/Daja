export function toCsv<T extends Record<string, unknown>>(rows: T[], columns?: (keyof T)[]): string {
  if (rows.length === 0) return ''
  const keys = (columns ?? (Object.keys(rows[0]) as (keyof T)[])) as (keyof T)[]
  const esc = (v: unknown): string => {
    if (v == null) return ''
    const s = typeof v === 'string' ? v : JSON.stringify(v)
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const header = keys.map(String).join(',')
  const body = rows.map((r) => keys.map((k) => esc(r[k])).join(',')).join('\n')
  return `${header}\n${body}`
}

/**
 * Parse CSV back into an array of records. Handles double-quoted fields with
 * embedded commas, newlines, and escaped quotes (`""`). Header row required.
 * Returns header array + rows for the caller to validate against a known schema.
 */
export function fromCsv(content: string): { header: string[]; rows: Record<string, string>[] } {
  const text = content.replace(/^\uFEFF/, '') // strip UTF-8 BOM
  const cells: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0
  while (i < text.length) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      field += ch
      i++
      continue
    }
    if (ch === '"') {
      inQuotes = true
      i++
      continue
    }
    if (ch === ',') {
      row.push(field)
      field = ''
      i++
      continue
    }
    if (ch === '\n' || ch === '\r') {
      row.push(field)
      if (row.length > 1 || row[0] !== '') cells.push(row)
      row = []
      field = ''
      if (ch === '\r' && text[i + 1] === '\n') i += 2
      else i++
      continue
    }
    field += ch
    i++
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    cells.push(row)
  }
  if (cells.length === 0) return { header: [], rows: [] }
  const [header, ...rest] = cells
  const rows = rest.map((r) => {
    const out: Record<string, string> = {}
    header.forEach((h, idx) => {
      out[h] = r[idx] ?? ''
    })
    return out
  })
  return { header, rows }
}

export async function downloadCsv(filename: string, content: string): Promise<boolean> {
  const res = await window.daja.system.saveFile({
    defaultPath: filename,
    filters: [{ name: 'CSV', extensions: ['csv'] }],
    contents: content
  })
  return res.ok
}
